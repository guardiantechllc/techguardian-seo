"""
scripts/sheets_sync.py
----------------------
One-way sync: EspoCRM RepairTickets → Google Sheets.

Pulls every Repair Ticket via EspoCRM's REST API and upserts rows
into a Google Sheet by ticket ID. Designed to run on cron so your
Sheet is always a near-real-time mirror of EspoCRM data without
relying on paid integrations (Zapier, Make, etc.).

Usage:
    python scripts/sheets_sync.py

Prereqs:
    1. An EspoCRM API User with an API Key (see docs/GOOGLE_SHEETS.md)
    2. A Google service-account JSON key
    3. A Google Sheet shared with the service account
    4. .env filled in with ESPO_API_URL, ESPO_API_KEY,
       GOOGLE_SHEETS_CREDENTIALS_FILE, GOOGLE_SHEETS_SPREADSHEET,
       GOOGLE_SHEETS_WORKSHEET
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Dict, List

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


# ---------- Config ----------

ESPO_URL = os.environ.get("ESPO_API_URL", "http://localhost:8080/api/v1")
ESPO_KEY = os.environ.get("ESPO_API_KEY", "")
SHEETS_CREDS = os.environ.get("GOOGLE_SHEETS_CREDENTIALS_FILE", "")
SHEETS_NAME = os.environ.get("GOOGLE_SHEETS_SPREADSHEET", "")
SHEETS_TAB = os.environ.get("GOOGLE_SHEETS_WORKSHEET", "repairs")

COLUMNS = [
    "ticketId",
    "name",
    "status",
    "customerName",
    "phoneNumber",
    "deviceType",
    "issueDescription",
    "quotedPrice",
    "partsCost",
    "laborCost",
    "totalCost",
    "profit",
    "leadSource",
    "flagged",
    "completedAt",
    "createdAt",
    "modifiedAt",
]


# ---------- EspoCRM reader ----------


def fetch_tickets() -> List[dict]:
    """Pull all RepairTickets from EspoCRM's REST API."""
    if not ESPO_KEY:
        print("ERROR: ESPO_API_KEY not set in .env")
        sys.exit(1)

    headers = {"X-Api-Key": ESPO_KEY}
    tickets: List[dict] = []
    offset = 0
    limit = 200

    while True:
        params = {
            "offset": offset,
            "maxSize": limit,
            "orderBy": "createdAt",
            "order": "desc",
        }
        resp = requests.get(
            f"{ESPO_URL}/RepairTicket",
            headers=headers,
            params=params,
            timeout=30,
        )
        if resp.status_code == 401:
            print("ERROR: EspoCRM API key is invalid. Create one in Admin > API Users.")
            sys.exit(1)
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("list", [])
        tickets.extend(batch)
        if len(batch) < limit:
            break
        offset += limit

    print(f"Fetched {len(tickets)} tickets from EspoCRM")
    return tickets


def ticket_to_row(ticket: dict) -> List[str]:
    """Map an EspoCRM ticket dict to a flat row matching COLUMNS."""
    return [str(ticket.get(col, "") or "") for col in COLUMNS]


# ---------- Google Sheets writer ----------


def write_to_sheets(tickets: List[dict]) -> int:
    if not SHEETS_CREDS or not SHEETS_NAME:
        print("Google Sheets not configured — printing to stdout instead")
        for t in tickets[:10]:
            print(f"  {t.get('ticketId', '?')}  {t.get('status', '')}  {t.get('customerName', '')}")
        return 0

    try:
        import gspread
        from google.oauth2.service_account import Credentials
    except ImportError:
        print("ERROR: gspread/google-auth not installed. pip install gspread google-auth")
        sys.exit(1)

    creds = Credentials.from_service_account_file(
        SHEETS_CREDS,
        scopes=[
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ],
    )
    gc = gspread.authorize(creds)
    try:
        sh = gc.open(SHEETS_NAME)
    except Exception:
        sh = gc.open_by_key(SHEETS_NAME)

    try:
        ws = sh.worksheet(SHEETS_TAB)
    except Exception:
        ws = sh.add_worksheet(title=SHEETS_TAB, rows=1000, cols=len(COLUMNS))
        ws.append_row(COLUMNS, value_input_option="RAW")

    # Ensure header
    header = ws.row_values(1)
    if header != COLUMNS:
        ws.update("A1", [COLUMNS])

    # Build id->row map for upsert
    existing_ids = ws.col_values(1)[1:]  # skip header
    id_to_row: Dict[str, int] = {
        tid: i for i, tid in enumerate(existing_ids, start=2)
    }

    updates = []
    appends = []
    for ticket in tickets:
        row = ticket_to_row(ticket)
        tid = row[0]  # ticketId is first column
        if tid in id_to_row:
            r = id_to_row[tid]
            col_letter = chr(65 + len(COLUMNS) - 1)
            updates.append({"range": f"A{r}:{col_letter}{r}", "values": [row]})
        else:
            appends.append(row)

    if updates:
        ws.batch_update(updates, value_input_option="RAW")
    if appends:
        ws.append_rows(appends, value_input_option="RAW")

    total = len(updates) + len(appends)
    print(f"Google Sheets: synced {total} rows ({len(updates)} updated, {len(appends)} new)")
    return total


# ---------- Main ----------


def main() -> int:
    print("Tech Guardian — EspoCRM → Google Sheets sync")
    tickets = fetch_tickets()
    if not tickets:
        print("No tickets to sync.")
        return 0
    write_to_sheets(tickets)
    return 0


if __name__ == "__main__":
    sys.exit(main())
