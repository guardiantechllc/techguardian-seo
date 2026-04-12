# EspoCRM Dashboard — Daily Revenue Tracker

Build a dashboard showing 4 KPIs + a pipeline Kanban.

> EspoCRM free version has built-in Reports (list + grid), chart
> dashlets, and the Kanban board. No paid pack needed for this.

---

## 1. Create the 4 KPI reports

Go to **Reports** (top nav) → create each one:

### Report 1: Total Revenue (30 Days)

1. **+ Create Report** → Type: **Grid**
2. Entity Type: **Repair Ticket**
3. **Filters**:
   - `status` equals `Completed`
   - `completedAt` is after **{today} minus 30 days** (use relative date: "Last 30 days")
4. **Columns**: add `SUM: quotedPrice`
5. **Group By**: (none — we want a single total)
6. **Name**: `Total Revenue (30 Days)`
7. **Save**
8. Click **Run** to verify — should show a single number.

### Report 2: Total Profit (30 Days)

Same as above but:
4. **Columns**: `SUM: profit`
6. **Name**: `Total Profit (30 Days)`

### Report 3: Jobs Completed (30 Days)

1. **+ Create Report** → Type: **Grid**
2. Entity: **Repair Ticket**
3. Filters: same (Completed, last 30 days)
4. **Columns**: `COUNT: id`
5. **Name**: `Jobs Completed (30 Days)`

### Report 4: Average Profit per Job

1. **+ Create Report** → Type: **Grid**
2. Entity: **Repair Ticket**
3. Filters: same
4. **Columns**: `AVG: profit`
5. **Name**: `Avg Profit per Job`

---

## 2. Pin reports to the dashboard

1. Go to the **Home** page (click EspoCRM logo or Home link)
2. Click the **pencil icon** in the top right of the dashboard area
   (or click **Edit Dashboard**)
3. **+ Add Dashlet** → choose **Report**
   - Select: `Total Revenue (30 Days)`
   - Display As: **Total** (big number)
   - Color: green
4. Repeat for the other 3 reports:
   - `Total Profit (30 Days)` → big number, green
   - `Jobs Completed (30 Days)` → big number, blue
   - `Avg Profit per Job` → big number, blue
5. Drag them into a 2x2 grid at the top of the dashboard.

---

## 3. Add the Kanban pipeline view

1. Still on the dashboard, **+ Add Dashlet** → **Record List**
2. Entity: **Repair Ticket**
3. **Primary Filter**: `status` not in [`Completed`, `No Fix`]
4. Sort by: `createdAt` descending
5. Columns: `ticketId`, `name`, `status`, `customerName`, `deviceType`
6. Title: `Active Repairs`
7. Place it below the KPI row.

For the full Kanban board:
1. Navigate to **Repair Tickets** (top nav tab)
2. Click the **view toggle** in the top right → select **Kanban**
3. The board shows columns for each status (New Lead → ... → Completed)
4. Drag tickets between columns to update status.
5. The "Completed" and "No Fix" columns are hidden (configured in
   `scopes/RepairTicket.json` → `kanbanStatusIgnoreList`).

---

## 4. Add a revenue trend chart

1. Go to **Reports** → **+ Create Report** → Type: **Grid**
2. Entity: **Repair Ticket**
3. Filters: `status` = `Completed`, `completedAt` within last 30 days
4. Columns: `SUM: quotedPrice`
5. **Group By**: `completedAt` → **Day**
6. Name: `Daily Revenue Trend`
7. **Chart Type**: **Line** or **Bar**
8. **Save** → **Run** to verify
9. Go back to Home → **Edit Dashboard** → **+ Add Dashlet** → **Report**
   - Select `Daily Revenue Trend`
   - Display As: **Chart**
   - Size: full width
10. Place it at the bottom of the dashboard.

---

## 5. Final dashboard layout

```
┌─────────────────┬─────────────────┐
│  Total Revenue   │  Total Profit    │
│     $5,400       │     $3,210       │
├─────────────────┼─────────────────┤
│  Jobs Completed  │  Avg Profit/Job  │
│       27         │     $118.89      │
├─────────────────┴─────────────────┤
│  Active Repairs (list)             │
│  TG-0034  PS5 HDMI    In Progress  │
│  TG-0033  Xbox HDMI   Awaiting...  │
│  TG-0032  iPhone 14   Diagnosed    │
├────────────────────────────────────┤
│  Daily Revenue Trend (chart)       │
│  ████ █████ ██ ████████ ███ ██     │
└────────────────────────────────────┘
```

---

## 6. Mobile access

EspoCRM is responsive. Open `http://YOUR_SERVER:8080` on your phone's
browser and the dashboard adapts to the screen. Pin it to your home
screen ("Add to Home Screen" in Safari / Chrome) for an app-like feel.

---

## Tips

- **Refresh period**: dashlets auto-refresh every 5 minutes by
  default. Click the gear icon on a dashlet to change it.
- **Multiple dashboards**: EspoCRM supports multiple dashboard tabs.
  Create one called "Revenue" with the 4 KPIs and chart, and another
  called "Pipeline" with just the Kanban record list.
- **Admin users see all tickets**. If you add technicians later, set
  up teams + roles so each tech sees only their assigned tickets but
  you see everything.
