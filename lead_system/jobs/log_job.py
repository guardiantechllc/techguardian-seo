"""
jobs/log_job.py
---------------
Interactive CLI to log a completed repair in ~15 seconds.

Run:
    python -m lead_system.jobs.log_job

Non-interactive form (for iPhone Shortcut, scripts, etc.):
    python -m lead_system.jobs.log_job \
        --customer "Jane Doe" \
        --device "PS5" \
        --service "HDMI port replacement" \
        --revenue 180 \
        --parts 22 \
        --phone "816-555-0101" \
        --source yelp \
        --notes "Same-day turnaround"

Writes to data/jobs.csv (always) AND Airtable Jobs table (if
AIRTABLE_API_KEY/AIRTABLE_BASE_ID are set in .env).
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path
from typing import Optional

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from lead_system.config import load_config
from lead_system.utils.logger import setup_logging, get_logger
from lead_system.jobs.models import Job
from lead_system.jobs.store import JobsCsvStore, JobsAirtableStore


def _prompt(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    val = input(f"{label}{suffix}: ").strip()
    return val or default


def _prompt_float(label: str, default: float = 0.0) -> float:
    while True:
        raw = input(f"{label} [{default}]: ").strip()
        if not raw:
            return float(default)
        try:
            return float(raw.replace("$", "").replace(",", ""))
        except ValueError:
            print("  not a number, try again")


def interactive() -> Job:
    print("Log a completed repair (Ctrl-C to cancel)")
    print("-" * 50)
    today = date.today().isoformat()
    day = _prompt("Date (YYYY-MM-DD)", today) or today
    customer = _prompt("Customer name") or "walk-in"
    phone = _prompt("Customer phone")
    device = _prompt("Device (PS5, Xbox Series X, iPhone 12, ...)") or "console"
    service = _prompt("Service performed") or "repair"
    revenue = _prompt_float("Revenue / price charged", 0.0)
    parts = _prompt_float("Parts cost", 0.0)
    other = _prompt_float("Other expenses (shipping, shop supplies)", 0.0)
    source = _prompt("Lead source (yelp, walkin, craigslist, ...)", "walkin")
    notes = _prompt("Notes (optional)")
    return Job(
        date=day,
        customer_name=customer,
        customer_phone=phone,
        device=device,
        service=service,
        revenue=revenue,
        parts_cost=parts,
        other_expenses=other,
        lead_source=source,
        notes=notes,
    )


def non_interactive(args: argparse.Namespace) -> Job:
    return Job(
        date=args.date or date.today().isoformat(),
        customer_name=args.customer or "walk-in",
        customer_phone=args.phone or "",
        device=args.device or "console",
        service=args.service or "repair",
        revenue=float(args.revenue or 0),
        parts_cost=float(args.parts or 0),
        other_expenses=float(args.other or 0),
        lead_source=args.source or "walkin",
        notes=args.notes or "",
    )


def main(argv: Optional[list] = None) -> int:
    parser = argparse.ArgumentParser(description="Log a completed Tech Guardian repair")
    parser.add_argument("--date")
    parser.add_argument("--customer")
    parser.add_argument("--phone")
    parser.add_argument("--device")
    parser.add_argument("--service")
    parser.add_argument("--revenue", type=float)
    parser.add_argument("--parts", type=float)
    parser.add_argument("--other", type=float)
    parser.add_argument("--source")
    parser.add_argument("--notes")
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip interactive mode even if some fields are missing",
    )
    args = parser.parse_args(argv)

    config = load_config()
    setup_logging(log_file=config.log_file(), level=config.log_level())
    log = get_logger("lead_system.jobs.log_job")

    interactive_mode = not args.yes and not any(
        [args.customer, args.service, args.revenue is not None]
    )

    try:
        job = interactive() if interactive_mode else non_interactive(args)
    except KeyboardInterrupt:
        print("\nCancelled.")
        return 130

    csv_store = JobsCsvStore(config.jobs_csv_file())
    csv_store.write([job])

    at_store = JobsAirtableStore(config)
    if at_store.available:
        at_store.write([job])
    else:
        log.info("Airtable not configured — wrote to CSV only")

    print()
    print(f"Logged job {job.id}")
    print(f"  {job.customer_name} — {job.device} — {job.service}")
    print(f"  Revenue ${job.revenue:.2f} | Parts ${job.parts_cost:.2f} | Profit ${job.profit:.2f}")
    print()
    print("Run daily report:  python -m lead_system.jobs.report")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
