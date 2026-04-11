"""
storage/google_sheets_store.py
------------------------------
Optional Google Sheets sync for lead rows.

How it works:
  - If GOOGLE_SHEETS_CREDENTIALS_FILE points to a valid Google
    service-account JSON and GOOGLE_SHEETS_SPREADSHEET is set, the
    store opens (or creates) the spreadsheet, opens (or creates) the
    worksheet, and upserts rows by the `id` column.
  - If anything is missing or fails, the call is a no-op and the
    caller falls back to CSV alone. No noisy errors — just a warning.

Grant setup (one-time):
  1) Create a Google Cloud service account and enable Sheets + Drive API.
  2) Download its JSON key → save as ./credentials/google-sa.json (for
     example) and point GOOGLE_SHEETS_CREDENTIALS_FILE at it.
  3) In the Google Sheet, share the sheet with the service account's
     email address as Editor.
"""

from __future__ import annotations

from typing import Dict, Iterable, List, Optional

from ..config import Config
from ..models import Lead, LEAD_FIELDS
from ..utils.logger import get_logger


log = get_logger(__name__)


class GoogleSheetsStore:
    def __init__(self, config: Config) -> None:
        self.cfg = config.google_sheets_config()
        self._client = None
        self._worksheet = None

    @property
    def available(self) -> bool:
        return self.cfg is not None

    def _connect(self) -> bool:
        if not self.available:
            return False
        if self._worksheet is not None:
            return True
        try:
            import gspread
            from google.oauth2.service_account import Credentials
        except ImportError:
            log.warning("gspread/google-auth not installed — skipping Sheets")
            return False

        scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]
        try:
            creds = Credentials.from_service_account_file(
                self.cfg["credentials_file"], scopes=scopes
            )
            self._client = gspread.authorize(creds)
            spreadsheet_name = self.cfg["spreadsheet"]
            try:
                sh = self._client.open(spreadsheet_name)
            except Exception:
                # Fall back to open_by_key if they gave us a key string.
                sh = self._client.open_by_key(spreadsheet_name)

            worksheet_name = self.cfg["worksheet"]
            try:
                ws = sh.worksheet(worksheet_name)
            except Exception:
                ws = sh.add_worksheet(
                    title=worksheet_name, rows=1000, cols=len(LEAD_FIELDS)
                )
                ws.append_row(LEAD_FIELDS, value_input_option="RAW")

            # Ensure header exists / matches.
            header = ws.row_values(1)
            if header != LEAD_FIELDS:
                ws.update("A1", [LEAD_FIELDS])

            self._worksheet = ws
            return True
        except Exception as exc:
            log.warning("Google Sheets connection failed: %s", exc)
            return False

    def write(self, leads: Iterable[Lead]) -> int:
        leads = list(leads)
        if not leads:
            return 0
        if not self._connect():
            return 0

        ws = self._worksheet

        # Build an id -> row_index map from the current sheet so we can
        # upsert instead of appending duplicates.
        try:
            existing = ws.col_values(LEAD_FIELDS.index("id") + 1)
        except Exception as exc:
            log.warning("Sheets read failed: %s", exc)
            return 0

        id_to_row: Dict[str, int] = {}
        for i, rid in enumerate(existing[1:], start=2):  # skip header row
            if rid:
                id_to_row[rid] = i

        updates_batch: List[dict] = []
        to_append: List[List[str]] = []

        for lead in leads:
            row = lead.to_row()
            values = [str(row.get(k, "")) for k in LEAD_FIELDS]
            if lead.id in id_to_row:
                r = id_to_row[lead.id]
                updates_batch.append(
                    {"range": f"A{r}:{_col(len(LEAD_FIELDS))}{r}", "values": [values]}
                )
            else:
                to_append.append(values)

        try:
            if updates_batch:
                ws.batch_update(updates_batch, value_input_option="RAW")
            if to_append:
                ws.append_rows(to_append, value_input_option="RAW")
        except Exception as exc:
            log.warning("Sheets write failed: %s", exc)
            return 0

        log.info(
            "Google Sheets: upserted %d rows (%d updated, %d appended)",
            len(leads),
            len(updates_batch),
            len(to_append),
        )
        return len(leads)


def _col(n: int) -> str:
    """1-indexed column number -> spreadsheet letter (A, B, .., Z, AA)."""
    s = ""
    while n > 0:
        n, rem = divmod(n - 1, 26)
        s = chr(65 + rem) + s
    return s
