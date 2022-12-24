const fetch = require('node-fetch')
const https = require('https');

const doStuff = async () => {

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });
  
  const data = new URLSearchParams()
  data.append("inputPassword", "12345")
  
  const baseUrl = 'https://sandbox.cialers.org'

  const cookie = await fetch(baseUrl + "/qr.php", {
    method: "GET",
    agent: httpsAgent
  }).then(async res => {
    console.log('log in status:', res.status)
    const cookie = res.headers.get("set-cookie").split(";")[0]
    console.log(res.headers)


    console.log('log in cookie:', cookie)
    return cookie
  })

  // Log in
  await fetch(baseUrl + '/qr.php?action=password-check', {
    method: "POST",
    body: data,
    headers: {
      "Cookie": cookie,
    },
    agent: httpsAgent,
    redirect: "manual"
  }).then(res => {
    console.log("Log In Status:", res.status)
    console.log(res.headers)
  })

  // const checkinUrl = baseUrl + '/qr.php?action=update&id=00001'
  const checkinUrl1 = 'https://sandbox.cialers.org/qr.php?action=update&id=00001'
  const checkinUrl2 = 'https://sandbox.cialers.org/qr.php?action=update&id=00002'

  await fetch(checkinUrl1, {
    method: "GET",
    headers: {
      "Cookie": cookie,
    },
    agent: httpsAgent,
    redirect: "manual"
  }).then(res => {
    console.log("Check in status", res.status)
    return res.text()
  }).then(resText => {
    // console.log(resText)
  })

  await fetch(checkinUrl2, {
    method: "GET",
    headers: {
      "Cookie": cookie,
    },
    agent: httpsAgent,
    redirect: "manual"
  }).then(res => {
    console.log("Check in status", res.status)
    return res.text()
  }).then(resText => {
    // console.log(resText)
  })

}

doStuff()