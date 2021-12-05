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
  boxes.forEach(boxId => {
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

const generateXML = (scannedEntry, boxId) => `<?xml version="1.0" encoding="utf-8"?>
<DesktopLabel Version="1">
  <DYMOLabel Version="3">
    <Description>DYMO Label</Description>
    <Orientation>Landscape</Orientation>
    <LabelName>Small30333</LabelName>
    <InitialLength>0</InitialLength>
    <BorderStyle>SolidLine</BorderStyle>
    <DYMORect>
      <DYMOPoint>
        <X>0.1</X>
        <Y>0.05666666</Y>
      </DYMOPoint>
      <Size>
        <Width>0.84</Width>
        <Height>0.9033334</Height>
      </Size>
    </DYMORect>
    <BorderColor>
      <SolidColorBrush>
        <Color A="1" R="0" G="0" B="0"></Color>
      </SolidColorBrush>
    </BorderColor>
    <BorderThickness>1</BorderThickness>
    <Show_Border>False</Show_Border>
    <DynamicLayoutManager>
      <RotationBehavior>ClearObjects</RotationBehavior>
      <LabelObjects>
        <TextObject>
          <Name>ITextObject0</Name>
          <Brushes>
            <BackgroundBrush>
              <SolidColorBrush>
                <Color A="0" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BackgroundBrush>
            <BorderBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BorderBrush>
            <StrokeBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </StrokeBrush>
            <FillBrush>
              <SolidColorBrush>
                <Color A="0" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </FillBrush>
          </Brushes>
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <BorderStyle>SolidLine</BorderStyle>
          <Margin>
            <DYMOThickness Left="0" Top="0" Right="0" Bottom="0" />
          </Margin>
          <HorizontalAlignment>Left</HorizontalAlignment>
          <VerticalAlignment>Top</VerticalAlignment>
          <FitMode>None</FitMode>
          <IsVertical>False</IsVertical>
          <FormattedText>
            <FitMode>None</FitMode>
            <HorizontalAlignment>Left</HorizontalAlignment>
            <VerticalAlignment>Top</VerticalAlignment>
            <IsVertical>False</IsVertical>
            <LineTextSpan>
              <TextSpan>
                <Text># ${scannedEntry.judgingNumber}</Text>
                <FontInfo>
                  <FontName>Segoe UI</FontName>
                  <FontSize>10</FontSize>
                  <IsBold>True</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush>
                    <SolidColorBrush>
                      <Color A="1" R="0" G="0" B="0"></Color>
                    </SolidColorBrush>
                  </FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
          </FormattedText>
          <ObjectLayout>
            <DYMOPoint>
              <X>0.1</X>
              <Y>0.03</Y>
            </DYMOPoint>
            <Size>
              <Width>0.81</Width>
              <Height>0.2223911</Height>
            </Size>
          </ObjectLayout>
        </TextObject>
        <TextObject>
          <Name>ITextObject1</Name>
          <Brushes>
            <BackgroundBrush>
              <SolidColorBrush>
                <Color A="0" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BackgroundBrush>
            <BorderBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BorderBrush>
            <StrokeBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </StrokeBrush>
            <FillBrush>
              <SolidColorBrush>
                <Color A="0" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </FillBrush>
          </Brushes>
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <BorderStyle>SolidLine</BorderStyle>
          <Margin>
            <DYMOThickness Left="0" Top="0" Right="0" Bottom="0" />
          </Margin>
          <HorizontalAlignment>Left</HorizontalAlignment>
          <VerticalAlignment>Top</VerticalAlignment>
          <FitMode>None</FitMode>
          <IsVertical>False</IsVertical>
          <FormattedText>
            <FitMode>None</FitMode>
            <HorizontalAlignment>Left</HorizontalAlignment>
            <VerticalAlignment>Top</VerticalAlignment>
            <IsVertical>False</IsVertical>
            <LineTextSpan>
              <TextSpan>
                <Text>${scannedEntry[boxId] && boxId !== "records" ? "Box:" : ""}${scannedEntry[boxId] || ""} Cat:${scannedEntry.category}${scannedEntry.subcat}</Text>
                <FontInfo>
                  <FontName>Segoe UI</FontName>
                  <FontSize>8</FontSize>
                  <IsBold>False</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush>
                    <SolidColorBrush>
                      <Color A="1" R="0" G="0" B="0"></Color>
                    </SolidColorBrush>
                  </FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
            <LineTextSpan>
              <TextSpan>
                <Text>${boxId === 'record' ? "FOR RECORDS" : (scannedEntry[boxId] === null || scannedEntry[boxId] === undefined) ? "SPARE ENTRY" : boxId === 'box3' ? "Flight: 2nd Round" : boxId === 'box4' ? "Flight: BOS" : "FlightID: " + scannedEntry.flight}</Text>
                <FontInfo>
                  <FontName>Segoe UI</FontName>
                  <FontSize>8</FontSize>
                  <IsBold>False</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush>
                    <SolidColorBrush>
                      <Color A="1" R="0" G="0" B="0"></Color>
                    </SolidColorBrush>
                  </FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
          </FormattedText>
          <ObjectLayout>
            <DYMOPoint>
              <X>0.1</X>
              <Y>0.1881604</Y>
            </DYMOPoint>
            <Size>
              <Width>0.8250001</Width>
              <Height>0.2990725</Height>
            </Size>
          </ObjectLayout>
        </TextObject>
        <TextObject>
          <Name>ITextObject2</Name>
          <Brushes>
            <BackgroundBrush>
              <SolidColorBrush>
                <Color A="0" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BackgroundBrush>
            <BorderBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BorderBrush>
            <StrokeBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </StrokeBrush>
            <FillBrush>
              <SolidColorBrush>
                <Color A="0" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </FillBrush>
          </Brushes>
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <BorderStyle>SolidLine</BorderStyle>
          <Margin>
            <DYMOThickness Left="0" Top="0" Right="0" Bottom="0" />
          </Margin>
          <HorizontalAlignment>Left</HorizontalAlignment>
          <VerticalAlignment>Top</VerticalAlignment>
          <FitMode>None</FitMode>
          <IsVertical>False</IsVertical>
          <FormattedText>
            <FitMode>None</FitMode>
            <HorizontalAlignment>Left</HorizontalAlignment>
            <VerticalAlignment>Top</VerticalAlignment>
            <IsVertical>False</IsVertical>
            <LineTextSpan>
              <TextSpan>
                <Text># ${scannedEntry.judgingNumber}</Text>
                <FontInfo>
                  <FontName>Segoe UI</FontName>
                  <FontSize>10</FontSize>
                  <IsBold>True</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush>
                    <SolidColorBrush>
                      <Color A="1" R="0" G="0" B="0"></Color>
                    </SolidColorBrush>
                  </FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
          </FormattedText>
          <ObjectLayout>
            <DYMOPoint>
              <X>0.1</X>
              <Y>0.5</Y>
            </DYMOPoint>
            <Size>
              <Width>0.81</Width>
              <Height>0.2223911</Height>
            </Size>
          </ObjectLayout>
        </TextObject>
        <TextObject>
          <Name>ITextObject3</Name>
          <Brushes>
            <BackgroundBrush>
              <SolidColorBrush>
                <Color A="0" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BackgroundBrush>
            <BorderBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BorderBrush>
            <StrokeBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </StrokeBrush>
            <FillBrush>
              <SolidColorBrush>
                <Color A="0" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </FillBrush>
          </Brushes>
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <BorderStyle>SolidLine</BorderStyle>
          <Margin>
            <DYMOThickness Left="0" Top="0" Right="0" Bottom="0" />
          </Margin>
          <HorizontalAlignment>Left</HorizontalAlignment>
          <VerticalAlignment>Top</VerticalAlignment>
          <FitMode>None</FitMode>
          <IsVertical>False</IsVertical>
          <FormattedText>
            <FitMode>None</FitMode>
            <HorizontalAlignment>Left</HorizontalAlignment>
            <VerticalAlignment>Top</VerticalAlignment>
            <IsVertical>False</IsVertical>
            <LineTextSpan>
              <TextSpan>
                <Text>${scannedEntry[boxId] && boxId !== "records" ? "Box:" : ""}${scannedEntry[boxId] || ""} Cat:${scannedEntry.category}${scannedEntry.subcat}</Text>
                <FontInfo>
                  <FontName>Segoe UI</FontName>
                  <FontSize>8</FontSize>
                  <IsBold>False</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush>
                    <SolidColorBrush>
                      <Color A="1" R="0" G="0" B="0"></Color>
                    </SolidColorBrush>
                  </FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
            <LineTextSpan>
              <TextSpan>
                <Text>${boxId === 'record' ? "FOR RECORDS" : (scannedEntry[boxId] === null || scannedEntry[boxId] === undefined) ? "SPARE ENTRY" : boxId === 'box3' ? "Flight: 2nd Round" : boxId === 'box4' ? "Flight: BOS" : "FlightID: " + scannedEntry.flight}</Text>
                <FontInfo>
                  <FontName>Segoe UI</FontName>
                  <FontSize>8</FontSize>
                  <IsBold>False</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush>
                    <SolidColorBrush>
                      <Color A="1" R="0" G="0" B="0"></Color>
                    </SolidColorBrush>
                  </FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
          </FormattedText>
          <ObjectLayout>
            <DYMOPoint>
              <X>0.1</X>
              <Y>0.6609275</Y>
            </DYMOPoint>
            <Size>
              <Width>0.8250001</Width>
              <Height>0.2990725</Height>
            </Size>
          </ObjectLayout>
        </TextObject>
      </LabelObjects>
    </DynamicLayoutManager>
  </DYMOLabel>
  <LabelApplication>Blank</LabelApplication>
  <DataTable>
    <Columns></Columns>
    <Rows></Rows>
  </DataTable>
</DesktopLabel>
`


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
      <Bounds X="144" Y="588" Width="1440" Height="300" />
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
      <Bounds X="144" Y="1120" Width="1440" Height="300" />
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
      <Bounds X="144" Y="1308" Width="1440" Height="120" />
    </ObjectInfo>
  </DieCutLabel>`