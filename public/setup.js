const MapUploadToKeys = {
  entryNumber: "Entry Number",
  judgingNumber: "Judging Number",
  category: "Category",
  subcat: "Sub",
  flight: "Flight",
  box1:  "Box 1",
  box2:  "Box 2",
  box3:  "Box 3",
  box4:  "Box 4",
  checkedIn: "Checked In"
}

let entryUuidCounterVal = parseInt(localStorage.getItem('uuidCounter')) || 0
let systemId = localStorage.getItem('systemId') || "1"
let passphrase = localStorage.getItem('passphrase') || " "

const createInstanceListItem = (instanceUrl, instancePrefix, connectionStatus=false) => {
  return `
    <li class="list-group-item instance-listing" instanceprefix='${instancePrefix}'>
      <div class="row">
        <span class="col-3 badge badge-${connectionStatus ? "success" : "secondary"}">${connectionStatus ? "Connected" : "Disconnected"}</span>
        <span class="col-6">${instanceUrl}</span>
        <div class="col-1">${instancePrefix.length ? "<span class='badge badge-primary'>"+instancePrefix+"</span>" : ""}</div>
        <div class="col-1 update-instance-button" instanceprefix='${instancePrefix}' style="cursor:pointer;"><span class='badge badge-info'>🗘</span></div>
        <div class="col-1 remove-instance-button" instanceprefix='${instancePrefix}' style="cursor:pointer;"><span class='badge badge-danger'>X</span></div>
      </div>
    </li>`
}

const updateInstanceButtonMap = () => {
  $(".update-instance-button").on('click', function(evt) {
    evt.stopPropagation();
    evt.stopImmediatePropagation();
    const instancePrefix = $(this).attr("instanceprefix")

    fetch('/reconnect', {
      method: "POST",
      headers: {
        passphrase: localStorage.getItem("passphrase")
      },
      body: JSON.stringify({
        instancePrefix: instancePrefix
      })
    })
      .then(res => res.json())
      .then(res => {
        $(`.instance-listing[instanceprefix='${res.instancePrefix}']`).find(':first-child').remove()

        $(`.instance-listing[instanceprefix='${res.instancePrefix}']`).append(
          $(createInstanceListItem(
            res.instanceUrl,
            res.instancePrefix,
            res.currentStatus
          )).first().html()
        )
      })
  })

  $(".remove-instance-button").on('click', function(evt) {
    evt.stopPropagation();
    evt.stopImmediatePropagation();
    const instancePrefix = $(this).attr("instanceprefix")

    fetch('/logout', {
      method: "POST",
      headers: {
        passphrase: localStorage.getItem("passphrase")
      },
      body: JSON.stringify({
        instancePrefix: instancePrefix
      })
    })
      .then(res => res.json())
      .then(res => {
        $(`.instance-listing[instanceprefix='${res.destroy}']`).remove()
      })
  })
}

const updateSystemStatus = async () => {
  await fetch('/connectionstatus', {
    headers: {
      passphrase: localStorage.getItem("passphrase")
    },
  })
    .then(res => res.json())
    .then(res => {
      if (!res.length) return

      res.forEach(instance => {
        $('#instancesContainer').append(
          createInstanceListItem(
            instance.instanceUrl,
            instance.instancePrefix,
            instance.currentStatus
          )
        )
      })

      updateInstanceButtonMap()
    })
}

$(document).ready(() => {
  updateSystemStatus()

  $("#currentCounterVal").text(entryUuidCounterVal)
  $("#currentSystemId").text(systemId)
  $("#currentPassphrase").text(passphrase)

  $('#entryFileUpload').on('change', handleFile)

  $("#importEntriesButton").on('click', () => {
    const instancePrefix = window.prompt("Enter an instance prefix (leave blank if none)", "")

    $("#uploadFileModalInstancePrefix").val(instancePrefix)
    $("#uploadFileModal").modal("show")
  })

  $('#BcoemConnectButton').on("click", async () => {
    const instancePrefix = $("#instancePrefix").val()
    const url = $('#competitionUrl').val()
    const password = $('#qr-checkin-password').val()

    await fetch("/login", {
      method: "POST",
      headers: {
        passphrase: localStorage.getItem("passphrase"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        instanceUrl: url,
        qrPassword: password,
        instancePrefix: instancePrefix
      })
    })

    $('#instancesContainer').append(
      createInstanceListItem(
        url,
        instancePrefix,
        true
      )
    )

    updateInstanceButtonMap()
  })

  $('#setSystemPassphrase').on('click', () => {
    const passphrase = window.prompt("Please enter the passphrase", "")

    localStorage.setItem('passphrase', passphrase)
    $("#currentPassphrase").text(passphrase)
  })

  $('#resetCounterButton').on('click', () => {
    const resetCounterVal = window.prompt("Please enter a new counter value", "0")

    if (parseInt(resetCounterVal) != NaN && parseInt(resetCounterVal) >= 0) {
      entryUuidCounterVal = parseInt(resetCounterVal)
      localStorage.setItem('uuidCounter', entryUuidCounterVal)
      $("#currentCounterVal").text(entryUuidCounterVal)
    } else {
      window.alert("Could not parse value. Please enter a positive integer.")
    }
  })

  $('#resetSystemIdButton').on('click', () => {
    const newSystemId = window.prompt("Please enter a new system ID. System ID must be a single character.", "1")

    if (newSystemId.length != 1) {
      window.alert("Invalid system ID. System ID must be a single character!")
      return
    }

    systemId = newSystemId
    localStorage.setItem('systemId', newSystemId)
    $("#currentSystemId").text(newSystemId)
  })

  function handleFile(e) {
    const instancePrefix = $("#uploadFileModalInstancePrefix").val()
    const files = e.target.files, f = files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const headers = []
      const rows = []
      const allEntries = {}

      const regex = new RegExp(/[//!]/g)

      Object.entries(workbook.Sheets["Sheet1"])
      .filter(([key,val]) => (!regex.test(key)))
      .forEach(([key, val]) => {
        const rowNumber = Number(key.replace(/[A-Z]/g, ''))
        const columnNumber = Number(key.replace(/[0-9]/g, '').charCodeAt(0)) - 65

        if (rowNumber === 1) {
          headers[columnNumber] = val.v
          return
        }

        rows[rowNumber-1] = rows[rowNumber-1] || []

        rows[rowNumber-1][columnNumber] = val.v
      })

      rows.forEach((row, idx) => {
        const entryNumber = String(row[headers.indexOf(MapUploadToKeys.entryNumber)]).padStart(6, "0")
        const box1 = row[headers.indexOf(MapUploadToKeys.box1)]
        const box2 = row[headers.indexOf(MapUploadToKeys.box2)]
        const box3 = row[headers.indexOf(MapUploadToKeys.box3)]
        const box4 = row[headers.indexOf(MapUploadToKeys.box4)]
        const flightId = row[headers.indexOf(MapUploadToKeys.flight)]

        allEntries[entryNumber] = {
          entryNumber,
          judgingNumber: row[headers.indexOf(MapUploadToKeys.judgingNumber)] || null,
          category: row[headers.indexOf(MapUploadToKeys.category)] || null,
          subcat: row[headers.indexOf(MapUploadToKeys.subcat)] || null,
          flight: flightId || null,
          box1: box1 !== "N/R" ? box1 : null,
          box2: box2 !== "N/R" ? box2 : null,
          box3: box3 !== "N/R" ? box3 : null,
          box4: box4 !== "N/R" ? box4 : null,
          checkedIn: ""
        }
      })

      fetch('/upload', {
        method: "POST",
        headers: {
          passphrase: localStorage.getItem("passphrase"),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          entries: Object.values(allEntries),
          instancePrefix
        })
      })

      $("#uploadFileModal").modal("hide")
      $("#uploadFileModalInstancePrefix").val("")
    };
    reader.readAsArrayBuffer(f);
  }
})
