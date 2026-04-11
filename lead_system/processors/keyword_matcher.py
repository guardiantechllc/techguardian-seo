"""
processors/keyword_matcher.py
-----------------------------
Case-insensitive multi-word keyword matcher.

Given a Lead and a Config, it scans the title + snippet for every
configured keyword and annotates the lead with:
  - matched_keywords: the keywords it found
  - lead_type: "console_hdmi" (currently the only type — extensible)

Returns True if the lead matched at least one primary / symptom /
console keyword — i.e. "is this worth keeping?".
"""

from __future__ import annotations

import re
from typing import Dict, List, Set

from ..config import Config
from ..models import Lead


class KeywordMatcher:
    def __init__(self, config: Config) -> None:
        self.buckets: Dict[str, List[str]] = config.keywords() or {}
        # Pre-compile regexes for each keyword once.
        self._regexes: Dict[str, Dict[str, re.Pattern]] = {
            bucket: {kw: self._compile(kw) for kw in kws}
            for bucket, kws in self.buckets.items()
        }

    @staticmethod
    def _compile(keyword: str) -> re.Pattern:
        # Word-boundary style match that still works with multi-word phrases
        # and apostrophes (e.g. "won't display").
        escaped = re.escape(keyword).replace(r"\ ", r"\s+")
        return re.compile(rf"(?<![A-Za-z0-9]){escaped}(?![A-Za-z0-9])", re.IGNORECASE)

    def match(self, lead: Lead) -> bool:
        """Annotate the lead in place. Returns True if it should be kept."""
        blob = f"{lead.title}\n{lead.text_snippet}"
        found: List[str] = []
        bucket_hits: Set[str] = set()

        for bucket, regexes in self._regexes.items():
            for kw, rx in regexes.items():
                if rx.search(blob):
                    found.append(kw)
                    bucket_hits.add(bucket)

        # De-dup while preserving order.
        lead.matched_keywords = list(dict.fromkeys(found))

        # A lead is a keeper if it matched a primary/symptom/intent bucket,
        # or if it hit BOTH a console bucket and any other bucket.
        if bucket_hits & {"primary", "symptom"}:
            return True
        if "console" in bucket_hits and bucket_hits & {"intent"}:
            return True
        return False
