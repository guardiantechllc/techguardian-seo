"""
sources/manual_source.py
------------------------
Reads leads you found MANUALLY (Facebook groups, Nextdoor, neighborhood
apps, text messages from a friend, word of mouth) from a CSV file and
runs them through the exact same matching / scoring / drafting pipeline
as the automated sources.

Why this exists
---------------
Some of the best leads live in places a bot can't legitimately reach:
Facebook groups, Instagram, Nextdoor, etc. Automating those violates
their Terms of Service — but there's nothing stopping YOU from browsing
them as a human and copy-pasting the interesting posts into a CSV.

This source makes those human finds feel like any other lead: they get
keyword-matched, scored 1-5, drafted 3 ways, deduped, and saved next to
your Craigslist/Reddit rows. You get leverage from the system without
asking it to do anything sketchy.

Input file
----------
`data/manual_leads.csv` (gitignored so your notes never leak into git).
Copy the shipped template once:

    cp data/manual_leads.csv.template data/manual_leads.csv

Columns
-------
Required: `url`, `title`
Optional: `text`, `source_label`, `city`, `timestamp`, `author`

Behavior
--------
- Rows with a missing URL or title are skipped and warned.
- Rows whose URL matches the template placeholder are silently skipped.
- Re-runs are idempotent: the deduper remembers what it's already seen,
  so you can leave old rows in the file forever without reprocessing.
"""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from typing import List

from .base import BaseSource
from ..models import Lead
from ..utils.logger import get_logger


log = get_logger(__name__)


MANUAL_CSV_HEADER = [
    "url",
    "title",
    "text",
    "source_label",
    "city",
    "timestamp",
    "author",
]

_PLACEHOLDER_HOSTS = ("example.com", "example.org")


class ManualSource(BaseSource):
    name = "manual"
    platform = "Manual ingest"

    def fetch(self) -> List[Lead]:
        cfg = self.config.source_config("manual")
        if not cfg or not cfg.get("enabled"):
            log.info("Manual source disabled — skipping")
            return []

        rel = cfg.get("file", "data/manual_leads.csv")
        path = self.config.root / rel
        if not path.exists():
            log.info(
                "Manual source: %s not found — skipping. "
                "Create it from data/manual_leads.csv.template to start "
                "ingesting leads you found by hand.",
                path,
            )
            return []

        leads: List[Lead] = []
        skipped = 0

        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=2):  # start=2 to count header
                url = (row.get("url") or "").strip()
                title = (row.get("title") or "").strip()

                if not url or not title:
                    log.warning(
                        "Manual row %d skipped — missing url or title", row_num
                    )
                    skipped += 1
                    continue

                if any(host in url for host in _PLACEHOLDER_HOSTS):
                    # The user left the template row in — quietly skip it.
                    skipped += 1
                    continue

                text = (row.get("text") or "").strip()
                source_label = (row.get("source_label") or "manual").strip()
                city = (row.get("city") or "").strip()
                ts = (row.get("timestamp") or "").strip() or datetime.now(
                    timezone.utc
                ).isoformat()
                author = (row.get("author") or "manual entry").strip()

                leads.append(
                    Lead(
                        source=self.name,
                        platform=source_label or "Manual ingest",
                        title=title,
                        author_or_listing_name=author,
                        text_snippet=(text or title)[:500],
                        url=url,
                        timestamp=ts,
                        city_or_location=city,
                    )
                )

        log.info(
            "Manual source: %d rows loaded from %s (%d skipped)",
            len(leads),
            path,
            skipped,
        )
        return leads
