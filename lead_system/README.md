# Tech Guardian — Ops System

A modular Python pipeline for everything Tech Guardian needs to run:
lead discovery, Yelp/Voice email parsing, manual ingest for leads you
find by hand (Facebook groups, Nextdoor, phone calls), profit tracking
against a $400/day goal, and CSV + Google Sheets + Airtable storage.

Every outreach message is saved as a **draft for manual review** —
the system never sends anything on your behalf.

---

## What it does

| Feature | How |
| --- | --- |
| Web lead discovery | Public Craigslist RSS + official Reddit API |
| Yelp lead email parsing | IMAP reader for your Zoho inbox |
| Google Voice missed-call capture | Same IMAP reader (Voice emails you) |
| Facebook groups / Nextdoor / etc. | Manual CSV ingest (you paste what you find by hand) |
| Personal-cell call logging | iPhone Shortcut that writes to Airtable in 5 seconds |
| Lead scoring 1–5 | Transparent rule scorer you can debug |
| Outreach drafts | 3 variants per lead (soft / direct / urgency) |
| Dedupe across runs | Persistent JSON ledger of URL+content hashes |
| Storage | CSV (always) + Google Sheets + Airtable (both optional) |
| Profit tracking | CLI to log repairs + daily report vs $400/day goal |

## What it does NOT do

- Scrape Facebook, Instagram, Nextdoor, or anything behind a login.
  (The manual ingest path is the compliant workaround for those.)
- Bulk auto-message anyone, ever.
- Ignore `robots.txt` — HTTP client refuses disallowed URLs.
- Touch any private platform API that doesn't officially support
  third-party read access.

---

## Folder structure

```
lead_system/
├── main.py                          # Entry: run the lead pipeline
├── config.py
├── models.py
├── requirements.txt
├── .env.example
├── README.md
├── config/
│   └── settings.yaml
├── sources/
│   ├── craigslist_source.py         # Public RSS
│   ├── reddit_source.py             # Official API via PRAW
│   ├── zoho_email_source.py         # IMAP Yelp + Voice parser
│   ├── manual_source.py             # data/manual_leads.csv ingest
│   └── forum_source.py              # RSS stub for future forums
├── processors/
│   ├── keyword_matcher.py
│   ├── scorer.py
│   └── deduper.py
├── messaging/
│   └── draft_generator.py           # 3 variants + optional LLM polish
├── storage/
│   ├── csv_store.py                 # Always-on audit trail
│   ├── google_sheets_store.py       # Optional
│   └── airtable_store.py            # Optional — Airtable REST upsert
├── jobs/
│   ├── models.py                    # Job dataclass + profit calc
│   ├── store.py                     # CSV + Airtable Jobs writer
│   ├── log_job.py                   # Interactive CLI to log a repair
│   └── report.py                    # Daily profit report vs $400/day
├── utils/
│   ├── logger.py
│   └── http.py                      # robots.txt + rate limited requests
├── docs/
│   ├── AIRTABLE_SETUP.md
│   ├── ZOHO_SETUP.md
│   └── IPHONE_SHORTCUT.md
├── data/
│   ├── leads_sample.csv             # Example (committed)
│   ├── leads.csv                    # Created on first run (gitignored)
│   ├── jobs.csv                     # Created when you log first job
│   ├── manual_leads.csv.template    # Copy to manual_leads.csv to use
│   └── seen_hashes.json             # Dedupe ledger
└── logs/
    └── lead_monitor.log              # Rotating log
```

---

## macOS setup — the "get it running" path

```bash
# 1. Pull the branch
cd ~/Documents
git clone https://github.com/guardiantechllc/techguardian-seo.git
cd techguardian-seo
git checkout claude/console-repair-lead-system-xXeY2
cd lead_system

# 2. Virtualenv + install
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 3. Config
cp .env.example .env
open -e .env            # fill in whatever you have ready

# 4. First dry run — no writes, just prints what it found
python main.py --dry-run
```

The system runs even with a completely empty `.env`. Each integration
turns on as you add credentials. Minimum viable = Airtable + Zoho.

---

## Setting up each integration

Each of these has a dedicated doc with screenshots-level detail:

| Integration | Setup doc | What it gives you |
| --- | --- | --- |
| **Airtable base schema** | `docs/AIRTABLE_SETUP.md` | Leads + Repairs + Lead Follow-Ups tables |
| **Airtable automations** | `docs/AIRTABLE_AUTOMATIONS.md` | Auto-stamp completed date, $400 quota notifications, 7-day follow-ups, lead→repair conversion |
| **Airtable dashboard** | `docs/AIRTABLE_DASHBOARD.md` | Interface Designer build: big number + gauge + trend chart |
| **Zoho IMAP** (Yelp + Voice emails) | `docs/ZOHO_SETUP.md` | Every Yelp lead email becomes a row |
| **iPhone call logger** | `docs/IPHONE_SHORTCUT.md` | Tap after each call, 5 seconds to a new row |
| **Reddit API** (optional) | See README "Reddit setup" below | Extra lead volume from public posts |
| **Google Sheets** (optional backup) | See README "Google Sheets setup" below | Backup of all Airtable data |

---

## Daily operations

### Check for new leads
```bash
cd ~/Documents/techguardian-seo/lead_system
source .venv/bin/activate
python main.py
```

Runs every source, writes new leads to CSV + Sheets + Airtable. Safe
to run as often as you want — the deduper keeps it idempotent.

### Log a completed repair
```bash
python -m lead_system.jobs.log_job
```

Interactive prompts. Writes to `data/jobs.csv` and your Airtable Jobs
table.

Or non-interactive (scripts, iPhone Shortcut, etc.):
```bash
python -m lead_system.jobs.log_job --customer "Jane Doe" \
    --device "PS5" --service "HDMI port" --revenue 180 --parts 22 \
    --source yelp
```

### See how today is tracking against the $400 goal
```bash
python -m lead_system.jobs.report
```

Shows today's revenue + profit + goal progress, plus a 7-day table.
Use `--days 30` for a monthly view.

### Add a manually-found lead (FB group, Nextdoor, word of mouth)
```bash
# First time only:
cp data/manual_leads.csv.template data/manual_leads.csv

# Then open it in any spreadsheet app and add rows
open data/manual_leads.csv

# Next pipeline run, they get ingested, scored, drafted, saved
python main.py
```

---

## Daily schedule with cron

Every 2 hours, scan sources + sync storage:

```bash
crontab -e
# paste:
0 */2 * * * cd ~/Documents/techguardian-seo/lead_system && /bin/bash -lc 'source .venv/bin/activate && python main.py >> logs/cron.log 2>&1'

# every morning at 9am, print yesterday's report to a log
0 9 * * * cd ~/Documents/techguardian-seo/lead_system && /bin/bash -lc 'source .venv/bin/activate && python -m lead_system.jobs.report >> logs/daily-report.log 2>&1'
```

---

## Reddit setup (optional — high volume, 5 minutes)

1. Go to https://www.reddit.com/prefs/apps → **create app**
2. Type = **script**, redirect URI = `http://localhost:8080`
3. Copy the id + secret into `.env`:
    ```env
    REDDIT_CLIENT_ID=xxx
    REDDIT_CLIENT_SECRET=xxx
    REDDIT_USER_AGENT=techguardian-lead-monitor/0.1 by u/your_username
    ```

If these aren't set the Reddit source is just skipped with a warning.

## Google Sheets setup (optional backup)

See `docs/AIRTABLE_SETUP.md` — Airtable is the recommended primary.
If you want Sheets too:

1. Enable Google Sheets + Drive APIs in Google Cloud
2. Create a service account, download its JSON key to
   `credentials/google-sa.json`
3. Create a sheet `Tech Guardian Leads`, share it with the service
   account email as Editor
4. Fill `.env`:
    ```env
    GOOGLE_SHEETS_CREDENTIALS_FILE=./credentials/google-sa.json
    GOOGLE_SHEETS_SPREADSHEET=Tech Guardian Leads
    GOOGLE_SHEETS_WORKSHEET=console_hdmi
    ```

---

## Lead schema

Every row in CSV, Sheets, and Airtable has the same columns:

| column | meaning |
| --- | --- |
| `id` | sha1 of `source|url` (stable — used for upsert) |
| `source` | `craigslist`, `reddit`, `zoho_email`, `manual` |
| `platform` | Human label |
| `title` | Post / listing / email subject |
| `author_or_listing_name` | Customer / poster |
| `text_snippet` | First 500 chars of the body |
| `url` | Canonical URL (or `mail:<message-id>` for emails) |
| `timestamp` | ISO-8601 publish time |
| `city_or_location` | Populated when source provides |
| `matched_keywords` | Pipe-delimited |
| `lead_type` | `console_hdmi` (extensible) |
| `intent_score` | 1..5 |
| `outreach_draft` | Best of 3 variants |
| `outreach_variants` | All 3, `---` separated |
| `status` | `new`, `reviewed`, `sent`, `skipped`, `booked` |
| `notes` | Free-form — phone number from email parser lives here |
| `created_at` | When we first saved it |

## Repair (Job) schema

Stored locally as `data/jobs.csv` and synced to the Airtable
**Repairs** table.

| column | meaning |
| --- | --- |
| `id` | Random hex |
| `date` | YYYY-MM-DD |
| `customer_name`, `customer_phone` | |
| `device` | `PS5`, `Xbox Series X`, ... |
| `service` | `HDMI port replacement`, etc. |
| `revenue`, `parts_cost`, `other_expenses` | Currency |
| `profit` | `revenue - parts_cost - other_expenses` |
| `status` | `New`, `In Progress`, `Completed`, `Cancelled` — drives the automations |
| `completed_date` | Stamped when status flips to Completed (or up-front via `log_job`) |
| `lead_source` | `yelp`, `walkin`, `craigslist`, ... |
| `notes`, `created_at` | |

---

## Safety + compliance (enforced in code)

| Rule | Where |
| --- | --- |
| Robots.txt respected | `utils/http.py` checks before every GET |
| Rate limiting | `utils/http.py` per-host min interval + backoff |
| No login scraping | Reddit = official API; Craigslist = RSS only |
| No private platforms | No FB/IG/TikTok modules exist |
| No auto-send | Only `draft_generator.py` writes text; no module sends |

---

## Troubleshooting

- **`python main.py` says "No leads fetched from any source"**
  → Check the yellow "What to do next" panel it prints. Most common
  fix: turn on Reddit (5 min) or Zoho (3 min).
- **Airtable 404** → Table name mismatch between
  `config/settings.yaml` and the actual table name in Airtable.
- **Zoho login failed** → You used your normal password. Generate an
  app-specific password (see `docs/ZOHO_SETUP.md`).
- **Yelp email parsed but customer name blank** → Yelp changed their
  template. Add a regex case to `_parse_yelp` in
  `sources/zoho_email_source.py`.
- **Profit report shows $0** → You haven't logged any jobs yet. Run
  `python -m lead_system.jobs.log_job` after your next repair.

---

## Plug into n8n later

Three integration points, covered in detail in the original README
section and still valid:

1. **Execute Command** — n8n runs `python main.py` on cron, reads
   the resulting CSV or Airtable rows
2. **Google Sheets / Airtable read** — skip the Python entirely, n8n
   polls the sheet/base directly and fires notifications when
   `status = new AND intent_score >= 4`
3. **FastAPI wrapper** — expose `main.run()` as `POST /run` so n8n
   can trigger on-demand from a chat message
