const MapUploadToKeys = {
  entryNumber: "Entry Number",
  judgingNumber: "Judging Number",
  category: "Category Sort",
  subcat: "Sub Category",
  flight: "Flight",
  box1:  "Bottle 1 Box",
  box2:  "Bottle 2 Box",
  box3:  "Bottle 3 box",
  box4:  "Bottle 4 box",
  checkedIn: "Checked In"
}
const Entries = {}
const BCOEM = {
  url: '',
  password: ''
}

$(document).ready(() => {
  const table = $("#entry-table").DataTable({
    columns: Object.keys(MapUploadToKeys).map(key => ({data: key}))
  })

  $('#scannerInput').keyup((evt) => {
    if (evt.which !== 13) return 

    const scannerInput = $('#scannerInput').val()
    const scannedEntry = Entries[scannerInput]
    $('#scannerInput').val('')

    if (!scannedEntry) {
      console.error("Entry does not exist!")
      return
    }

    const printHtml = `<div><div style="font-weight:bolder;"># ${scannedEntry.judgingNumber}</div><div>Cat: ${scannedEntry.category}${scannedEntry.subcat} &nbsp; Box: ${scannedEntry.box1}</div><div>Flight: ${scannedEntry.flight}</div></div>`
    const printCss="margin:0px;width:1in; height:1in; transform:rotate(90deg);display:flex;flex-direction:column;justify-content:space-around;align-items:center;font-size:9.5px;font-family:sans-serif;"

    const printWindow = window.open('', 'PRINT', 'height=400,width=600')
    printWindow.document.write(`<html><head><title>Print Label</title></head><body style="${printCss}">${printHtml}${printHtml}</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()

    console.log(scannedEntry)
  })

  $('#entryFileUpload').on('change', handleFile)

  $("#importEntriesButton").on('click', () => {
    $("#uploadFileModal").modal("show")
  })

  $("#addEntryButton").on("click", ()=> {
    $('#addEntryModal').modal('show')
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

  function handleFile(e) {
    const files = e.target.files, f = files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const headers = []
      const rows = []

      const regex = new RegExp(/[//!]/g)

      Object.entries(workbook.Sheets.Sheet1)
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

        Entries[entryNumber] = {
          entryNumber,
          judgingNumber: row[headers.indexOf(MapUploadToKeys.judgingNumber)] || null,
          category: row[headers.indexOf(MapUploadToKeys.category)] || null,
          subcat: row[headers.indexOf(MapUploadToKeys.subcat)] || null,
          flight: row[headers.indexOf(MapUploadToKeys.flight)] || null,
          box1: box1 !== "N/R" ? box1 : null,
          box2: box2 !== "N/R" ? box2 : null,
          box3: box3 !== "N/R" ? box3 : null,
          box4: box4 !== "N/R" ? box4 : null,
          checkedIn: ""
        }
      })

      table.rows.add(Object.values(Entries)).draw()
      $("#uploadFileModal").modal("hide")
    };
    reader.readAsArrayBuffer(f);
  }
})