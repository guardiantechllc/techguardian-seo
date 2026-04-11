"""
scripts/airtable_bootstrap.py
-----------------------------
Create (or reconcile) the entire Tech Guardian Ops schema in your
Airtable base, in one go.

What this DOES:
  - Uses the Airtable Metadata API to create three tables:
      Leads, Repairs, Lead Follow-Ups
  - Creates every field with the exact type, select options, and
    formula the rest of the system expects.
  - Adds the dashboard helper formula fields to Repairs
    (revenue_today, revenue_this_week, quota_met) so the dashboard
    build in `docs/AIRTABLE_DASHBOARD.md` becomes pure clicks.
  - Is idempotent — safe to re-run. Existing tables/fields are left
    alone; only missing pieces are added.

What this does NOT do:
  - Create Airtable Automations (no public API for that).
  - Create Airtable Interfaces / Dashboards (no public API).
  - Both still require clicks — see `docs/AIRTABLE_AUTOMATIONS.md`
    and `docs/AIRTABLE_DASHBOARD.md`.

Prereqs:
  - AIRTABLE_API_KEY in .env must have these scopes:
      data.records:read
      data.records:write
      schema.bases:read
      schema.bases:write     <-- THIS ONE IS REQUIRED
  - AIRTABLE_BASE_ID in .env must point at an existing (empty or
    partial) base. Create it once in Airtable ("Add a base" -> blank)
    if you haven't yet, then paste its appXXX id into .env.

Run:
    python -m lead_system.scripts.airtable_bootstrap

If the script fails partway through, just re-run it. It picks up
where it left off.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path
from typing import Dict, List

import requests

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from lead_system.config import load_config
from lead_system.utils.logger import setup_logging, get_logger


API = "https://api.airtable.com/v0"


# ---------- Schema definitions ----------
#
# Field dicts follow Airtable's Metadata API format:
# https://airtable.com/developers/web/api/model/field-model

LEADS_FIELDS: List[dict] = [
    {"name": "id", "type": "singleLineText"},                       # PRIMARY
    {"name": "source", "type": "singleLineText"},
    {"name": "platform", "type": "singleLineText"},
    {"name": "title", "type": "multilineText"},
    {"name": "author_or_listing_name", "type": "singleLineText"},
    {"name": "text_snippet", "type": "multilineText"},
    {"name": "url", "type": "url"},
    {"name": "timestamp", "type": "singleLineText"},
    {"name": "city_or_location", "type": "singleLineText"},
    {"name": "matched_keywords", "type": "multilineText"},
    {"name": "lead_type", "type": "singleLineText"},
    {"name": "intent_score", "type": "number", "options": {"precision": 0}},
    {"name": "outreach_draft", "type": "multilineText"},
    {"name": "outreach_variants", "type": "multilineText"},
    {
        "name": "status",
        "type": "singleSelect",
        "options": {
            "choices": [
                {"name": "new", "color": "grayLight2"},
                {"name": "reviewed", "color": "blueLight2"},
                {"name": "sent", "color": "yellowLight2"},
                {"name": "skipped", "color": "redLight2"},
                {"name": "booked", "color": "greenLight2"},
            ]
        },
    },
    {"name": "notes", "type": "multilineText"},
    {"name": "created_at", "type": "singleLineText"},
]


REPAIRS_FIELDS: List[dict] = [
    {"name": "id", "type": "singleLineText"},                       # PRIMARY
    {
        "name": "date",
        "type": "date",
        "options": {"dateFormat": {"name": "iso"}},
    },
    {"name": "customer_name", "type": "singleLineText"},
    {"name": "customer_phone", "type": "phoneNumber"},
    {"name": "device", "type": "singleLineText"},
    {"name": "service", "type": "singleLineText"},
    {
        "name": "revenue",
        "type": "currency",
        "options": {"precision": 2, "symbol": "$"},
    },
    {
        "name": "parts_cost",
        "type": "currency",
        "options": {"precision": 2, "symbol": "$"},
    },
    {
        "name": "other_expenses",
        "type": "currency",
        "options": {"precision": 2, "symbol": "$"},
    },
    {
        "name": "profit",
        "type": "currency",
        "options": {"precision": 2, "symbol": "$"},
    },
    {
        "name": "status",
        "type": "singleSelect",
        "options": {
            "choices": [
                {"name": "New", "color": "grayLight2"},
                {"name": "In Progress", "color": "yellowLight2"},
                {"name": "Completed", "color": "greenLight2"},
                {"name": "Cancelled", "color": "redLight2"},
            ]
        },
    },
    {
        "name": "completed_date",
        "type": "date",
        "options": {"dateFormat": {"name": "iso"}},
    },
    {"name": "lead_source", "type": "singleLineText"},
    {"name": "notes", "type": "multilineText"},
    {"name": "created_at", "type": "singleLineText"},
]


# Follow-ups has a link field into Repairs, which needs the Repairs
# table id. We insert the link into this list dynamically in main()
# once Repairs exists and we know its id.
FOLLOWUPS_BASIC: List[dict] = [
    {"name": "id", "type": "singleLineText"},                       # PRIMARY
    {"name": "customer_name", "type": "singleLineText"},
    {"name": "customer_phone", "type": "phoneNumber"},
    {"name": "device", "type": "singleLineText"},
    {"name": "service", "type": "singleLineText"},
    # the "repair" multipleRecordLinks field gets inserted here
    {
        "name": "scheduled_date",
        "type": "date",
        "options": {"dateFormat": {"name": "iso"}},
    },
    {
        "name": "status",
        "type": "singleSelect",
        "options": {
            "choices": [
                {"name": "Scheduled", "color": "grayLight2"},
                {"name": "Sent", "color": "yellowLight2"},
                {"name": "Done", "color": "greenLight2"},
                {"name": "Skipped", "color": "redLight2"},
            ]
        },
    },
    {"name": "notes", "type": "multilineText"},
    {"name": "created_at", "type": "singleLineText"},
]


# Formula helpers added to Repairs AFTER the table exists so the
# formulas can reference other fields by name.
DASHBOARD_FORMULAS: List[dict] = [
    {
        "name": "revenue_today",
        "type": "formula",
        "options": {
            "formula": (
                'IF(AND({status} = "Completed", '
                'IS_SAME({completed_date}, TODAY(), "day")), {revenue}, 0)'
            ),
        },
    },
    {
        "name": "revenue_this_week",
        "type": "formula",
        "options": {
            "formula": (
                'IF(AND({status} = "Completed", '
                'IS_SAME({completed_date}, TODAY(), "week")), {revenue}, 0)'
            ),
        },
    },
    {
        "name": "quota_met",
        "type": "formula",
        "options": {"formula": "IF({revenue_today} > 0, 1, 0)"},
    },
]


# ---------- HTTP client ----------


class AirtableMetaClient:
    def __init__(self, api_key: str, base_id: str) -> None:
        self.base_id = base_id
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        )

    def list_tables(self) -> Dict[str, dict]:
        url = f"{API}/meta/bases/{self.base_id}/tables"
        resp = self.session.get(url)
        self._raise_friendly(resp, "list tables")
        return {t["name"]: t for t in resp.json().get("tables", [])}

    def create_table(self, name: str, fields: List[dict]) -> dict:
        url = f"{API}/meta/bases/{self.base_id}/tables"
        resp = self.session.post(url, json={"name": name, "fields": fields})
        self._raise_friendly(resp, f"create table {name!r}")
        return resp.json()

    def create_field(self, table_id: str, field: dict) -> dict:
        url = f"{API}/meta/bases/{self.base_id}/tables/{table_id}/fields"
        resp = self.session.post(url, json=field)
        self._raise_friendly(resp, f"create field {field.get('name')!r}")
        return resp.json()

    @staticmethod
    def _raise_friendly(resp: requests.Response, what: str) -> None:
        if resp.status_code < 400:
            return
        msg = resp.text[:400]
        if resp.status_code == 401:
            raise SystemExit(
                f"[Airtable 401] {what}: AIRTABLE_API_KEY is invalid or missing. "
                "Regenerate a PAT at https://airtable.com/create/tokens"
            )
        if resp.status_code == 403:
            raise SystemExit(
                f"[Airtable 403] {what}: PAT is missing the required scopes. "
                "Your token needs data.records:read, data.records:write, "
                "schema.bases:read, and schema.bases:write. Edit the token "
                "at https://airtable.com/create/tokens and re-run."
            )
        if resp.status_code == 404:
            raise SystemExit(
                f"[Airtable 404] {what}: AIRTABLE_BASE_ID points at a base "
                "that doesn't exist, or your PAT doesn't have access to it. "
                "Open the base in Airtable, copy the `appXXX` part of the "
                "URL, and set AIRTABLE_BASE_ID in .env."
            )
        raise SystemExit(f"[Airtable {resp.status_code}] {what}: {msg}")


# ---------- Reconcilers ----------


def ensure_table(
    client: AirtableMetaClient,
    tables: Dict[str, dict],
    name: str,
    fields: List[dict],
    log,
) -> dict:
    """Create the table if missing, otherwise add only missing fields."""
    if name not in tables:
        log.info("Creating %s table with %d fields...", name, len(fields))
        created = client.create_table(name, fields)
        log.info("  done (tableId=%s)", created["id"])
        time.sleep(0.3)
        return created

    existing = tables[name]
    log.info("%s exists — reconciling fields", name)
    existing_names = {f["name"] for f in existing["fields"]}

    # Skip the primary field (index 0). You can't add a primary field
    # to an existing table via the API, and renaming it is out of scope.
    added = 0
    for f in fields[1:]:
        if f["name"] in existing_names:
            continue
        try:
            client.create_field(existing["id"], f)
            added += 1
            time.sleep(0.2)
        except SystemExit:
            raise
        except Exception as exc:  # pragma: no cover
            log.warning("  couldn't add %s to %s: %s", f["name"], name, exc)
    log.info("  added %d missing field(s)" if added else "  already up to date", added or "")
    return existing


def ensure_dashboard_formulas(
    client: AirtableMetaClient,
    repairs_table: dict,
    log,
) -> None:
    existing_names = {f["name"] for f in repairs_table["fields"]}
    for formula in DASHBOARD_FORMULAS:
        if formula["name"] in existing_names:
            log.info("  %s already exists", formula["name"])
            continue
        log.info("  adding %s", formula["name"])
        try:
            client.create_field(repairs_table["id"], formula)
            time.sleep(0.3)
        except SystemExit:
            raise
        except Exception as exc:
            log.warning(
                "  %s failed (%s) — you can add it manually using the "
                "formula in docs/AIRTABLE_DASHBOARD.md",
                formula["name"],
                exc,
            )


def ensure_repair_lookup_on_followups(
    client: AirtableMetaClient,
    followups_table: dict,
    repairs_table: dict,
    log,
) -> None:
    existing = {f["name"]: f for f in followups_table["fields"]}
    if "repair_date" in existing:
        log.info("  repair_date lookup already exists")
        return

    repair_link = existing.get("repair")
    repairs_date = next(
        (f for f in repairs_table["fields"] if f["name"] == "date"), None
    )
    if not repair_link or not repairs_date:
        log.warning(
            "  cannot add repair_date lookup — missing link field or source. "
            "Add it manually: Field type = Lookup, link field = repair, "
            "field in linked table = date"
        )
        return

    log.info("  adding repair_date lookup")
    try:
        client.create_field(
            followups_table["id"],
            {
                "name": "repair_date",
                "type": "multipleLookupValues",
                "options": {
                    "recordLinkFieldId": repair_link["id"],
                    "fieldIdInLinkedTable": repairs_date["id"],
                },
            },
        )
    except SystemExit:
        raise
    except Exception as exc:
        log.warning("  repair_date lookup failed: %s — add it manually", exc)


# ---------- Main ----------


def main() -> int:
    config = load_config()
    creds = config.airtable_credentials()
    if not creds:
        print(
            "ERROR: AIRTABLE_API_KEY and AIRTABLE_BASE_ID must both be set "
            "in .env before running this script. See docs/AIRTABLE_SETUP.md."
        )
        return 1

    setup_logging(log_file=config.log_file(), level=config.log_level())
    log = get_logger("lead_system.scripts.airtable_bootstrap")

    log.info("Tech Guardian Airtable bootstrap")
    log.info("Base: %s", creds["base_id"])

    client = AirtableMetaClient(creds["api_key"], creds["base_id"])
    tables = client.list_tables()

    # Step 1: Leads
    ensure_table(client, tables, "Leads", LEADS_FIELDS, log)

    # Step 2: Repairs
    ensure_table(client, tables, "Repairs", REPAIRS_FIELDS, log)

    # Refresh so we have the Repairs tableId we need for the link field
    tables = client.list_tables()
    repairs_table = tables["Repairs"]

    # Step 3: Lead Follow-Ups (with link to Repairs)
    followups_fields = list(FOLLOWUPS_BASIC)
    followups_fields.insert(
        5,  # after "service"
        {
            "name": "repair",
            "type": "multipleRecordLinks",
            "options": {"linkedTableId": repairs_table["id"]},
        },
    )
    ensure_table(client, tables, "Lead Follow-Ups", followups_fields, log)

    # Refresh again to capture the new table + link field id
    tables = client.list_tables()
    followups_table = tables["Lead Follow-Ups"]
    repairs_table = tables["Repairs"]

    # Step 4: repair_date lookup
    log.info("Reconciling repair_date lookup on Lead Follow-Ups")
    ensure_repair_lookup_on_followups(
        client, followups_table, repairs_table, log
    )

    # Step 5: dashboard helper formulas
    log.info("Adding dashboard helper formulas to Repairs")
    repairs_table = client.list_tables()["Repairs"]
    ensure_dashboard_formulas(client, repairs_table, log)

    log.info("Done.")
    print()
    print("=" * 60)
    print("  Schema ready. Remaining manual steps:")
    print("    1. Build automations  -> docs/AIRTABLE_AUTOMATIONS.md")
    print("    2. Build dashboard    -> docs/AIRTABLE_DASHBOARD.md")
    print()
    print("  (Airtable's API does not expose automations or")
    print("   interfaces to any tool, so those are the only pieces")
    print("   I cannot create automatically.)")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
