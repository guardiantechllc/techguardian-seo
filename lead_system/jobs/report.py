"""
jobs/report.py
--------------
Profit report CLI — shows today / this week / this month, plus how
you're tracking against your $400/day goal.

Run:
    python -m lead_system.jobs.report
    python -m lead_system.jobs.report --days 30
    python -m lead_system.jobs.report --date 2026-04-10

Reads data/jobs.csv — you don't need Airtable for reports to work.
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, List, Optional

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from lead_system.config import load_config
from lead_system.jobs.store import JobsCsvStore


def _load_rows(csv_path: Path) -> List[dict]:
    return JobsCsvStore(csv_path).load_all()


def _f(val: str) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return 0.0


def _sum(rows: List[dict], key: str) -> float:
    return sum(_f(r.get(key, "")) for r in rows)


def _filter_date(rows: List[dict], target_day: str) -> List[dict]:
    return [r for r in rows if r.get("date", "") == target_day]


def _filter_range(rows: List[dict], start: date, end: date) -> List[dict]:
    out = []
    for r in rows:
        d = r.get("date", "")
        if not d:
            continue
        try:
            day = date.fromisoformat(d)
        except ValueError:
            continue
        if start <= day <= end:
            out.append(r)
    return out


def _fmt_money(n: float) -> str:
    return f"${n:,.2f}"


def _bar(progress: float, width: int = 30) -> str:
    progress = max(0.0, min(1.0, progress))
    filled = int(round(progress * width))
    return "█" * filled + "░" * (width - filled)


def main(argv: Optional[list] = None) -> int:
    parser = argparse.ArgumentParser(description="Tech Guardian profit report")
    parser.add_argument(
        "--date",
        help="Specific day YYYY-MM-DD (default: today)",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Trailing window for the summary table (default: 7)",
    )
    args = parser.parse_args(argv)

    config = load_config()
    csv_path = config.jobs_csv_file()
    rows = _load_rows(csv_path)
    target = config.daily_revenue_target()

    today_iso = args.date or date.today().isoformat()
    today_rows = _filter_date(rows, today_iso)

    # Trailing window
    try:
        today_d = date.fromisoformat(today_iso)
    except ValueError:
        print(f"Invalid --date: {today_iso}")
        return 2
    start_d = today_d - timedelta(days=args.days - 1)
    window_rows = _filter_range(rows, start_d, today_d)

    today_revenue = _sum(today_rows, "revenue")
    today_profit = _sum(today_rows, "profit")
    window_revenue = _sum(window_rows, "revenue")
    window_profit = _sum(window_rows, "profit")

    progress = today_revenue / target if target > 0 else 0.0

    # Per-day breakdown in window
    per_day: Dict[str, Dict[str, float]] = {}
    for r in window_rows:
        d = r.get("date", "")
        bucket = per_day.setdefault(d, {"revenue": 0.0, "profit": 0.0, "jobs": 0})
        bucket["revenue"] += _f(r.get("revenue"))
        bucket["profit"] += _f(r.get("profit"))
        bucket["jobs"] += 1

    try:
        from rich.console import Console
        from rich.table import Table
        from rich.panel import Panel
    except Exception:
        # Plain text fallback
        print(f"Today ({today_iso}): revenue {_fmt_money(today_revenue)}, "
              f"profit {_fmt_money(today_profit)}, target {_fmt_money(target)}, "
              f"{progress:.0%} of goal")
        print(f"Last {args.days} days: revenue {_fmt_money(window_revenue)}, "
              f"profit {_fmt_money(window_profit)}")
        return 0

    console = Console()

    # Today panel
    remaining = max(target - today_revenue, 0.0)
    title = f"Today — {today_iso}"
    body_lines = [
        f"Revenue: [bold]{_fmt_money(today_revenue)}[/bold]",
        f"Profit:  [bold]{_fmt_money(today_profit)}[/bold]",
        f"Jobs:    {len(today_rows)}",
        "",
        f"Goal:    {_fmt_money(target)} / day",
        f"Progress:  {_bar(progress)}  {progress:.0%}",
    ]
    if remaining > 0:
        body_lines.append(f"Need:    {_fmt_money(remaining)} more today")
    else:
        body_lines.append(f"[green]Goal hit![/green]  +{_fmt_money(today_revenue - target)} over")

    border = "green" if progress >= 1 else ("yellow" if progress >= 0.5 else "red")
    console.print(Panel("\n".join(body_lines), title=title, border_style=border))

    # Window table
    table = Table(title=f"Last {args.days} days ({start_d} → {today_d})")
    table.add_column("Date")
    table.add_column("Jobs", justify="right")
    table.add_column("Revenue", justify="right")
    table.add_column("Profit", justify="right")
    table.add_column("Goal hit?", justify="center")

    window_day = start_d
    while window_day <= today_d:
        key = window_day.isoformat()
        bucket = per_day.get(key, {"revenue": 0.0, "profit": 0.0, "jobs": 0})
        hit = "[green]✓[/green]" if bucket["revenue"] >= target else "—"
        table.add_row(
            key,
            str(int(bucket["jobs"])),
            _fmt_money(bucket["revenue"]),
            _fmt_money(bucket["profit"]),
            hit,
        )
        window_day += timedelta(days=1)
    console.print(table)

    # Totals
    days_in_window = args.days
    avg_per_day = window_revenue / days_in_window if days_in_window else 0
    footer = (
        f"Window totals: revenue [bold]{_fmt_money(window_revenue)}[/bold], "
        f"profit [bold]{_fmt_money(window_profit)}[/bold], "
        f"avg/day {_fmt_money(avg_per_day)}"
    )
    console.print(footer)

    if csv_path.exists():
        console.print(f"\n[dim]Source: {csv_path}[/dim]")
    else:
        console.print(
            "\n[yellow]No jobs logged yet. Log one with:[/yellow] "
            "python -m lead_system.jobs.log_job"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
