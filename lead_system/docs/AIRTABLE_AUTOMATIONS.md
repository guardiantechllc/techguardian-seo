# Airtable Automations — Tech Guardian Ops

Three automations built in the Airtable UI. They're configured once
per base and run forever.

> **Read this first:** Airtable automations can't be created via the
> API or MCP — you build them inside Airtable. I wrote the Python
> side (status field, completed_date field) so these trigger cleanly.
>
> Prerequisite: you've built the Leads + Repairs + Lead Follow-Ups
> tables per `AIRTABLE_SETUP.md`.

---

## Automation 1 — "Stamp completed_date when a repair is marked Completed"

**Why:** the dashboard and daily-quota automation both use
`completed_date = TODAY()` to roll up today's revenue. Without this
stamp, completed repairs wouldn't count toward today's goal if you
log them the next morning.

> The Python `log_job` CLI already stamps `completed_date` on new
> rows, so this automation is for the case where you update a repair
> in Airtable directly (e.g. you log it as "In Progress" this morning
> and mark it Completed tonight).

### Build steps

1. Open the base → top right **Automations** tab → **+ Create automation**
2. Name: `Stamp completed_date on Completed`
3. **Trigger:** "When record matches conditions"
   - Table: **Repairs**
   - Conditions: `status` `is` `Completed`
   - Click **Test trigger** — pick any existing record (doesn't need to be Completed yet) just to validate the step.
4. **Action:** "Update record"
   - Table: **Repairs**
   - Record ID: click the blue `+` → pick the trigger step → pick **Airtable record ID**
   - Fields to update: `completed_date` → click the blue `+` → **Insert date** → **NOW** (this gives a date-time; Airtable will coerce it into the Date field)
5. **Test action** — should succeed.
6. Toggle **On** in the top right.

### Alternative: formula field (zero-automation version)

If you hate automations, you can skip step 1 entirely and make
`completed_date` a **Formula field** instead of a Date field:

```
IF({status} = "Completed", IF({completed_date_raw}, {completed_date_raw}, TODAY()))
```

…but that gets funky because formula fields can't be written to, so
you'd need a hidden `completed_date_raw` field for back-dating. The
automation approach is cleaner. Recommend sticking with the automation.

---

## Automation 2 — "Daily quota met" notification

**Why:** the whole point of the $400/day target is knowing when you
cross it. This fires a notification the moment you hit it so you can
celebrate (or push for more).

### Build steps

1. **Automations** → **+ Create automation**
2. Name: `Daily $400 quota met`
3. **Trigger:** "When record matches conditions"
   - Table: **Repairs**
   - Conditions: `status` `is` `Completed` **AND** `completed_date` `is` `today`
   - (Airtable triggers once per record matching the condition — we'll add a dedupe check in the script step below.)
4. **Action:** "Run script"
   - Click **+ Add action** → **Run a script**
   - Paste the script from the next section.
5. **Action:** "Send email" (or Slack, or SMS via a Webhook — see variants below)
   - Only fires if the script step returns "quota met for first time today".

### Script: "is this the first time today we hit $400?"

Airtable's script action can query records with filterByFormula-style
queries and return output for the next step to conditionally act on.

Paste this into the script action (edit `DAILY_TARGET` if you ever
change the goal):

```javascript
// Tech Guardian — daily $400 quota check
const DAILY_TARGET = 400;

// Pull every Completed repair from today
const table = base.getTable('Repairs');
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const query = await table.selectRecordsAsync({
    fields: ['revenue', 'completed_date', 'status'],
});

let todaysRevenue = 0;
for (const record of query.records) {
    const status = record.getCellValueAsString('status');
    const completedDate = record.getCellValueAsString('completed_date');
    if (status === 'Completed' && completedDate === today) {
        todaysRevenue += record.getCellValue('revenue') || 0;
    }
}

// We also want to only fire ONCE per day. We track that by looking
// at a `quota_notified_date` field on a tiny Settings table — or, if
// you don't want a Settings table, we compare today's total vs the
// total BEFORE this triggering record and see if we just crossed.
const triggerRecordId = input.config().triggerRecordId;
const triggerRecord = query.getRecord(triggerRecordId);
const triggerRevenue = triggerRecord.getCellValue('revenue') || 0;
const revenueBefore = todaysRevenue - triggerRevenue;

const justCrossed = revenueBefore < DAILY_TARGET && todaysRevenue >= DAILY_TARGET;

output.set('todaysRevenue', todaysRevenue);
output.set('justCrossed', justCrossed);
output.set('target', DAILY_TARGET);
```

6. Back in the **Run script** action, click **Input variables** and add:
   - Name: `triggerRecordId`
   - Value: click the blue `+` → pick the trigger step → pick **Airtable record ID**
7. **Action 3:** "Send email" (or your preferred channel)
   - Condition: add a **Find records** or simply use a **Conditional logic** step above Send Email with condition `justCrossed = true`.
   - Actually, the simplest path: put the script output into the email subject and use an `IF` in the email body. Alternative: use a **Conditional group** action, set condition `{justCrossed} is true`, and put the email inside.
8. Email configuration:
   - To: your own address
   - Subject: `Quota met — ${todaysRevenue} today`
   - Body: `You just crossed the $400/day goal. Today total: $${todaysRevenue}. Keep going.`

### Channel variants (pick one)

| Channel | Action to use | Notes |
| --- | --- | --- |
| **Email** | Send email | Zero-config, lands in your Zoho |
| **Slack** | Send Slack message | Requires a free Slack workspace + Airtable Slack extension |
| **SMS** | Run Twilio webhook | $0.0075 per text, needs Twilio account |
| **Push notification to phone** | Use Airtable mobile app + "Send notification" | Free, requires the Airtable iPhone app installed + logged in |

**Recommended for a solo shop:** Airtable mobile push notification.
It's free, it's loud, and the app is already on your phone so you
don't need another service.

---

## Automation 3 — "Schedule a 7-day follow-up"

**Why:** 7 days after a repair is done is the sweet spot for asking
for a Google review, checking that nothing broke, and reminding the
customer you fixed something for them (= referrals).

### Build steps

1. **Automations** → **+ Create automation**
2. Name: `Schedule 7-day follow-up`
3. **Trigger:** "When record matches conditions"
   - Table: **Repairs**
   - Conditions: `status` `is` `Completed`
4. **Action:** "Create record"
   - Table: **Lead Follow-Ups**
   - Fields to set:
     - `customer_name` → click blue `+` → trigger step → `customer_name`
     - `customer_phone` → trigger step → `customer_phone`
     - `device` → trigger step → `device`
     - `service` → trigger step → `service`
     - `repair` → trigger step → **Airtable record ID** (this creates the link-to-Repairs relationship)
     - `scheduled_date` → click blue `+` → **Insert date** → **DATEADD** → `{trigger step → completed_date}`, amount `7`, unit `days`
     - `status` → `Scheduled`
     - `notes` → `Auto-created by Schedule 7-day follow-up automation`
5. **Test action** → pick a Completed repair → should create a row in Lead Follow-Ups with a date 7 days out.
6. Toggle **On**.

### Bonus: "Remind me about today's follow-ups at 9am"

Pair automation 3 with a second, time-based automation:

1. **+ Create automation** → Name: `Morning follow-up reminder`
2. **Trigger:** "At scheduled time"
   - Repeat: **Daily**
   - Time: **9:00 AM** (your local timezone)
3. **Action:** "Find records"
   - Table: **Lead Follow-Ups**
   - Condition: `scheduled_date = TODAY() AND status = Scheduled`
4. **Action:** "Send email" (or Airtable notification)
   - Subject: `Follow up with {count} customer(s) today`
   - Body: list each customer + phone + original device from the find-records step (Airtable lets you loop through them as table markdown).

---

## Automation 4 (optional but powerful) — "Convert a Lead into a Repair"

This closes the loop between the automated lead capture pipeline and
your Repairs table. When you flip a Lead's `status` to `booked`, this
creates a Repair record pre-filled from the Lead.

1. **+ Create automation** → Name: `Lead → Repair on booked`
2. **Trigger:** "When record matches conditions"
   - Table: **Leads**
   - Conditions: `status` `is` `booked`
3. **Action:** "Create record"
   - Table: **Repairs**
   - Fields:
     - `id` → trigger → `id` (keeps the same id so the CSV-side upsert still works)
     - `customer_name` → trigger → `author_or_listing_name`
     - `customer_phone` → trigger → `notes` (phone usually lives in notes for email-sourced leads; or leave blank and fill in later)
     - `device` → leave blank, you'll fill in after intake
     - `service` → leave blank
     - `status` → `New`
     - `lead_source` → trigger → `source`
     - `notes` → "Converted from lead " + trigger → `title`

Now a lead that books becomes a work order with zero re-typing.

---

## Verifying everything fires

1. Manually create a test Repair in Airtable:
   - `customer_name`: Test
   - `device`: PS5
   - `revenue`: 450
   - `status`: Completed
2. Within ~30 seconds:
   - `completed_date` should auto-fill to today (Automation 1)
   - You should get a notification (Automation 2) because 450 > 400
   - A row should appear in Lead Follow-Ups with a date 7 days out (Automation 3)
3. Delete the test record. Automations don't "undo" — you'll also need to manually delete the Lead Follow-Up row it created and ignore the notification.

---

## Debugging

- **Automation didn't fire** → Check the Run history tab in the automation editor. Airtable shows every trigger attempt + result.
- **Script step fails** → Most common cause: a cell value is `null` because the field doesn't exist or got renamed. Script steps log cleanly in the run history.
- **Notification sent twice** → Your "just crossed" logic needs the `revenueBefore` calculation to be correct. If you're updating an existing record (not creating), the trigger fires but `revenueBefore` may already include the new amount. Consider a Settings table with a `notified_today` boolean instead — let me know if you want that version and I'll write it.
- **Follow-up row created twice** → Add a condition to the Repair trigger: `status is Completed AND completed_date was modified today`. That dedupes "status bounced from Completed → In Progress → Completed again."
