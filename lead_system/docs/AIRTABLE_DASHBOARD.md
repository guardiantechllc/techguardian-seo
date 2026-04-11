# Airtable Dashboard — Daily Revenue Tracker

Build a visual dashboard in Airtable Interface Designer showing:
- Big number: today's revenue
- Progress bar / gauge: percentage of the $400 daily quota
- Line chart: daily revenue trend over the last 30 days

Built inside Airtable (not Python). Takes about 10 minutes.

> Prerequisite: the Repairs table exists and has at least a few rows
> (it can be a test row — just needs `revenue`, `completed_date`, and
> `status = Completed`).

---

## 1. Open Interface Designer

1. Open your **Tech Guardian Ops** base
2. Top of the screen → click **Interfaces** tab (between Data and Automations)
3. **+ Create new interface** → give it a name: `Ops Dashboard`
4. Pick a layout — for a dashboard, choose **Dashboard (blank)** or the **Dashboard** starter template

---

## 2. Create helper fields on the Repairs table (one-time)

Before building the dashboard elements, add a couple of formula
fields to the Repairs table. These make the dashboard much simpler
because each element only has to read a field, not compute anything.

Go back to the **Data** tab → open **Repairs** table → add:

### `revenue_today` (Formula, Number, currency format)
```
IF(
  AND(
    {status} = "Completed",
    IS_SAME({completed_date}, TODAY(), "day")
  ),
  {revenue},
  0
)
```

### `revenue_this_week` (Formula, Number, currency format)
```
IF(
  AND(
    {status} = "Completed",
    IS_SAME({completed_date}, TODAY(), "week")
  ),
  {revenue},
  0
)
```

### `quota_met` (Formula, Number)
```
IF({revenue_today} > 0, 1, 0)
```
(Used for a ring-style progress gauge.)

Now any rollup on these fields is a one-click dashboard element.

---

## 3. Build the dashboard elements

Back to the **Interfaces** tab → open your `Ops Dashboard` interface.

### Element 1 — Big number: today's revenue

1. Click **+ Add element** → **Number**
2. Data source: **Repairs** table
3. Value: **Sum of** → `revenue_today`
4. Label: `Today's Revenue`
5. Optional: set comparison period → "vs yesterday" — Airtable can
   compute a delta for you with the built-in comparison setting.
6. Format: currency ($)
7. Size: large — drag it to span two columns of the dashboard grid

### Element 2 — Progress gauge: percentage of $400 quota

Airtable Interface Designer has a **Progress bar** element under
"Number" element types.

1. Click **+ Add element** → **Progress bar**
2. Data source: **Repairs**
3. Value: **Sum of** → `revenue_today`
4. Target: `400` (literal value)
5. Label: `Daily Quota ($400)`
6. Color stops (optional but nice):
   - 0–50%: red
   - 50–99%: yellow
   - 100%+: green

If the Progress bar element isn't available on your plan, use a
**Chart** → **Gauge** element instead:

1. **+ Add element** → **Chart** → **Gauge**
2. Data source: **Repairs**
3. Metric: **Sum of** → `revenue_today`
4. Min: `0`, Max: `400`
5. Label: `Today vs $400`

### Element 3 — Trend chart: daily revenue over the last 30 days

1. **+ Add element** → **Chart** → **Line chart**
2. Data source: **Repairs**
3. X axis: `completed_date`
4. X axis grouping: **Day**
5. Y axis: **Sum of** → `revenue`
6. Filter:
   - `status = Completed`
   - `completed_date is within` → `the last 30 days`
7. Reference line (optional): horizontal line at `400` so you can see
   at a glance which days hit the goal.
8. Size: make it full-width across the bottom of the dashboard.

### Element 4 — Bonus: job count and average ticket

1. **+ Add element** → **Number** → **Count of** records
2. Filter: `status = Completed AND completed_date = TODAY()`
3. Label: `Jobs today`

4. **+ Add element** → **Number** → **Average of** `revenue`
5. Filter: same as above
6. Label: `Avg ticket today`

### Element 5 — "Active repairs" list

This isn't on the original plan but it's the most useful item on the
whole dashboard. Shows what's actually on your bench right now.

1. **+ Add element** → **Record list**
2. Data source: **Repairs**
3. Filter: `status = New OR status = In Progress`
4. Sort: `date` ascending (oldest first = most overdue first)
5. Columns to show: `customer_name`, `device`, `service`, `status`, `date`
6. Label: `Active repairs`

Drag it to the right side of the dashboard so you can see pending work
alongside the revenue numbers.

---

## 4. Final layout suggestion

```
┌──────────────────────────────────┬──────────────────────────┐
│                                  │                          │
│   Today's Revenue                │   Active Repairs         │
│       $320                       │   (list of in-progress)  │
│   ▓▓▓▓▓▓▓▓▓▓░░░░   80% of $400   │                          │
│                                  │                          │
├──────────────┬───────────────────┤                          │
│  Jobs today  │  Avg ticket       │                          │
│      3       │     $107          │                          │
├──────────────┴───────────────────┴──────────────────────────┤
│                                                              │
│   Daily Revenue — Last 30 Days (line chart)                  │
│   ─── $400 goal line ──────────────────────                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Publish it to your phone

1. Top right of the interface → **Publish**
2. Open the Airtable mobile app on your iPhone
3. Bases → Tech Guardian Ops → **Interfaces** → `Ops Dashboard`
4. Add it as a home-screen widget if you want: long-press the
   Airtable app icon → Home Screen → add widget → pick `Ops Dashboard`

Now you can glance at your phone between repairs and see exactly
how close you are to the daily goal.

---

## 6. Refresh frequency

Airtable dashboards refresh in near-real-time whenever the underlying
data changes. You don't need to set a refresh interval — mark a
Repair as Completed, the big number goes up within a couple of
seconds.

If you're using the Python `log_job` CLI, the Airtable sync runs
synchronously so by the time the command returns, the dashboard is
already updated.

---

## Troubleshooting

- **Big number shows $0 even though you logged repairs** → The
  `revenue_today` formula depends on `status = Completed` AND
  `completed_date = TODAY()`. Check that both are set. The Python
  `log_job` CLI stamps `completed_date` automatically when status
  defaults to Completed, but if you're adding rows directly in
  Airtable make sure to set the status to Completed (or let
  Automation 1 do it).
- **Line chart looks empty** → You need at least a few days of data
  for the trend to be interesting. Log 2-3 test jobs spread over
  different dates to see it populate.
- **Progress bar isn't an option** → You're on a plan tier that
  doesn't include it. Use the Chart → Gauge element instead; it's
  available on every plan.
- **Dashboard works on desktop but not mobile** → Interfaces need to
  be published separately. Click Publish in the top right each time
  you make structural changes.
