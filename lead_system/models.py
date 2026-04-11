"""
models.py
---------
Dataclasses and shared types used across the lead pipeline.

The Lead dataclass is the canonical row format — every source must
normalize its raw results into Lead instances before they move down
the pipeline. Adding a new source never requires changing the rest
of the system as long as the source returns Leads.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import List, Optional
import hashlib
import uuid


# Fixed column order used by CSV and Google Sheets outputs so that
# downstream consumers (n8n, spreadsheets, etc.) get a stable schema.
LEAD_FIELDS: List[str] = [
    "id",
    "source",
    "platform",
    "title",
    "author_or_listing_name",
    "text_snippet",
    "url",
    "timestamp",
    "city_or_location",
    "matched_keywords",
    "lead_type",
    "intent_score",
    "outreach_draft",
    "outreach_variants",
    "status",
    "notes",
    "created_at",
]


@dataclass
class Lead:
    """A single normalized lead row."""

    source: str                       # "craigslist", "reddit", etc.
    platform: str                     # Human label: "Craigslist KC", "Reddit"
    title: str
    author_or_listing_name: str
    text_snippet: str
    url: str
    timestamp: str                    # ISO-8601 when the source published it
    city_or_location: str = ""
    matched_keywords: List[str] = field(default_factory=list)
    lead_type: str = "console_hdmi"
    intent_score: int = 1             # 1..5
    outreach_draft: str = ""          # The "best" variant, promoted by scorer
    outreach_variants: List[str] = field(default_factory=list)  # All 3 variants
    status: str = "new"               # new|reviewed|sent|skipped|booked
    notes: str = ""
    id: str = ""
    created_at: str = ""

    def __post_init__(self) -> None:
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat()
        if not self.id:
            # Deterministic id: hash of source+url (falls back to random uuid
            # if a source can't give us a URL, e.g. stubbed feeds).
            basis = f"{self.source}|{self.url}".strip("|")
            if basis and self.url:
                self.id = hashlib.sha1(basis.encode("utf-8")).hexdigest()[:16]
            else:
                self.id = uuid.uuid4().hex[:16]

    def content_hash(self) -> str:
        """Stable hash of what we treat as the lead's content — used by the
        deduper when a URL isn't reliable (e.g. two posts with the same URL
        but different bodies)."""
        blob = "|".join(
            [self.source, self.url, self.title, self.text_snippet[:500]]
        )
        return hashlib.sha1(blob.encode("utf-8")).hexdigest()

    def to_row(self) -> dict:
        """Flatten the Lead into a single-row dict suitable for CSV/Sheets."""
        row = asdict(self)
        # Collections -> pipe-delimited strings so spreadsheets stay clean.
        row["matched_keywords"] = " | ".join(self.matched_keywords)
        row["outreach_variants"] = "\n---\n".join(self.outreach_variants)
        return {k: row.get(k, "") for k in LEAD_FIELDS}

    @staticmethod
    def header() -> List[str]:
        return list(LEAD_FIELDS)
