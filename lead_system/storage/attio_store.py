"""
storage/attio_store.py
----------------------
Writes leads to Attio CRM via the REST API (v2).

Field mappings verified against attio_discover output:

  Leads list (parent: people):
    lead_source_list, lead_notes, device_interest,
    follow_up_due, lead_stage, converted

  People object:
    name, email_addresses, phone_numbers, lead_source,
    customer_notes, lifecycle_stage

  Repairs object:
    customer, device_type, issue, repair_stage, quote_amount,
    final_invoice_amount, lead_source_repair, repair_notes,
    intake_date, waiting_on_parts, actual_completion_date
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
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
                person_id = self._upsert_person(lead)
                self._add_to_leads_list(lead, person_id)
                written += 1
                time.sleep(0.3)
            except Exception as exc:
                log.warning("Attio write failed for %s: %s", lead.id, exc)
                continue

        log.info("Attio: wrote %d leads", written)
        return written

    # ---------- People ----------

    def _upsert_person(self, lead: Lead) -> Optional[str]:
        """Create or match a Person record."""
        name = lead.author_or_listing_name
        if not name or name in ("unknown", "Craigslist listing", "manual entry"):
            name = "Unknown Lead"

        parts = name.strip().split(None, 1)
        first = parts[0] if parts else "Unknown"
        last = parts[1] if len(parts) > 1 else ""

        values: Dict[str, list] = {
            "name": [{"first_name": first, "last_name": last}],
        }

        # Only add customer_notes — don't overwrite existing notes on match
        snippet = lead.text_snippet[:500] if lead.text_snippet else ""
        if snippet:
            values["customer_notes"] = [{"value": snippet}]

        # Lead source on the Person
        source_map = {
            "craigslist": "Craigslist",
            "reddit": "Reddit",
            "zoho_email": "Yelp",
            "manual": "Other",
            "phone": "Phone Call",
        }
        source_label = source_map.get(lead.source, "Other")
        values["lead_source"] = [{"option": source_label}]

        values["lifecycle_stage"] = [{"option": "Lead"}]

        # Try upsert by name match
        resp = requests.put(
            f"{API}/objects/people/records",
            headers=self._headers,
            json={
                "data": {"values": values},
                "matching_attribute": "name",
            },
            timeout=20,
        )

        if resp.status_code >= 400:
            log.debug("Attio person upsert %d: %s", resp.status_code, resp.text[:200])
            # Fall back to create
            resp = requests.post(
                f"{API}/objects/people/records",
                headers=self._headers,
                json={"data": {"values": values}},
                timeout=20,
            )
            if resp.status_code >= 400:
                log.warning("Attio person create failed %d: %s", resp.status_code, resp.text[:200])
                return None

        record = resp.json().get("data", {})
        record_id = record.get("id", {}).get("record_id")
        if record_id:
            log.debug("Attio person: %s (%s)", name, record_id)
        return record_id

    # ---------- Leads list ----------

    def _add_to_leads_list(self, lead: Lead, person_id: Optional[str]) -> None:
        """Add an entry to the Leads list.

        Attio Leads list attributes (from discover):
          lead_source_list  (select)
          lead_notes        (text)
          device_interest   (text)
          follow_up_due     (date)
          lead_stage        (select)
          converted         (checkbox)
        """
        entry_values: Dict[str, list] = {}

        # Lead source
        source_map = {
            "craigslist": "Craigslist",
            "reddit": "Reddit",
            "zoho_email": "Yelp",
            "manual": "Manual",
            "phone": "Phone",
        }
        source_label = source_map.get(lead.source, lead.source or "Other")
        entry_values["lead_source_list"] = [{"option": source_label}]

        # Lead stage
        entry_values["lead_stage"] = [{"option": "New"}]

        # Device / Issue — pack the useful info here
        device_info = lead.title or ""
        if lead.matched_keywords:
            device_info += f" [{', '.join(lead.matched_keywords[:5])}]"
        if device_info:
            entry_values["device_interest"] = [{"value": device_info[:1000]}]

        # Lead notes — outreach draft + source URL + score
        notes_parts = []
        if lead.outreach_draft:
            notes_parts.append(f"DRAFT: {lead.outreach_draft}")
        if lead.url and not lead.url.startswith("mail:"):
            notes_parts.append(f"URL: {lead.url}")
        if lead.intent_score:
            notes_parts.append(f"Score: {lead.intent_score}/5")
        if lead.city_or_location:
            notes_parts.append(f"Location: {lead.city_or_location}")
        if lead.platform:
            notes_parts.append(f"Platform: {lead.platform}")
        if lead.notes:
            notes_parts.append(f"Notes: {lead.notes}")
        if notes_parts:
            entry_values["lead_notes"] = [{"value": "\n".join(notes_parts)}]

        # Not converted yet
        entry_values["converted"] = [{"value": False}]

        body: dict = {"data": {"entry_values": entry_values}}

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
                "Attio 404: Leads list slug might be wrong. "
                "Run: python -m lead_system.scripts.attio_discover"
            )
        elif resp.status_code >= 400:
            log.debug("Attio leads entry %d: %s", resp.status_code, resp.text[:300])
        else:
            log.debug("Attio: lead added to Leads list")

    # ---------- Repairs ----------

    def write_repair(self, job_data: dict) -> bool:
        """Write a completed repair to the Attio Repairs object.

        Repairs required fields (from discover):
          customer        (record-reference) — person record id
          device_type     (text)
          issue           (text)
          repair_stage    (select)
          quote_amount    (currency)
          final_invoice_amount (currency)
        """
        if not self.available:
            return False

        # First upsert the customer as a Person
        customer_name = job_data.get("customer_name", "Walk-in")
        parts = customer_name.strip().split(None, 1)
        person_values = {
            "name": [{"first_name": parts[0], "last_name": parts[1] if len(parts) > 1 else ""}],
        }
        if job_data.get("customer_phone"):
            person_values["phone_numbers"] = [{"phone_number": job_data["customer_phone"]}]

        person_resp = requests.put(
            f"{API}/objects/people/records",
            headers=self._headers,
            json={"data": {"values": person_values}, "matching_attribute": "name"},
            timeout=20,
        )
        person_id = None
        if person_resp.status_code < 400:
            person_id = person_resp.json().get("data", {}).get("id", {}).get("record_id")

        # Build repair record
        values: Dict[str, list] = {
            "device_type": [{"value": job_data.get("device", "Other")}],
            "issue": [{"value": job_data.get("service", "Repair")}],
            "repair_stage": [{"option": "Completed"}],
            "quote_amount": [{"currency_value": float(job_data.get("revenue", 0))}],
            "final_invoice_amount": [{"currency_value": float(job_data.get("revenue", 0))}],
        }

        if person_id:
            values["customer"] = [{"target_record_id": person_id, "target_object": "people"}]

        if job_data.get("date"):
            values["intake_date"] = [{"value": job_data["date"]}]
            values["actual_completion_date"] = [{"value": job_data["date"]}]

        source_map = {
            "yelp": "Yelp", "google": "Google", "walkin": "Walk-in",
            "craigslist": "Craigslist", "reddit": "Reddit",
            "referral": "Referral", "phone": "Phone",
        }
        src = source_map.get(job_data.get("lead_source", ""), "Other")
        values["lead_source_repair"] = [{"option": src}]

        if job_data.get("notes"):
            values["repair_notes"] = [{"value": job_data["notes"]}]

        resp = requests.post(
            f"{API}/objects/repairs/records",
            headers=self._headers,
            json={"data": {"values": values}},
            timeout=20,
        )

        if resp.status_code >= 400:
            log.warning("Attio repair %d: %s", resp.status_code, resp.text[:300])
            return False

        log.info("Attio: repair record created")
        return True
