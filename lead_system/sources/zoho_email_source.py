"""
sources/zoho_email_source.py
----------------------------
Reads Yelp lead emails (and Google Voice missed-call emails) out of
your Zoho inbox via IMAP and turns each one into a Lead.

Why IMAP instead of the Zoho Mail API?
  - IMAP is standard, stable, works with any Zoho plan including
    Mail Lite, and only needs a one-time app-specific password.
  - Zoho's OAuth2 API is more work to set up and adds exactly zero
    capability for this use case (read unread, mark read, move).

Setup:
  1. Log in to https://accounts.zoho.com/home#security/device_management
     and generate an app-specific password labeled "TechGuardian Lead
     Monitor". Copy the password.
  2. Put it in .env:
        ZOHO_EMAIL_USER=you@techguardiankc.com
        ZOHO_APP_PASSWORD=the-16-char-string-zoho-showed-you
  3. Run. The source connects over IMAPS (993), searches for unread
     messages from Yelp / Google Voice, parses each one, emits a
     Lead, and either moves the mail to a "Processed-Leads" folder
     or just marks it read (configurable).

What it parses:
  - Yelp lead notification emails (customer name, phone, message)
  - Yelp "new message" emails (same schema)
  - Google Voice missed-call emails (caller name + number)
  - Google Voice voicemail emails (transcript)

If a new sender or format shows up that we can't parse, the lead
still gets created with title + raw body so nothing is ever lost.
"""

from __future__ import annotations

import email
import email.header
import imaplib
import re
from datetime import datetime, timezone
from email.message import Message
from typing import List, Optional, Tuple

from .base import BaseSource
from ..models import Lead
from ..utils.logger import get_logger


log = get_logger(__name__)


class ZohoEmailSource(BaseSource):
    name = "zoho_email"
    platform = "Yelp / Email"

    def fetch(self) -> List[Lead]:
        cfg = self.config.source_config("zoho_email")
        if not cfg or not cfg.get("enabled"):
            log.info("Zoho email source disabled — skipping")
            return []

        creds = self.config.zoho_credentials()
        if not creds:
            log.warning(
                "Zoho email source: no credentials in .env — skipping. "
                "Set ZOHO_EMAIL_USER and ZOHO_APP_PASSWORD (see docs/ZOHO_SETUP.md)."
            )
            return []

        host = cfg.get("imap_host", "imappro.zoho.com")
        port = int(cfg.get("imap_port", 993))
        folder = cfg.get("folder", "INBOX")
        senders = cfg.get("senders", []) or []
        subject_includes = cfg.get("subject_includes", []) or []
        max_messages = int(cfg.get("max_messages_per_run", 50))
        processed_folder = cfg.get("processed_folder", "") or ""

        leads: List[Lead] = []

        try:
            imap = imaplib.IMAP4_SSL(host, port)
        except Exception as exc:
            log.error("Zoho IMAP connect failed: %s", exc)
            return []

        try:
            imap.login(creds["user"], creds["password"])
        except imaplib.IMAP4.error as exc:
            log.error(
                "Zoho IMAP login failed (check ZOHO_APP_PASSWORD — must be "
                "app-specific, not your regular password): %s",
                exc,
            )
            try:
                imap.logout()
            except Exception:
                pass
            return []

        try:
            typ, _ = imap.select(folder)
            if typ != "OK":
                log.error("Zoho IMAP: couldn't select folder %r", folder)
                return []

            # Search: UNSEEN + (FROM sender1 OR FROM sender2 OR SUBJECT ...)
            criteria = self._build_criteria(senders, subject_includes)
            log.info("Zoho IMAP search: %s", criteria)

            typ, data = imap.search(None, criteria)
            if typ != "OK":
                log.warning("Zoho IMAP search failed: %s", data)
                return []

            msg_ids = (data[0] or b"").split()
            log.info("Zoho IMAP: %d matching messages", len(msg_ids))

            if not msg_ids:
                return []

            # Process newest first, capped.
            msg_ids = msg_ids[-max_messages:][::-1]

            for msg_id in msg_ids:
                try:
                    typ, msg_data = imap.fetch(msg_id, "(RFC822)")
                    if typ != "OK" or not msg_data or not msg_data[0]:
                        continue
                    raw = msg_data[0][1]
                    parsed = email.message_from_bytes(raw)
                    lead = self._message_to_lead(parsed)
                    if lead is None:
                        continue
                    leads.append(lead)

                    # After processing: move to processed folder, or just mark read.
                    if processed_folder:
                        self._ensure_folder(imap, processed_folder)
                        imap.copy(msg_id, processed_folder)
                        imap.store(msg_id, "+FLAGS", "\\Deleted")
                    else:
                        imap.store(msg_id, "+FLAGS", "\\Seen")
                except Exception as exc:
                    log.warning("Failed to process message %s: %s", msg_id, exc)
                    continue

            if processed_folder:
                imap.expunge()
        finally:
            try:
                imap.close()
            except Exception:
                pass
            try:
                imap.logout()
            except Exception:
                pass

        log.info("Zoho email: %d leads extracted", len(leads))
        return leads

    # ---------- criteria builder ----------

    @staticmethod
    def _build_criteria(senders: List[str], subjects: List[str]) -> str:
        """Build an IMAP SEARCH criteria string.

        We OR every sender + every subject-include term together, then
        AND with UNSEEN. IMAP OR only takes 2 args so we nest them.
        """
        clauses: List[str] = []
        for s in senders:
            clauses.append(f'FROM "{s}"')
        for s in subjects:
            clauses.append(f'SUBJECT "{s}"')

        if not clauses:
            return "UNSEEN"

        # Nest OR pairs right-associatively: OR a (OR b (OR c d))
        def nest(items: List[str]) -> str:
            if len(items) == 1:
                return items[0]
            return f"OR {items[0]} ({nest(items[1:])})"

        return f"UNSEEN ({nest(clauses)})"

    # ---------- folder helper ----------

    @staticmethod
    def _ensure_folder(imap: imaplib.IMAP4_SSL, name: str) -> None:
        typ, _ = imap.list()
        # Cheap: try to create, ignore "already exists" error.
        try:
            imap.create(name)
        except Exception:
            pass

    # ---------- message -> Lead ----------

    def _message_to_lead(self, msg: Message) -> Optional[Lead]:
        from_addr = self._decode(msg.get("From", ""))
        subject = self._decode(msg.get("Subject", ""))
        date_hdr = msg.get("Date", "")
        message_id = (msg.get("Message-ID", "") or "").strip("<>")

        body = self._extract_body(msg)

        # Identify format so we can parse hints out.
        from_lc = from_addr.lower()
        if "yelp.com" in from_lc:
            parsed = self._parse_yelp(subject, body)
            platform = "Yelp"
        elif "google.com" in from_lc and "voice" in subject.lower():
            parsed = self._parse_voice(subject, body)
            platform = "Google Voice"
        else:
            parsed = {"customer": "", "phone": "", "message": body[:500]}
            platform = "Email"

        customer = parsed.get("customer") or "Unknown customer"
        phone = parsed.get("phone") or ""
        message = parsed.get("message") or body[:500]

        # A URL is required for the dedupe id — use Message-ID when available.
        url = f"mail:{message_id}" if message_id else f"mail:{subject[:80]}"

        note_bits: List[str] = []
        if phone:
            note_bits.append(f"phone={phone}")
        if from_addr:
            note_bits.append(f"from={from_addr}")

        ts = self._parse_date(date_hdr)

        return Lead(
            source=self.name,
            platform=platform,
            title=subject or "(no subject)",
            author_or_listing_name=customer,
            text_snippet=message[:500],
            url=url,
            timestamp=ts,
            city_or_location="",
            notes="; ".join(note_bits),
        )

    # ---------- parsing helpers ----------

    @staticmethod
    def _decode(value: str) -> str:
        if not value:
            return ""
        parts = email.header.decode_header(value)
        out: List[str] = []
        for text, enc in parts:
            if isinstance(text, bytes):
                try:
                    out.append(text.decode(enc or "utf-8", errors="replace"))
                except LookupError:
                    out.append(text.decode("utf-8", errors="replace"))
            else:
                out.append(text)
        return "".join(out).strip()

    @staticmethod
    def _extract_body(msg: Message) -> str:
        """Return the first text/plain body we find, falling back to text/html."""
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                disp = part.get("Content-Disposition", "") or ""
                if "attachment" in disp:
                    continue
                if ctype == "text/plain":
                    return ZohoEmailSource._decode_payload(part)
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    return ZohoEmailSource._html_to_text(
                        ZohoEmailSource._decode_payload(part)
                    )
            return ""
        else:
            ctype = msg.get_content_type()
            body = ZohoEmailSource._decode_payload(msg)
            if ctype == "text/html":
                return ZohoEmailSource._html_to_text(body)
            return body

    @staticmethod
    def _decode_payload(part: Message) -> str:
        payload = part.get_payload(decode=True) or b""
        charset = part.get_content_charset() or "utf-8"
        try:
            return payload.decode(charset, errors="replace")
        except LookupError:
            return payload.decode("utf-8", errors="replace")

    @staticmethod
    def _html_to_text(html: str) -> str:
        try:
            from bs4 import BeautifulSoup
            return BeautifulSoup(html, "lxml").get_text("\n", strip=True)
        except Exception:
            # Fallback: strip tags crudely.
            return re.sub(r"<[^>]+>", " ", html)

    # ---------- Yelp / Voice body parsers ----------

    _PHONE_RE = re.compile(
        r"(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}"
    )

    _YELP_CUSTOMER_RE = re.compile(
        r"(?:from|Customer|Name)\s*[:\-]\s*([A-Z][A-Za-z'\-]+(?:\s+[A-Z][A-Za-z'\-]+)?)",
    )

    def _parse_yelp(self, subject: str, body: str) -> dict:
        customer = ""
        # Yelp subjects look like: "New lead from Jane D. | Your Business Name"
        m = re.search(r"from\s+([A-Z][A-Za-z'\-\.]+(?:\s+[A-Z][A-Za-z'\-\.]+)?)", subject)
        if m:
            customer = m.group(1).strip()

        if not customer:
            m = self._YELP_CUSTOMER_RE.search(body)
            if m:
                customer = m.group(1).strip()

        phone = ""
        m = self._PHONE_RE.search(body)
        if m:
            phone = m.group(0).strip()

        # Trim Yelp footer boilerplate — keep ~first 1000 chars of useful text.
        cleaned = re.sub(r"\n{3,}", "\n\n", body).strip()
        cleaned = cleaned.split("Unsubscribe")[0].split("This message was sent")[0]

        return {"customer": customer, "phone": phone, "message": cleaned[:1000]}

    def _parse_voice(self, subject: str, body: str) -> dict:
        # Google Voice subjects: "Missed call from (555) 123-4567 at 10:23 AM"
        # or "New voicemail from Jane Doe"
        customer = ""
        m = re.search(r"from\s+([A-Z][A-Za-z'\-\. ]+?)(?:\s+at|\s*$)", subject)
        if m:
            customer = m.group(1).strip()

        phone = ""
        m = self._PHONE_RE.search(subject + " " + body)
        if m:
            phone = m.group(0).strip()

        cleaned = body.strip()[:1000]
        return {"customer": customer or "Voice caller", "phone": phone, "message": cleaned}

    @staticmethod
    def _parse_date(date_hdr: str) -> str:
        if not date_hdr:
            return datetime.now(timezone.utc).isoformat()
        try:
            from email.utils import parsedate_to_datetime
            dt = parsedate_to_datetime(date_hdr)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except Exception:
            return datetime.now(timezone.utc).isoformat()
