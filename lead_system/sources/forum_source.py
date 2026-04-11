"""
sources/forum_source.py
-----------------------
CLEAN STUB for public forum / classifieds RSS feeds.

It's intentionally not wired to anything real because forum support
varies wildly (some require login, some have unstable HTML, some
publish RSS). When you find a forum you trust and that explicitly
allows automated reads, add its RSS URL to
`sources.forum_stub.feeds` in `config/settings.yaml` and flip
`enabled: true`.

The stub already implements:
  - feed parsing via feedparser
  - polite HTTP through HttpClient
  - normalization into Lead

...so you only need to change the config to use it.
"""

from __future__ import annotations

from typing import List

import feedparser

from .base import BaseSource
from ..models import Lead
from ..utils.logger import get_logger


log = get_logger(__name__)


class ForumStubSource(BaseSource):
    name = "forum_stub"
    platform = "Public Forum"

    def fetch(self) -> List[Lead]:
        cfg = self.config.source_config("forum_stub")
        if not cfg or not cfg.get("enabled"):
            log.info("Forum stub source disabled — skipping (expected)")
            return []

        feeds = cfg.get("feeds", []) or []
        if not feeds:
            log.info("Forum stub enabled but no feeds configured — skipping")
            return []

        leads: List[Lead] = []
        for feed_url in feeds:
            try:
                raw = self.http.get_text(feed_url)
                parsed = feedparser.parse(raw)
            except PermissionError as exc:
                log.warning("Forum robots.txt blocked: %s", exc)
                continue
            except Exception as exc:
                log.warning("Forum fetch failed for %s: %s", feed_url, exc)
                continue

            for entry in parsed.entries:
                link = getattr(entry, "link", "")
                if not link:
                    continue
                leads.append(
                    Lead(
                        source=self.name,
                        platform=self.platform,
                        title=(getattr(entry, "title", "") or "").strip(),
                        author_or_listing_name=getattr(entry, "author", "") or "forum user",
                        text_snippet=(getattr(entry, "summary", "") or "")[:500],
                        url=link,
                        timestamp=getattr(entry, "updated", "") or getattr(entry, "published", ""),
                    )
                )
        log.info("Forum stub: %d raw leads collected", len(leads))
        return leads
