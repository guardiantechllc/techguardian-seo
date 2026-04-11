"""
jobs/models.py
--------------
Dataclass for a completed repair job — the unit of revenue tracking.

Every row in data/jobs.csv and the Airtable Jobs table has this shape.
Profit is a computed property: revenue - parts_cost - other_expenses.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import List
import uuid


JOB_FIELDS: List[str] = [
    "id",
    "date",
    "customer_name",
    "customer_phone",
    "device",
    "service",
    "revenue",
    "parts_cost",
    "other_expenses",
    "profit",
    "lead_source",
    "notes",
    "created_at",
]


@dataclass
class Job:
    date: str                         # YYYY-MM-DD
    customer_name: str
    device: str                       # e.g. "PS5", "iPhone 12"
    service: str                      # e.g. "HDMI port replacement"
    revenue: float
    parts_cost: float = 0.0
    other_expenses: float = 0.0
    customer_phone: str = ""
    lead_source: str = ""             # yelp | reddit | craigslist | walkin | ...
    notes: str = ""
    id: str = ""
    created_at: str = ""

    def __post_init__(self) -> None:
        if not self.id:
            self.id = uuid.uuid4().hex[:16]
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat()

    @property
    def profit(self) -> float:
        return round(
            float(self.revenue)
            - float(self.parts_cost)
            - float(self.other_expenses),
            2,
        )

    def to_row(self) -> dict:
        row = asdict(self)
        row["profit"] = self.profit
        # Force numeric rounding for CSV / Airtable cleanliness.
        for k in ("revenue", "parts_cost", "other_expenses"):
            row[k] = round(float(row[k]), 2)
        return {k: row.get(k, "") for k in JOB_FIELDS}

    @staticmethod
    def header() -> List[str]:
        return list(JOB_FIELDS)
