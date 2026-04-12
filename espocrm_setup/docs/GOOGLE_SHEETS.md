# Google Sheets sync — EspoCRM → Sheets

One-way sync that mirrors every Repair Ticket to a Google Sheet.
Run on cron so the Sheet is always up to date, or run once to dump
current state. Free, no Zapier/Make needed.

---

## 1. Create an EspoCRM API User

EspoCRM requires an API key for external scripts to pull data.

1. Log in as admin → **Admin** → **API Users**
2. **+ Create** → Name: `Sheets Sync`
3. **Authentication**: API Key
4. Copy the key that's generated
5. **Roles**: assign a role that has read access to RepairTickets
   (create a role under Admin → Roles with "Repair Ticket: read" if
   one doesn't exist)
6. Paste into `.env`:
   ```env
   ESPO_API_URL=http://localhost:8080/api/v1
   ESPO_API_KEY=the_key_you_copied
   ```

## 2. Set up Google Sheets credentials

Same as the lead_system setup — reuse the same service account if you
have one:

1. Google Cloud → enable Sheets + Drive APIs
2. Create service account → download JSON key
3. In `.env`:
   ```env
   GOOGLE_SHEETS_CREDENTIALS_FILE=./path/to/key.json
   GOOGLE_SHEETS_SPREADSHEET=Tech Guardian Repairs
   GOOGLE_SHEETS_WORKSHEET=repairs
   ```
4. Create a Sheet called `Tech Guardian Repairs`, share with the
   service account email as Editor.

## 3. Run the sync

```bash
cd espocrm_setup
pip install -r scripts/requirements.txt
python scripts/sheets_sync.py
```

Output:
```
Fetched 34 tickets from EspoCRM
Google Sheets: synced 34 rows (12 updated, 22 new)
```

## 4. Schedule on cron

```bash
crontab -e
# sync every 30 minutes
*/30 * * * * cd ~/Documents/techguardian-seo/espocrm_setup && python scripts/sheets_sync.py >> logs/sheets_sync.log 2>&1
```

## Columns synced

The Sheet gets these columns in order:

| Column | Source |
| --- | --- |
| ticketId | TG-0001, TG-0002, etc. |
| name | Ticket summary |
| status | Pipeline stage |
| customerName | |
| phoneNumber | |
| deviceType | PS5, Xbox, etc. |
| issueDescription | |
| quotedPrice, partsCost, laborCost, totalCost, profit | Currency fields |
| leadSource | Where the lead came from |
| flagged | true/false |
| completedAt | When marked Completed |
| createdAt, modifiedAt | |

Rows are upserted by `ticketId` — re-running doesn't create
duplicates.
