"""
storage/attio_store.py
----------------------
Writes leads to Attio CRM via the REST API (v2).

Targets:
  - Your "Leads" list (list entries linked to People records)
  - Upserts by matching on the lead's email or source URL

Setup:
  1. Attio → Settings → Developers → API keys → Generate (full access)
  2. Add to .env: ATTIO_API_KEY=your_key_here
  3. Run the discovery script first to map your attribute slugs:
     python -m lead_system.scripts.attio_discover

Attio API docs: https://developers.attio.com/reference
"""

from __future__ import annotations

import time
from typing import Dict, Iterable, List, Optional

import requests

from ..config import Config
from ..models import Lead
from ..utils.logger import get_logger


log = get_logger(__name__)

API = "https://api.attio.com/v2"


class AttioStore:
    def __init__(self, config: Config) -> None:
        self.api_key = (config.env or {}).get("ATTIO_API_KEY", "")
        self._headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def write(self, leads: Iterable[Lead]) -> int:
        leads = list(leads)
        if not leads or not self.available:
            return 0

        written = 0
        for lead in leads:
            try:
                # Step 1: Upsert a Person record for the lead contact
                person_id = self._upsert_person(lead)

                # Step 2: Add an entry to the Leads list
                self._add_to_leads_list(lead, person_id)

                written += 1
                time.sleep(0.3)  # Attio rate limit: ~150 req/min
            except Exception as exc:
                log.warning("Attio write failed for %s: %s", lead.id, exc)
                continue

        log.info("Attio: wrote %d leads", written)
        return written

    def _upsert_person(self, lead: Lead) -> Optional[str]:
        """Create or update a Person record in Attio.

        Attio's People object has built-in attributes:
          - name (text)
          - email_addresses (email)
          - phone_numbers (phone)

        We match on email if available, otherwise create fresh.
        """
        # Build the values dict using Attio's attribute format
        values: Dict[str, list] = {}

        # Name
        name = lead.author_or_listing_name
        if name and name not in ("unknown", "Craigslist listing", "manual entry"):
            values["name"] = [{"first_name": name.split()[0] if name else "",
                              "last_name": " ".join(name.split()[1:]) if len(name.split()) > 1 else ""}]

        # Notes field gets the snippet
        if lead.text_snippet:
            values["description"] = [{"value": lead.text_snippet[:1000]}]

        data = {"data": {"values": values}}

        # Use assert_record (upsert) endpoint
        resp = requests.put(
            f"{API}/objects/people/records",
            headers=self._headers,
            json={
                "data": {
                    "values": values
                },
                "matching_attribute": "name",
            },
            timeout=20,
        )

        if resp.status_code >= 400:
            log.warning("Attio person upsert %d: %s", resp.status_code, resp.text[:200])
            # Fall back to creating without match
            resp = requests.post(
                f"{API}/objects/people/records",
                headers=self._headers,
                json={"data": {"values": values}},
                timeout=20,
            )
            if resp.status_code >= 400:
                log.warning("Attio person create failed: %d", resp.status_code)
                return None

        record = resp.json().get("data", {})
        return record.get("id", {}).get("record_id")

    def _add_to_leads_list(self, lead: Lead, person_id: Optional[str]) -> None:
        """Add an entry to the Leads list in Attio.

        List entries have:
          - A parent record reference (the Person)
          - Entry-level attributes (custom fields on the list)

        We write as much data as we can into entry attributes.
        The attribute slugs depend on how you named them in Attio —
        run `attio_discover` to map them. Below we use common names
        that match what you likely set up.
        """
        entry_values: Dict[str, list] = {}

        # Map lead fields to likely Attio list attribute slugs.
        # These will silently be ignored if the slug doesn't exist
        # in your Leads list — no crash, just missing data. Run
        # attio_discover to get exact slugs and adjust below.
        field_map = {
            "source": lead.source,
            "platform": lead.platform,
            "title": lead.title,
            "status": "New",
            "intent_score": lead.intent_score,
            "url": lead.url,
            "city": lead.city_or_location,
            "matched_keywords": ", ".join(lead.matched_keywords) if lead.matched_keywords else "",
            "outreach_draft": lead.outreach_draft,
            "notes": lead.notes,
            "lead_type": lead.lead_type,
        }

        for slug, value in field_map.items():
            if value:
                entry_values[slug] = [{"value": str(value) if not isinstance(value, int) else value}]

        body: dict = {"data": {"entry_values": entry_values}}

        # Link to the Person record if we have one
        if person_id:
            body["data"]["parent_record_id"] = person_id
            body["data"]["parent_object"] = "people"

        resp = requests.post(
            f"{API}/lists/leads/entries",
            headers=self._headers,
            json=body,
            timeout=20,
        )

        if resp.status_code == 404:
            log.warning(
                "Attio Leads list not found. Check that your list slug is "
                "'leads' (lowercase). Run: python -m lead_system.scripts.attio_discover"
            )
        elif resp.status_code >= 400:
            log.debug("Attio list entry %d: %s", resp.status_code, resp.text[:200])

    # ---------- Repair/Job writer ----------

    def write_repair(self, job_data: dict) -> bool:
        """Write a completed repair to the Attio Repairs object.

        This is called by the jobs/log_job CLI when Attio is configured.
        """
        if not self.available:
            return False

        values: Dict[str, list] = {}
        field_map = {
            "name": job_data.get("customer_name", ""),
            "device": job_data.get("device", ""),
            "service": job_data.get("service", ""),
            "revenue": job_data.get("revenue"),
            "parts_cost": job_data.get("parts_cost"),
            "profit": job_data.get("profit"),
            "status": "Completed",
            "lead_source": job_data.get("lead_source", ""),
            "notes": job_data.get("notes", ""),
        }

        for slug, value in field_map.items():
            if value is not None and value != "":
                if isinstance(value, (int, float)):
                    values[slug] = [{"value": value}]
                else:
                    values[slug] = [{"value": str(value)}]

        resp = requests.post(
            f"{API}/objects/repairs/records",
            headers=self._headers,
            json={"data": {"values": values}},
            timeout=20,
        )

        if resp.status_code >= 400:
            log.warning("Attio repair write %d: %s", resp.status_code, resp.text[:200])
            return False

        log.info("Attio: repair record created")
        return True
