// ============================================================
// TECH GUARDIAN - REPAIR BUSINESS BUDGET & CASH FLOW SYSTEM
// Google Apps Script - Full Workbook Builder
// ============================================================
// HOW TO USE:
// 1. Open a new Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Paste this entire file into Code.gs
// 4. Run buildWorkbook() to generate all sheets
// 5. Authorize when prompted
// ============================================================

// ---- MAIN BUILDER ----

function buildWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename("Tech Guardian - Budget Command Center");

  // Delete default Sheet1 if it exists (after creating others)
  var sheetOrder = [
    "Dashboard",
    "Repair Jobs",
    "Allocations",
    "Parts Expenses",
    "Fixed Expenses",
    "Debt Tracker",
    "Marketing Tracker",
    "Settings"
  ];

  // Create all sheets
  buildSettingsSheet(ss);
  buildRepairJobsSheet(ss);
  buildAllocationsSheet(ss);
  buildPartsExpensesSheet(ss);
  buildFixedExpensesSheet(ss);
  buildDebtTrackerSheet(ss);
  buildMarketingTrackerSheet(ss);
  buildDashboardSheet(ss);

  // Delete default sheet if present
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  // Reorder sheets
  for (var i = 0; i < sheetOrder.length; i++) {
    var sheet = ss.getSheetByName(sheetOrder[i]);
    if (sheet) {
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(i + 1);
    }
  }

  // Set Dashboard as active
  ss.setActiveSheet(ss.getSheetByName("Dashboard"));

  // Create named ranges
  createNamedRanges(ss);

  SpreadsheetApp.flush();
  Browser.msgBox("Tech Guardian Budget System built successfully! Start entering repair jobs.");
}

// ---- SETTINGS SHEET ----

function buildSettingsSheet(ss) {
  var sheet = getOrCreateSheet(ss, "Settings");
  sheet.clear();
  sheet.setTabColor("#4A86C8");

  // Title
  sheet.getRange("A1").setValue("TECH GUARDIAN - SETTINGS").setFontSize(14).setFontWeight("bold").setFontColor("#FFFFFF");
  sheet.getRange("A1:D1").mergeAcross().setBackground("#1B3A5C");

  // Allocation Percentages
  sheet.getRange("A3").setValue("ALLOCATION PERCENTAGES").setFontWeight("bold").setFontSize(11).setBackground("#E8EEF4");
  sheet.getRange("A3:D3").mergeAcross().setBackground("#E8EEF4");

  var allocLabels = ["Parts / Operating Budget", "Debt Payoff", "Personal Spending", "Savings"];
  var allocValues = [0.40, 0.25, 0.20, 0.15];
  for (var i = 0; i < allocLabels.length; i++) {
    sheet.getRange("A" + (4 + i)).setValue(allocLabels[i]);
    sheet.getRange("B" + (4 + i)).setValue(allocValues[i]).setNumberFormat("0%");
  }
  sheet.getRange("A8").setValue("Total").setFontWeight("bold");
  sheet.getRange("B8").setFormula("=SUM(B4:B7)").setNumberFormat("0%").setFontWeight("bold");

  // Allocation check
  sheet.getRange("C8").setFormula('=IF(B8=1,"OK","ERROR: Must equal 100%")');

  // Marketing Settings
  sheet.getRange("A10").setValue("MARKETING SETTINGS").setFontWeight("bold").setFontSize(11).setBackground("#E8EEF4");
  sheet.getRange("A10:D10").mergeAcross().setBackground("#E8EEF4");

  sheet.getRange("A11").setValue("Marketing Retainer (Monthly)");
  sheet.getRange("B11").setValue(300).setNumberFormat("$#,##0.00");
  sheet.getRange("A12").setValue("Commission Per Referred Lead");
  sheet.getRange("B12").setValue(25).setNumberFormat("$#,##0.00");
  sheet.getRange("A13").setValue("Marketing Guy Name");
  sheet.getRange("B13").setValue("Marketing Partner");

  // Dropdown Values
  sheet.getRange("A15").setValue("DROPDOWN VALUES").setFontWeight("bold").setFontSize(11).setBackground("#E8EEF4");
  sheet.getRange("A15:D15").mergeAcross().setBackground("#E8EEF4");

  // Device Types
  sheet.getRange("A16").setValue("Device Types").setFontWeight("bold");
  var devices = ["iPhone", "iPad", "Samsung Galaxy", "Google Pixel", "MacBook", "Laptop (Other)", "Desktop", "Game Console", "Tablet (Other)", "Other"];
  for (var i = 0; i < devices.length; i++) {
    sheet.getRange("A" + (17 + i)).setValue(devices[i]);
  }

  // Lead Sources
  sheet.getRange("B16").setValue("Lead Sources").setFontWeight("bold");
  var leads = ["Google Search", "Google Maps", "Facebook", "Instagram", "Referral - Marketing Guy", "Referral - Customer", "Walk-In", "Repeat Customer", "Craigslist", "Nextdoor", "Yelp", "Other"];
  for (var i = 0; i < leads.length; i++) {
    sheet.getRange("B" + (17 + i)).setValue(leads[i]);
  }

  // Payment Status
  sheet.getRange("C16").setValue("Payment Status").setFontWeight("bold");
  var statuses = ["Paid", "Unpaid", "Partial", "Warranty", "Refunded"];
  for (var i = 0; i < statuses.length; i++) {
    sheet.getRange("C" + (17 + i)).setValue(statuses[i]);
  }

  // Repair Types
  sheet.getRange("D16").setValue("Repair Types").setFontWeight("bold");
  var repairs = ["Screen Repair", "Battery Replacement", "Charging Port", "Water Damage", "Back Glass", "Camera Repair", "Speaker/Mic", "Software Issue", "Data Recovery", "Diagnostic", "Full Refurb", "Other"];
  for (var i = 0; i < repairs.length; i++) {
    sheet.getRange("D" + (17 + i)).setValue(repairs[i]);
  }

  // Expense Categories
  sheet.getRange("A30").setValue("Expense Categories").setFontWeight("bold");
  var expCats = ["Marketing", "Utilities", "Rent", "Software", "Tools", "Insurance", "Supplies", "Vehicle", "Other"];
  for (var i = 0; i < expCats.length; i++) {
    sheet.getRange("A" + (31 + i)).setValue(expCats[i]);
  }

  // Debt Status Values
  sheet.getRange("B30").setValue("Debt Status").setFontWeight("bold");
  var debtStatuses = ["Active", "Paid Off", "Overdue", "On Hold"];
  for (var i = 0; i < debtStatuses.length; i++) {
    sheet.getRange("B" + (31 + i)).setValue(debtStatuses[i]);
  }

  // Frequency Values
  sheet.getRange("C30").setValue("Frequency").setFontWeight("bold");
  var freqs = ["Weekly", "Bi-Weekly", "Monthly", "Quarterly", "Annual", "One-Time"];
  for (var i = 0; i < freqs.length; i++) {
    sheet.getRange("C" + (31 + i)).setValue(freqs[i]);
  }

  // Business Info
  sheet.getRange("A40").setValue("BUSINESS INFO").setFontWeight("bold").setFontSize(11).setBackground("#E8EEF4");
  sheet.getRange("A40:D40").mergeAcross().setBackground("#E8EEF4");
  sheet.getRange("A41").setValue("Business Name");
  sheet.getRange("B41").setValue("Tech Guardian");
  sheet.getRange("A42").setValue("Owner");
  sheet.getRange("B42").setValue("");
  sheet.getRange("A43").setValue("Start Date");
  sheet.getRange("B43").setValue(new Date()).setNumberFormat("MM/dd/yyyy");

  // Column widths
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 180);

  // Freeze header
  sheet.setFrozenRows(1);
}

// ---- REPAIR JOBS SHEET ----

function buildRepairJobsSheet(ss) {
  var sheet = getOrCreateSheet(ss, "Repair Jobs");
  sheet.clear();
  sheet.setTabColor("#34A853");

  var headers = [
    "Job ID",           // A
    "Date",             // B
    "Customer",         // C
    "Device Type",      // D
    "Repair Type",      // E
    "Lead Source",       // F
    "Referred?",        // G - Yes/No
    "Revenue",          // H
    "Parts Cost",       // I
    "Commission",       // J - auto
    "Gross Profit",     // K - auto
    "Alloc: Parts/Ops", // L - auto
    "Alloc: Debt",      // M - auto
    "Alloc: Personal",  // N - auto
    "Alloc: Savings",   // O - auto
    "Payment Status",   // P
    "Week #",           // Q - auto
    "Month",            // R - auto
    "Notes"             // S
  ];

  // Header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold").setBackground("#1B3A5C").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  sheet.setFrozenRows(1);

  // Set column widths for mobile friendliness
  var widths = [70, 100, 140, 120, 130, 140, 80, 90, 90, 90, 100, 100, 90, 90, 90, 100, 60, 80, 200];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  // Add formulas for rows 2-500
  for (var row = 2; row <= 500; row++) {
    // Job ID: TG-0001 format
    sheet.getRange("A" + row).setFormula('=IF(B' + row + '="","",TEXT(ROW()-1,"TG-\\"0000\\""))');

    // Commission: $25 if Referred = Yes
    sheet.getRange("J" + row).setFormula('=IF(G' + row + '="Yes",Settings!B12,0)');

    // Gross Profit: Revenue - Parts Cost - Commission
    sheet.getRange("K" + row).setFormula('=IF(H' + row + '="","",H' + row + '-I' + row + '-J' + row + ')');

    // Allocation: Parts/Ops (% of Revenue)
    sheet.getRange("L" + row).setFormula('=IF(H' + row + '="","",H' + row + '*Settings!B4)');

    // Allocation: Debt (% of Revenue)
    sheet.getRange("M" + row).setFormula('=IF(H' + row + '="","",H' + row + '*Settings!B5)');

    // Allocation: Personal (% of Revenue)
    sheet.getRange("N" + row).setFormula('=IF(H' + row + '="","",H' + row + '*Settings!B6)');

    // Allocation: Savings (% of Revenue)
    sheet.getRange("O" + row).setFormula('=IF(H' + row + '="","",H' + row + '*Settings!B7)');

    // Week number
    sheet.getRange("Q" + row).setFormula('=IF(B' + row + '="","",WEEKNUM(B' + row + '))');

    // Month
    sheet.getRange("R" + row).setFormula('=IF(B' + row + '="","",TEXT(B' + row + ',"MMM YYYY"))');
  }

  // Number formats
  sheet.getRange("B2:B500").setNumberFormat("MM/dd/yyyy");
  sheet.getRange("H2:O500").setNumberFormat("$#,##0.00");

  // Data validation - Device Type dropdown
  var deviceRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName("Settings").getRange("A17:A26"), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("D2:D500").setDataValidation(deviceRule);

  // Repair Type dropdown
  var repairRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName("Settings").getRange("D17:D28"), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("E2:E500").setDataValidation(repairRule);

  // Lead Source dropdown
  var leadRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName("Settings").getRange("B17:B28"), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("F2:F500").setDataValidation(leadRule);

  // Referred Yes/No dropdown
  var referredRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Yes", "No"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("G2:G500").setDataValidation(referredRule);

  // Payment Status dropdown
  var paymentRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName("Settings").getRange("C17:C21"), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("P2:P500").setDataValidation(paymentRule);

  // Conditional Formatting
  // High profit jobs (> $100 profit) - green
  var highProfitRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(100)
    .setBackground("#D9EAD3")
    .setRanges([sheet.getRange("K2:K500")])
    .build();

  // Low profit jobs (< $25 profit) - red
  var lowProfitRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(25)
    .setBackground("#F4C7C3")
    .setRanges([sheet.getRange("K2:K500")])
    .build();

  // Unpaid status - orange
  var unpaidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Unpaid")
    .setBackground("#FCE8B2")
    .setRanges([sheet.getRange("P2:P500")])
    .build();

  // Paid status - green
  var paidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Paid")
    .setBackground("#D9EAD3")
    .setRanges([sheet.getRange("P2:P500")])
    .build();

  sheet.setConditionalFormatRules([highProfitRule, lowProfitRule, unpaidRule, paidRule]);

  // Add sample row
  sheet.getRange("B2").setValue(new Date());
  sheet.getRange("C2").setValue("Sample Customer");
  sheet.getRange("D2").setValue("iPhone");
  sheet.getRange("E2").setValue("Screen Repair");
  sheet.getRange("F2").setValue("Google Search");
  sheet.getRange("G2").setValue("No");
  sheet.getRange("H2").setValue(120);
  sheet.getRange("I2").setValue(35);
  sheet.getRange("P2").setValue("Paid");
  sheet.getRange("S2").setValue("Sample job - delete when ready");
}

// ---- ALLOCATIONS SHEET ----

function buildAllocationsSheet(ss) {
  var sheet = getOrCreateSheet(ss, "Allocations");
  sheet.clear();
  sheet.setTabColor("#FBBC04");

  // Title
  sheet.getRange("A1").setValue("ALLOCATION SUMMARY").setFontSize(14).setFontWeight("bold").setFontColor("#FFFFFF");
  sheet.getRange("A1:E1").mergeAcross().setBackground("#1B3A5C");

  // Current allocation rates
  sheet.getRange("A3").setValue("CURRENT ALLOCATION RATES").setFontWeight("bold").setBackground("#E8EEF4");
  sheet.getRange("A3:E3").mergeAcross().setBackground("#E8EEF4");

  sheet.getRange("A4").setValue("Category");
  sheet.getRange("B4").setValue("Rate");
  sheet.getRange("C4").setValue("Total Allocated");
  sheet.getRange("D4").setValue("Total Spent");
  sheet.getRange("E4").setValue("Remaining");
  sheet.getRange("A4:E4").setFontWeight("bold").setBackground("#D9E2EC");

  // Parts/Ops
  sheet.getRange("A5").setValue("Parts / Operating");
  sheet.getRange("B5").setFormula("=Settings!B4").setNumberFormat("0%");
  sheet.getRange("C5").setFormula('=SUMPRODUCT((\'Repair Jobs\'!H2:H500<>"")*\'Repair Jobs\'!L2:L500)').setNumberFormat("$#,##0.00");
  sheet.getRange("D5").setFormula('=SUMPRODUCT((\'Parts Expenses\'!F2:F500<>"")*\'Parts Expenses\'!F2:F500)').setNumberFormat("$#,##0.00");
  sheet.getRange("E5").setFormula("=C5-D5").setNumberFormat("$#,##0.00");

  // Debt
  sheet.getRange("A6").setValue("Debt Payoff");
  sheet.getRange("B6").setFormula("=Settings!B5").setNumberFormat("0%");
  sheet.getRange("C6").setFormula('=SUMPRODUCT((\'Repair Jobs\'!H2:H500<>"")*\'Repair Jobs\'!M2:M500)').setNumberFormat("$#,##0.00");
  sheet.getRange("D6").setFormula('=SUMPRODUCT((\'Debt Tracker\'!F2:F100<>"")*\'Debt Tracker\'!F2:F100)').setNumberFormat("$#,##0.00");
  sheet.getRange("E6").setFormula("=C6-D6").setNumberFormat("$#,##0.00");

  // Personal
  sheet.getRange("A7").setValue("Personal Spending");
  sheet.getRange("B7").setFormula("=Settings!B6").setNumberFormat("0%");
  sheet.getRange("C7").setFormula('=SUMPRODUCT((\'Repair Jobs\'!H2:H500<>"")*\'Repair Jobs\'!N2:N500)').setNumberFormat("$#,##0.00");
  sheet.getRange("D7").setValue(0).setNumberFormat("$#,##0.00"); // Manual tracking
  sheet.getRange("E7").setFormula("=C7-D7").setNumberFormat("$#,##0.00");

  // Savings
  sheet.getRange("A8").setValue("Savings");
  sheet.getRange("B8").setFormula("=Settings!B7").setNumberFormat("0%");
  sheet.getRange("C8").setFormula('=SUMPRODUCT((\'Repair Jobs\'!H2:H500<>"")*\'Repair Jobs\'!O2:O500)').setNumberFormat("$#,##0.00");
  sheet.getRange("D8").setValue(0).setNumberFormat("$#,##0.00"); // Manual tracking
  sheet.getRange("E8").setFormula("=C8-D8").setNumberFormat("$#,##0.00");

  // Totals
  sheet.getRange("A9").setValue("TOTALS").setFontWeight("bold");
  sheet.getRange("B9").setFormula("=SUM(B5:B8)").setNumberFormat("0%").setFontWeight("bold");
  sheet.getRange("C9").setFormula("=SUM(C5:C8)").setNumberFormat("$#,##0.00").setFontWeight("bold");
  sheet.getRange("D9").setFormula("=SUM(D5:D8)").setNumberFormat("$#,##0.00").setFontWeight("bold");
  sheet.getRange("E9").setFormula("=SUM(E5:E8)").setNumberFormat("$#,##0.00").setFontWeight("bold");

  // Monthly Allocation Breakdown
  sheet.getRange("A11").setValue("MONTHLY ALLOCATION BREAKDOWN").setFontWeight("bold").setBackground("#E8EEF4");
  sheet.getRange("A11:F11").mergeAcross().setBackground("#E8EEF4");

  sheet.getRange("A12").setValue("Month");
  sheet.getRange("B12").setValue("Total Revenue");
  sheet.getRange("C12").setValue("Parts/Ops Alloc");
  sheet.getRange("D12").setValue("Debt Alloc");
  sheet.getRange("E12").setValue("Personal Alloc");
  sheet.getRange("F12").setValue("Savings Alloc");
  sheet.getRange("A12:F12").setFontWeight("bold").setBackground("#D9E2EC");

  // Monthly rows - use SUMPRODUCT to aggregate by month
  for (var row = 13; row <= 24; row++) {
    var monthNum = row - 12;
    var year = new Date().getFullYear();
    sheet.getRange("A" + row).setValue(new Date(year, monthNum - 1, 1)).setNumberFormat("MMM YYYY");
    sheet.getRange("B" + row).setFormula('=SUMPRODUCT((MONTH(\'Repair Jobs\'!B2:B500)=' + monthNum + ')*(YEAR(\'Repair Jobs\'!B2:B500)=' + year + ')*(\'Repair Jobs\'!H2:H500))').setNumberFormat("$#,##0.00");
    sheet.getRange("C" + row).setFormula('=B' + row + '*Settings!B4').setNumberFormat("$#,##0.00");
    sheet.getRange("D" + row).setFormula('=B' + row + '*Settings!B5').setNumberFormat("$#,##0.00");
    sheet.getRange("E" + row).setFormula('=B' + row + '*Settings!B6').setNumberFormat("$#,##0.00");
    sheet.getRange("F" + row).setFormula('=B' + row + '*Settings!B7').setNumberFormat("$#,##0.00");
  }

  // How much can I safely spend?
  sheet.getRange("A26").setValue("SAFE SPENDING CHECK").setFontWeight("bold").setFontSize(11).setBackground("#E8EEF4");
  sheet.getRange("A26:E26").mergeAcross().setBackground("#E8EEF4");

  sheet.getRange("A27").setValue("Total Revenue (All Time)");
  sheet.getRange("B27").setFormula('=SUMPRODUCT((\'Repair Jobs\'!H2:H500<>"")*\'Repair Jobs\'!H2:H500)').setNumberFormat("$#,##0.00");

  sheet.getRange("A28").setValue("Total Parts Costs");
  sheet.getRange("B28").setFormula('=SUMPRODUCT((\'Repair Jobs\'!I2:I500<>"")*\'Repair Jobs\'!I2:I500)').setNumberFormat("$#,##0.00");

  sheet.getRange("A29").setValue("Total Commissions");
  sheet.getRange("B29").setFormula('=SUMPRODUCT((\'Repair Jobs\'!J2:J500<>"")*\'Repair Jobs\'!J2:J500)').setNumberFormat("$#,##0.00");

  sheet.getRange("A30").setValue("Total Fixed Expenses Paid");
  sheet.getRange("B30").setFormula('=SUMPRODUCT((\'Fixed Expenses\'!C2:C100<>"")*\'Fixed Expenses\'!C2:C100*(\'Fixed Expenses\'!F2:F100="Paid"))').setNumberFormat("$#,##0.00");

  sheet.getRange("A31").setValue("Total Debt Payments Made");
  sheet.getRange("B31").setFormula("=D6").setNumberFormat("$#,##0.00");

  sheet.getRange("A32").setValue("Cash Available to Spend").setFontWeight("bold").setFontSize(12);
  sheet.getRange("B32").setFormula("=B27-B28-B29-B30-B31").setNumberFormat("$#,##0.00").setFontWeight("bold").setFontSize(12);

  // Conditional formatting on remaining
  var negativeRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0)
    .setBackground("#F4C7C3")
    .setFontColor("#CC0000")
    .setRanges([sheet.getRange("E5:E8"), sheet.getRange("B32")])
    .build();
  sheet.setConditionalFormatRules([negativeRule]);

  // Column widths
  sheet.setColumnWidth(1, 220);
  for (var c = 2; c <= 6; c++) sheet.setColumnWidth(c, 140);

  sheet.setFrozenRows(1);
}

// ---- PARTS EXPENSES SHEET ----

function buildPartsExpensesSheet(ss) {
  var sheet = getOrCreateSheet(ss, "Parts Expenses");
  sheet.clear();
  sheet.setTabColor("#EA4335");

  var headers = [
    "Date",           // A
    "Vendor",         // B
    "Part",           // C
    "Device / Job",   // D
    "Quantity",       // E
    "Cost",           // F
    "Paid?",          // G
    "Month",          // H
    "Notes"           // I
  ];

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold").setBackground("#1B3A5C").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  sheet.setFrozenRows(1);

  // Formats
  sheet.getRange("A2:A500").setNumberFormat("MM/dd/yyyy");
  sheet.getRange("F2:F500").setNumberFormat("$#,##0.00");

  // Month formula
  for (var row = 2; row <= 500; row++) {
    sheet.getRange("H" + row).setFormula('=IF(A' + row + '="","",TEXT(A' + row + ',"MMM YYYY"))');
  }

  // Paid dropdown
  var paidRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Paid", "Unpaid"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("G2:G500").setDataValidation(paidRule);

  // Conditional formatting
  var unpaidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Unpaid")
    .setBackground("#FCE8B2")
    .setRanges([sheet.getRange("G2:G500")])
    .build();
  var paidFmtRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Paid")
    .setBackground("#D9EAD3")
    .setRanges([sheet.getRange("G2:G500")])
    .build();
  sheet.setConditionalFormatRules([unpaidRule, paidFmtRule]);

  // Column widths
  var widths = [100, 140, 160, 140, 70, 90, 80, 90, 200];
  for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
}

// ---- FIXED EXPENSES SHEET ----

function buildFixedExpensesSheet(ss) {
  var sheet = getOrCreateSheet(ss, "Fixed Expenses");
  sheet.clear();
  sheet.setTabColor("#9334E6");

  var headers = [
    "Expense Name",   // A
    "Category",       // B
    "Amount",         // C
    "Frequency",      // D
    "Due Date",       // E
    "Paid Status",    // F
    "Month",          // G
    "Notes"           // H
  ];

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold").setBackground("#1B3A5C").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  sheet.setFrozenRows(1);

  // Formats
  sheet.getRange("C2:C100").setNumberFormat("$#,##0.00");
  sheet.getRange("E2:E100").setNumberFormat("MM/dd/yyyy");

  // Month formula
  for (var row = 2; row <= 100; row++) {
    sheet.getRange("G" + row).setFormula('=IF(E' + row + '="","",TEXT(E' + row + ',"MMM YYYY"))');
  }

  // Category dropdown
  var catRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName("Settings").getRange("A31:A39"), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("B2:B100").setDataValidation(catRule);

  // Frequency dropdown
  var freqRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName("Settings").getRange("C31:C36"), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("D2:D100").setDataValidation(freqRule);

  // Paid Status dropdown
  var paidRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Paid", "Unpaid", "Partial"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("F2:F100").setDataValidation(paidRule);

  // Sample data
  var sampleExpenses = [
    ["Marketing Retainer", "Marketing", 300, "Monthly", "", "Unpaid", "", "Paid to marketing partner"],
    ["Phone Bill", "Utilities", 85, "Monthly", "", "Unpaid", "", ""],
    ["Internet", "Utilities", 70, "Monthly", "", "Unpaid", "", ""],
    ["Software/Tools", "Software", 30, "Monthly", "", "Unpaid", "", "Repair tracking software"],
  ];
  if (sampleExpenses.length > 0) {
    sheet.getRange(2, 1, sampleExpenses.length, sampleExpenses[0].length).setValues(sampleExpenses);
  }

  // Conditional formatting
  var unpaidRule2 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Unpaid")
    .setBackground("#FCE8B2")
    .setRanges([sheet.getRange("F2:F100")])
    .build();
  var paidFmtRule2 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Paid")
    .setBackground("#D9EAD3")
    .setRanges([sheet.getRange("F2:F100")])
    .build();
  // Overdue: due date is past and unpaid
  var overdueRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(E2<TODAY(),E2<>"",F2="Unpaid")')
    .setBackground("#F4C7C3")
    .setRanges([sheet.getRange("A2:H100")])
    .build();
  sheet.setConditionalFormatRules([overdueRule, unpaidRule2, paidFmtRule2]);

  // Column widths
  var widths = [180, 120, 100, 100, 100, 100, 90, 200];
  for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
}

// ---- DEBT TRACKER SHEET ----

function buildDebtTrackerSheet(ss) {
  var sheet = getOrCreateSheet(ss, "Debt Tracker");
  sheet.clear();
  sheet.setTabColor("#E67C73");

  var headers = [
    "Who I Owe",         // A
    "Description",       // B
    "Starting Balance",  // C
    "Minimum Payment",   // D
    "Due Date",          // E
    "Total Paid",        // F
    "Remaining Balance", // G
    "Status",            // H
    "Last Payment Date", // I
    "Notes"              // J
  ];

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold").setBackground("#1B3A5C").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  sheet.setFrozenRows(1);

  // Formats
  sheet.getRange("C2:G100").setNumberFormat("$#,##0.00");
  sheet.getRange("E2:E100").setNumberFormat("MM/dd/yyyy");
  sheet.getRange("I2:I100").setNumberFormat("MM/dd/yyyy");

  // Remaining Balance formula
  for (var row = 2; row <= 100; row++) {
    sheet.getRange("G" + row).setFormula('=IF(C' + row + '="","",C' + row + '-F' + row + ')');
  }

  // Status dropdown
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName("Settings").getRange("B31:B34"), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("H2:H100").setDataValidation(statusRule);

  // Sample debts
  var sampleDebts = [
    ["Mom", "Personal loan", 500, 50, "", 0, "", "Active", "", ""],
    ["Friend", "Startup help", 300, 25, "", 0, "", "Active", "", ""],
  ];
  sheet.getRange(2, 1, sampleDebts.length, sampleDebts[0].length).setValues(sampleDebts);

  // Summary section
  sheet.getRange("A20").setValue("DEBT SUMMARY").setFontWeight("bold").setFontSize(11).setBackground("#E8EEF4");
  sheet.getRange("A20:D20").mergeAcross().setBackground("#E8EEF4");

  sheet.getRange("A21").setValue("Total Debt (Starting)").setFontWeight("bold");
  sheet.getRange("B21").setFormula('=SUMPRODUCT((C2:C100<>"")*C2:C100)').setNumberFormat("$#,##0.00");

  sheet.getRange("A22").setValue("Total Paid").setFontWeight("bold");
  sheet.getRange("B22").setFormula('=SUMPRODUCT((F2:F100<>"")*F2:F100)').setNumberFormat("$#,##0.00");

  sheet.getRange("A23").setValue("Total Remaining").setFontWeight("bold").setFontSize(12);
  sheet.getRange("B23").setFormula('=SUMPRODUCT((G2:G18<>"")*G2:G18)').setNumberFormat("$#,##0.00").setFontWeight("bold").setFontSize(12);

  sheet.getRange("A24").setValue("Debt Allocation Available").setFontWeight("bold");
  sheet.getRange("B24").setFormula("=Allocations!E6").setNumberFormat("$#,##0.00");

  sheet.getRange("A26").setValue("NEXT DUE / OVERDUE").setFontWeight("bold").setBackground("#E8EEF4");
  sheet.getRange("A26:D26").mergeAcross().setBackground("#E8EEF4");

  sheet.getRange("A27").setValue("Overdue Count");
  sheet.getRange("B27").setFormula('=COUNTIFS(E2:E18,"<"&TODAY(),H2:H18,"Active")');

  sheet.getRange("A28").setValue("Active Debts Count");
  sheet.getRange("B28").setFormula('=COUNTIF(H2:H18,"Active")');

  // Conditional formatting
  var overdueDebt = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Overdue")
    .setBackground("#F4C7C3")
    .setRanges([sheet.getRange("H2:H100")])
    .build();
  var paidOffDebt = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Paid Off")
    .setBackground("#D9EAD3")
    .setRanges([sheet.getRange("H2:H100")])
    .build();
  var negativeRemaining = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground("#FCE8B2")
    .setRanges([sheet.getRange("G2:G100")])
    .build();
  sheet.setConditionalFormatRules([overdueDebt, paidOffDebt, negativeRemaining]);

  // Column widths
  var widths = [130, 160, 120, 120, 100, 100, 130, 90, 120, 200];
  for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
}

// ---- MARKETING TRACKER SHEET ----

function buildMarketingTrackerSheet(ss) {
  var sheet = getOrCreateSheet(ss, "Marketing Tracker");
  sheet.clear();
  sheet.setTabColor("#FF6D01");

  var headers = [
    "Month",                    // A
    "Retainer Due",             // B
    "Retainer Paid?",           // C
    "Referred Customers",       // D
    "Commission/Lead",          // E
    "Total Commission Owed",    // F
    "Total Marketing Cost",     // G
    "Revenue from Referrals",   // H
    "Profit from Referrals",    // I
    "ROI %"                     // J
  ];

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold").setBackground("#1B3A5C").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  sheet.setFrozenRows(1);

  var year = new Date().getFullYear();

  for (var row = 2; row <= 13; row++) {
    var monthNum = row - 1;
    // Month
    sheet.getRange("A" + row).setValue(new Date(year, monthNum - 1, 1)).setNumberFormat("MMM YYYY");

    // Retainer due
    sheet.getRange("B" + row).setFormula("=Settings!B11").setNumberFormat("$#,##0.00");

    // Retainer paid - manual
    sheet.getRange("C" + row).setValue("No");

    // Referred customers count
    sheet.getRange("D" + row).setFormula(
      '=COUNTIFS(\'Repair Jobs\'!G2:G500,"Yes",\'Repair Jobs\'!R2:R500,TEXT(A' + row + ',"MMM YYYY"))'
    );

    // Commission per lead
    sheet.getRange("E" + row).setFormula("=Settings!B12").setNumberFormat("$#,##0.00");

    // Total commission owed
    sheet.getRange("F" + row).setFormula("=D" + row + "*E" + row).setNumberFormat("$#,##0.00");

    // Total marketing cost
    sheet.getRange("G" + row).setFormula("=B" + row + "+F" + row).setNumberFormat("$#,##0.00");

    // Revenue from referrals
    sheet.getRange("H" + row).setFormula(
      '=SUMPRODUCT((\'Repair Jobs\'!G2:G500="Yes")*(\'Repair Jobs\'!R2:R500=TEXT(A' + row + ',"MMM YYYY"))*(\'Repair Jobs\'!H2:H500))'
    ).setNumberFormat("$#,##0.00");

    // Profit from referrals
    sheet.getRange("I" + row).setFormula(
      '=SUMPRODUCT((\'Repair Jobs\'!G2:G500="Yes")*(\'Repair Jobs\'!R2:R500=TEXT(A' + row + ',"MMM YYYY"))*(\'Repair Jobs\'!K2:K500))'
    ).setNumberFormat("$#,##0.00");

    // ROI %: (Profit - Marketing Cost) / Marketing Cost
    sheet.getRange("J" + row).setFormula(
      '=IFERROR((I' + row + '-G' + row + ')/G' + row + ',0)'
    ).setNumberFormat("0.0%");
  }

  // Retainer Paid dropdown
  var paidRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Yes", "No"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("C2:C13").setDataValidation(paidRule);

  // Summary
  sheet.getRange("A15").setValue("MARKETING SUMMARY (YTD)").setFontWeight("bold").setFontSize(11).setBackground("#E8EEF4");
  sheet.getRange("A15:E15").mergeAcross().setBackground("#E8EEF4");

  sheet.getRange("A16").setValue("Total Referred Customers");
  sheet.getRange("B16").setFormula("=SUM(D2:D13)").setFontWeight("bold");

  sheet.getRange("A17").setValue("Total Commission Owed");
  sheet.getRange("B17").setFormula("=SUM(F2:F13)").setNumberFormat("$#,##0.00");

  sheet.getRange("A18").setValue("Total Retainer Cost");
  sheet.getRange("B18").setFormula("=COUNTIF(C2:C13,\"Yes\")*Settings!B11").setNumberFormat("$#,##0.00");

  sheet.getRange("A19").setValue("Total Marketing Cost");
  sheet.getRange("B19").setFormula("=SUM(G2:G13)").setNumberFormat("$#,##0.00").setFontWeight("bold");

  sheet.getRange("A20").setValue("Total Revenue from Referrals");
  sheet.getRange("B20").setFormula("=SUM(H2:H13)").setNumberFormat("$#,##0.00");

  sheet.getRange("A21").setValue("Total Profit from Referrals");
  sheet.getRange("B21").setFormula("=SUM(I2:I13)").setNumberFormat("$#,##0.00");

  sheet.getRange("A22").setValue("Overall Marketing ROI");
  sheet.getRange("B22").setFormula("=IFERROR((B21-B19)/B19,0)").setNumberFormat("0.0%").setFontWeight("bold").setFontSize(12);

  sheet.getRange("A23").setValue("Is Marketing Worth It?");
  sheet.getRange("B23").setFormula('=IF(B22>0,"YES - Profitable","NO - Review spend")').setFontWeight("bold");

  // Conditional formatting
  var positiveROI = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground("#D9EAD3")
    .setRanges([sheet.getRange("J2:J13")])
    .build();
  var negativeROI = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThanOrEqualTo(0)
    .setBackground("#F4C7C3")
    .setRanges([sheet.getRange("J2:J13")])
    .build();
  var unpaidComm = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("No")
    .setBackground("#FCE8B2")
    .setRanges([sheet.getRange("C2:C13")])
    .build();
  sheet.setConditionalFormatRules([positiveROI, negativeROI, unpaidComm]);

  // Column widths
  var widths = [100, 100, 100, 130, 110, 140, 140, 160, 150, 80];
  for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
}

// ---- DASHBOARD SHEET ----

function buildDashboardSheet(ss) {
  var sheet = getOrCreateSheet(ss, "Dashboard");
  sheet.clear();
  sheet.setTabColor("#0F9D58");

  var today = "TODAY()";
  var thisWeekStart = "TODAY()-WEEKDAY(TODAY(),2)+1";
  var thisMonthStart = "DATE(YEAR(TODAY()),MONTH(TODAY()),1)";
  var thisMonthEnd = "EOMONTH(TODAY(),0)";

  // Title
  sheet.getRange("A1").setValue("TECH GUARDIAN - COMMAND CENTER").setFontSize(16).setFontWeight("bold").setFontColor("#FFFFFF");
  sheet.getRange("A1:F1").mergeAcross().setBackground("#1B3A5C");

  sheet.getRange("A2").setFormula('="Last updated: "&TEXT(NOW(),"MM/dd/yyyy hh:mm AM/PM")').setFontColor("#666666").setFontSize(9);

  // ---- TOP METRICS ----
  sheet.getRange("A4").setValue("KEY METRICS").setFontWeight("bold").setFontSize(12).setBackground("#E8EEF4");
  sheet.getRange("A4:F4").mergeAcross().setBackground("#E8EEF4");

  var metrics = [
    // [Label, Formula]
    ["Revenue This Week",
     '=SUMPRODUCT((\'Repair Jobs\'!B2:B500>=' + thisWeekStart + ')*(\'Repair Jobs\'!B2:B500<=' + today + ')*(\'Repair Jobs\'!H2:H500))'],
    ["Revenue This Month",
     '=SUMPRODUCT((\'Repair Jobs\'!B2:B500>=' + thisMonthStart + ')*(\'Repair Jobs\'!B2:B500<=' + thisMonthEnd + ')*(\'Repair Jobs\'!H2:H500))'],
    ["Net Profit This Week",
     '=SUMPRODUCT((\'Repair Jobs\'!B2:B500>=' + thisWeekStart + ')*(\'Repair Jobs\'!B2:B500<=' + today + ')*(\'Repair Jobs\'!K2:K500))'],
    ["Net Profit This Month",
     '=SUMPRODUCT((\'Repair Jobs\'!B2:B500>=' + thisMonthStart + ')*(\'Repair Jobs\'!B2:B500<=' + thisMonthEnd + ')*(\'Repair Jobs\'!K2:K500))'],
    ["Parts Spent This Month",
     '=SUMPRODUCT((\'Parts Expenses\'!A2:A500>=' + thisMonthStart + ')*(\'Parts Expenses\'!A2:A500<=' + thisMonthEnd + ')*(\'Parts Expenses\'!F2:F500))'],
    ["Remaining Parts Budget",
     "=Allocations!E5"],
    ["Total Debt Remaining",
     "='Debt Tracker'!B23"],
    ["Savings Allocated (Total)",
     "=Allocations!C8"],
    ["Personal Spending Allocated",
     "=Allocations!C7"],
    ["Marketing Commissions Owed",
     "='Marketing Tracker'!B17"],
    ["Fixed Expenses This Month",
     '=SUMPRODUCT((\'Fixed Expenses\'!G2:G100=TEXT(TODAY(),"MMM YYYY"))*(\'Fixed Expenses\'!C2:C100))'],
  ];

  // Layout metrics in 2 columns
  for (var i = 0; i < metrics.length; i++) {
    var col = (i % 2 === 0) ? "A" : "D";
    var row = 5 + Math.floor(i / 2);
    sheet.getRange(col + row).setValue(metrics[i][0]).setFontWeight("bold");
    var valCol = (col === "A") ? "B" : "E";
    sheet.getRange(valCol + row).setFormula(metrics[i][1]).setNumberFormat("$#,##0.00").setFontSize(11).setFontWeight("bold");
  }

  // Cash available after obligations
  var cashRow = 5 + Math.ceil(metrics.length / 2);
  sheet.getRange("A" + cashRow).setValue("CASH AFTER OBLIGATIONS").setFontWeight("bold").setFontSize(12).setBackground("#D9EAD3");
  sheet.getRange("B" + cashRow).setFormula("=Allocations!B32").setNumberFormat("$#,##0.00").setFontWeight("bold").setFontSize(14).setBackground("#D9EAD3");
  sheet.getRange("A" + cashRow + ":C" + cashRow).setBackground("#D9EAD3");

  // ---- BONUS METRICS ----
  var bonusStart = cashRow + 2;
  sheet.getRange("A" + bonusStart).setValue("PERFORMANCE METRICS").setFontWeight("bold").setFontSize(12).setBackground("#E8EEF4");
  sheet.getRange("A" + bonusStart + ":F" + bonusStart).mergeAcross().setBackground("#E8EEF4");

  var r = bonusStart + 1;

  sheet.getRange("A" + r).setValue("Total Repair Count (All Time)");
  sheet.getRange("B" + r).setFormula('=COUNTA(\'Repair Jobs\'!B2:B500)');
  r++;

  sheet.getRange("A" + r).setValue("Repairs This Month");
  sheet.getRange("B" + r).setFormula('=COUNTIFS(\'Repair Jobs\'!B2:B500,">="&' + thisMonthStart + ',\'Repair Jobs\'!B2:B500,"<="&' + thisMonthEnd + ')');
  r++;

  sheet.getRange("A" + r).setValue("Repairs This Week");
  sheet.getRange("B" + r).setFormula('=COUNTIFS(\'Repair Jobs\'!B2:B500,">="&' + thisWeekStart + ',\'Repair Jobs\'!B2:B500,"<="&' + today + ')');
  r++;

  sheet.getRange("A" + r).setValue("Average Ticket Value");
  sheet.getRange("B" + r).setFormula('=IFERROR(AVERAGE(\'Repair Jobs\'!H2:H500),0)').setNumberFormat("$#,##0.00");
  r++;

  sheet.getRange("A" + r).setValue("Average Profit Per Job");
  sheet.getRange("B" + r).setFormula('=IFERROR(AVERAGE(\'Repair Jobs\'!K2:K500),0)').setNumberFormat("$#,##0.00");
  r++;

  sheet.getRange("A" + r).setValue("Profit Margin %");
  sheet.getRange("B" + r).setFormula('=IFERROR(SUM(\'Repair Jobs\'!K2:K500)/SUM(\'Repair Jobs\'!H2:H500),0)').setNumberFormat("0.0%");
  r++;

  sheet.getRange("A" + r).setValue("Total Revenue (All Time)");
  sheet.getRange("B" + r).setFormula('=SUM(\'Repair Jobs\'!H2:H500)').setNumberFormat("$#,##0.00");
  r++;

  sheet.getRange("A" + r).setValue("Total Profit (All Time)");
  sheet.getRange("B" + r).setFormula('=SUM(\'Repair Jobs\'!K2:K500)').setNumberFormat("$#,##0.00");
  r++;

  // Daily Revenue Goal tracker
  sheet.getRange("A" + r).setValue("Daily Rev Goal ($500/day)");
  sheet.getRange("B" + r).setFormula('=500-SUMPRODUCT((\'Repair Jobs\'!B2:B500=TODAY())*(\'Repair Jobs\'!H2:H500))').setNumberFormat("$#,##0.00");
  sheet.getRange("C" + r).setValue("remaining today");
  r++;

  // Break-even tracker
  sheet.getRange("A" + r).setValue("Monthly Break-Even Target");
  sheet.getRange("B" + r).setFormula('=SUMPRODUCT((\'Fixed Expenses\'!G2:G100=TEXT(TODAY(),"MMM YYYY"))*(\'Fixed Expenses\'!C2:C100))+Settings!B11').setNumberFormat("$#,##0.00");
  sheet.getRange("C" + r).setValue("min revenue to cover fixed costs");
  r++;

  // ---- BREAKDOWNS ----
  r += 1;
  sheet.getRange("A" + r).setValue("REVENUE BREAKDOWNS").setFontWeight("bold").setFontSize(12).setBackground("#E8EEF4");
  sheet.getRange("A" + r + ":F" + r).mergeAcross().setBackground("#E8EEF4");
  r++;

  // Revenue by Device Type
  sheet.getRange("A" + r).setValue("By Device Type").setFontWeight("bold").setBackground("#D9E2EC");
  sheet.getRange("B" + r).setValue("Revenue").setFontWeight("bold").setBackground("#D9E2EC");
  sheet.getRange("C" + r).setValue("Count").setFontWeight("bold").setBackground("#D9E2EC");
  r++;

  var devices = ["iPhone", "iPad", "Samsung Galaxy", "Google Pixel", "MacBook", "Laptop (Other)", "Desktop", "Game Console", "Tablet (Other)", "Other"];
  for (var d = 0; d < devices.length; d++) {
    sheet.getRange("A" + r).setValue(devices[d]);
    sheet.getRange("B" + r).setFormula('=SUMPRODUCT((\'Repair Jobs\'!D2:D500="' + devices[d] + '")*(\'Repair Jobs\'!H2:H500))').setNumberFormat("$#,##0.00");
    sheet.getRange("C" + r).setFormula('=COUNTIF(\'Repair Jobs\'!D2:D500,"' + devices[d] + '")');
    r++;
  }

  r++;
  // Revenue by Lead Source
  sheet.getRange("A" + r).setValue("By Lead Source").setFontWeight("bold").setBackground("#D9E2EC");
  sheet.getRange("B" + r).setValue("Revenue").setFontWeight("bold").setBackground("#D9E2EC");
  sheet.getRange("C" + r).setValue("Profit").setFontWeight("bold").setBackground("#D9E2EC");
  sheet.getRange("D" + r).setValue("Count").setFontWeight("bold").setBackground("#D9E2EC");
  r++;

  var leads = ["Google Search", "Google Maps", "Facebook", "Instagram", "Referral - Marketing Guy", "Referral - Customer", "Walk-In", "Repeat Customer", "Craigslist", "Nextdoor", "Yelp", "Other"];
  for (var l = 0; l < leads.length; l++) {
    sheet.getRange("A" + r).setValue(leads[l]);
    sheet.getRange("B" + r).setFormula('=SUMPRODUCT((\'Repair Jobs\'!F2:F500="' + leads[l] + '")*(\'Repair Jobs\'!H2:H500))').setNumberFormat("$#,##0.00");
    sheet.getRange("C" + r).setFormula('=SUMPRODUCT((\'Repair Jobs\'!F2:F500="' + leads[l] + '")*(\'Repair Jobs\'!K2:K500))').setNumberFormat("$#,##0.00");
    sheet.getRange("D" + r).setFormula('=COUNTIF(\'Repair Jobs\'!F2:F500,"' + leads[l] + '")');
    r++;
  }

  r++;
  // Referred customer performance
  sheet.getRange("A" + r).setValue("REFERRED CUSTOMER PERFORMANCE").setFontWeight("bold").setFontSize(11).setBackground("#E8EEF4");
  sheet.getRange("A" + r + ":F" + r).mergeAcross().setBackground("#E8EEF4");
  r++;

  sheet.getRange("A" + r).setValue("Total Referred Customers");
  sheet.getRange("B" + r).setFormula('=COUNTIF(\'Repair Jobs\'!G2:G500,"Yes")');
  r++;
  sheet.getRange("A" + r).setValue("Revenue from Referred");
  sheet.getRange("B" + r).setFormula('=SUMPRODUCT((\'Repair Jobs\'!G2:G500="Yes")*(\'Repair Jobs\'!H2:H500))').setNumberFormat("$#,##0.00");
  r++;
  sheet.getRange("A" + r).setValue("Profit from Referred");
  sheet.getRange("B" + r).setFormula('=SUMPRODUCT((\'Repair Jobs\'!G2:G500="Yes")*(\'Repair Jobs\'!K2:K500))').setNumberFormat("$#,##0.00");
  r++;
  sheet.getRange("A" + r).setValue("Avg Ticket (Referred)");
  sheet.getRange("B" + r).setFormula('=IFERROR(SUMPRODUCT((\'Repair Jobs\'!G2:G500="Yes")*(\'Repair Jobs\'!H2:H500))/COUNTIF(\'Repair Jobs\'!G2:G500,"Yes"),0)').setNumberFormat("$#,##0.00");
  r++;
  sheet.getRange("A" + r).setValue("Avg Ticket (Non-Referred)");
  sheet.getRange("B" + r).setFormula('=IFERROR(SUMPRODUCT((\'Repair Jobs\'!G2:G500="No")*(\'Repair Jobs\'!H2:H500))/COUNTIF(\'Repair Jobs\'!G2:G500,"No"),0)').setNumberFormat("$#,##0.00");
  r++;

  // Best performers
  r++;
  sheet.getRange("A" + r).setValue("TOP PERFORMERS").setFontWeight("bold").setFontSize(11).setBackground("#E8EEF4");
  sheet.getRange("A" + r + ":F" + r).mergeAcross().setBackground("#E8EEF4");
  r++;

  sheet.getRange("A" + r).setValue("Best Lead Source (by profit)");
  sheet.getRange("B" + r).setFormula('=IFERROR(INDEX(\'Repair Jobs\'!F2:F500,MATCH(MAX(SUMPRODUCT((\'Repair Jobs\'!F2:F500=\'Repair Jobs\'!F2:F500)*(\'Repair Jobs\'!K2:K500))),SUMPRODUCT((\'Repair Jobs\'!F2:F500=\'Repair Jobs\'!F2:F500)*(\'Repair Jobs\'!K2:K500)),0)),"N/A")');
  r++;

  sheet.getRange("A" + r).setValue("Best Device (by count)");
  sheet.getRange("B" + r).setFormula('=IFERROR(INDEX(\'Repair Jobs\'!D2:D500,MATCH(MAX(COUNTIF(\'Repair Jobs\'!D2:D500,\'Repair Jobs\'!D2:D500)),COUNTIF(\'Repair Jobs\'!D2:D500,\'Repair Jobs\'!D2:D500),0)),"N/A")');
  r++;

  // CHART SUGGESTIONS note
  r += 2;
  sheet.getRange("A" + r).setValue("CHART SUGGESTIONS").setFontWeight("bold").setFontSize(11).setBackground("#E8EEF4");
  sheet.getRange("A" + r + ":F" + r).mergeAcross().setBackground("#E8EEF4");
  r++;
  var chartNotes = [
    "1. Revenue by Week - Use Allocations monthly data or Repair Jobs Week# column",
    "2. Profit by Month - Chart from Allocations monthly breakdown",
    "3. Debt Remaining - Bar chart from Debt Tracker G column",
    "4. Lead Source Performance - Pie chart from Lead Source breakdown above",
    "5. Parts Budget vs Spending - 2-bar comparison from Allocations C5 vs D5",
    "6. To create: Select data range > Insert > Chart > Customize"
  ];
  for (var n = 0; n < chartNotes.length; n++) {
    sheet.getRange("A" + r).setValue(chartNotes[n]).setFontColor("#666666");
    r++;
  }

  // Conditional formatting for negative cash
  var negativeCash = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0)
    .setBackground("#F4C7C3")
    .setFontColor("#CC0000")
    .setRanges([sheet.getRange("B" + cashRow)])
    .build();
  sheet.setConditionalFormatRules([negativeCash]);

  // Column widths
  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 260);
  sheet.setColumnWidth(5, 140);
  sheet.setColumnWidth(6, 120);

  sheet.setFrozenRows(1);
}

// ---- NAMED RANGES ----

function createNamedRanges(ss) {
  // Remove existing named ranges to avoid conflicts
  var existing = ss.getNamedRanges();
  for (var i = 0; i < existing.length; i++) {
    existing[i].remove();
  }

  var settings = ss.getSheetByName("Settings");
  var jobs = ss.getSheetByName("Repair Jobs");

  ss.setNamedRange("AllocParts", settings.getRange("B4"));
  ss.setNamedRange("AllocDebt", settings.getRange("B5"));
  ss.setNamedRange("AllocPersonal", settings.getRange("B6"));
  ss.setNamedRange("AllocSavings", settings.getRange("B7"));
  ss.setNamedRange("MarketingRetainer", settings.getRange("B11"));
  ss.setNamedRange("CommissionPerLead", settings.getRange("B12"));
  ss.setNamedRange("DeviceTypes", settings.getRange("A17:A26"));
  ss.setNamedRange("LeadSources", settings.getRange("B17:B28"));
  ss.setNamedRange("PaymentStatuses", settings.getRange("C17:C21"));
  ss.setNamedRange("RepairTypes", settings.getRange("D17:D28"));
  ss.setNamedRange("ExpenseCategories", settings.getRange("A31:A39"));
  ss.setNamedRange("JobDates", jobs.getRange("B2:B500"));
  ss.setNamedRange("JobRevenue", jobs.getRange("H2:H500"));
  ss.setNamedRange("JobProfit", jobs.getRange("K2:K500"));
  ss.setNamedRange("JobReferred", jobs.getRange("G2:G500"));
}

// ---- HELPER ----

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

// ============================================================
// AUTOMATION SCRIPTS
// ============================================================

/**
 * Auto-timestamp: When a new row is added to Repair Jobs,
 * automatically set the date to today if blank.
 * Set up via Edit > Triggers > onEdit
 */
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;

  if (sheet.getName() === "Repair Jobs") {
    var row = range.getRow();
    var col = range.getColumn();

    // If editing Customer name (col 3) and Date (col 2) is empty, auto-fill date
    if (col === 3 && row >= 2) {
      var dateCell = sheet.getRange(row, 2);
      if (dateCell.getValue() === "") {
        dateCell.setValue(new Date());
      }
    }

    // If Referred column (G, col 7) is set to "Yes", auto-set lead source
    if (col === 7 && row >= 2) {
      if (e.value === "Yes") {
        var leadCell = sheet.getRange(row, 6); // Lead Source column
        if (leadCell.getValue() === "") {
          leadCell.setValue("Referral - Marketing Guy");
        }
      }
    }
  }
}

/**
 * Generate monthly summary - run manually or via time trigger
 * Creates a summary for the current month
 */
function generateMonthlySummary() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var jobs = ss.getSheetByName("Repair Jobs");
  var data = jobs.getDataRange().getValues();

  var now = new Date();
  var currentMonth = now.getMonth();
  var currentYear = now.getFullYear();
  var monthName = Utilities.formatDate(now, Session.getScriptTimeZone(), "MMMM yyyy");

  var totalRevenue = 0;
  var totalProfit = 0;
  var jobCount = 0;
  var referredCount = 0;

  for (var i = 1; i < data.length; i++) {
    var jobDate = data[i][1]; // Column B
    if (jobDate instanceof Date && jobDate.getMonth() === currentMonth && jobDate.getFullYear() === currentYear) {
      jobCount++;
      totalRevenue += (data[i][7] || 0);  // Column H - Revenue
      totalProfit += (data[i][10] || 0);   // Column K - Gross Profit
      if (data[i][6] === "Yes") referredCount++; // Column G - Referred
    }
  }

  var avgTicket = jobCount > 0 ? totalRevenue / jobCount : 0;
  var margin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

  var summary = "TECH GUARDIAN - " + monthName + " Summary\n\n" +
    "Total Jobs: " + jobCount + "\n" +
    "Total Revenue: $" + totalRevenue.toFixed(2) + "\n" +
    "Total Profit: $" + totalProfit.toFixed(2) + "\n" +
    "Average Ticket: $" + avgTicket.toFixed(2) + "\n" +
    "Profit Margin: " + margin.toFixed(1) + "%\n" +
    "Referred Customers: " + referredCount + "\n";

  Browser.msgBox("Monthly Summary", summary, Browser.Buttons.OK);
}

/**
 * Check for unpaid debts and overdue items
 * Can be set as a daily time-driven trigger
 */
function checkUnpaidDebts() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var debts = ss.getSheetByName("Debt Tracker");
  var data = debts.getDataRange().getValues();
  var today = new Date();
  var alerts = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === "") continue; // Skip empty rows

    var who = data[i][0];
    var dueDate = data[i][4];
    var remaining = data[i][6];
    var status = data[i][7];

    if (status === "Active" && remaining > 0) {
      if (dueDate instanceof Date && dueDate < today) {
        alerts.push("OVERDUE: " + who + " - $" + remaining.toFixed(2) + " remaining");
      } else if (dueDate instanceof Date) {
        var daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 7) {
          alerts.push("DUE SOON: " + who + " in " + daysUntil + " days - $" + remaining.toFixed(2));
        }
      }
    }
  }

  if (alerts.length > 0) {
    Browser.msgBox("Debt Alerts", alerts.join("\n"), Browser.Buttons.OK);
  } else {
    Browser.msgBox("Debt Alerts", "No overdue or upcoming debt payments.", Browser.Buttons.OK);
  }
}

/**
 * Count referred leads for current month
 */
function countReferredLeads() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var jobs = ss.getSheetByName("Repair Jobs");
  var data = jobs.getDataRange().getValues();

  var now = new Date();
  var currentMonth = now.getMonth();
  var currentYear = now.getFullYear();
  var count = 0;
  var totalCommission = 0;
  var commissionRate = ss.getSheetByName("Settings").getRange("B12").getValue();

  for (var i = 1; i < data.length; i++) {
    var jobDate = data[i][1];
    if (jobDate instanceof Date && jobDate.getMonth() === currentMonth && jobDate.getFullYear() === currentYear) {
      if (data[i][6] === "Yes") {
        count++;
        totalCommission += commissionRate;
      }
    }
  }

  Browser.msgBox("Referred Leads This Month",
    "Referred customers: " + count + "\n" +
    "Commission owed: $" + totalCommission.toFixed(2),
    Browser.Buttons.OK);
}

/**
 * Refresh dashboard - forces recalculation
 */
function refreshDashboard() {
  SpreadsheetApp.flush();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dashboard = ss.getSheetByName("Dashboard");
  dashboard.getRange("A2").setFormula('="Last updated: "&TEXT(NOW(),"MM/dd/yyyy hh:mm AM/PM")');
  SpreadsheetApp.flush();
  Browser.msgBox("Dashboard refreshed!");
}

/**
 * Custom menu for easy access to automation
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Tech Guardian')
    .addItem('Refresh Dashboard', 'refreshDashboard')
    .addItem('Monthly Summary', 'generateMonthlySummary')
    .addItem('Check Unpaid Debts', 'checkUnpaidDebts')
    .addItem('Count Referred Leads', 'countReferredLeads')
    .addSeparator()
    .addItem('Rebuild Workbook (CAUTION)', 'buildWorkbook')
    .addToUi();
}
