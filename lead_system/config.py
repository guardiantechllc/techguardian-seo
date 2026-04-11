"""
config.py
---------
Loads YAML settings and .env variables into a single Config object.

We purposely keep this as a thin wrapper so the rest of the codebase
never touches os.environ or yaml directly — that makes testing easy
and keeps secrets from leaking into logs.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
import os

import yaml
from dotenv import load_dotenv


REPO_ROOT = Path(__file__).resolve().parent
DEFAULT_SETTINGS_PATH = REPO_ROOT / "config" / "settings.yaml"
DEFAULT_ENV_PATH = REPO_ROOT / ".env"


@dataclass
class Config:
    """Typed view of the app's runtime configuration."""

    settings: Dict[str, Any]
    env: Dict[str, str] = field(default_factory=dict)
    root: Path = REPO_ROOT

    # ---------- Convenience accessors ----------

    def business(self) -> Dict[str, Any]:
        return self.settings.get("business", {})

    def keywords(self) -> Dict[str, List[str]]:
        return self.settings.get("keywords", {})

    def all_keywords(self) -> List[str]:
        """Flatten every keyword bucket into a de-duplicated list."""
        flat: List[str] = []
        for bucket in self.keywords().values():
            flat.extend(bucket)
        # Preserve order; dict keeps first-seen insertion order in 3.7+
        return list(dict.fromkeys(flat))

    def source_config(self, name: str) -> Dict[str, Any]:
        return self.settings.get("sources", {}).get(name, {}) or {}

    def enabled_sources(self) -> List[str]:
        # RUN_SOURCES env var overrides YAML toggles if set.
        override = (self.env.get("RUN_SOURCES") or "").strip()
        if override:
            return [s.strip() for s in override.split(",") if s.strip()]
        return [
            name
            for name, cfg in (self.settings.get("sources", {}) or {}).items()
            if (cfg or {}).get("enabled")
        ]

    def scoring(self) -> Dict[str, int]:
        return self.settings.get("scoring", {}) or {}

    def deduper_ledger(self) -> Path:
        rel = (self.settings.get("deduper") or {}).get(
            "ledger_file", "data/seen_hashes.json"
        )
        return self.root / rel

    def csv_file(self) -> Path:
        rel = (self.settings.get("storage") or {}).get(
            "csv_file", "data/leads.csv"
        )
        return self.root / rel

    def write_sheets(self) -> bool:
        return bool((self.settings.get("storage") or {}).get("write_sheets"))

    def log_file(self) -> Path:
        rel = (self.settings.get("logging") or {}).get(
            "file", "logs/lead_monitor.log"
        )
        return self.root / rel

    def log_level(self) -> str:
        return (self.env.get("LOG_LEVEL") or "INFO").upper()

    # ---------- External service credentials ----------

    def reddit_credentials(self) -> Optional[Dict[str, str]]:
        needed = ("REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USER_AGENT")
        if not all(self.env.get(k) for k in needed):
            return None
        return {
            "client_id": self.env["REDDIT_CLIENT_ID"],
            "client_secret": self.env["REDDIT_CLIENT_SECRET"],
            "user_agent": self.env["REDDIT_USER_AGENT"],
            "username": self.env.get("REDDIT_USERNAME", ""),
            "password": self.env.get("REDDIT_PASSWORD", ""),
        }

    def google_sheets_config(self) -> Optional[Dict[str, str]]:
        creds_file = self.env.get("GOOGLE_SHEETS_CREDENTIALS_FILE", "")
        spreadsheet = self.env.get("GOOGLE_SHEETS_SPREADSHEET", "")
        if not creds_file or not spreadsheet:
            return None
        resolved = (self.root / creds_file).resolve() if not Path(creds_file).is_absolute() else Path(creds_file)
        if not resolved.exists():
            return None
        return {
            "credentials_file": str(resolved),
            "spreadsheet": spreadsheet,
            "worksheet": self.env.get("GOOGLE_SHEETS_WORKSHEET", "console_hdmi"),
        }

    def openai_config(self) -> Optional[Dict[str, str]]:
        key = self.env.get("OPENAI_API_KEY", "")
        if not key:
            return None
        return {
            "api_key": key,
            "model": self.env.get("OPENAI_MODEL", "gpt-4o-mini"),
        }


def load_config(
    settings_path: Path = DEFAULT_SETTINGS_PATH,
    env_path: Path = DEFAULT_ENV_PATH,
) -> Config:
    """Read settings.yaml and .env (if present) into a Config."""
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)

    if not settings_path.exists():
        raise FileNotFoundError(f"Settings file not found: {settings_path}")

    with settings_path.open("r", encoding="utf-8") as f:
        settings = yaml.safe_load(f) or {}

    env_snapshot = {k: v for k, v in os.environ.items()}
    return Config(settings=settings, env=env_snapshot)
