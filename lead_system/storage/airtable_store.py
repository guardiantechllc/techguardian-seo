"""
storage/airtable_store.py
-------------------------
Writes leads to an Airtable base using the official REST API.

Setup: see `docs/AIRTABLE_SETUP.md` — you create the base + Leads
table once (takes 2-3 minutes), drop the base ID and a personal access
token into .env, and this module upserts by the `id` column just like
the CSV and Google Sheets stores.

Why the raw REST API instead of pyairtable?
  - No extra dependency needed (`requests` is already required).
  - Airtable's REST API is stable and well-documented.
  - Smaller install footprint, fewer moving parts on the Mac.

Behavior:
  - Lazy init — if the base doesn't have a Leads table yet, every
    write returns 0 with a friendly warning (non-fatal).
  - Upserts by the `id` field using Airtable's /patch endpoint with
    `performUpsert: { fieldsToMergeOn: ["id"] }`, so re-runs don't
    create duplicate rows.
  - Batches of 10 (Airtable's cap) with brief sleeps between.
"""

from __future__ import annotations

import time
from typing import Dict, Iterable, List, Optional

import requests

from ..config import Config
from ..models import Lead, LEAD_FIELDS
from ..utils.logger import get_logger


log = get_logger(__name__)


AIRTABLE_API = "https://api.airtable.com/v0"
BATCH_SIZE = 10   # Airtable hard cap per write


class AirtableStore:
    def __init__(self, config: Config) -> None:
        self.cfg = config.airtable_credentials()
        self.table_name = config.airtable_leads_table()

    @property
    def available(self) -> bool:
        return self.cfg is not None

    def write(self, leads: Iterable[Lead]) -> int:
        leads = list(leads)
        if not leads:
            return 0
        if not self.available:
            return 0

        base_id = self.cfg["base_id"]
        api_key = self.cfg["api_key"]
        url = f"{AIRTABLE_API}/{base_id}/{self._encode(self.table_name)}"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        written = 0
        for batch in self._chunk(leads, BATCH_SIZE):
            records = [{"fields": self._lead_to_fields(l)} for l in batch]
            payload = {
                "performUpsert": {"fieldsToMergeOn": ["id"]},
                "records": records,
                "typecast": True,
            }
            try:
                resp = requests.patch(url, headers=headers, json=payload, timeout=30)
            except Exception as exc:
                log.warning("Airtable request failed: %s", exc)
                continue

            if resp.status_code == 404:
                log.warning(
                    "Airtable table %r not found in base %s — check "
                    "AIRTABLE_BASE_ID and create the Leads table per "
                    "docs/AIRTABLE_SETUP.md",
                    self.table_name,
                    base_id,
                )
                return written
            if resp.status_code == 401:
                log.warning("Airtable auth failed — check AIRTABLE_API_KEY")
                return written
            if resp.status_code >= 400:
                log.warning(
                    "Airtable %d: %s", resp.status_code, resp.text[:300]
                )
                continue

            written += len(batch)
            time.sleep(0.25)   # polite — Airtable limit is 5 req/sec/base

        log.info("Airtable: upserted %d leads into %r", written, self.table_name)
        return written

    # ---------- helpers ----------

    @staticmethod
    def _chunk(items: List[Lead], size: int):
        for i in range(0, len(items), size):
            yield items[i : i + size]

    @staticmethod
    def _encode(name: str) -> str:
        # Airtable table names may contain spaces; URL-encode them.
        import urllib.parse
        return urllib.parse.quote(name, safe="")

    @staticmethod
    def _lead_to_fields(lead: Lead) -> Dict[str, object]:
        """Map the Lead dataclass to Airtable field values.

        Field names must match exactly what's in your Airtable Leads
        table (see docs/AIRTABLE_SETUP.md). Missing columns on the
        Airtable side are simply ignored by Airtable when typecast=true,
        so you can add columns incrementally without breaking writes.
        """
        row = lead.to_row()
        # Airtable wants lists for multi-select, strings for single-select.
        # We keep everything as plain strings; Airtable typecasts.
        fields: Dict[str, object] = {k: row.get(k, "") for k in LEAD_FIELDS}
        # intent_score is numeric in Airtable — cast back to int.
        try:
            fields["intent_score"] = int(row.get("intent_score") or 0)
        except (ValueError, TypeError):
            fields["intent_score"] = 0
        return fields
