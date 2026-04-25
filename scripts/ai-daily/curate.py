"""Send artikler til Claude API for kuratering."""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from anthropic import Anthropic

MODEL = "claude-sonnet-4-5-20250929"  # oppdater til Sonnet 4.6 når tilgjengelig
MAX_ARTICLES = 60


def curate(articles: list[dict], prompt_path: Path) -> dict:
    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    system_prompt = prompt_path.read_text(encoding="utf-8")

    trimmed = articles[:MAX_ARTICLES]
    user_msg = "Her er artiklene fra siste 24 timer:\n\n"
    for a in trimmed:
        user_msg += f"- [{a['region']}/{a['source']}] {a['title']}\n"
        user_msg += f"  {a['summary'][:300]}\n  {a['url']}\n  ({a['date']})\n\n"

    last_error: Exception | None = None
    for attempt in range(2):
        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": user_msg}],
            )
            text = resp.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()
            payload = json.loads(text)
            return payload
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            print(f"  Kurator-feil (forsøk {attempt + 1}): {exc}")
            if attempt == 0:
                time.sleep(5)

    print(f"  Kurator gir opp etter 2 forsøk ({last_error}). Bruker fallback.")
    return _fallback(articles)


def _fallback(articles: list[dict]) -> dict:
    """Hvis Claude svikter helt, send rå titler gruppert per region."""
    by_region: dict[str, list[dict]] = {"norge": [], "europa": [], "usa": []}
    labels = {"norge": "Norge & Norden", "europa": "Europa", "usa": "USA & globalt"}

    for a in articles[:15]:
        bucket = by_region.setdefault(a["region"], [])
        if len(bucket) >= 5:
            continue
        bucket.append(
            {
                "title": a["title"],
                "url": a["url"],
                "source": a["source"],
                "date": a["date"],
                "summary": a["summary"][:200],
                "verdict": "",
            }
        )

    return {
        "date": articles[0]["date"] if articles else "",
        "take": "Kurator utilgjengelig — råliste under.",
        "sections": [
            {"region": r, "label": labels.get(r, r.title()), "items": items}
            for r, items in by_region.items()
            if items
        ],
    }
