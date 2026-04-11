"""
processors/deduper.py
---------------------
Persistent de-duplication ledger.

Keeps a JSON file of seen hashes (URL + content hash) so that running
the pipeline repeatedly doesn't spam you with the same leads.

A lead is considered "new" if BOTH its URL-derived id AND its
content_hash are unseen. If either matches, we skip.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Set

from ..models import Lead
from ..utils.logger import get_logger


log = get_logger(__name__)


class Deduper:
    def __init__(self, ledger_path: Path) -> None:
        self.path = ledger_path
        self.seen_ids: Set[str] = set()
        self.seen_hashes: Set[str] = set()
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            log.info("Deduper: starting fresh ledger at %s", self.path)
            return
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            self.seen_ids = set(data.get("ids", []))
            self.seen_hashes = set(data.get("hashes", []))
            log.info(
                "Deduper: loaded %d ids and %d hashes",
                len(self.seen_ids),
                len(self.seen_hashes),
            )
        except Exception as exc:
            log.warning("Deduper: couldn't parse %s (%s) — starting fresh", self.path, exc)

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "ids": sorted(self.seen_ids),
            "hashes": sorted(self.seen_hashes),
        }
        self.path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def is_new(self, lead: Lead) -> bool:
        if lead.id in self.seen_ids:
            return False
        if lead.content_hash() in self.seen_hashes:
            return False
        return True

    def remember(self, lead: Lead) -> None:
        self.seen_ids.add(lead.id)
        self.seen_hashes.add(lead.content_hash())

    def filter_new(self, leads: List[Lead]) -> List[Lead]:
        fresh: List[Lead] = []
        for lead in leads:
            if self.is_new(lead):
                self.remember(lead)
                fresh.append(lead)
        return fresh
