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
const Entries = JSON.parse(localStorage.getItem('Entries')) || {}
let entryUuidCounterVal = parseInt(localStorage.getItem('uuidCounter')) || 0
let systemId = localStorage.getItem('systemId') || "1"
let bcoemConnected = false;
let bcoemWindow = null;
let dymoConnected = false;
let dymoPrinter = null;
let dymoPrinterParams = null;

window.onbeforeunload = function(){
  if (!bcoemWindow) return
  bcoemWindow.close()
}

const connectToBcoem = (url, password) => {
  bcoemWindow = window.open("", "BCOEM",'height=400,width=600');
  const iframe = bcoemWindow.document
  const loginForm = document.createElement('FORM')
  iframe.body.appendChild(loginForm)
  const passwordField = document.createElement("INPUT")
  passwordField.setAttribute('type', 'text')
  passwordField.setAttribute('value', password)
  passwordField.setAttribute('name', 'inputPassword')
  loginForm.appendChild(passwordField)

  loginForm.action = `${url.replace(/\/+$/, "")}/qr.php?action=password-check`
  loginForm.method = "post"
  loginForm.submit()

  return Promise.resolve("Connected")
}

const checkInEntry = (url, entryNumber) => {
  if (!bcoemWindow) return

  bcoemWindow.location.href = `${url.replace(/\/+$/, "")}/qr.php?action=update&id=${Number(entryNumber)}`

  return Promise.resolve(entryNumber)
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
  let audit = [systemId]
  
  boxes.forEach(boxId => {
    scannedEntry.uuid = `${systemId}${entryUuidCounterVal.toString(16)}`
    audit.push(entryUuidCounterVal.toString(16))
    entryUuidCounterVal = parseInt(entryUuidCounterVal) + 1
    localStorage.setItem('uuidCounter', entryUuidCounterVal)
    $("#currentCounterVal").text(entryUuidCounterVal)

    const generatedXML = generateLegacyXML(scannedEntry, boxId)

    label = dymo.label.framework.openLabelXml(generatedXML)
    const isValidLabel = label.isValidLabel()

    if (dymoPrinter && isValidLabel) {
      label.print(dymoPrinter)
    }
  })

  Entries[scannedEntry.entryNumber].audit = audit.join("-")
  localStorage.setItem('Entries', JSON.stringify(Entries))
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

  $("#currentCounterVal").text(entryUuidCounterVal)
  $("#currentSystemId").text(systemId)
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

    const scannerInput = $('#scannerInput').val().padStart(6, "0")
    const scannedEntry = Entries[scannerInput]
    $('#scannerInput').val('')

    if (!scannedEntry) {
      console.error("Entry does not exist!")
      return
    }

    Entries[scannedEntry.entryNumber].checkedIn = "Local"
    table.cell(`#${scannedEntry.entryNumber}`, 9).data(Entries[scannedEntry.entryNumber].checkedIn).draw()
    localStorage.setItem('Entries', JSON.stringify(Entries))

    if (bcoemConnected) {
      const url = $('#competitionUrl').val()

      checkInEntry(url, scannedEntry.entryNumber)
      .then(entryNumber => {
        $('#checkInStatus').attr('hidden', false)
        $('#checkInStatus').removeClass("alert-warning alert-danger alert-primary")
        $('#checkInStatus').addClass("alert-success")
        $('#checkInStatus').text(`Entry ${entryNumber} checked in`)

        Entries[entryNumber].checkedIn = "BCOEM"
        table.cell(`#${scannedEntry.entryNumber}`, 9).data(Entries[scannedEntry.entryNumber].checkedIn).draw()
        localStorage.setItem('Entries', JSON.stringify(Entries))
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

    if (dymoConnected) {
      printDymo(scannedEntry)
    } else {
      printDefault(scannedEntry)
    }

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
      textOut += `"${value.entryNumber}","${value.checkedIn}","${value.audit}"\n`
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
      bcoemWindow.close()
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

  $('#addManualEntry').on("click", () => {
    const entryNumber = $("#addEntryNumber").val()
    if (!entryNumber) return

    Entries[entryNumber] = {
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
        const flightId = row[headers.indexOf(MapUploadToKeys.flight)]

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

const generateLegacyXML = (scannedEntry, boxId) => `<?xml version="1.0" encoding="utf-8"?>
  <DieCutLabel Version="8.0" Units="twips">
    <PaperOrientation>Landscape</PaperOrientation>
    <Id>Address</Id>
    <PaperName>30252 Address</PaperName>\
    <DrawCommands>
        <RoundRectangle X="0" Y="0" Width="1440" Height="1440" Rx="270" Ry="270" />
    </DrawCommands>

    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String># ${scannedEntry.judgingNumber}</String>
            <Attributes>
              <Font Family="Arial" Size="10" Bold="True" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="144" Y="120" Width="1440" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation90</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String>${scannedEntry.uuid}</String>
            <Attributes>
              <Font Family="Arial" Size="5" Bold="True" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="1500" Y="120" Width="300" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String>${scannedEntry[boxId] && boxId !== "records" ? "Box:" : ""}${scannedEntry[boxId] || ""} Cat:${scannedEntry.category}${scannedEntry.subcat}</String>
            <Attributes>
              <Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="144" Y="400" Width="1440" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String>${boxId === 'record' ? "FOR RECORDS" : (scannedEntry[boxId] === null || scannedEntry[boxId] === undefined) ? "SPARE ENTRY" : boxId === 'box3' ? "Flight: 2nd Round" : boxId === 'box4' ? "Flight: BOS" : "FlightID: " + scannedEntry.flight}</String>
            <Attributes>
              <Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="144" Y="578" Width="1440" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String># ${scannedEntry.judgingNumber}</String>
            <Attributes>
              <Font Family="Arial" Size="10" Bold="True" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="144" Y="840" Width="1440" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation90</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String>${scannedEntry.uuid}</String>
            <Attributes>
              <Font Family="Arial" Size="5" Bold="True" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="1500" Y="840" Width="300" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String>${scannedEntry[boxId] && boxId !== "records" ? "Box:" : ""}${scannedEntry[boxId] || ""} Cat:${scannedEntry.category}${scannedEntry.subcat}</String>
            <Attributes>
              <Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="144" Y="1025" Width="1440" Height="125" />
    </ObjectInfo>

    <ObjectInfo>
      <BarcodeObject>
          <Name>Barcode</Name>
          <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
          <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
          <Rotation>Rotation0</Rotation>
          <IsMirrored>False</IsMirrored>
          <IsVariable>True</IsVariable>
          <Text>${scannedEntry.uuid}</Text>
          <Type>Code128Auto</Type>
          <Size>Small</Size>
          <TextPosition>None</TextPosition>
          <TextFont Family="Arial" Size="8" Bold="False" Italic="False"
                          Underline="False" Strikeout="False" />
          <CheckSumFont Family="Arial" Size="8" Bold="False" Italic="False"
                              Underline="False" Strikeout="False" />
          <TextEmbedding>None</TextEmbedding>
          <ECLevel>0</ECLevel>
          <HorizontalAlignment>Center</HorizontalAlignment>
          <QuietZonesPadding Left="0" Top="0" Right="0" Bottom="0" />
      </BarcodeObject>
      <Bounds X="0" Y="1200" Width="1200" Height="250" />
    </ObjectInfo>
  </DieCutLabel>`