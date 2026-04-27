"""Deterministisk aggregering — ingen LLM-kurator.

Grupperer artikler per region, sorterer etter tier (kildeprioritet) og dato,
dedupliserer på tittel, og kutter sammendrag til de første 1-2 setningene.
Same signatur som før (`curate(articles, prompt_path)`), så main.py kan kalle
funksjonen uendret.
"""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Optional

ITEMS_PER_REGION = 3
SUMMARY_MAX_SENTENCES = 2
SUMMARY_MAX_CHARS = 280

REGION_LABELS = {
    "norge": "Norge & Norden",
    "europa": "Europa",
    "usa": "USA & globalt",
}

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-ZÆØÅ])")


def curate(articles: list[dict], prompt_path: Optional[object] = None) -> dict:
    by_region: dict[str, list[dict]] = defaultdict(list)
    for a in articles:
        by_region[a["region"]].append(a)

    sections = []
    date = articles[0]["date"] if articles else ""

    for region in ("norge", "europa", "usa"):
        bucket = by_region.get(region, [])
        bucket.sort(key=lambda a: (a.get("tier", 99), -_date_key(a.get("date", ""))))
        picked = _dedupe_by_title(bucket)[:ITEMS_PER_REGION]
        items = [
            {
                "title": a["title"],
                "url": a["url"],
                "source": a["source"],
                "date": a.get("date", ""),
                "summary": _trim_summary(a.get("summary", "")),
                "verdict": "",
            }
            for a in picked
        ]
        sections.append({"region": region, "label": REGION_LABELS[region], "items": items})

    return {"date": date, "take": "", "sections": sections}


def _date_key(date_str: str) -> int:
    try:
        y, m, d = date_str.split("-")
        return int(y) * 10000 + int(m) * 100 + int(d)
    except (ValueError, AttributeError):
        return 0


def _dedupe_by_title(articles: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for a in articles:
        key = re.sub(r"\s+", " ", a["title"].lower()).strip()
        if key in seen:
            continue
        seen.add(key)
        out.append(a)
    return out


def _trim_summary(summary: str) -> str:
    if not summary:
        return ""
    parts = _SENT_SPLIT.split(summary)
    out = " ".join(parts[:SUMMARY_MAX_SENTENCES]).strip()
    if len(out) > SUMMARY_MAX_CHARS:
        out = out[: SUMMARY_MAX_CHARS - 1].rstrip() + "…"
    return out
