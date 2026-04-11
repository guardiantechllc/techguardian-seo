"""
utils/logger.py
---------------
Central logger setup: rich console handler + rotating file handler.

Call `get_logger(__name__)` from anywhere in the project. Configure
once with `setup_logging(config)` at startup.
"""

from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from rich.logging import RichHandler


_CONFIGURED = False


def setup_logging(
    log_file: Path,
    level: str = "INFO",
    max_bytes: int = 1_048_576,
    backup_count: int = 5,
) -> None:
    """Install the console + file handlers on the root logger.

    Safe to call more than once — the second call is a no-op.
    """
    global _CONFIGURED
    if _CONFIGURED:
        return

    log_file.parent.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger()
    root.setLevel(level)

    # Clear any preexisting handlers (e.g. from noisy third-party libs).
    root.handlers.clear()

    console = RichHandler(
        rich_tracebacks=True,
        show_time=True,
        show_path=False,
        markup=False,
    )
    console.setLevel(level)
    root.addHandler(console)

    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    file_handler.setLevel("DEBUG")
    file_handler.setFormatter(
        logging.Formatter(
            "%(asctime)s  %(levelname)-7s  %(name)s  %(message)s"
        )
    )
    root.addHandler(file_handler)

    # Tame noisy libraries.
    for noisy in ("urllib3", "requests", "prawcore", "praw"):
        logging.getLogger(noisy).setLevel("WARNING")

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
