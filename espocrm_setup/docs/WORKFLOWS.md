# EspoCRM Workflows — Repair Ticket Automations

Four workflows built in the EspoCRM Admin UI. These can't be created
through files or the API — you click through the Workflow builder once
per automation.

> Go to **Admin** (top right) → **Workflows** (under BPM & Workflows).

---

## Workflow 1 — "Auto-assign New Lead status on creation"

**What it does:** when a new RepairTicket is created without an
explicit status, force it to "New Lead" so your Kanban board is
consistent.

> The `beforeSaveCustomScript` in entityDefs already defaults status
> to "New Lead", so this workflow is belt-and-suspenders. Skip it if
> you trust the default.

### Build steps

1. **+ Create Workflow**
2. **Target Entity**: `Repair Ticket`
3. **Type**: `After record created`
4. **Conditions**: None (fire on every new ticket)
5. **Actions**: click **Add Action** → **Update Target Record**
   - Field: `status` → Value: `New Lead`
   - Only if: `status` is empty (to not override an explicit value)
6. **Save** → mark **Active**

---

## Workflow 2 — "Flag stale tickets (48 hours without update)"

**What it does:** if a ticket's `status` hasn't changed in 48 hours
and it's not already Completed or No Fix, set `flagged = true` and
write a reason. The Kanban board will show a flag icon so you can
spot stalled jobs immediately.

### Build steps

1. **+ Create Workflow**
2. **Target Entity**: `Repair Ticket`
3. **Type**: `Scheduled`
4. **Scheduling**:
   - Run every: **1 hour** (or 2 hours to save CPU)
   - Target: records matching conditions below
5. **Conditions** (all must be true):
   - `status` not in [`Completed`, `No Fix`]
   - `flagged` equals `false`
   - `modifiedAt` is before **{now} minus 48 hours**
     (In the condition builder: `modifiedAt` → `Before` →
     use the formula: `datetime\addHours(datetime\now(), -48)`)
6. **Actions**: click **Add Action** → **Update Target Record**
   - `flagged` → `true`
   - `flagReason` → `No update in 48 hours`
7. **Save** → mark **Active**

### Bonus: auto-unflag when ticket moves

Add a second workflow:

1. **Target Entity**: `Repair Ticket`
2. **Type**: `After record saved`
3. **Conditions**: `status` has changed (use "Field changed" condition) AND `flagged` is `true`
4. **Actions**: **Update Target Record**
   - `flagged` → `false`
   - `flagReason` → (empty)
5. **Save** → **Active**

Now the flag clears the moment you touch the ticket again.

---

## Workflow 3 — "Trigger SMS when Ready for Pickup"

**What it does:** when `status` changes to "Ready for Pickup", fire a
webhook that sends an SMS to the customer. We use a webhook approach
so you can plug in Twilio, Vonage, or any SMS gateway without changing
EspoCRM.

### Option A: Webhook → external SMS sender

1. **+ Create Workflow**
2. **Target Entity**: `Repair Ticket`
3. **Type**: `After record saved`
4. **Conditions**:
   - `status` equals `Ready for Pickup`
   - `status` has changed (important — prevents firing every save)
5. **Actions**: **Send HTTP Request** (sometimes called "Make HTTP Request" or "Webhook")
   - **URL**: `https://YOUR_WEBHOOK_ENDPOINT/sms`
     (e.g. an n8n webhook, a Zapier catch hook, or a tiny Flask server)
   - **Method**: `POST`
   - **Headers**: `Content-Type: application/json`
   - **Body** (JSON):
     ```json
     {
       "to": "{phoneNumber}",
       "customerName": "{customerName}",
       "ticketId": "{ticketId}",
       "message": "Hi {customerName}, your {deviceType} is ready for pickup at Tech Guardian! Ticket {ticketId}."
     }
     ```
   (Use EspoCRM's `{fieldName}` placeholder syntax in the body.)
6. **Save** → **Active**

### Option B: Direct Twilio (if you have an n8n or small server)

If you want to cut out the middleman, create a tiny webhook receiver
that calls Twilio directly. Here's a minimal Python version you can
run alongside EspoCRM:

```python
# sms_webhook.py — run with: python sms_webhook.py
from flask import Flask, request
from twilio.rest import Client
import os

app = Flask(__name__)

@app.route("/sms", methods=["POST"])
def send_sms():
    data = request.json
    client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])
    client.messages.create(
        body=data["message"],
        from_=os.environ["TWILIO_FROM_NUMBER"],
        to=data["to"],
    )
    return {"status": "sent"}, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050)
```

Point the EspoCRM webhook at `http://YOUR_SERVER:5050/sms`.

### Option C: No SMS, just email

If SMS isn't ready yet, change the action to **Send Email** instead:

1. **Actions**: **Send Email**
   - To: `{email}` (or leave blank and send to yourself as a reminder)
   - Subject: `Your {deviceType} is ready for pickup — {ticketId}`
   - Body: `Hi {customerName}, your device is ready...`

You can always switch to SMS later by swapping the action.

---

## Workflow 4 — "Log revenue when Completed"

**What it does:** when `status` changes to "Completed", the
`beforeSaveCustomScript` in entityDefs already auto-stamps
`completedAt` and computes `profit`. This workflow adds an activity
log entry to the ticket's stream so you have an audit trail.

Optionally, it also creates a task to follow up in 7 days.

### Build steps

1. **+ Create Workflow**
2. **Target Entity**: `Repair Ticket`
3. **Type**: `After record saved`
4. **Conditions**:
   - `status` equals `Completed`
   - `status` has changed
5. **Actions**:

   **Action 1**: **Create Related Record** → `Task`
   - Name: `Follow up: {customerName} — {ticketId}`
   - Date Start: **{now} + 7 days**
     (use formula: `datetime\addDays(datetime\now(), 7)`)
   - Status: `Not Started`
   - Assigned User: same as ticket's assigned user
   - Description: `Customer: {customerName}\nDevice: {deviceType}\nRepair: {name}\nProfit: {profit}`

   **Action 2** (optional): **Send Email** to yourself
   - Subject: `Completed: {ticketId} — ${profit} profit`
   - Body: revenue summary

6. **Save** → **Active**

---

## Verification checklist

After building all four, test them:

1. **Create a new Repair Ticket**
   - It should get status "New Lead" and a ticket ID like TG-0001.
2. **Wait (or set modifiedAt manually in the DB to 3 days ago)**
   - The hourly scheduled workflow should set `flagged = true`.
3. **Change status to "Ready for Pickup"**
   - The webhook/email fires.
4. **Change status to "Completed"**
   - `completedAt` gets stamped, `profit` is computed.
   - A 7-day follow-up Task appears.
   - (Optional) You get a "Completed" email.

You can see workflow run history at **Admin → Workflows → (workflow)
→ Log** tab. Every trigger attempt + result is recorded.

---

## Troubleshooting

- **Workflow never fires** → Check that EspoCRM's daemon container
  (`techguardian-daemon`) is running. Scheduled workflows won't run
  without it: `docker compose ps` and verify it shows "Up".
- **"Field changed" condition doesn't work** → Make sure you selected
  "Field was changed" in the condition builder, not "Field equals".
  They're different conditions in EspoCRM.
- **Webhook gets 404** → Your SMS server isn't running or the port is
  wrong. Test the webhook URL with curl first.
- **Stale flag never triggers** → The scheduled workflow runs at the
  interval you set (default 1h). It won't fire between runs. Check
  the scheduled workflow log and make sure the "Before" date formula
  is correct.
