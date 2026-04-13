"""
scripts/attio_discover.py
-------------------------
Discovers your Attio workspace structure and prints the exact
object slugs, list slugs, and attribute slugs you need for the
integration to work.

Run this ONCE after you set ATTIO_API_KEY in .env:

    python -m lead_system.scripts.attio_discover

It prints a map like:
    Objects:
      people  -> name, email_addresses, phone_numbers, ...
      repairs -> device, status, revenue, ...
    Lists:
      leads   -> source, status, intent_score, ...

Use the output to verify that attio_store.py field mappings match
your actual attribute names. If they don't, edit the `field_map`
dicts in attio_store.py.
"""

from __future__ import annotations

import sys
from pathlib import Path

import requests

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from lead_system.config import load_config


API = "https://api.attio.com/v2"


def main() -> int:
    config = load_config()
    key = (config.env or {}).get("ATTIO_API_KEY", "")
    if not key:
        print("ERROR: ATTIO_API_KEY not set in .env")
        return 1

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    # ---------- Objects ----------
    print("=" * 60)
    print("  ATTIO WORKSPACE DISCOVERY")
    print("=" * 60)

    resp = requests.get(f"{API}/objects", headers=headers, timeout=15)
    if resp.status_code == 401:
        print("ERROR: Invalid API key. Regenerate in Attio → Settings → Developers.")
        return 1
    resp.raise_for_status()

    objects = resp.json().get("data", [])
    print(f"\nObjects ({len(objects)}):")
    for obj in objects:
        slug = obj.get("api_slug", "?")
        obj_id = obj.get("id", {}).get("object_id", "?")
        plural = obj.get("plural_noun", "")
        print(f"\n  [{slug}]  (id: {obj_id})  {plural}")

        # Get attributes for this object
        attr_resp = requests.get(
            f"{API}/objects/{slug}/attributes",
            headers=headers,
            timeout=15,
        )
        if attr_resp.status_code == 200:
            attrs = attr_resp.json().get("data", [])
            for attr in attrs:
                a_slug = attr.get("api_slug", "?")
                a_type = attr.get("type", "?")
                a_title = attr.get("title", "")
                is_required = " [REQUIRED]" if attr.get("is_required") else ""
                print(f"    - {a_slug} ({a_type}) {a_title}{is_required}")

    # ---------- Lists ----------
    resp2 = requests.get(f"{API}/lists", headers=headers, timeout=15)
    resp2.raise_for_status()
    lists = resp2.json().get("data", [])
    print(f"\n\nLists ({len(lists)}):")
    for lst in lists:
        slug = lst.get("api_slug", "?")
        lst_id = lst.get("id", {}).get("list_id", "?")
        parent = lst.get("parent_object", "?")
        name = lst.get("name", "")
        print(f"\n  [{slug}]  (id: {lst_id})  parent: {parent}  \"{name}\"")

        # Get list attributes (entry-level fields)
        attr_resp = requests.get(
            f"{API}/lists/{slug}/attributes",
            headers=headers,
            timeout=15,
        )
        if attr_resp.status_code == 200:
            attrs = attr_resp.json().get("data", [])
            for attr in attrs:
                a_slug = attr.get("api_slug", "?")
                a_type = attr.get("type", "?")
                a_title = attr.get("title", "")
                print(f"    - {a_slug} ({a_type}) {a_title}")

    print("\n" + "=" * 60)
    print("  Use the slugs above to verify field mappings in")
    print("  lead_system/storage/attio_store.py")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
