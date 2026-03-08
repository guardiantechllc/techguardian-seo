// ============================================================
// GUARDIAN INNOVATIONS — CLIENT ONBOARDING FORM BUILDER
// Google Apps Script — Auto-generates intake form + response sheet
// ============================================================
// HOW TO USE:
// 1. Open a new Google Sheet (this will be your "Client Intake" sheet)
// 2. Go to Extensions > Apps Script
// 3. Paste this entire file into Code.gs
// 4. Run createOnboardingForm()
// 5. Authorize when prompted
// 6. The form URL will appear in cell A1 of your sheet
// 7. Send that form link to new clients before setup
// ============================================================

function createOnboardingForm() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename("Guardian Innovations — Client Intake");

  // Create the form
  var form = FormApp.create("Budget Command Center — Client Onboarding");
  form.setDescription(
    "Welcome! Please fill out this form so we can build your custom Budget Command Center. " +
    "This takes about 5-10 minutes and helps us configure everything to match YOUR business. " +
    "The more detail you give, the better your system will be on day one."
  );
  form.setConfirmationMessage(
    "You're all set! We'll have your custom Budget Command Center ready within 48 hours. " +
    "We'll reach out to schedule your training call. — Guardian Innovations"
  );
  form.setAllowResponseEdits(true);
  form.setCollectEmail(true);

  // ---- SECTION 1: BASIC INFO ----
  form.addSectionHeaderItem()
    .setTitle("About You & Your Business")
    .setHelpText("Let's start with the basics.");

  form.addTextItem()
    .setTitle("Full Name")
    .setRequired(true);

  form.addTextItem()
    .setTitle("Business Name")
    .setRequired(true);

  form.addTextItem()
    .setTitle("Phone Number")
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Which package are you signing up for?")
    .setChoiceValues(["Starter ($297)", "Pro ($597)", "Premium ($997)", "Not sure yet — help me decide"])
    .setRequired(true);

  // ---- SECTION 2: BUSINESS TYPE ----
  form.addSectionHeaderItem()
    .setTitle("Your Business")
    .setHelpText("Help us understand what you do so we can customize your categories.");

  form.addMultipleChoiceItem()
    .setTitle("What industry is your business in?")
    .setChoiceValues([
      "Phone/Electronics Repair",
      "Restaurant / Food Service",
      "Landscaping / Lawn Care",
      "Salon / Barbershop",
      "General Contractor / Handyman",
      "Auto Detailing / Mechanic",
      "Cleaning Service",
      "Freelance / Consulting",
      "E-Commerce / Online Store",
      "Food Truck / Catering",
      "Photography / Videography",
      "Personal Training / Fitness",
      "Other (describe below)"
    ])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("If 'Other' — describe your business in a sentence or two")
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle("How long have you been in business?")
    .setChoiceValues([
      "Just starting out (less than 6 months)",
      "6 months to 1 year",
      "1-3 years",
      "3-5 years",
      "5+ years"
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Roughly how much revenue do you bring in per month?")
    .setChoiceValues([
      "Under $2,000",
      "$2,000 - $5,000",
      "$5,000 - $10,000",
      "$10,000 - $25,000",
      "$25,000 - $50,000",
      "$50,000+",
      "I honestly don't know (that's why I need this)"
    ])
    .setRequired(true);

  // ---- SECTION 3: REVENUE ----
  form.addSectionHeaderItem()
    .setTitle("How You Make Money")
    .setHelpText("This helps us set up your job tracking and revenue categories.");

  form.addParagraphTextItem()
    .setTitle("List your main services or products (one per line)")
    .setHelpText("Example:\nScreen repair\nBattery replacement\nData recovery\nConsole repair")
    .setRequired(true);

  form.addTextItem()
    .setTitle("What's your average job/sale price?")
    .setHelpText("Rough estimate is fine. Example: $150")
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Do you want to track parts/material costs per job?")
    .setChoiceValues(["Yes — I buy parts for each job", "No — my costs are mostly fixed/overhead", "Sometimes — depends on the job"])
    .setRequired(true);

  // ---- SECTION 4: EXPENSES ----
  form.addSectionHeaderItem()
    .setTitle("Your Expenses")
    .setHelpText("Tell us what you spend money on so we can set up your expense categories.");

  form.addParagraphTextItem()
    .setTitle("List your fixed monthly expenses (one per line with approximate amount)")
    .setHelpText("Example:\nRent - $1200\nInsurance - $150\nPhone bill - $85\nInternet - $60\nSubscriptions - $100")
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("List any variable/irregular expenses you commonly have")
    .setHelpText("Example:\nParts/supplies\nGas/travel\nTools & equipment\nAdvertising")
    .setRequired(false);

  // ---- SECTION 5: MONEY SPLITS ----
  form.addSectionHeaderItem()
    .setTitle("Profit Splitting Preferences")
    .setHelpText("The system can automatically split your revenue into buckets. We'll configure these for you.");

  form.addTextItem()
    .setTitle("What percentage do you want set aside for taxes?")
    .setHelpText("Common: 25-30% for self-employed. If unsure, we'll default to 25%.")
    .setRequired(false);

  form.addTextItem()
    .setTitle("What percentage do you want to reinvest back into the business?")
    .setHelpText("Common: 10-20%. This is for tools, equipment, growth. If unsure, we'll default to 10%.")
    .setRequired(false);

  form.addTextItem()
    .setTitle("What percentage goes to an emergency fund?")
    .setHelpText("Common: 5-10%. If unsure, we'll default to 5%.")
    .setRequired(false);

  // ---- SECTION 6: DEBT ----
  form.addSectionHeaderItem()
    .setTitle("Debt & Loans (Optional)")
    .setHelpText("If you have business debt, we'll set up your payoff tracker. This is optional but powerful.");

  form.addParagraphTextItem()
    .setTitle("List any debts or loans (one per line: name, balance, minimum payment)")
    .setHelpText("Example:\nCredit Card - $3,200 - $85/mo\nEquipment Loan - $5,000 - $200/mo\nPersonal Loan - $1,500 - $50/mo\n\nLeave blank if no debt.")
    .setRequired(false);

  // ---- SECTION 7: MARKETING ----
  form.addSectionHeaderItem()
    .setTitle("Marketing & Advertising (Optional)")
    .setHelpText("If you spend money on marketing, we'll track your ROI.");

  form.addCheckboxItem()
    .setTitle("Where do you currently market your business? (Select all that apply)")
    .setChoiceValues([
      "Facebook / Instagram Ads",
      "Google Ads",
      "TikTok",
      "Yelp",
      "Flyers / Print",
      "Word of Mouth (free)",
      "Website / SEO",
      "Referral Program",
      "I don't do any marketing yet"
    ])
    .setRequired(false);

  form.addTextItem()
    .setTitle("Roughly how much do you spend on marketing per month?")
    .setHelpText("Example: $200. Put $0 if none.")
    .setRequired(false);

  // ---- SECTION 8: GOALS ----
  form.addSectionHeaderItem()
    .setTitle("Your Goals")
    .setHelpText("Help us understand what matters most to you.");

  form.addCheckboxItem()
    .setTitle("What are your top priorities? (Select all that apply)")
    .setChoiceValues([
      "Know my real profit each month",
      "Set aside taxes so I'm not screwed in April",
      "Pay off debt faster",
      "Track where every dollar goes",
      "Grow revenue and track what's working",
      "Build an emergency fund",
      "Get my finances organized for the first time",
      "Look professional for investors/partners/lenders"
    ])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("Anything else we should know?")
    .setHelpText("Special requests, specific reports you want, unique aspects of your business, etc.")
    .setRequired(false);

  // ---- LINK FORM TO SHEET ----
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Put the form URL in cell A1 for easy access
  var sheet = ss.getSheets()[0];
  sheet.setName("Onboarding Info");
  sheet.getRange("A1").setValue("ONBOARDING FORM URL:");
  sheet.getRange("B1").setValue(form.getPublishedUrl());
  sheet.getRange("A1").setFontWeight("bold");
  sheet.getRange("B1").setFontColor("#180EC0");

  sheet.getRange("A3").setValue("EDIT FORM URL:");
  sheet.getRange("B3").setValue(form.getEditUrl());
  sheet.getRange("A3").setFontWeight("bold");

  sheet.getRange("A5").setValue("Responses will appear in the 'Form Responses 1' tab automatically.");
  sheet.getRange("A5").setFontStyle("italic");
  sheet.getRange("A5:E5").merge();

  // Auto-resize
  sheet.autoResizeColumns(1, 2);

  // Alert with form URL
  SpreadsheetApp.getUi().alert(
    "Onboarding Form Created!\n\n" +
    "Form URL (send to clients):\n" + form.getPublishedUrl() + "\n\n" +
    "Edit Form URL:\n" + form.getEditUrl() + "\n\n" +
    "Client responses will appear in the 'Form Responses 1' tab."
  );
}

// ---- BONUS: Email notification when someone submits ----
// After running createOnboardingForm(), set up a trigger:
// 1. In Apps Script, go to Triggers (clock icon)
// 2. Add trigger: onFormSubmit, From spreadsheet, On form submit
// This will email you whenever a new client fills out the form.

function onFormSubmit(e) {
  var responses = e.namedValues;
  var clientName = responses["Full Name"] || "New Client";
  var businessName = responses["Business Name"] || "Unknown";
  var package = responses["Which package are you signing up for?"] || "Not specified";
  var email = responses["Email Address"] || "No email";

  var subject = "New Budget Command Center Client: " + clientName;
  var body =
    "New client onboarding submission!\n\n" +
    "Name: " + clientName + "\n" +
    "Business: " + businessName + "\n" +
    "Package: " + package + "\n" +
    "Email: " + email + "\n\n" +
    "Check the intake sheet for full details.\n\n" +
    "— Guardian Innovations Bot";

  // CHANGE THIS to your email
  MailApp.sendEmail("tech@guardianlabs.digital", subject, body);
}
