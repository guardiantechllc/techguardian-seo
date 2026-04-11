"""
main.py
-------
Entry point for the Tech Guardian lead monitor.

Pipeline:
    1. Load config + .env
    2. Set up logging
    3. For each enabled source → fetch raw Leads
    4. Keyword match + filter
    5. Deduplicate against the persistent ledger
    6. Score 1..5
    7. Generate outreach drafts
    8. Sort by score desc
    9. Write to CSV (always) and Google Sheets (if configured)
   10. Print a summary table to the console

Run:
    python -m lead_system.main
or from inside the lead_system/ folder:
    python main.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List

# Allow running as either `python -m lead_system.main` (package mode)
# or `python main.py` from inside the lead_system/ directory.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lead_system.config import load_config, Config
from lead_system.models import Lead
from lead_system.utils.logger import setup_logging, get_logger
from lead_system.utils.http import HttpClient
from lead_system.sources.base import BaseSource
from lead_system.sources.craigslist_source import CraigslistSource
from lead_system.sources.reddit_source import RedditSource
from lead_system.sources.forum_source import ForumStubSource
from lead_system.processors.keyword_matcher import KeywordMatcher
from lead_system.processors.scorer import Scorer
from lead_system.processors.deduper import Deduper
from lead_system.messaging.draft_generator import DraftGenerator
from lead_system.storage.csv_store import CsvStore
from lead_system.storage.google_sheets_store import GoogleSheetsStore


SOURCE_REGISTRY = {
    "craigslist": CraigslistSource,
    "reddit": RedditSource,
    "forum_stub": ForumStubSource,
}


def build_sources(config: Config, http: HttpClient) -> List[BaseSource]:
    log = get_logger(__name__)
    wanted = config.enabled_sources()
    sources: List[BaseSource] = []
    for name in wanted:
        cls = SOURCE_REGISTRY.get(name)
        if cls is None:
            log.warning("Unknown source %r — skipping", name)
            continue
        sources.append(cls(config, http))
    return sources


def run(config: Config, dry_run: bool = False) -> List[Lead]:
    log = get_logger("lead_system.main")

    http = HttpClient()

    # ---------- 1. Fetch ----------
    all_leads: List[Lead] = []
    for source in build_sources(config, http):
        log.info("Running source: %s", source.name)
        try:
            raw = source.fetch()
        except Exception as exc:
            log.exception("Source %s blew up: %s", source.name, exc)
            continue
        log.info("  %s returned %d raw leads", source.name, len(raw))
        all_leads.extend(raw)

    if not all_leads:
        log.warning("No leads fetched from any source")
        return []

    # ---------- 2. Keyword filter ----------
    matcher = KeywordMatcher(config)
    matched = [l for l in all_leads if matcher.match(l)]
    log.info("Keyword filter: %d -> %d", len(all_leads), len(matched))

    # ---------- 3. Dedupe ----------
    deduper = Deduper(config.deduper_ledger())
    fresh = deduper.filter_new(matched)
    log.info("Dedupe: %d -> %d new leads", len(matched), len(fresh))

    if not fresh:
        log.info("No new leads this run")
        deduper.save()
        return []

    # ---------- 4. Score ----------
    scorer = Scorer(config)
    for lead in fresh:
        scorer.score(lead)

    # ---------- 5. Drafts ----------
    drafter = DraftGenerator(config)
    for lead in fresh:
        drafter.generate(lead)

    # ---------- 6. Sort by score desc ----------
    fresh.sort(key=lambda l: l.intent_score, reverse=True)

    # ---------- 7. Store ----------
    if not dry_run:
        csv_store = CsvStore(config.csv_file())
        csv_store.write(fresh)

        if config.write_sheets():
            sheets = GoogleSheetsStore(config)
            if sheets.available:
                sheets.write(fresh)
            else:
                log.info(
                    "Google Sheets not configured — CSV is the system of record"
                )

        deduper.save()

    _print_summary(fresh)
    return fresh


def _print_summary(leads: List[Lead]) -> None:
    try:
        from rich.console import Console
        from rich.table import Table
    except Exception:
        for lead in leads:
            print(f"[{lead.intent_score}] {lead.source} :: {lead.title[:80]}")
        return

    console = Console()
    table = Table(title=f"Tech Guardian — {len(leads)} new lead(s)")
    table.add_column("Score", justify="right")
    table.add_column("Source")
    table.add_column("Title", overflow="fold")
    table.add_column("Matched", overflow="fold")

    for lead in leads:
        table.add_row(
            str(lead.intent_score),
            lead.platform,
            lead.title[:100],
            ", ".join(lead.matched_keywords[:6]),
        )
    console.print(table)


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Tech Guardian console-repair lead monitor"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run the pipeline but don't write to CSV or Sheets",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=None,
        help="Path to an alternate settings.yaml",
    )
    args = parser.parse_args(argv)

    # Load config first so we know where to write logs.
    config = load_config(
        settings_path=args.config
        or (Path(__file__).resolve().parent / "config" / "settings.yaml")
    )

    logging_cfg = config.settings.get("logging", {}) or {}
    setup_logging(
        log_file=config.log_file(),
        level=config.log_level(),
        max_bytes=int(logging_cfg.get("max_bytes", 1_048_576)),
        backup_count=int(logging_cfg.get("backup_count", 5)),
    )

    log = get_logger("lead_system.main")
    log.info("Tech Guardian lead monitor starting")
    log.info("Enabled sources: %s", ", ".join(config.enabled_sources()) or "(none)")

    try:
        run(config, dry_run=args.dry_run)
    except Exception as exc:
        log.exception("Pipeline crashed: %s", exc)
        return 1

    log.info("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
