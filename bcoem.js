const fetch = require('node-fetch')
const https = require('https');

const BCOEM = {}

/*
msg=1 - Password Error
msg=2 - Password Accepted
msg=3 - Checked In + Judging Number Updated
msg=4 - Entry not in DB
msg=5 - Judging Number Already Assigned
msg=6 - Checkin Success
msg=7 - DB Error
*/

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

BCOEM.login = async (
  instanceUrl,
  qrPassword
) => {
  const data = new URLSearchParams()
  data.append("inputPassword", qrPassword)

  const cookie = await fetch(instanceUrl + "/qr.php", {
    method: "GET",
    agent: httpsAgent
  }).then(async res => {
    return res.headers.get("set-cookie").split(";")[0]
  })

  const loginSucceeded = fetch(instanceUrl + '/qr.php?action=password-check', {
    method: "POST",
    body: data,
    headers: {
      "Cookie": cookie,
    },
    agent: httpsAgent,
    redirect: "manual"
  }).then(res => {
    if (res.headers.get("location").includes("msg=1")) {
      // Password Error
      return false
    } else if (res.headers.get("location").includes("msg=2")) {
      // Password Accepted Success
      return true
    }
  })

  if (!loginSucceeded) {
    return false
  }

  return cookie
}

BCOEM.getConnectionStatus = async (
  instanceUrl,
  cookie
) => {
  if (!cookie) return false

  return fetch(instanceUrl + '/qr.php', {
    method: "GET",
    agent: httpsAgent,
    headers: {
      "Cookie": cookie,
    },
  })
    .then(res => res.text())
    .then(res => {
      return res.includes("Waiting for scanned QR code input.")
    })
}

BCOEM.checkInEntry = async (
  instanceUrl,
  entryNumber,
  cookie
) => {
  if (!cookie) return false

  const checkinUrl = instanceUrl + '/qr.php?action=update&id=' + entryNumber

  return fetch(checkinUrl, {
    method: "GET",
    headers: {
      "Cookie": cookie,
    },
    agent: httpsAgent,
    redirect: "manual"
  }).then(res => {
    if (res.headers.get("location").includes("msg=1")) {
      // Password Error
      return false
    } else if (res.headers.get("location").includes("msg=6")) {
      // Checkin Success
      return true
    }

    // Other errors
    return null
  })
}

module.exports = BCOEM