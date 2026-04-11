"""
utils/http.py
-------------
Polite HTTP helper.

- A single shared `requests.Session` with a clearly-identified
  User-Agent (so sites can contact us if we misbehave).
- Per-host rate limiting. Every request sleeps just long enough
  that consecutive calls to the same host respect `min_interval`.
- Automatic retry with exponential backoff on transient errors.
- Honors robots.txt when `respect_robots=True` (default).

Usage:
    client = HttpClient(user_agent="techguardian-lead-monitor/0.1")
    html = client.get_text("https://kansascity.craigslist.org/...")
"""

from __future__ import annotations

import time
import urllib.parse
import urllib.robotparser
from dataclasses import dataclass, field
from typing import Dict, Optional

import requests

from .logger import get_logger


log = get_logger(__name__)


DEFAULT_UA = (
    "techguardian-lead-monitor/0.1 "
    "(+https://techguardiankc.com; contact: repairs@techguardiankc.com)"
)


@dataclass
class HttpClient:
    user_agent: str = DEFAULT_UA
    min_interval: float = 2.0       # seconds between calls to the same host
    timeout: float = 20.0
    max_retries: int = 3
    respect_robots: bool = True

    _session: requests.Session = field(init=False, repr=False)
    _last_call_per_host: Dict[str, float] = field(default_factory=dict, repr=False)
    _robots_cache: Dict[str, Optional[urllib.robotparser.RobotFileParser]] = field(
        default_factory=dict, repr=False
    )

    def __post_init__(self) -> None:
        self._session = requests.Session()
        self._session.headers.update(
            {
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/json;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }
        )

    # ---------- Public API ----------

    def get(self, url: str, **kwargs) -> requests.Response:
        self._check_robots(url)
        self._rate_limit(url)
        return self._request_with_retry("GET", url, **kwargs)

    def get_text(self, url: str, **kwargs) -> str:
        resp = self.get(url, **kwargs)
        resp.raise_for_status()
        return resp.text

    def get_json(self, url: str, **kwargs) -> dict:
        resp = self.get(url, **kwargs)
        resp.raise_for_status()
        return resp.json()

    # ---------- Internals ----------

    def _host(self, url: str) -> str:
        return urllib.parse.urlparse(url).netloc.lower()

    def _rate_limit(self, url: str) -> None:
        host = self._host(url)
        last = self._last_call_per_host.get(host, 0.0)
        wait = (last + self.min_interval) - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        self._last_call_per_host[host] = time.monotonic()

    def _check_robots(self, url: str) -> None:
        if not self.respect_robots:
            return
        parsed = urllib.parse.urlparse(url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin not in self._robots_cache:
            rp = urllib.robotparser.RobotFileParser()
            try:
                rp.set_url(f"{origin}/robots.txt")
                rp.read()
                self._robots_cache[origin] = rp
            except Exception as exc:     # pragma: no cover - network fluke
                log.debug("robots.txt fetch failed for %s: %s", origin, exc)
                self._robots_cache[origin] = None

        rp = self._robots_cache[origin]
        if rp is None:
            return   # couldn't read robots.txt, fail-open politely
        if not rp.can_fetch(self.user_agent, url):
            raise PermissionError(
                f"robots.txt disallows {url} for user-agent {self.user_agent!r}"
            )

    def _request_with_retry(
        self, method: str, url: str, **kwargs
    ) -> requests.Response:
        kwargs.setdefault("timeout", self.timeout)
        last_exc: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                resp = self._session.request(method, url, **kwargs)
                # Retry on 429/5xx.
                if resp.status_code == 429 or 500 <= resp.status_code < 600:
                    raise requests.HTTPError(
                        f"{resp.status_code} from {url}", response=resp
                    )
                return resp
            except (requests.ConnectionError, requests.Timeout, requests.HTTPError) as exc:
                last_exc = exc
                wait = min(2 ** attempt, 30)
                log.warning(
                    "HTTP attempt %d/%d failed for %s: %s — retrying in %ds",
                    attempt,
                    self.max_retries,
                    url,
                    exc,
                    wait,
                )
                time.sleep(wait)
        assert last_exc is not None
        raise last_exc
