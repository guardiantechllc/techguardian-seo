"""
sources/craigslist_source.py
----------------------------
Fetches public Craigslist search results via the officially-offered
RSS format (`?format=rss`).

Why RSS?
  - It's the format Craigslist explicitly publishes for automated
    consumers — no HTML scraping, no login, no captchas.
  - Stable, polite, and easy to parse with `feedparser`.

The source hits every path configured under `sources.craigslist` in
settings.yaml, normalizes each entry into a Lead, and tags the city
with the local subdomain ("kansascity.craigslist.org" -> "Kansas City").
"""

from __future__ import annotations

import time
from typing import List

import feedparser

from .base import BaseSource
from ..models import Lead
from ..utils.logger import get_logger


log = get_logger(__name__)


class CraigslistSource(BaseSource):
    name = "craigslist"
    platform = "Craigslist KC"

    def fetch(self) -> List[Lead]:
        cfg = self.config.source_config("craigslist")
        if not cfg or not cfg.get("enabled"):
            log.info("Craigslist source disabled — skipping")
            return []

        base = cfg.get("base_url", "").rstrip("/")
        paths = cfg.get("search_paths", []) or []
        delay = float(cfg.get("request_delay_seconds", 3.0))
        max_items = int(cfg.get("max_items_per_feed", 25))

        # Derive a readable city label from the subdomain.
        city_label = "Kansas City"
        if "kansascity" in base:
            city_label = "Kansas City"

        leads: List[Lead] = []

        for path in paths:
            url = f"{base}{path}"
            log.info("Craigslist: fetching %s", url)
            try:
                # feedparser can take a URL directly, but we route through
                # our polite HttpClient so robots.txt + rate limiting apply.
                raw = self.http.get_text(url)
                parsed = feedparser.parse(raw)
            except PermissionError as exc:
                log.warning("Craigslist robots.txt blocked: %s", exc)
                continue
            except Exception as exc:
                log.warning("Craigslist fetch failed for %s: %s", url, exc)
                continue

            entries = parsed.entries[:max_items]
            log.info("  -> %d entries", len(entries))

            for entry in entries:
                lead = self._entry_to_lead(entry, city_label)
                if lead is not None:
                    leads.append(lead)

            # Extra delay between feeds on top of HttpClient's host rate limit.
            time.sleep(delay)

        log.info("Craigslist: %d raw leads collected", len(leads))
        return leads

    # ---------- helpers ----------

    def _entry_to_lead(self, entry, city_label: str) -> Lead | None:
        link = getattr(entry, "link", "") or ""
        if not link:
            return None
        title = getattr(entry, "title", "") or ""
        summary = getattr(entry, "summary", "") or getattr(entry, "description", "") or ""
        published = getattr(entry, "updated", "") or getattr(entry, "published", "") or ""
        author = getattr(entry, "author", "") or "Craigslist listing"

        return Lead(
            source=self.name,
            platform=self.platform,
            title=title.strip(),
            author_or_listing_name=author.strip(),
            text_snippet=self._clean_summary(summary)[:500],
            url=link.strip(),
            timestamp=published.strip(),
            city_or_location=city_label,
        )

    @staticmethod
    def _clean_summary(html: str) -> str:
        """Crude HTML strip — good enough for Craigslist's short blurbs."""
        try:
            from bs4 import BeautifulSoup
            return BeautifulSoup(html, "lxml").get_text(" ", strip=True)
        except Exception:
            return html
