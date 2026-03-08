// ============================================================
// GUARDIAN INNOVATIONS — INDUSTRY TEMPLATE CONFIGS
// Google Apps Script — Pre-built configs for rapid client setup
// ============================================================
// HOW TO USE:
// 1. Add this file to the same Apps Script project as Code.gs
// 2. Run deployTemplate("restaurant") (or any industry key)
// 3. It will auto-populate the Settings sheet with industry-specific
//    categories, then rebuild the workbook with those settings
// ============================================================

// ---- TEMPLATE DATABASE ----

var INDUSTRY_TEMPLATES = {

  // ---- PHONE / ELECTRONICS REPAIR ----
  "repair": {
    businessName: "My Repair Shop",
    industry: "Phone & Electronics Repair",
    taxRate: 25,
    reinvestRate: 10,
    emergencyRate: 5,
    jobTypes: [
      "Screen Repair", "Battery Replacement", "Charging Port Repair",
      "Water Damage Repair", "Back Glass Repair", "Camera Repair",
      "Speaker/Mic Repair", "Console Repair", "MacBook Repair",
      "Data Recovery", "Board-Level Repair", "Custom Mod", "Other"
    ],
    fixedExpenses: [
      { name: "Rent/Lease", amount: 1200 },
      { name: "Insurance", amount: 150 },
      { name: "Phone/Internet", amount: 120 },
      { name: "Tools & Equipment Lease", amount: 100 },
      { name: "Software Subscriptions", amount: 75 },
      { name: "POS System", amount: 30 },
      { name: "Advertising", amount: 200 },
      { name: "Supplies (general)", amount: 100 }
    ],
    partsCategories: [
      "Screens", "Batteries", "Charging Ports", "Back Glass",
      "Cameras", "Speakers/Mics", "Logic Boards", "Cables/Flex",
      "Adhesive/Tools", "Console Parts", "Laptop Parts", "Other Parts"
    ],
    marketingChannels: [
      "Google Ads", "Facebook/Instagram Ads", "Yelp",
      "Google Business Profile", "Flyers/Door Hangers",
      "Referral Program", "Website/SEO"
    ]
  },

  // ---- RESTAURANT / FOOD SERVICE ----
  "restaurant": {
    businessName: "My Restaurant",
    industry: "Restaurant / Food Service",
    taxRate: 25,
    reinvestRate: 8,
    emergencyRate: 5,
    jobTypes: [
      "Dine-In Sales", "Takeout Orders", "Delivery Orders",
      "Catering Jobs", "Event/Party Revenue", "Bar/Drink Sales",
      "Merchandise", "Gift Cards Sold", "Other Revenue"
    ],
    fixedExpenses: [
      { name: "Rent/Lease", amount: 3000 },
      { name: "Insurance", amount: 300 },
      { name: "Utilities (Electric/Gas/Water)", amount: 800 },
      { name: "Phone/Internet/POS", amount: 200 },
      { name: "Payroll", amount: 5000 },
      { name: "Liquor License", amount: 100 },
      { name: "Health Permits", amount: 50 },
      { name: "Pest Control", amount: 75 },
      { name: "Linen/Uniform Service", amount: 150 },
      { name: "Advertising", amount: 300 },
      { name: "Waste Removal", amount: 100 },
      { name: "Equipment Maintenance", amount: 200 }
    ],
    partsCategories: [
      "Food (Proteins)", "Food (Produce)", "Food (Dairy/Eggs)",
      "Food (Dry Goods/Staples)", "Beverages (Non-Alcohol)",
      "Alcohol (Beer/Wine/Liquor)", "Packaging/To-Go Containers",
      "Cleaning Supplies", "Kitchen Smallwares", "Paper Goods", "Other"
    ],
    marketingChannels: [
      "Google Ads", "Facebook/Instagram Ads", "Yelp",
      "DoorDash/UberEats/GrubHub", "Flyers/Menus",
      "Email List", "Events/Sponsorships", "Website/SEO"
    ]
  },

  // ---- LANDSCAPING / LAWN CARE ----
  "landscaping": {
    businessName: "My Landscaping Co",
    industry: "Landscaping / Lawn Care",
    taxRate: 25,
    reinvestRate: 15,
    emergencyRate: 5,
    jobTypes: [
      "Lawn Mowing (Residential)", "Lawn Mowing (Commercial)",
      "Landscape Design", "Landscape Install", "Mulching",
      "Tree Trimming/Removal", "Leaf Cleanup", "Snow Removal",
      "Irrigation Install/Repair", "Hardscaping", "Fertilization/Treatment",
      "One-Time Cleanups", "Other"
    ],
    fixedExpenses: [
      { name: "Truck Payment", amount: 600 },
      { name: "Truck Insurance", amount: 250 },
      { name: "Trailer Payment/Storage", amount: 150 },
      { name: "General Liability Insurance", amount: 200 },
      { name: "Gas/Fuel", amount: 500 },
      { name: "Equipment Maintenance", amount: 200 },
      { name: "Phone", amount: 80 },
      { name: "Software/CRM", amount: 50 },
      { name: "Payroll (crew)", amount: 3000 },
      { name: "Advertising", amount: 200 }
    ],
    partsCategories: [
      "Mulch/Soil", "Plants/Trees/Shrubs", "Sod/Seed",
      "Fertilizer/Chemicals", "Hardscape Materials (pavers/stone)",
      "Irrigation Supplies", "Equipment Parts", "Blades/String",
      "Fuel/Oil Mix", "Safety Gear", "Other Materials"
    ],
    marketingChannels: [
      "Google Ads", "Facebook Ads", "Nextdoor",
      "Yard Signs", "Door Hangers/Flyers",
      "Referral Program", "Website/SEO", "Thumbtack/HomeAdvisor"
    ]
  },

  // ---- SALON / BARBERSHOP ----
  "salon": {
    businessName: "My Salon",
    industry: "Salon / Barbershop",
    taxRate: 25,
    reinvestRate: 10,
    emergencyRate: 5,
    jobTypes: [
      "Haircuts (Men)", "Haircuts (Women)", "Color/Highlights",
      "Blowouts/Styling", "Perms/Treatments", "Extensions",
      "Beard Trim/Shave", "Waxing", "Nails", "Facials/Skincare",
      "Product Sales", "Other Services"
    ],
    fixedExpenses: [
      { name: "Rent/Booth Rental", amount: 1500 },
      { name: "Insurance", amount: 100 },
      { name: "Utilities", amount: 200 },
      { name: "Phone/Internet", amount: 80 },
      { name: "POS/Booking Software", amount: 50 },
      { name: "Laundry/Towels", amount: 60 },
      { name: "Licenses/Permits", amount: 30 },
      { name: "Continuing Education", amount: 50 },
      { name: "Advertising", amount: 150 }
    ],
    partsCategories: [
      "Hair Color/Developer", "Shampoo/Conditioner (Professional)",
      "Styling Products", "Tools (Scissors/Clippers/Dryers)",
      "Capes/Towels/Supplies", "Retail Products (for resale)",
      "Nail Supplies", "Waxing Supplies", "Skincare Products",
      "Cleaning/Sanitizing", "Other Supplies"
    ],
    marketingChannels: [
      "Instagram", "Facebook", "TikTok",
      "Google Business Profile", "Yelp",
      "Referral Program", "Walk-in Signage", "Website/SEO"
    ]
  },

  // ---- GENERAL CONTRACTOR / HANDYMAN ----
  "contractor": {
    businessName: "My Contracting Biz",
    industry: "General Contractor / Handyman",
    taxRate: 28,
    reinvestRate: 12,
    emergencyRate: 5,
    jobTypes: [
      "Kitchen Remodel", "Bathroom Remodel", "Painting (Interior)",
      "Painting (Exterior)", "Drywall Repair/Install", "Flooring Install",
      "Deck/Patio Build", "Fence Install/Repair", "Plumbing Repair",
      "Electrical Repair", "Door/Window Install", "Roofing",
      "General Handyman", "Demolition", "Other"
    ],
    fixedExpenses: [
      { name: "Truck Payment", amount: 600 },
      { name: "Vehicle Insurance", amount: 250 },
      { name: "General Liability Insurance", amount: 300 },
      { name: "Workers Comp Insurance", amount: 400 },
      { name: "Gas/Fuel", amount: 400 },
      { name: "Tool Replacement/Maintenance", amount: 200 },
      { name: "Phone", amount: 80 },
      { name: "Software/CRM", amount: 50 },
      { name: "Licenses/Permits (avg monthly)", amount: 75 },
      { name: "Advertising", amount: 250 },
      { name: "Dump/Disposal Fees", amount: 100 }
    ],
    partsCategories: [
      "Lumber", "Drywall/Mud/Tape", "Paint/Primer",
      "Flooring Materials", "Plumbing Supplies", "Electrical Supplies",
      "Hardware/Fasteners", "Concrete/Masonry", "Tile/Backsplash",
      "Fixtures (sinks, lights, etc.)", "Roofing Materials",
      "Adhesives/Caulk/Sealant", "Safety Equipment", "Other Materials"
    ],
    marketingChannels: [
      "Google Ads", "Facebook Ads", "Nextdoor",
      "HomeAdvisor/Angi", "Thumbtack", "Yard Signs",
      "Referral Program", "Vehicle Wrap/Magnet", "Website/SEO"
    ]
  },

  // ---- AUTO DETAILING ----
  "detailing": {
    businessName: "My Detailing Biz",
    industry: "Auto Detailing",
    taxRate: 25,
    reinvestRate: 12,
    emergencyRate: 5,
    jobTypes: [
      "Basic Wash", "Interior Detail", "Exterior Detail",
      "Full Detail (Interior + Exterior)", "Ceramic Coating",
      "Paint Correction", "Headlight Restoration", "Engine Bay Clean",
      "Boat/RV/Motorcycle Detail", "Fleet/Commercial", "Add-On Services", "Other"
    ],
    fixedExpenses: [
      { name: "Vehicle Payment (mobile rig)", amount: 500 },
      { name: "Vehicle Insurance", amount: 200 },
      { name: "General Liability Insurance", amount: 150 },
      { name: "Gas/Fuel", amount: 300 },
      { name: "Phone", amount: 80 },
      { name: "Booking Software/CRM", amount: 40 },
      { name: "Storage Unit (supplies)", amount: 100 },
      { name: "Water Access/Usage", amount: 50 },
      { name: "Advertising", amount: 200 }
    ],
    partsCategories: [
      "Soap/Shampoo", "Wax/Sealant", "Ceramic Coating Products",
      "Interior Cleaners", "Glass Cleaner", "Tire/Wheel Cleaners",
      "Microfiber Towels", "Applicator Pads", "Polishing Compounds",
      "Brushes/Detailing Tools", "Vacuum Bags/Filters", "Other Supplies"
    ],
    marketingChannels: [
      "Instagram", "TikTok", "Facebook Ads",
      "Google Business Profile", "Before/After Posts",
      "Referral Program", "Vehicle Wrap", "Website/SEO"
    ]
  },

  // ---- CLEANING SERVICE ----
  "cleaning": {
    businessName: "My Cleaning Service",
    industry: "Cleaning Service",
    taxRate: 25,
    reinvestRate: 10,
    emergencyRate: 5,
    jobTypes: [
      "Residential (Standard Clean)", "Residential (Deep Clean)",
      "Move-In/Move-Out Clean", "Commercial/Office Cleaning",
      "Post-Construction Clean", "Carpet Cleaning",
      "Window Cleaning", "Recurring (Weekly)", "Recurring (Bi-Weekly)",
      "Recurring (Monthly)", "One-Time Special", "Other"
    ],
    fixedExpenses: [
      { name: "Vehicle Payment", amount: 400 },
      { name: "Vehicle Insurance", amount: 180 },
      { name: "General Liability Insurance", amount: 120 },
      { name: "Gas/Fuel", amount: 250 },
      { name: "Phone", amount: 80 },
      { name: "Booking Software/CRM", amount: 40 },
      { name: "Payroll (if employees)", amount: 2000 },
      { name: "Advertising", amount: 150 }
    ],
    partsCategories: [
      "All-Purpose Cleaners", "Disinfectants", "Glass Cleaners",
      "Floor Cleaners/Mops", "Vacuum Bags/Filters", "Microfiber Cloths",
      "Sponges/Scrub Pads", "Trash Bags", "Gloves/PPE",
      "Specialty Cleaners (Oven/Bathroom)", "Equipment Parts", "Other"
    ],
    marketingChannels: [
      "Google Ads", "Facebook Ads", "Nextdoor",
      "Thumbtack/TaskRabbit", "Referral Program",
      "Door Hangers/Flyers", "Website/SEO"
    ]
  },

  // ---- FREELANCE / CONSULTING ----
  "freelance": {
    businessName: "My Freelance Biz",
    industry: "Freelance / Consulting",
    taxRate: 30,
    reinvestRate: 10,
    emergencyRate: 10,
    jobTypes: [
      "Hourly Client Work", "Fixed-Price Project", "Retainer Client",
      "Consulting Session", "Workshop/Training", "Digital Product Sale",
      "Affiliate/Referral Income", "Speaking/Event", "Other Revenue"
    ],
    fixedExpenses: [
      { name: "Software/Subscriptions", amount: 200 },
      { name: "Internet", amount: 80 },
      { name: "Phone", amount: 60 },
      { name: "Coworking Space", amount: 200 },
      { name: "Insurance (E&O/Liability)", amount: 100 },
      { name: "Accounting/Legal", amount: 100 },
      { name: "Domain/Hosting", amount: 30 },
      { name: "Advertising", amount: 100 },
      { name: "Professional Development", amount: 75 }
    ],
    partsCategories: [
      "Software Licenses (per-project)", "Stock Assets (photos/fonts/templates)",
      "Printing/Shipping", "Travel/Meals (client meetings)",
      "Subcontractor Payments", "Hardware/Equipment", "Books/Courses", "Other"
    ],
    marketingChannels: [
      "LinkedIn", "Twitter/X", "Portfolio Website",
      "Upwork/Fiverr", "Email Newsletter", "Content Marketing",
      "Referral Program", "Speaking/Podcasts"
    ]
  },

  // ---- FOOD TRUCK / CATERING ----
  "foodtruck": {
    businessName: "My Food Truck",
    industry: "Food Truck / Catering",
    taxRate: 25,
    reinvestRate: 10,
    emergencyRate: 5,
    jobTypes: [
      "Daily Sales (Location 1)", "Daily Sales (Location 2)",
      "Event/Festival", "Catering (Private)", "Catering (Corporate)",
      "Farmers Market", "Merchandise/Merch", "Other Revenue"
    ],
    fixedExpenses: [
      { name: "Truck Payment/Lease", amount: 800 },
      { name: "Truck Insurance", amount: 300 },
      { name: "General Liability Insurance", amount: 150 },
      { name: "Health Permit/Food License", amount: 80 },
      { name: "Commissary Kitchen Rental", amount: 400 },
      { name: "Gas/Propane/Fuel", amount: 400 },
      { name: "Phone/POS", amount: 100 },
      { name: "Payroll", amount: 2000 },
      { name: "Advertising", amount: 150 },
      { name: "Parking/Location Fees", amount: 200 }
    ],
    partsCategories: [
      "Proteins (Meat/Seafood)", "Produce (Vegetables/Fruits)",
      "Dairy/Eggs", "Dry Goods (Rice/Flour/Oil)", "Sauces/Spices",
      "Beverages", "Packaging (Containers/Cups/Napkins)",
      "Cleaning Supplies", "Propane/Fuel", "Equipment Parts", "Other"
    ],
    marketingChannels: [
      "Instagram", "TikTok", "Facebook",
      "Google Business Profile", "Event Listings",
      "Food Truck Aggregator Apps", "Flyers/Stickers", "Website"
    ]
  }
};

// ---- DEPLOY A TEMPLATE ----
// Run this function with the industry key to auto-populate Settings

function deployTemplate(industryKey) {
  if (!industryKey) {
    // Show picker
    var ui = SpreadsheetApp.getUi();
    var keys = Object.keys(INDUSTRY_TEMPLATES);
    var options = keys.map(function(k) { return k + " — " + INDUSTRY_TEMPLATES[k].industry; }).join("\n");
    var result = ui.prompt(
      "Select Industry Template",
      "Enter the template key from the list below:\n\n" + options,
      ui.ButtonSet.OK_CANCEL
    );
    if (result.getSelectedButton() !== ui.Button.OK) return;
    industryKey = result.getResponseText().trim().toLowerCase();
  }

  var template = INDUSTRY_TEMPLATES[industryKey];
  if (!template) {
    SpreadsheetApp.getUi().alert("Template '" + industryKey + "' not found. Available: " + Object.keys(INDUSTRY_TEMPLATES).join(", "));
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = ss.getSheetByName("Settings");

  if (!settings) {
    SpreadsheetApp.getUi().alert("No 'Settings' sheet found. Run buildWorkbook() from Code.gs first, then apply a template.");
    return;
  }

  // Populate settings sheet
  // Row 2: Business Name
  settings.getRange("B2").setValue(template.businessName);
  // Row 3: Tax Rate
  settings.getRange("B3").setValue(template.taxRate / 100);
  // Row 4: Reinvest Rate
  settings.getRange("B4").setValue(template.reinvestRate / 100);
  // Row 5: Emergency Rate
  settings.getRange("B5").setValue(template.emergencyRate / 100);

  // Job Types - column D starting at row 2
  for (var i = 0; i < template.jobTypes.length; i++) {
    settings.getRange(i + 2, 4).setValue(template.jobTypes[i]);
  }

  // Fixed Expenses - populate the Fixed Expenses sheet
  var fixedSheet = ss.getSheetByName("Fixed Expenses");
  if (fixedSheet) {
    for (var j = 0; j < template.fixedExpenses.length; j++) {
      fixedSheet.getRange(j + 3, 1).setValue(template.fixedExpenses[j].name);
      fixedSheet.getRange(j + 3, 2).setValue(template.fixedExpenses[j].amount);
      fixedSheet.getRange(j + 3, 3).setValue("Monthly");
    }
  }

  SpreadsheetApp.getUi().alert(
    "Template Applied: " + template.industry + "\n\n" +
    "Job types, expenses, and categories have been configured.\n" +
    "Review the Settings and Fixed Expenses sheets, then customize as needed for this specific client."
  );
}

// ---- QUICK DEPLOY FUNCTIONS (one-click per industry) ----

function deployRepairTemplate() { deployTemplate("repair"); }
function deployRestaurantTemplate() { deployTemplate("restaurant"); }
function deployLandscapingTemplate() { deployTemplate("landscaping"); }
function deploySalonTemplate() { deployTemplate("salon"); }
function deployContractorTemplate() { deployTemplate("contractor"); }
function deployDetailingTemplate() { deployTemplate("detailing"); }
function deployCleaningTemplate() { deployTemplate("cleaning"); }
function deployFreelanceTemplate() { deployTemplate("freelance"); }
function deployFoodTruckTemplate() { deployTemplate("foodtruck"); }

// ---- CUSTOM MENU (add to onOpen in Code.gs) ----
// Add this to your onOpen function to get a menu for quick template deployment:
//
// function onOpen() {
//   var ui = SpreadsheetApp.getUi();
//   ui.createMenu('Guardian Innovations')
//     .addSubMenu(ui.createMenu('Apply Industry Template')
//       .addItem('Phone/Electronics Repair', 'deployRepairTemplate')
//       .addItem('Restaurant / Food Service', 'deployRestaurantTemplate')
//       .addItem('Landscaping / Lawn Care', 'deployLandscapingTemplate')
//       .addItem('Salon / Barbershop', 'deploySalonTemplate')
//       .addItem('General Contractor', 'deployContractorTemplate')
//       .addItem('Auto Detailing', 'deployDetailingTemplate')
//       .addItem('Cleaning Service', 'deployCleaningTemplate')
//       .addItem('Freelance / Consulting', 'deployFreelanceTemplate')
//       .addItem('Food Truck / Catering', 'deployFoodTruckTemplate')
//     )
//     .addItem('Custom Template...', 'deployTemplate')
//     .addToUi();
// }
