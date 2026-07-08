// ============================================================
// SETUP INSTRUCTIONS:
// 1. Open your Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Delete whatever is in there and paste ALL of this code
// 4. Click "Deploy" > "New Deployment"
// 5. Type = "Web app"
// 6. Execute as = "Me"
// 7. Who has access = "Anyone"
// 8. Click Deploy, authorize it
// 9. Copy the URL it gives you
// 10. Paste that URL into dashboard.html where it says PASTE_YOUR_URL_HERE
// Done. That's it.
// ============================================================

function doGet(e) {
  var action = e.parameter.action;

  if (action === 'read') {
    return readTransactions();
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  if (data.action === 'add') {
    return addTransaction(data.transaction);
  }

  if (data.action === 'delete') {
    return deleteTransaction(data.id);
  }

  if (data.action === 'sync') {
    return syncAll(data.transactions);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Transactions');

  if (!sheet) {
    sheet = ss.insertSheet('Transactions');
    sheet.appendRow(['ID', 'Date', 'Type', 'Category', 'Amount', 'Notes']);

    // Format header
    var header = sheet.getRange(1, 1, 1, 6);
    header.setFontWeight('bold');
    header.setBackground('#2563eb');
    header.setFontColor('white');

    // Set column widths
    sheet.setColumnWidth(1, 140);
    sheet.setColumnWidth(2, 110);
    sheet.setColumnWidth(3, 80);
    sheet.setColumnWidth(4, 140);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 250);

    // Create Summary sheet
    var summary = ss.getSheetByName('Summary');
    if (!summary) {
      summary = ss.insertSheet('Summary');
      summary.getRange('A1').setValue('Tech Guardian Financial Summary');
      summary.getRange('A1').setFontSize(16).setFontWeight('bold');

      summary.getRange('A3').setValue('Total Revenue');
      summary.getRange('B3').setFormula('=SUMIFS(Transactions!E:E,Transactions!C:C,"income")');
      summary.getRange('B3').setNumberFormat('$#,##0.00');

      summary.getRange('A4').setValue('Total Expenses');
      summary.getRange('B4').setFormula('=SUMIFS(Transactions!E:E,Transactions!C:C,"expense")');
      summary.getRange('B4').setNumberFormat('$#,##0.00');

      summary.getRange('A5').setValue('Net Profit');
      summary.getRange('B5').setFormula('=B3-B4');
      summary.getRange('B5').setNumberFormat('$#,##0.00').setFontWeight('bold');

      summary.getRange('A6').setValue('Profit Margin');
      summary.getRange('B6').setFormula('=IF(B3>0,B5/B3,0)');
      summary.getRange('B6').setNumberFormat('0.0%');

      summary.getRange('A8').setValue('Total Jobs');
      summary.getRange('B8').setFormula('=COUNTIF(Transactions!C:C,"income")');

      summary.getRange('A9').setValue('Avg Job Revenue');
      summary.getRange('B9').setFormula('=IF(B8>0,B3/B8,0)');
      summary.getRange('B9').setNumberFormat('$#,##0.00');

      summary.getRange('A3:A9').setFontWeight('bold');
      summary.setColumnWidth(1, 200);
      summary.setColumnWidth(2, 150);
    }
  }

  return sheet;
}

function addTransaction(t) {
  var sheet = getOrCreateSheet();
  sheet.appendRow([t.id, t.date, t.type, t.category, t.amount, t.notes || '']);

  // Format the new row
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 5).setNumberFormat('$#,##0.00');

  if (t.type === 'income') {
    sheet.getRange(lastRow, 3).setBackground('#dcfce7').setFontColor('#16a34a');
    sheet.getRange(lastRow, 5).setFontColor('#16a34a');
  } else {
    sheet.getRange(lastRow, 3).setBackground('#fee2e2').setFontColor('#dc2626');
    sheet.getRange(lastRow, 5).setFontColor('#dc2626');
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', action: 'added' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function deleteTransaction(id) {
  var sheet = getOrCreateSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', action: 'deleted' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function readTransactions() {
  var sheet = getOrCreateSheet();
  var data = sheet.getDataRange().getValues();
  var transactions = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      transactions.push({
        id: data[i][0],
        date: data[i][1],
        type: data[i][2],
        category: data[i][3],
        amount: data[i][4],
        notes: data[i][5] || ''
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', transactions: transactions }))
    .setMimeType(ContentService.MimeType.JSON);
}

function syncAll(transactions) {
  var sheet = getOrCreateSheet();

  // Clear existing data (keep header)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  // Write all transactions
  transactions.forEach(function(t) {
    sheet.appendRow([t.id, t.date, t.type, t.category, t.amount, t.notes || '']);
    var row = sheet.getLastRow();
    sheet.getRange(row, 5).setNumberFormat('$#,##0.00');
    if (t.type === 'income') {
      sheet.getRange(row, 3).setBackground('#dcfce7').setFontColor('#16a34a');
      sheet.getRange(row, 5).setFontColor('#16a34a');
    } else {
      sheet.getRange(row, 3).setBackground('#fee2e2').setFontColor('#dc2626');
      sheet.getRange(row, 5).setFontColor('#dc2626');
    }
  });

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', action: 'synced', count: transactions.length }))
    .setMimeType(ContentService.MimeType.JSON);
}
