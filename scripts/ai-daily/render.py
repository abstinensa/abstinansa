"""Rendrer web, e-post, indeks og Atom-feed."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).parent / "templates"
BASE_URL = "https://abstinensa.no"
ARCHIVE_LIMIT = 30
SOURCE_COUNT_FALLBACK = 0

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml", "j2"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


def _generated_at() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _count_sources() -> int:
    try:
        import yaml

        cfg = yaml.safe_load((Path(__file__).parent / "sources.yaml").read_text(encoding="utf-8"))
        return sum(len(r.get("sources", [])) for r in (cfg.get("regions") or {}).values())
    except Exception:  # noqa: BLE001
        return SOURCE_COUNT_FALLBACK


def render_web(payload: dict) -> str:
    template = _env.get_template("web.html.j2")
    return template.render(
        payload=payload,
        generated_at=_generated_at(),
        source_count=_count_sources(),
    )


def _pick_teasers(payload: dict, limit: int = 3) -> list[dict]:
    region_labels = {s.get("region"): s.get("label") for s in payload.get("sections", [])}
    teasers: list[dict] = []
    for section in payload.get("sections", []):
        for item in section.get("items", []):
            teasers.append(
                {
                    "title": item.get("title", "").strip(),
                    "source": item.get("source", "").strip(),
                    "region_label": region_labels.get(section.get("region"), ""),
                }
            )
    return teasers[:limit]


def render_email(payload: dict) -> str:
    template = _env.get_template("email.html.j2")
    date_str = payload.get("date", "")
    web_url = _web_url_for(date_str)
    return template.render(
        payload=payload,
        teasers=_pick_teasers(payload),
        web_url=web_url,
        generated_at=_generated_at(),
    )


def _web_url_for(date_str: str) -> str:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return f"{BASE_URL}/ai-daily/"
    return f"{BASE_URL}/ai-daily/{d.year}/{d.month:02d}/{d.day:02d}.html"


_TAKE_RE = re.compile(r'class="take">\s*<strong>[^<]*</strong>\s*([^<]+)', re.MULTILINE)
_HEADING_RE = re.compile(r"<time[^>]*>([^<]+)</time>")


def _scan_existing_editions(ai_daily_dir: Path) -> list[dict]:
    entries: list[dict] = []
    for html_path in ai_daily_dir.glob("*/*/*.html"):
        rel = html_path.relative_to(ai_daily_dir).as_posix()
        m = re.match(r"(\d{4})/(\d{2})/(\d{2})\.html$", rel)
        if not m:
            continue
        date_str = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        try:
            html = html_path.read_text(encoding="utf-8")
        except OSError:
            continue

        take_match = _TAKE_RE.search(html)
        take = take_match.group(1).strip() if take_match else ""
        take = " ".join(take.split())
        if len(take) > 280:
            take = take[:277] + "..."

        entries.append(
            {
                "date": date_str,
                "path": rel,
                "headline": f"AI Daily — {date_str}",
                "take": take,
            }
        )

    entries.sort(key=lambda e: e["date"], reverse=True)
    return entries[:ARCHIVE_LIMIT]


def regenerate_index(ai_daily_dir: Path) -> None:
    ai_daily_dir.mkdir(parents=True, exist_ok=True)
    entries = _scan_existing_editions(ai_daily_dir)
    template = _env.get_template("index.html.j2")
    html = template.render(entries=entries)
    (ai_daily_dir / "index.html").write_text(html, encoding="utf-8")
    print(f"  Skrev {ai_daily_dir}/index.html ({len(entries)} utgaver)")


def regenerate_feed(ai_daily_dir: Path) -> None:
    ai_daily_dir.mkdir(parents=True, exist_ok=True)
    entries = _scan_existing_editions(ai_daily_dir)
    feed_url = f"{BASE_URL}/ai-daily/feed.xml"
    site_url = f"{BASE_URL}/ai-daily/"
    updated = (
        f"{entries[0]['date']}T06:30:00Z" if entries else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    )

    parts = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<feed xmlns="http://www.w3.org/2005/Atom">',
        f"  <title>AI Daily — abstinensa.no</title>",
        f'  <link href="{feed_url}" rel="self"/>',
        f'  <link href="{site_url}"/>',
        f"  <id>{site_url}</id>",
        f"  <updated>{updated}</updated>",
    ]
    for entry in entries:
        url = f"{BASE_URL}/ai-daily/{entry['path']}"
        title = xml_escape(entry["headline"])
        summary = xml_escape(entry["take"]) if entry["take"] else ""
        parts.append("  <entry>")
        parts.append(f"    <title>{title}</title>")
        parts.append(f'    <link href="{url}"/>')
        parts.append(f"    <id>{url}</id>")
        parts.append(f"    <updated>{entry['date']}T06:30:00Z</updated>")
        if summary:
            parts.append(f"    <summary>{summary}</summary>")
        parts.append("  </entry>")
    parts.append("</feed>")

    (ai_daily_dir / "feed.xml").write_text("\n".join(parts) + "\n", encoding="utf-8")
    print(f"  Skrev {ai_daily_dir}/feed.xml ({len(entries)} entries)")
