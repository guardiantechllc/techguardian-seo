"""
jobs/store.py
-------------
CSV writer + optional Airtable writer for Job rows. Same upsert-by-id
pattern as the leads stores.
"""

from __future__ import annotations

import csv
import time
from pathlib import Path
from typing import Dict, Iterable, List

import requests

from ..config import Config
from ..utils.logger import get_logger
from .models import Job, JOB_FIELDS


log = get_logger(__name__)


class JobsCsvStore:
    def __init__(self, path: Path) -> None:
        self.path = path

    def load_all(self) -> List[dict]:
        if not self.path.exists():
            return []
        with self.path.open("r", encoding="utf-8", newline="") as f:
            return list(csv.DictReader(f))

    def write(self, jobs: Iterable[Job]) -> int:
        jobs = list(jobs)
        if not jobs:
            return 0
        self.path.parent.mkdir(parents=True, exist_ok=True)

        existing: Dict[str, Dict[str, str]] = {}
        if self.path.exists():
            for row in self.load_all():
                rid = row.get("id", "")
                if rid:
                    existing[rid] = row

        for job in jobs:
            existing[job.id] = {k: str(v) for k, v in job.to_row().items()}

        rows: List[Dict[str, str]] = list(existing.values())

        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=JOB_FIELDS)
            writer.writeheader()
            writer.writerows(rows)
        tmp.replace(self.path)

        log.info("Jobs CSV: wrote %d rows (%d total)", len(jobs), len(rows))
        return len(jobs)


class JobsAirtableStore:
    def __init__(self, config: Config) -> None:
        self.cfg = config.airtable_credentials()
        self.table = config.airtable_jobs_table()

    @property
    def available(self) -> bool:
        return self.cfg is not None

    def write(self, jobs: Iterable[Job]) -> int:
        jobs = list(jobs)
        if not jobs or not self.available:
            return 0

        import urllib.parse

        base_id = self.cfg["base_id"]
        api_key = self.cfg["api_key"]
        url = f"https://api.airtable.com/v0/{base_id}/{urllib.parse.quote(self.table, safe='')}"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        written = 0
        for i in range(0, len(jobs), 10):
            batch = jobs[i : i + 10]
            records = [{"fields": self._to_fields(j)} for j in batch]
            payload = {
                "performUpsert": {"fieldsToMergeOn": ["id"]},
                "records": records,
                "typecast": True,
            }
            try:
                resp = requests.patch(url, headers=headers, json=payload, timeout=30)
            except Exception as exc:
                log.warning("Airtable Jobs request failed: %s", exc)
                continue

            if resp.status_code == 404:
                log.warning(
                    "Airtable table %r not found — create it per "
                    "docs/AIRTABLE_SETUP.md",
                    self.table,
                )
                return written
            if resp.status_code >= 400:
                log.warning("Airtable Jobs %d: %s", resp.status_code, resp.text[:300])
                continue
            written += len(batch)
            time.sleep(0.25)

        log.info("Airtable Jobs: upserted %d jobs", written)
        return written

    @staticmethod
    def _to_fields(job: Job) -> Dict[str, object]:
        row = job.to_row()
        # Cast numerics cleanly.
        for k in ("revenue", "parts_cost", "other_expenses", "profit"):
            try:
                row[k] = float(row[k])
            except (ValueError, TypeError):
                row[k] = 0.0
        return row
