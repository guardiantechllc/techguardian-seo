# Tech Guardian - Budget Command Center Setup

## 2-Minute Setup (seriously, that's it)

### Step 1: Create the Sheet
1. Go to [sheets.new](https://sheets.new) — this opens a blank Google Sheet

### Step 2: Open Apps Script
1. Click **Extensions** → **Apps Script**
2. Delete everything in the editor (the `myFunction` placeholder)

### Step 3: Paste the Code
1. Open the file `Code.gs` from this folder
2. Copy the **entire** contents
3. Paste it into the Apps Script editor
4. Click the **Save** icon (💾) or press Ctrl+S

### Step 4: Run the Builder
1. In the Apps Script editor, select `buildWorkbook` from the function dropdown at the top
2. Click **Run** (▶ button)
3. First time: Click **Review Permissions** → Choose your Google account → **Allow**
4. Wait ~30 seconds while it builds all 8 sheets

### Step 5: Done
- Your workbook is fully built with all sheets, formulas, dropdowns, and formatting
- A custom **Tech Guardian** menu appears at the top of Google Sheets
- Start entering repair jobs immediately

---

## What You Get

### 8 Sheets Built Automatically

| Sheet | Purpose |
|-------|---------|
| **Dashboard** | Command center — all key metrics at a glance |
| **Repair Jobs** | Enter jobs here — everything else updates automatically |
| **Allocations** | See where your money goes (40% parts, 25% debt, 20% personal, 15% savings) |
| **Parts Expenses** | Track parts spending vs budget |
| **Fixed Expenses** | Recurring bills (marketing retainer, phone, internet, etc.) |
| **Debt Tracker** | Who you owe, how much, what's remaining |
| **Marketing Tracker** | Monthly marketing costs, referral ROI, is it worth it? |
| **Settings** | Change allocation %, dropdown values, commission rates |

### How to Enter a Repair Job (Mobile-Friendly)
1. Go to **Repair Jobs** sheet
2. Fill in these columns for each job:
   - **Date** (auto-fills if you type customer name first)
   - **Customer** name
   - **Device Type** (dropdown)
   - **Repair Type** (dropdown)
   - **Lead Source** (dropdown)
   - **Referred?** Yes/No (dropdown)
   - **Revenue** (what you charged)
   - **Parts Cost** (what parts cost you)
   - **Payment Status** (dropdown)
   - **Notes** (optional)

3. These columns auto-calculate:
   - Job ID
   - Commission ($25 if referred, $0 if not)
   - Gross Profit
   - All 4 allocation amounts
   - Week number and Month

### Custom Menu (appears after setup)
Click **Tech Guardian** in the menu bar:
- **Refresh Dashboard** — force update all numbers
- **Monthly Summary** — popup with this month's stats
- **Check Unpaid Debts** — alerts for overdue/upcoming payments
- **Count Referred Leads** — this month's referral count and commission

### Automation Triggers (Optional)
Go to Apps Script → **Triggers** (clock icon on left):

1. **Auto-timestamp**: Already works via `onEdit` — entering a customer name auto-fills today's date
2. **Daily debt check**: Add trigger → `checkUnpaidDebts` → Time-driven → Day timer → 9am
3. **Monthly summary**: Add trigger → `generateMonthlySummary` → Time-driven → Month timer → 1st of month

---

## Business Rules Built In

### Marketing Guy Payment
- $300/month fixed retainer (editable in Settings)
- $25 per referred customer (editable in Settings)
- Mark any job as "Referred = Yes" and commission auto-calculates
- Marketing Tracker shows monthly ROI — tells you if the arrangement is profitable

### Allocation Split (from Revenue)
| Category | Default % | What It Covers |
|----------|-----------|----------------|
| Parts/Operating | 40% | Parts inventory, supplies |
| Debt Payoff | 25% | Paying back mom, friend, bills |
| Personal | 20% | Your take-home |
| Savings | 15% | Emergency fund, growth |

Change these anytime in **Settings** sheet, cells B4:B7.

### Conditional Formatting (Built In)
- 🟢 Green: Paid items, high-profit jobs (>$100 profit)
- 🟡 Orange/Yellow: Unpaid items, commissions owed
- 🔴 Red: Overdue bills, low-profit jobs (<$25), negative cash flow

---

## Dashboard Metrics

### Key Numbers
- Revenue this week/month
- Net profit this week/month
- Parts spent vs budget remaining
- Total debt remaining
- Savings and personal spending allocated
- Marketing commissions owed
- Fixed expenses this month
- **Cash available after all obligations**

### Performance Metrics
- Total repair count
- Repairs this week/month
- Average ticket value
- Average profit per job
- Profit margin %
- Daily revenue goal tracker ($500/day default)
- Break-even target

### Breakdowns
- Revenue by device type
- Revenue/profit by lead source
- Referred vs non-referred performance
- Best lead source and best device

---

## Named Ranges (for power users / Apps Script)

| Name | Location | Purpose |
|------|----------|---------|
| AllocParts | Settings!B4 | Parts allocation % |
| AllocDebt | Settings!B5 | Debt allocation % |
| AllocPersonal | Settings!B6 | Personal allocation % |
| AllocSavings | Settings!B7 | Savings allocation % |
| MarketingRetainer | Settings!B11 | Monthly retainer amount |
| CommissionPerLead | Settings!B12 | Per-referral commission |
| DeviceTypes | Settings!A17:A26 | Device dropdown values |
| LeadSources | Settings!B17:B28 | Lead source dropdown values |
| PaymentStatuses | Settings!C17:C21 | Payment status options |
| RepairTypes | Settings!D17:D28 | Repair type options |
| ExpenseCategories | Settings!A31:A39 | Expense category options |
| JobDates | Repair Jobs!B2:B500 | All job dates |
| JobRevenue | Repair Jobs!H2:H500 | All job revenue |
| JobProfit | Repair Jobs!K2:K500 | All job profit |
| JobReferred | Repair Jobs!G2:G500 | Referred status |

---

## Expanding the System

### Ideas for V2
- **Invoice generator**: Apps Script to create PDF invoices from job data
- **SMS notifications**: Use Twilio API to text when a repair is done
- **Customer database**: Separate sheet tracking repeat customers
- **Inventory tracker**: Track parts stock levels, reorder alerts
- **Google Form intake**: Let customers submit repair requests via form
- **Weekly email digest**: Automated email with weekly performance summary
- **Zapier/Make integration**: Connect to CRM, accounting software
- **Multiple technicians**: Add technician column for multi-person shops
