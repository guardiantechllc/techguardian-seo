"""
processors/scorer.py
--------------------
Lightweight, explainable rule scorer (1..5).

Signals (all configurable in settings.yaml > scoring):
  + base score                          (always)
  + primary keyword match               (e.g. "PS5 HDMI")
  + symptom keyword match               (e.g. "black screen")
  + console keyword match               (e.g. "PS5")
  + intent keyword match                (e.g. "need repair")
  + local city mentioned in text/location
  + recent timestamp (default <= 7 days)

We clamp the final score to [1, 5] so downstream filters have a
predictable range. No ML here — by design, you can debug any score
by looking at the matched_keywords list on the Lead.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone, timedelta
from typing import Dict, List

from dateutil import parser as dateparser

from ..config import Config
from ..models import Lead
from ..utils.logger import get_logger


log = get_logger(__name__)


class Scorer:
    def __init__(self, config: Config) -> None:
        s = config.scoring()
        self.base = int(s.get("base", 1))
        self.primary = int(s.get("primary_keyword", 2))
        self.symptom = int(s.get("symptom_keyword", 1))
        self.console = int(s.get("console_keyword", 1))
        self.intent = int(s.get("intent_keyword", 1))
        self.local_bonus = int(s.get("local_city_bonus", 1))
        self.recency_days = int(s.get("recency_bonus_days", 7))
        self.recency_bonus = int(s.get("recency_bonus", 1))

        self.keyword_buckets = config.keywords() or {}
        self.local_cities = [
            c.lower() for c in (config.business().get("local_cities") or [])
        ]

    def score(self, lead: Lead) -> int:
        score = self.base
        matched_lower = {m.lower() for m in lead.matched_keywords}

        for bucket_name, bucket_kws in self.keyword_buckets.items():
            bucket_lower = {k.lower() for k in bucket_kws}
            hit = matched_lower & bucket_lower
            if not hit:
                continue
            if bucket_name == "primary":
                score += self.primary
            elif bucket_name == "symptom":
                score += self.symptom
            elif bucket_name == "console":
                score += self.console
            elif bucket_name == "intent":
                score += self.intent

        if self._is_local(lead):
            score += self.local_bonus

        if self._is_recent(lead):
            score += self.recency_bonus

        clamped = max(1, min(5, score))
        lead.intent_score = clamped
        return clamped

    # ---------- helpers ----------

    def _is_local(self, lead: Lead) -> bool:
        haystack = f"{lead.city_or_location}\n{lead.title}\n{lead.text_snippet}".lower()
        return any(city in haystack for city in self.local_cities)

    def _is_recent(self, lead: Lead) -> bool:
        if not lead.timestamp:
            return False
        try:
            ts = dateparser.parse(lead.timestamp)
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            return False
        return datetime.now(timezone.utc) - ts <= timedelta(days=self.recency_days)
