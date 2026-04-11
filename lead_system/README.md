# Tech Guardian — Console HDMI Repair Lead Monitor

A compliant, modular Python pipeline that discovers **public** repair leads
(PS5/PS4/Xbox HDMI, no-signal, black-screen posts and listings) across
approved sources, scores them 1–5, drafts 3 outreach variants per lead, and
saves everything to Google Sheets (with a CSV fallback).

> Built for **Tech Guardian** (Lee's Summit, MO / Kansas City metro).

---

## What it does — and does NOT do

**Does:**
- Searches **public** Craigslist RSS feeds and the **official Reddit API**.
- Normalizes results into a single `Lead` schema.
- Scores intent on a 1–5 scale using transparent, configurable rules.
- Writes 3 human-reviewable outreach drafts per lead.
- Persists to CSV + (optional) Google Sheets with upsert-by-id.
- Deduplicates across runs via a local JSON ledger.
- Logs everything to `logs/lead_monitor.log` (rotating) and to the console.

**Does NOT:**
- Send DMs, emails, or SMS. Every draft is manually reviewed by you.
- Scrape anything behind a login, captcha, or paywall.
- Touch Facebook, Instagram, or any private-platform API.
- Ignore `robots.txt` — the HTTP client refuses disallowed URLs by default.
- Run bulk auto-outreach of any kind.

Compliance is enforced in code (see `utils/http.py`) and in config
(`config/settings.yaml` only points at publicly documented endpoints).

---

## Folder structure

```
lead_system/
├── main.py                       # Entry point
├── config.py                     # YAML + .env loader
├── models.py                     # Lead dataclass + field schema
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
├── config/
│   └── settings.yaml             # Keywords, sources, scoring knobs
├── sources/
│   ├── base.py
│   ├── craigslist_source.py      # Public Craigslist RSS
│   ├── reddit_source.py          # Official Reddit API (PRAW)
│   └── forum_source.py           # Clean stub for future RSS feeds
├── processors/
│   ├── keyword_matcher.py
│   ├── scorer.py                 # 1..5 intent scoring
│   └── deduper.py                # Persistent seen-hash ledger
├── messaging/
│   └── draft_generator.py        # 3 variants + optional LLM polish
├── storage/
│   ├── csv_store.py              # Always-on CSV upsert
│   └── google_sheets_store.py    # Optional Sheets sync
├── utils/
│   ├── logger.py                 # Rich console + rotating file log
│   └── http.py                   # Polite requests: robots.txt + rate limit
├── data/
│   ├── leads_sample.csv          # Example output (committed)
│   ├── leads.csv                 # Created on first run (gitignored)
│   └── seen_hashes.json          # Dedupe ledger (gitignored)
└── logs/
    └── lead_monitor.log          # Rotating log (gitignored)
```

---

## macOS setup — exact terminal commands

```bash
# 1. Clone the repo (if you haven't already) and enter the project folder
cd ~/Projects
git clone https://github.com/guardiantechllc/techguardian-seo.git
cd techguardian-seo/lead_system

# 2. Create and activate a Python 3.10+ virtualenv
python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Create your .env from the template and edit credentials
cp .env.example .env
open -e .env   # (or: nano .env)

# 5. (Optional) drop a Google service-account key for Sheets output
mkdir -p credentials
# move the downloaded JSON into credentials/google-sa.json
# then make sure .env points GOOGLE_SHEETS_CREDENTIALS_FILE at it

# 6. Run a one-off dry-run (no writes, just prints what it found)
python main.py --dry-run

# 7. Real run — writes to data/leads.csv and Sheets if configured
python main.py
```

### Running as a module (from the repo root)

```bash
cd ~/Projects/techguardian-seo
source lead_system/.venv/bin/activate
python -m lead_system.main
```

### Scheduling on macOS (cron, every 2 hours)

```bash
crontab -e
# add:
0 */2 * * * cd ~/Projects/techguardian-seo/lead_system && /bin/bash -lc 'source .venv/bin/activate && python main.py >> logs/cron.log 2>&1'
```

---

## Configuration

Everything tunable lives in two files:

- **`config/settings.yaml`** — keywords, subreddits, search paths,
  scoring weights, local city list, storage file paths.
- **`.env`** — secrets only (Reddit API keys, Google Sheets path,
  optional OpenAI key). Never committed.

### Adding a new keyword

Edit `config/settings.yaml`:

```yaml
keywords:
  symptom:
    - "HDMI flicker"
```

No code changes required — the matcher compiles patterns at runtime.

### Disabling a source temporarily

```yaml
sources:
  reddit:
    enabled: false
```

Or at run time:

```bash
RUN_SOURCES=craigslist python main.py
```

---

## Google Sheets setup (optional)

1. Create a Google Cloud project and enable **Google Sheets API** and
   **Google Drive API**.
2. Create a **service account** under IAM → Service Accounts.
3. Generate a JSON key for that service account and save it to
   `lead_system/credentials/google-sa.json`.
4. In your Google Sheet (create one called `Tech Guardian Leads`),
   click **Share** and invite the service-account email
   (`...iam.gserviceaccount.com`) as **Editor**.
5. Fill in `.env`:

    ```env
    GOOGLE_SHEETS_CREDENTIALS_FILE=./credentials/google-sa.json
    GOOGLE_SHEETS_SPREADSHEET=Tech Guardian Leads
    GOOGLE_SHEETS_WORKSHEET=console_hdmi
    ```

If any of those are missing, the pipeline quietly writes CSV only.

---

## Reddit setup (optional but recommended)

1. Go to https://www.reddit.com/prefs/apps → **create app**.
2. Type = **script**. Redirect URI = `http://localhost:8080`.
3. Put the client id, secret, and a descriptive user agent in `.env`.
4. That's it — the source is read-only; no DMs, no votes.

If `.env` has no Reddit creds, the Reddit source is skipped with a
warning and the rest of the pipeline still runs.

---

## Lead schema

Every row in `data/leads.csv` and Google Sheets has the same columns:

| column | meaning |
| --- | --- |
| `id` | 16-char sha1 of `source|url` (or random fallback) — used for upsert |
| `source` | `craigslist`, `reddit`, `forum_stub`, ... |
| `platform` | Human label, e.g. `Reddit /r/kansascity` |
| `title` | Post / listing title |
| `author_or_listing_name` | Reddit username or Craigslist listing label |
| `text_snippet` | First 500 chars of the body, HTML-stripped |
| `url` | Canonical URL |
| `timestamp` | ISO-8601 publish time from source |
| `city_or_location` | Populated when the source provides one |
| `matched_keywords` | Pipe-delimited list from keyword matcher |
| `lead_type` | `console_hdmi` (extensible) |
| `intent_score` | Integer 1..5 |
| `outreach_draft` | Best variant (default: the direct one) |
| `outreach_variants` | All 3 variants, `---` separated |
| `status` | `new`, `reviewed`, `sent`, `skipped`, `booked` |
| `notes` | Free-form notes you add during review |
| `created_at` | UTC timestamp when the row was first saved |

See `data/leads_sample.csv` for a fully-populated example.

---

## Safety + compliance notes (how we enforce the rules)

| Rule | Where it's enforced |
| --- | --- |
| No bulk auto-messaging | Only `draft_generator.py` writes drafts; no module sends. |
| No scraping behind logins | Reddit goes through official API; Craigslist uses RSS. |
| No captcha bypass | None attempted anywhere. |
| Robots.txt respected | `utils/http.py` checks before every GET. |
| Rate limiting | `utils/http.py` enforces per-host min interval + backoff. |
| No private platforms | No Facebook / Instagram / TikTok modules exist. |
| Transparent scoring | `scorer.py` rules are plain Python with config knobs. |

---

## Safest next upgrades

These are the upgrades that add the most lead quality **without** adding
compliance risk:

1. **Human-in-the-loop triage UI.** A tiny Flask or Streamlit page
   that reads `data/leads.csv`, lets you flip `status` between
   `new/reviewed/sent/skipped/booked`, and writes it back. Keeps all
   messaging manual but speeds up review.
2. **More RSS sources.** Add reliable Google Alerts RSS and any local
   classifieds RSS you trust to `sources.forum_stub.feeds` — the code
   already handles that path.
3. **Geofence scoring.** Weight local city mentions more aggressively
   (bump `scoring.local_city_bonus` from 1 to 2) and optionally require
   that non-Craigslist leads mention a local city before being kept.
4. **Per-lead screenshot.** Use `requests` + `playwright` (headless,
   respecting robots) to save a PNG of each listing page so your
   reviewer has context without leaving the spreadsheet.
5. **Separate "repair history" sheet.** A second worksheet that logs
   which leads you contacted, replied, and booked — so the scorer can
   learn later (without ML, just heuristic feedback).
6. **LLM polish gated behind a flag.** The `OPENAI_API_KEY` hook is
   already in `draft_generator.py`. Add a CLI flag
   `--polish-drafts` so you opt in per run.
7. **Observability.** Pipe the rotating log to Papertrail or Better
   Stack so cron jobs that fail silently stop being silent.

---

## Plugging into n8n later

This project is designed to be a headless "lead producer" that n8n can
wrap for orchestration, notifications, and triage workflows.

There are three clean integration points:

### Option A — n8n runs the CLI directly (simplest)

Use n8n's **Execute Command** node:

```
cd /home/user/techguardian-seo/lead_system && \
  /home/user/techguardian-seo/lead_system/.venv/bin/python main.py
```

Trigger: a **Cron** node (e.g. every 2 hours). n8n captures stdout so
you see the rich summary table in the execution log. Follow it with a
**Read Binary File** or **Spreadsheet File** node pointed at
`data/leads.csv` to feed the downstream workflow.

### Option B — n8n reads Google Sheets

If you've enabled Sheets sync, skip the command-run entirely:

1. n8n **Cron** → **Google Sheets → Read** (the `console_hdmi` tab).
2. Filter for `status == "new"` and `intent_score >= 4`.
3. For each row → post to Slack / Telegram / email with the URL,
   snippet, and `outreach_draft` so you can one-tap review.
4. After you reply, update the row's `status` back in Sheets and n8n
   stops re-notifying thanks to the filter.

### Option C — expose as a tiny HTTP service

Wrap `main.run()` in a 15-line FastAPI endpoint (`POST /run`) inside a
new `lead_system/server.py`, then call it from an n8n **HTTP Request**
node. Keeps n8n in charge of scheduling and lets you run the pipeline
on demand from a chat message:

```python
# lead_system/server.py  (sketch)
from fastapi import FastAPI
from lead_system.main import run
from lead_system.config import load_config

app = FastAPI()

@app.post("/run")
def trigger():
    leads = run(load_config())
    return {"count": len(leads), "top": [l.to_row() for l in leads[:5]]}
```

---

## Troubleshooting

- **"Reddit source: no credentials in .env — skipping"** → expected
  until you add Reddit API keys. The rest of the pipeline still runs.
- **Craigslist returns 0 entries** → try running the URL in your
  browser with `&format=rss` appended. If empty there too, the search
  just didn't match; try broader queries in `settings.yaml`.
- **Google Sheets write failed** → verify the service-account email
  has Editor access to the exact spreadsheet name in `.env`.
- **Drafts look too templated** → add `OPENAI_API_KEY` to `.env` to
  enable the LLM polish pass.
