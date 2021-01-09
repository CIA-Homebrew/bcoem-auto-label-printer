const MapUploadToKeys = {
  entryNumber: "Entry Number",
  judgingNumber: "Judging Number",
  category: "Category Sort",
  subcat: "Sub Category",
  flight: "Flight",
  box1:  "Bottle 1 Box",
  box2:  "Bottle 2 Box",
  box3:  "Bottle 3 box (2-rd)",
  box4:  "Bottle 4 box (3-rd)",
  checkedIn: "Checked In"
}
const boxes = ['box1', 'box2', 'box3', 'box4', 'record']
const Entries = JSON.parse(localStorage.getItem('Entries')) || {}
let bcoemConnected = false;

const connectToBcoem = (url, password) => {
  const form = new FormData()
  form.append("inputPassword", password)

  return $.ajax({
    url: `${url.replace(/\/+$/, "")}/qr.php?action=password-check`,
    method: "POST",
    data: form,
    processData: false,
    contentType: false,
  })
  .then(response => {
    if (response.includes("Password accepted.")) {
      return Promise.resolve("Connected")
    } else if (response.includes("Password incorrect.")) {
      return Promise.reject("Incorrect password")
    }

    return Promise.reject("Connection Failure")
  })
}

const checkInEntry = (url, entryNumber) => {
  return $.ajax(
  {
    url: `${url.replace(/\/+$/, "")}/qr.php?action=update&id=${Number(entryNumber)}`,
    method: "POST",
    xhrFields: {
      withCredentials: true
    }
  })
  .then(response => {
    if (response.includes("is checked in.</strong></p>")) {
      return Promise.resolve(entryNumber)
    } else if (response.includes("please provide the correct password.")) {
      return Promise.reject("Session Timed Out")
    }

    return Promise.reject("Checkin Failure")
  })
}

$(document).ready(() => {
  $('#scannerInput').focus()

  const table = $("#entry-table").DataTable({
    columns: Object.keys(MapUploadToKeys).map(key => ({"data": key})),
    rowId: "entryNumber"
  })

  if (Object.keys(Entries).length) {
    table.rows.add(Object.values(Entries)).draw()
  }

  $('#scannerInput').keyup((evt) => {
    if (evt.which !== 13) return 

    const scannerInput = $('#scannerInput').val()
    const scannedEntry = Entries[scannerInput]
    $('#scannerInput').val('')

    if (!scannedEntry) {
      console.error("Entry does not exist!")
      return
    }

    Entries[scannedEntry.entryNumber].checkedIn = "Local"

    if (bcoemConnected) {
      const url = $('#competitionUrl').val()

      checkInEntry(url, scannedEntry.entryNumber)
      .then(entryNumber => {
        $('#checkInStatus').attr('hidden', false)
        $('#checkInStatus').removeClass("alert-warning alert-danger alert-primary")
        $('#checkInStatus').addClass("alert-success")
        $('#checkInStatus').text(`Entry ${entryNumber} checked in`)

        Entries[entryNumber].checkedIn = "BCOEM"
      })
      .catch(err => {
        $('#checkInStatus').attr('hidden', false)
        $('#checkInStatus').removeClass("alert-warning alert-success alert-primary")
        $('#checkInStatus').addClass("alert-danger")
        $('#checkInStatus').text(`Error adding entry ${scannedEntry.entryNumber}: ${err}`)
      })
    }

    table.cell(`#${scannedEntry.entryNumber}`, 9).data(Entries[scannedEntry.entryNumber].checkedIn).draw()
    localStorage.setItem('Entries', JSON.stringify(Entries))

    const printCss="margin:0px;width:1in; height:1in; transform:rotate(90deg);display:flex;flex-direction:column;justify-content:space-around;align-items:center;font-size:9.5px;font-family:sans-serif;"

    boxes.forEach(boxId => {
      let printHtml = ''

      if (boxId === 'record') {
        printHtml += `<div><div style="font-weight:bolder;"># ${scannedEntry.judgingNumber}</div>
        <div>Cat: ${scannedEntry.category}${scannedEntry.subcat}</div>
        <div>FOR RECORDS</div></div>`
      } else if (scannedEntry[boxId] === null || scannedEntry[boxId] === undefined) {
        printHtml += `<div><div style="font-weight:bolder;"># ${scannedEntry.judgingNumber}</div>
        <div>Cat: ${scannedEntry.category}${scannedEntry.subcat}</div>
        <div>SPARE ENTRY</div></div>`
      } else {
        printHtml += `
        <div><div style="font-weight:bolder;"># ${scannedEntry.judgingNumber}</div>
        <div>Cat: ${scannedEntry.category}${scannedEntry.subcat} &nbsp; Box: ${scannedEntry[boxId]}</div>
        <div>${boxId === 'box3' ? "Flight: 2nd Round" : boxId === 'box4' ? "Flight: BOS" : "FlightID: " + scannedEntry.flight}</div></div>`
      }
    
      const printWindow = window.open('', 'PRINT', 'height=400,width=600')
      printWindow.document.write(`<html><head><title>Print Label</title></head><body style="${printCss}">${printHtml}${printHtml}</body></html>`)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    })

    $('#scannerInput').focus()
  })

  $('#entryFileUpload').on('change', handleFile)

  $("#importEntriesButton").on('click', () => {
    $("#uploadFileModal").modal("show")
  })

  $("#addEntryButton").on("click", ()=> {
    $('#addEntryModal').modal('show')
  })

  $("#deleteEntriesButton").on("click", () => {
    $('#deleteEntriesModal').modal('show')
  })

  $("#confirmDeleteAllEntriesButton").on('click', () => {
    Object.keys(Entries).forEach(entry => {
      delete Entries[entry]
    })

    table.clear().draw()
    localStorage.setItem('Entries', JSON.stringify(Entries))

    $('#deleteEntriesModal').modal('hide')
  })

  $('#downloadEntryStatusButton').on('click', () => {
    let textOut = '"Entry Number","Check In Status"\n'

    Object.values(Entries).forEach(value => {
      textOut += `"${value.entryNumber}","${value.checkedIn}"\n`
    })

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(textOut));
    element.setAttribute('download', 'Check In Status.csv');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  })

  $('#BcoemConnectButton').on("click", () => {
    const url = $('#competitionUrl').val()
    const password = $('#qr-checkin-password').val()

    if (bcoemConnected === true) {
      bcoemConnected = false
      updateConnectionUi()
      $('#connectionStatus').text("Disconnected")
      return
    }

    if (url === "" || password === "") return

    connectToBcoem(url, password)
    .then(() => {
      bcoemConnected = true;
      updateConnectionUi()
    })
    .catch(err => {
      bcoemConnected = false;
      updateConnectionUi()
      $('#connectionStatus').text("Error: " + err)
      
    })
  })

  $('#addManualEntry').on("click", () => {
    table.row.add({
      entryNumber: $("#addEntryNumber").val() || null,
      judgingNumber: $("#addJudgingNumber").val() || null,
      category: $("#addFlightNumber").val() || null,
      subcat: $("#addCategory").val() || null,
      flight: $("#addSubcat").val() || null,
      box1: $("#addBox1").val() || null,
      box2: $("#addBox2").val() || null,
      box3: $("#addBox3").val() || null,
      box4: $("#addBox4").val() || null,
      checkedIn: ""
    }).draw()

    $('#addEntryModal').modal('hide')
    $("#addEntryNumber").val('')
    $("#addJudgingNumber").val('')
    $("#addFlightNumber").val('')
    $("#addCategory").val('')
    $("#addSubcat").val('')
    $("#addBox1").val('')
    $("#addBox2").val('')
    $("#addBox3").val('')
    $("#addBox4").val('')
  })

  function updateConnectionUi() {
    if (bcoemConnected) {
      $('#connectionStatus').removeClass("alert-warning alert-danger alert-primary")
      $('#connectionStatus').addClass("alert-success")
      $('#connectionStatus').text("✓ Connected")
      $('#qr-checkin-password').attr("disabled", true)
      $('#competitionUrl').attr("disabled", true)
      $('#BcoemConnectButton').removeClass("btn-primary")
      $('#BcoemConnectButton').addClass("btn-danger")
      $('#BcoemConnectButton').text("Disconnect")
    } else {
      $('#connectionStatus').removeClass("alert-warning alert-success alert-primary")
      $('#connectionStatus').addClass("alert-danger")
      $('#qr-checkin-password').attr("disabled", false)
      $('#competitionUrl').attr("disabled", false)
      $('#BcoemConnectButton').removeClass("btn-danger")
      $('#BcoemConnectButton').addClass("btn-primary")
      $('#BcoemConnectButton').text("Connect")
    }
  }

  function handleFile(e) {
    const files = e.target.files, f = files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const headers = []
      const rows = []

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

      rows.forEach(row => {
        const entryNumber = String(row[headers.indexOf(MapUploadToKeys.entryNumber)]).padStart(6, "0")
        const box1 = row[headers.indexOf(MapUploadToKeys.box1)]
        const box2 = row[headers.indexOf(MapUploadToKeys.box2)]
        const box3 = row[headers.indexOf(MapUploadToKeys.box3)]
        const box4 = row[headers.indexOf(MapUploadToKeys.box4)]

        const catNumber = String(row[headers.indexOf(MapUploadToKeys.category)]).charAt(0) === 'M' ?
          String(Number(String(row[headers.indexOf(MapUploadToKeys.category)]).charAt(1)) + 34).padStart(2, "0") :
          String(row[headers.indexOf(MapUploadToKeys.category)]).padStart(2, "0")

        const flightId = catNumber + 
          String(row[headers.indexOf(MapUploadToKeys.flight)]).padStart(2, "0") + 
          String(Number(catNumber) + Number(row[headers.indexOf(MapUploadToKeys.flight)])).padStart(2, "0")

        Entries[entryNumber] = {
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

      localStorage.setItem('Entries', JSON.stringify(Entries))

      table.rows.add(Object.values(Entries)).draw()
      $("#uploadFileModal").modal("hide")
    };
    reader.readAsArrayBuffer(f);
  }
})