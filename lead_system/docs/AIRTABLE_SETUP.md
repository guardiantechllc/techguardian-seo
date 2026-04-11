# Airtable setup — Tech Guardian ops base

You do this once. Takes about 5 minutes.

The Python code can't create an Airtable base on your behalf because
it doesn't know your account — so you build the schema manually and
the code connects to it via API.

---

## 1. Create the base

1. Log in at https://airtable.com
2. "Add a base" → **Start from scratch** → call it **`Tech Guardian Ops`**
3. You'll land on an empty base with one table called `Table 1`. Rename
   that table to **`Leads`** (click the name → Rename).

## 2. Build the Leads table

Delete all the default fields so only `Name` remains, then rename and
add fields to match exactly this list:

| Field name               | Type            | Notes |
| ------------------------ | --------------- | ----- |
| `id`                     | Single line text| The first/primary field. Delete the default `Name` and use this. |
| `source`                 | Single line text| `craigslist`, `reddit`, `zoho_email`, `manual` |
| `platform`               | Single line text| Human label |
| `title`                  | Long text       | |
| `author_or_listing_name` | Single line text| |
| `text_snippet`           | Long text       | |
| `url`                    | URL             | |
| `timestamp`              | Single line text| Source-provided ISO string |
| `city_or_location`       | Single line text| |
| `matched_keywords`       | Long text       | Pipe-delimited |
| `lead_type`              | Single line text| `console_hdmi` by default |
| `intent_score`           | Number (integer)| 1..5 |
| `outreach_draft`         | Long text       | |
| `outreach_variants`      | Long text       | |
| `status`                 | Single select   | Options: `new`, `reviewed`, `sent`, `skipped`, `booked` |
| `notes`                  | Long text       | |
| `created_at`             | Single line text| |

**Field-name match is CRITICAL** — the code writes these exact names.
Typos will silently drop fields. Airtable is case-sensitive here.

> Pro tip: make the first field (primary) the `id` field, because
> Airtable upserts use that for row identity in the mobile app too.

## 3. Build the Repairs table

Click the `+` at the top of the table tabs → **Create empty table** →
name it **`Repairs`**. Add these fields:

| Field name         | Type             | Notes |
| ------------------ | ---------------- | ----- |
| `id`               | Single line text | Primary field |
| `date`             | Date             | Format: ISO (2026-04-11). Turn ON "Include a time field" → OFF. |
| `customer_name`    | Single line text | |
| `customer_phone`   | Phone number     | |
| `device`           | Single line text | `PS5`, `Xbox Series X`, ... |
| `service`          | Single line text | |
| `revenue`          | Currency ($)     | |
| `parts_cost`       | Currency ($)     | |
| `other_expenses`   | Currency ($)     | |
| `profit`           | Currency ($)     | Pre-computed by the Python CLI. Can also be a Formula field: `{revenue} - {parts_cost} - {other_expenses}`. |
| `status`           | Single select    | Options (in order): `New`, `In Progress`, `Completed`, `Cancelled`. **Critical — the automations trigger on this field.** |
| `completed_date`   | Date             | Stamped automatically when status → Completed. Automation in `AIRTABLE_AUTOMATIONS.md` keeps it in sync. |
| `lead_source`      | Single line text | `yelp`, `walkin`, `craigslist`, etc. |
| `notes`            | Long text        | |
| `created_at`       | Single line text | |

## 4. Build the Lead Follow-Ups table

This table is populated automatically by a 7-day follow-up automation
(see `AIRTABLE_AUTOMATIONS.md`). Create it now so the automation has
somewhere to write to.

Click `+` → **Create empty table** → name it **`Lead Follow-Ups`**.

| Field name         | Type               | Notes |
| ------------------ | ------------------ | ----- |
| `id`               | Formula            | `CONCATENATE("fu-", RECORD_ID())` — makes a stable primary |
| `customer_name`    | Single line text   | Copied from the Repair |
| `customer_phone`   | Phone number       | |
| `device`           | Single line text   | |
| `service`          | Single line text   | |
| `repair`           | Link to another record → `Repairs` | The parent repair. |
| `repair_date`      | Lookup             | Lookup `date` from linked Repair |
| `scheduled_date`   | Date               | When to reach out — set by automation to completed + 7 days |
| `status`           | Single select      | Options: `Scheduled`, `Sent`, `Done`, `Skipped` |
| `notes`            | Long text          | |
| `created_at`       | Created time       | Airtable auto-populates |

## 5. (Optional but recommended) Create useful views

In the Leads table:
- **"New hot leads"** — filter `status = new` AND `intent_score >= 4`, sort by `intent_score` desc. Your daily triage list.
- **"Booked"** — filter `status = booked`.

In the Repairs table:
- **"Active"** — filter `status = New OR In Progress`, sort by `date` asc. Your workbench.
- **"Completed today"** — filter `completed_date = TODAY()`.
- **"This week"** — filter `completed_date IS WITHIN this week`.
- **"By device"** — group by `device`, sort by `profit` desc. Tells you which repairs actually make money.

In the Lead Follow-Ups table:
- **"Due today"** — filter `scheduled_date = TODAY() AND status = Scheduled`.
- **"Overdue"** — filter `scheduled_date IS BEFORE TODAY() AND status = Scheduled`.

## 6. Get your Personal Access Token (PAT)

Airtable killed API keys in 2024 and replaced them with PATs.

1. Go to https://airtable.com/create/tokens
2. **Create new token**
3. Name: `TechGuardian Lead Monitor`
4. Scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
5. Access: add the `Tech Guardian Ops` base
6. Click **Create token** → copy the token (starts with `pat...`).
   You only see it once.

## 7. Get your Base ID

1. Open your `Tech Guardian Ops` base in a browser
2. Look at the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. The `appXXXXXXXXXXXXXX` part is your base ID.

## 8. Paste into .env

```env
AIRTABLE_API_KEY=pat_your_token_here
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

## 9. Test it

```bash
cd lead_system
source .venv/bin/activate
python -c "
from lead_system.config import load_config
from lead_system.storage.airtable_store import AirtableStore
from lead_system.models import Lead
c = load_config()
s = AirtableStore(c)
print('available:', s.available)
test = Lead(source='test', platform='test', title='Test lead — safe to delete',
            author_or_listing_name='TEST', text_snippet='This is a test',
            url='https://example.com/test-airtable-001', timestamp='2026-04-11T00:00:00+00:00')
print('wrote:', s.write([test]))
"
```

If the Leads table shows a new row with title "Test lead — safe to
delete", you're done. Delete the row in Airtable and you're ready.

---

## Troubleshooting

- **404** → Table name mismatch. Check `storage.airtable_leads_table`
  in `config/settings.yaml` matches exactly the table name in Airtable.
- **401** → PAT is wrong or expired. Regenerate.
- **403** → The PAT doesn't have access to this base. Edit the token
  and add the base under **Access**.
- **"Unknown field"** in logs → a field in `LEAD_FIELDS` is missing
  from the table. We send `typecast: true` so Airtable ignores unknown
  fields silently, but if you see the row creating without your custom
  column, check the field name spelling.
