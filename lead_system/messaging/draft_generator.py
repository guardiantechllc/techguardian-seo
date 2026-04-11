"""
messaging/draft_generator.py
----------------------------
Generates 3 outreach draft variants per lead:

  1. Soft opener  — friendly check-in, no pressure
  2. Direct       — leads with the service + value
  3. Urgency      — same-day / same-week framing

Every draft is a human-reviewable text. This module does NOT send
anything — it only writes drafts into the Lead and saves them.

If OPENAI_API_KEY is set in .env, the generator will also ask an
OpenAI-compatible model to rewrite the template drafts for a slightly
sharper, less templated feel. The templated drafts remain the fallback
so the system works fully offline.
"""

from __future__ import annotations

from typing import Dict, List

from ..config import Config
from ..models import Lead
from ..utils.logger import get_logger


log = get_logger(__name__)


class DraftGenerator:
    def __init__(self, config: Config) -> None:
        self.business = config.business() or {}
        self.openai_cfg = config.openai_config()

    # ---------- public API ----------

    def generate(self, lead: Lead) -> List[str]:
        variants = self._templated_variants(lead)
        if self.openai_cfg:
            try:
                variants = self._llm_polish(lead, variants)
            except Exception as exc:
                log.warning("LLM polish failed, keeping templated drafts: %s", exc)

        lead.outreach_variants = variants
        # "Best" pick: direct variant by default (index 1). Tune freely.
        lead.outreach_draft = variants[1] if len(variants) > 1 else variants[0]
        return variants

    # ---------- templates ----------

    def _templated_variants(self, lead: Lead) -> List[str]:
        ctx = self._context(lead)
        soft = (
            "Hey{salutation}, saw your post about the {issue} on your {console}. "
            "If it turns out to be HDMI related, we fix those in-house all the time "
            "at {brand} here in {metro}. No pressure at all — happy to answer "
            "questions or give you a ballpark if you want one.{phone_line}"
        ).format(**ctx)

        direct = (
            "Hey{salutation}, sounds like a classic HDMI port issue on the {console}. "
            "{brand} in {city} fixes these routinely — usually a same-week turnaround "
            "with a warranty on the repair. Want me to send over a quote?{phone_line}"
        ).format(**ctx)

        urgency = (
            "Hey{salutation}, if you're trying to get back online fast, we can usually "
            "turn around {console} HDMI repairs within a few days at {brand} in {city}. "
            "Limited same-day slots most weeks — want me to check availability?{phone_line}"
        ).format(**ctx)

        return [soft, direct, urgency]

    def _context(self, lead: Lead) -> Dict[str, str]:
        brand = self.business.get("name", "Tech Guardian")
        city = self.business.get("city", "Lee's Summit")
        metro = self.business.get("metro", "Kansas City")
        phone = self.business.get("phone", "")
        phone_line = f" You can also reach us at {phone}." if phone else ""

        console = self._guess_console(lead) or "console"
        issue = self._guess_issue(lead) or "display issue"

        salutation = ""
        if lead.author_or_listing_name and lead.author_or_listing_name not in ("unknown", "Craigslist listing"):
            # Keep it casual — first word only, strip weird chars
            first = lead.author_or_listing_name.split()[0].strip(",:;")
            if first and first.isalnum():
                salutation = f" {first}"

        return {
            "brand": brand,
            "city": city,
            "metro": metro,
            "phone_line": phone_line,
            "console": console,
            "issue": issue,
            "salutation": salutation,
        }

    @staticmethod
    def _guess_console(lead: Lead) -> str:
        text = f"{lead.title} {lead.text_snippet}".lower()
        for needle, label in (
            ("ps5", "PS5"),
            ("playstation 5", "PS5"),
            ("ps4", "PS4"),
            ("playstation 4", "PS4"),
            ("series x", "Xbox Series X"),
            ("series s", "Xbox Series S"),
            ("xbox one", "Xbox One"),
            ("xbox", "Xbox"),
            ("switch", "Nintendo Switch"),
        ):
            if needle in text:
                return label
        return ""

    @staticmethod
    def _guess_issue(lead: Lead) -> str:
        text = f"{lead.title} {lead.text_snippet}".lower()
        if "hdmi" in text:
            return "HDMI issue"
        if "no signal" in text or "black screen" in text or "no picture" in text:
            return "no-signal issue"
        if "won't display" in text or "wont display" in text or "no display" in text:
            return "display issue"
        return ""

    # ---------- optional LLM polish ----------

    def _llm_polish(self, lead: Lead, variants: List[str]) -> List[str]:
        """Ask an OpenAI-compatible model to rewrite each variant.

        Fails loudly upward so the caller keeps the templated drafts
        when the network or quota is flaky.
        """
        import requests  # local import so plain runs don't need it

        api_key = self.openai_cfg["api_key"]
        model = self.openai_cfg["model"]

        system = (
            "You rewrite outreach drafts for Tech Guardian, a local console "
            "repair shop in Lee's Summit / Kansas City. Keep them casual, "
            "confident, not spammy, 2-3 sentences max. Never invent prices. "
            "Never add emojis. Never use phrases like 'I hope this finds you well'."
        )
        labels = ["soft opener", "direct pitch", "same-week urgency"]
        polished: List[str] = []

        for label, draft in zip(labels, variants):
            user = (
                f"Lead title: {lead.title}\n"
                f"Lead text: {lead.text_snippet}\n\n"
                f"Rewrite the following {label} draft. Keep the same intent "
                f"but make it sound natural:\n\n{draft}"
            )
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.5,
                    "max_tokens": 200,
                },
                timeout=30,
            )
            resp.raise_for_status()
            polished.append(resp.json()["choices"][0]["message"]["content"].strip())
        return polished
