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
// const boxes = ['box1', 'box2', 'box3', 'box4', 'record']
const boxes = ['box1', 'box2', 'box3', 'box4']
let entryUuidCounterVal = parseInt(localStorage.getItem('uuidCounter')) || 0
let systemId = localStorage.getItem('systemId') || "1"

let dymoConnected = false;
let dymoPrinter = null;
let dymoPrinterParams = null;

const createInstanceListItem = (instanceUrl, instancePrefix, connectionStatus=false) => {
  return `
    <li class="list-group-item instance-listing" instanceprefix='${instancePrefix}'>
      <div class="row">
        <span class="col-3 badge badge-${connectionStatus ? "success" : "secondary"}">${connectionStatus ? "Connected" : "Disconnected"}</span>
        <span class="col-6">${instanceUrl}</span>
        <div class="col-1">${instancePrefix.length ? "<span class='badge badge-primary'>"+instancePrefix+"</span>" : ""}</div>
      </div>
    </li>`
}

const updateSystemStatus = async () => {
  $('#instancesContainer').html('')

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
    })
}

const printDefault = (scannedEntry) => {
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
      <div style="font-size:9px;">Box: ${scannedEntry[boxId]} &nbsp; Cat: ${scannedEntry.category}${scannedEntry.subcat}</div>
      <div>${boxId === 'box3' ? "Flight: 2nd Round" : boxId === 'box4' ? "Flight: BOS" : "FlightID: " + scannedEntry.flight}</div></div>`
    }
  
    const printWindow = window.open('', 'PRINT', 'height=400,width=600')
    printWindow.document.write(`<html><head><title>Print Label</title></head><body style="${printCss}">${printHtml}${printHtml}</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  })
}

const printDymo = (scannedEntry) => {
  boxes.forEach((boxId, idx) => {
    scannedEntry.uuid = JSON.parse(scannedEntry.auditId)[idx]
    const generatedXML = generateLegacyXML(scannedEntry, boxId)

    label = dymo.label.framework.openLabelXml(generatedXML)
    const isValidLabel = label.isValidLabel()

    if (dymoPrinter && isValidLabel) {
      label.print(dymoPrinter)
    }
  })
}

$(document).ready(() => {
  // Check if dymo connect framework is loaded and set flag
  if(dymo.label.framework.init) {
    dymo.label.framework.init()
    const printerEnvironment = dymo.label.framework.checkEnvironment()
    if (printerEnvironment.isFrameworkInstalled && printerEnvironment.isBrowserSupported ) {
      // Make sure printer is connected
      setTimeout(() => {
        const printers = dymo.label.framework.getPrinters()
        if (printers.length) {
          dymoPrinter = printers[0].name
          dymoPrinterParams = dymo.label.framework.createLabelWriterPrintParamsXml({copies:1,printQuality:'Text'});
          dymoConnected = true
          console.log("Connected to Dyno Framework and Label Printer", dymoPrinter)
        }
      }, 100)
    }
  }

  // Update the system status(es) now and then once again every 60 seconds
  updateSystemStatus()
  setInterval(() => {updateSystemStatus()}, 60000)

  const table = $("#entry-table").DataTable({
    columns: Object.keys(MapUploadToKeys).map(key => ({"data": key})),
    rowId: "entryNumber"
  })

  fetch('/allentries', {
    headers: {
      passphrase: localStorage.getItem("passphrase"),
    }
  })
    .then(res => res.json())
    .then(allEntries => {
      if (allEntries.length) {
        table.rows.add(allEntries).draw()
      }
    })

  $("#currentCounterVal").text(entryUuidCounterVal)
  $("#currentSystemId").text(systemId)
  $('#scannerInput').focus()

  $('#scannerInput').keyup(async (evt) => {
    if (evt.which !== 13) return 

    const scannerInput = $('#scannerInput').val().padStart(6, "0")
    $('#scannerInput').val('')

    // Update UUID
    const currentUuidCounter = localStorage.getItem('uuidCounter')
    const uuidMap = [0, 1, 2, 3].map(val => String(localStorage.getItem('systemId')) + (val + parseInt(currentUuidCounter)).toString(16).padStart(3, "0"))
    entryUuidCounterVal = parseInt(entryUuidCounterVal) + 4
    localStorage.setItem('uuidCounter', entryUuidCounterVal)
    $("#currentCounterVal").text(entryUuidCounterVal)

    const checkinEntryData = await fetch('/checkin', {
      method: "POST",
      headers: {
        passphrase: localStorage.getItem("passphrase"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        checkinSystem: localStorage.getItem('systemId'),
        auditId: uuidMap,
        entryNumber: scannerInput
      })
    })
      .then(res => res.json())
      .catch(err => {
        return false
      })

    if (checkinEntryData.error) {
      $('#checkInStatus').attr('hidden', false)
      $('#checkInStatus').removeClass("alert-warning alert-success alert-primary")
      $('#checkInStatus').addClass("alert-danger")
      $('#checkInStatus').text(`Error adding entry ${scannerInput} to BCOEM: ${checkinEntryData.error}`)
      table.cell(`#${scannerInput}`, 9).data("ERROR").draw()
      return
    }

    $('#checkInStatus').attr('hidden', false)
    $('#checkInStatus').removeClass("alert-warning alert-danger alert-primary")
    $('#checkInStatus').addClass("alert-success")
    $('#checkInStatus').text(`Entry ${scannerInput} checked in`)
    table.cell(`#${checkinEntryData.entryNumber}`, 9).data("true").draw()

    if (dymoConnected) {
      printDymo(checkinEntryData)
    } else {
      printDefault(checkinEntryData)
    }

    $('#scannerInput').focus()
  })

  $("#addEntryButton").on("click", ()=> {
    $('#addEntryModal').modal('show')
  })

  $("#deleteEntriesButton").on("click", () => {
    $('#deleteEntriesModal').modal('show')
  })

  $("#confirmDeleteAllEntriesButton").on('click', () => {
    // TODO: Delete all entries API call

    $('#deleteEntriesModal').modal('hide')
  })

  $('#downloadEntryStatusButton').on('click', () => {
    let textOut = ''

    fetch('/allentries', {
      headers: {
        passphrase: localStorage.getItem("passphrase"),
      }
    })
      .then(res => res.json())
      .then(allEntries => {
        allEntries.forEach((entry, idx) => {
          if (idx === 0) {
            // Header row
            textOut += Object.keys(entry).map(val => `"${val}"`).join(",") + "\n"
          }

          textOut += Object.values(entry).map(val => `"${val}"`).join(",") + "\n"
        })
      })

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(textOut));
    element.setAttribute('download', 'Check In Status.csv');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  })

  $('#addManualEntry').on("click", () => {
    const entryNumber = $("#addEntryNumber").val()
    if (!entryNumber) return

    const newEntry = {
      entryNumber,
      judgingNumber: $("#addJudgingNumber").val() || null,
      category: $("#addCategory").val() || null,
      subcat: $("#addSubcat").val() || null,
      flight: $("#addFlightNumber").val() || null,
      box1: $("#addBox1").val() || null,
      box2: $("#addBox2").val() || null,
      box3: $("#addBox3").val() || null,
      box4: $("#addBox4").val() || null,
      checkedIn: ""
    }

    //TODO: API call to manually add entry

    table.row.add(Entries[entryNumber]).draw()

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
})
