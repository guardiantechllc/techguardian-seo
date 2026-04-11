"""
sources/reddit_source.py
------------------------
Fetches public Reddit posts via the OFFICIAL Reddit API (PRAW) when
credentials are configured in .env.

Compliance notes:
  - Requires a Reddit "script" app; uses read-only OAuth.
  - Only searches public subreddits and public posts.
  - Does NOT DM, comment, upvote, or log in as a user-bot.
  - Gracefully skipped if credentials are missing — no unofficial
    scraping fallback, so you stay on the right side of Reddit ToS.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import List

from .base import BaseSource
from ..models import Lead
from ..utils.logger import get_logger


log = get_logger(__name__)


class RedditSource(BaseSource):
    name = "reddit"
    platform = "Reddit"

    def fetch(self) -> List[Lead]:
        cfg = self.config.source_config("reddit")
        if not cfg or not cfg.get("enabled"):
            log.info("Reddit source disabled — skipping")
            return []

        creds = self.config.reddit_credentials()
        if not creds:
            log.warning(
                "Reddit source: no credentials in .env — skipping. "
                "Set REDDIT_CLIENT_ID/SECRET/USER_AGENT to enable."
            )
            return []

        try:
            import praw  # Imported lazily so the app still runs without praw
        except ImportError:
            log.error("praw is not installed; cannot use Reddit source")
            return []

        reddit = praw.Reddit(
            client_id=creds["client_id"],
            client_secret=creds["client_secret"],
            user_agent=creds["user_agent"],
            # read_only mode — no login, no write scopes
            check_for_async=False,
        )
        reddit.read_only = True

        subs = cfg.get("subreddits", []) or []
        queries = cfg.get("queries", []) or []
        time_filter = cfg.get("time_filter", "month")
        limit = int(cfg.get("limit_per_query", 15))
        delay = float(cfg.get("request_delay_seconds", 2.0))

        leads: List[Lead] = []

        for sub in subs:
            for query in queries:
                log.info("Reddit: r/%s search %r", sub, query)
                try:
                    submissions = reddit.subreddit(sub).search(
                        query=query,
                        sort="new",
                        time_filter=time_filter,
                        limit=limit,
                    )
                    for post in submissions:
                        lead = self._post_to_lead(post)
                        if lead is not None:
                            leads.append(lead)
                except Exception as exc:
                    log.warning("Reddit search failed (r/%s %r): %s", sub, query, exc)
                time.sleep(delay)

        log.info("Reddit: %d raw leads collected", len(leads))
        return leads

    # ---------- helpers ----------

    def _post_to_lead(self, post) -> Lead | None:
        if getattr(post, "stickied", False):
            return None
        title = getattr(post, "title", "") or ""
        selftext = getattr(post, "selftext", "") or ""
        url = f"https://www.reddit.com{post.permalink}" if getattr(post, "permalink", None) else getattr(post, "url", "")
        author = str(getattr(post, "author", "") or "unknown")

        ts = getattr(post, "created_utc", None)
        if ts:
            iso = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
        else:
            iso = ""

        # Reddit posts don't always give us city; leave blank and let
        # the scorer bump score if the body mentions a local city.
        return Lead(
            source=self.name,
            platform=f"Reddit /r/{post.subreddit}",
            title=title.strip(),
            author_or_listing_name=author,
            text_snippet=(selftext or title).strip()[:500],
            url=url,
            timestamp=iso,
            city_or_location="",
        )
