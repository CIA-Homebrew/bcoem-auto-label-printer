let currentBoxEntries
let dymoConnected = false;
let dymoPrinter = null;
let dymoPrinterParams = null;
const allBoxes = ['box1', 'box2', 'box3', 'box4']

const generateTable = (allEntries) => {
  return `<ul class="list-group list-group-flush">
    <li class="list-group-item list-group-item-dark">
      <div class="row">
        <div class="col-md-2 text-center">Entry Number</div>
        <div class="col-md-2 text-center">Audit ID</div>
        <div class="col-md-2 text-center">Category</div>
        <div class="col-md-2 text-center">Flight</div>
        <div class="col-md-2 text-center">Checked In</div>
        <div class="col-md-2 text-center">Re-print Label</div>
      </div>
    </li>
    ${allEntries.map(generateEntryRow).join("")}
  </ul>`
}

const generateEntryRow = (entry) => {
  const currentBoxNumber = $('#boxIdInput').val()
  const boxId = allBoxes.filter(box => entry[box] === currentBoxNumber)[0]
  const currentAuditId = entry.checkedIn ? entry.auditId[allBoxes.indexOf(boxId)] : ""

  return `<li class="list-group-item box-audit-list" entrynumber="${entry.entryNumber}">
    <div class="row">
      <div class="col-md-2 text-center">${entry.entryNumber}</div>
      <div class="col-md-2 text-center audit-id" entrynumber="${entry.entryNumber}">${currentAuditId}</div>
      <div class="col-md-2 text-center">${entry.category}${entry.subcat}</div>
      <div class="col-md-2 text-center">${entry.flight}</div>
      <div class="col-md-2 text-center">${entry.checkedIn ? "✅" : ""}</div>
      <div class="col-md-2 text-center" ${entry.checkedIn ? "" : "style=display:none;"}>
        <span 
          class="reprint-button badge badge-info" 
          style="cursor:pointer;" 
          entrynumber="${entry.entryNumber}"
          auditnumber="${currentAuditId}"
          boxid="${boxId}"
        >
          🖶
        </span>
      </div>
    </div>
  </li>`
}


const bindPrintButton = () => {
  $('.reprint-button').click(function(evt) {
    evt.stopPropagation();
    evt.stopImmediatePropagation();
    const entryNumber = $(this).attr("entrynumber")
    const entry = currentBoxEntries.filter(entry => entry.entryNumber === entryNumber)

    if (!entry.length) return

    const auditNumber = $(this).attr("auditnumber")
    const boxId = $(this).attr("boxid")

    handleReprintLabel(entry[0], boxId, auditNumber)
  })
}

const handleReprintLabel = async (entry, boxId, auditId) => {
  const currentUuidCounter = localStorage.getItem('uuidCounter')
  localStorage.setItem('uuidCounter', parseInt(currentUuidCounter)+1)

  const originalAuditId = auditId
  const updatedAuditId = `${localStorage.getItem('systemId')}${parseInt(currentUuidCounter).toString(16).padStart(3, "0")}`

  const updatedEntry = fetch("/updateuuid", {
    method: "POST",
    headers: {
      passphrase: localStorage.getItem("passphrase"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      entryNumber: entry.entryNumber,
      originalAuditId,
      updatedAuditId
    })
  })
  .then(res => res.json())
  .catch(err => {
    return
  })

  if (updatedEntry.error) {
    console.log(updatedEntry.error)
    return
  }

  updatedEntry.uuid = updatedAuditId
  $(`.audit-id[entrynumber='${entry.entryNumber}']`).text(updatedAuditId)

  const generatedXML = generateLegacyXML(updatedEntry, boxId)
  label = dymo.label.framework.openLabelXml(generatedXML)
  const isValidLabel = label.isValidLabel()

  if (dymoPrinter && isValidLabel) {
    label.print(dymoPrinter)
  }
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
  
  // Handle box input
  $('#boxIdInput').keyup(async (evt) => {
    if (evt.which !== 13) return 

    const boxId = $('#boxIdInput').val()

    currentBoxEntries = await fetch("/box", {
      method: "POST",
      headers: {
        passphrase: localStorage.getItem("passphrase"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        boxId: String(boxId)
      })
    })
    .then(res => res.json())
    .then(allEntries => {
      if (allEntries.error) {
        return
      }

      $("#boxInfo").html(
        generateTable(allEntries)
      )

      bindPrintButton()

      $('#barcodeScanContainer').show()
      $('#boxIdInput').prop('disabled', true)
      $('#entryScanInput').focus()

      return allEntries
    })
  })

  //Handle entry input
  $('#entryScanInput').keyup(evt => {
    if (evt.which !== 13) return 

    $('#auditScanInput').focus()
  })

  //Handle audit input
  $('#auditScanInput').keyup(evt => {
    if (evt.which !== 13) return 
    const entryNumber = $('#entryScanInput').val().padStart(6,"0")
    const scannedAuditNumber = $('#auditScanInput').val()
    const recordAuditNumber = $(`.audit-id[entrynumber='${entryNumber}']`).text()

    if (scannedAuditNumber == recordAuditNumber) {
      $(`.box-audit-list[entrynumber='${entryNumber}']`).addClass('list-group-item-success')
    } else {
      $(`.box-audit-list[entrynumber='${entryNumber}']`).addClass('list-group-item-danger')
    }

    $('#entryScanInput').val('')
    $('#auditScanInput').val('')
    $('#entryScanInput').focus()
  })

  $('#unlockBoxButton').click(() => {
    $('#barcodeScanContainer').hide()
    $('#entryScanInput').val('')
    $('#auditScanInput').val('')
    $('#boxIdInput').val('')
    $("#boxInfo").html('')
    $('#boxIdInput').prop('disabled', false)
    $('#boxIdInput').focus()
  })
})