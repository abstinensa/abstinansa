"""Hent RSS-feeds, filtrer på alder og nøkkelord, returner artikler."""
from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from html import unescape
from pathlib import Path
from typing import Iterable

import feedparser
import yaml

MAX_AGE_HOURS = 24
SUMMARY_MAX_CHARS = 1200
USER_AGENT = "abstinensa-ai-daily/1.0 (+https://abstinensa.no)"


@dataclass
class Article:
    title: str
    url: str
    source: str
    region: str
    tier: int
    date: str
    summary: str

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "url": self.url,
            "source": self.source,
            "region": self.region,
            "tier": self.tier,
            "date": self.date,
            "summary": self.summary,
        }


def _strip_html(text: str) -> str:
    if not text:
        return ""
    out = []
    in_tag = False
    for ch in text:
        if ch == "<":
            in_tag = True
        elif ch == ">":
            in_tag = False
        elif not in_tag:
            out.append(ch)
    cleaned = unescape("".join(out))
    return " ".join(cleaned.split())


def _entry_datetime(entry) -> datetime | None:
    for key in ("published_parsed", "updated_parsed", "created_parsed"):
        struct = entry.get(key)
        if struct:
            try:
                return datetime.fromtimestamp(time.mktime(struct), tz=timezone.utc)
            except (OverflowError, ValueError):
                continue
    return None


def _matches_keywords(text: str, keywords: Iterable[str]) -> bool:
    lowered = text.lower()
    return any(kw.lower() in lowered for kw in keywords)


def _fetch_one(source: dict, region: str, exclude_keywords: list[str], cutoff: datetime) -> list[Article]:
    name = source["name"]
    url = source["url"]
    tier = source.get("tier", 3)
    filter_keywords = source.get("filter_keywords") or []

    parsed = feedparser.parse(url, agent=USER_AGENT, request_headers={"User-Agent": USER_AGENT})
    if parsed.bozo and not parsed.entries:
        print(f"  [{name}] feedparser-feil: {parsed.bozo_exception}")
        return []

    raw_total = len(parsed.entries)
    kept: list[Article] = []
    for entry in parsed.entries:
        title = _strip_html(entry.get("title", "")).strip()
        link = entry.get("link", "").strip()
        if not title or not link:
            continue

        summary = _strip_html(entry.get("summary", entry.get("description", "")))
        summary = summary[:SUMMARY_MAX_CHARS]

        published = _entry_datetime(entry)
        if published is None:
            continue
        if published < cutoff:
            continue

        searchable = f"{title}\n{summary}"
        if filter_keywords and not _matches_keywords(searchable, filter_keywords):
            continue
        if exclude_keywords and _matches_keywords(searchable, exclude_keywords):
            continue

        kept.append(
            Article(
                title=title,
                url=link,
                source=name,
                region=region,
                tier=tier,
                date=published.date().isoformat(),
                summary=summary,
            )
        )

    print(f"  [{name}] {raw_total} items, {len(kept)} etter filter")
    return kept


def fetch_all(sources_path: Path) -> list[dict]:
    config = yaml.safe_load(sources_path.read_text(encoding="utf-8"))
    exclude_keywords = config.get("exclude_keywords") or []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=MAX_AGE_HOURS)

    all_articles: list[Article] = []
    for region_key, region_cfg in (config.get("regions") or {}).items():
        print(f"Region: {region_key}")
        for source in region_cfg.get("sources", []):
            try:
                all_articles.extend(_fetch_one(source, region_key, exclude_keywords, cutoff))
            except Exception as exc:  # noqa: BLE001
                print(f"  [{source.get('name', '?')}] uventet feil: {exc}")

    all_articles.sort(key=lambda a: (a.tier, a.region, a.date), reverse=False)
    return [a.to_dict() for a in all_articles]
