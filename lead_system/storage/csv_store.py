"""
storage/csv_store.py
--------------------
Append-only CSV writer. Always writes — this is the fallback store
when Google Sheets isn't configured, and also the reliable local
audit trail even when Sheets IS configured.

Behavior:
  - Creates file + header on first write.
  - Upserts by `id`: if a row with the same id already exists, it
    is updated in place (so re-runs don't duplicate rows).
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict, Iterable, List

from ..models import Lead, LEAD_FIELDS
from ..utils.logger import get_logger


log = get_logger(__name__)


class CsvStore:
    def __init__(self, path: Path) -> None:
        self.path = path

    def write(self, leads: Iterable[Lead]) -> int:
        leads = list(leads)
        if not leads:
            log.info("CSV store: nothing to write")
            return 0

        self.path.parent.mkdir(parents=True, exist_ok=True)

        existing: Dict[str, Dict[str, str]] = {}
        if self.path.exists():
            with self.path.open("r", encoding="utf-8", newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    rid = row.get("id", "")
                    if rid:
                        existing[rid] = row

        for lead in leads:
            existing[lead.id] = lead.to_row()

        rows: List[Dict[str, str]] = list(existing.values())

        # Atomic-ish write: tmp then rename.
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=LEAD_FIELDS)
            writer.writeheader()
            writer.writerows(rows)
        tmp.replace(self.path)

        log.info("CSV store: wrote %d rows to %s", len(rows), self.path)
        return len(leads)
