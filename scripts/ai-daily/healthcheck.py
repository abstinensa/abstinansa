"""Ukentlig sjekk av RSS-feeds. Åpner GitHub Issue for døde feeds."""
from __future__ import annotations

import json
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import feedparser
import yaml

DEAD_THRESHOLD_DAYS = 30
USER_AGENT = "abstinensa-ai-daily-healthcheck/1.0 (+https://abstinensa.no)"


def _latest_entry_dt(parsed) -> datetime | None:
    latest = None
    for entry in parsed.entries:
        for key in ("published_parsed", "updated_parsed", "created_parsed"):
            struct = entry.get(key)
            if not struct:
                continue
            try:
                dt = datetime.fromtimestamp(time.mktime(struct), tz=timezone.utc)
            except (OverflowError, ValueError):
                continue
            if latest is None or dt > latest:
                latest = dt
            break
    return latest


def check_feed(name: str, url: str) -> dict:
    parsed = feedparser.parse(url, agent=USER_AGENT, request_headers={"User-Agent": USER_AGENT})
    status = getattr(parsed, "status", None)
    bozo_exc = parsed.bozo_exception if parsed.bozo else None
    latest = _latest_entry_dt(parsed)
    age_days: float | None = None
    if latest is not None:
        age_days = (datetime.now(timezone.utc) - latest).total_seconds() / 86400.0
    return {
        "name": name,
        "url": url,
        "status": status,
        "entries": len(parsed.entries),
        "latest": latest.isoformat() if latest else None,
        "age_days": round(age_days, 1) if age_days is not None else None,
        "bozo": str(bozo_exc) if bozo_exc else None,
    }


def is_dead(result: dict) -> bool:
    if result["entries"] == 0:
        return True
    if result["age_days"] is None:
        return True
    return result["age_days"] > DEAD_THRESHOLD_DAYS


def open_issue(dead: list[dict]) -> None:
    if not dead:
        return
    title = f"AI Daily: {len(dead)} feed(s) dead/stale"
    lines = ["The following feeds had no items in the last 30 days or returned errors:", ""]
    for r in dead:
        bits = [f"- **{r['name']}**: {r['url']}"]
        if r["status"]:
            bits.append(f"HTTP {r['status']}")
        bits.append(f"items={r['entries']}")
        if r["latest"]:
            bits.append(f"latest={r['latest']} ({r['age_days']}d)")
        if r["bozo"]:
            bits.append(f"err={r['bozo']}")
        lines.append(", ".join(bits))
    body = "\n".join(lines)

    cmd = ["gh", "issue", "create", "--title", title, "--body", body, "--label", "ai-daily,healthcheck"]
    print(f"Åpner issue: {title}")
    try:
        subprocess.run(cmd, check=True)
    except FileNotFoundError:
        print("`gh` ikke installert — printer issue-body i stedet:")
        print(title)
        print(body)
    except subprocess.CalledProcessError as exc:
        print(f"`gh` returnerte ikke-null exit ({exc.returncode}). Printer body:")
        print(body)


def main() -> int:
    sources_path = Path(__file__).parent / "sources.yaml"
    config = yaml.safe_load(sources_path.read_text(encoding="utf-8"))
    results: list[dict] = []
    for region_key, region_cfg in (config.get("regions") or {}).items():
        for source in region_cfg.get("sources", []):
            r = check_feed(source["name"], source["url"])
            r["region"] = region_key
            results.append(r)
            flag = "DEAD" if is_dead(r) else "ok"
            print(f"  [{flag}] {r['name']} entries={r['entries']} age_days={r['age_days']}")

    dead = [r for r in results if is_dead(r)]
    print(f"\n{len(dead)} feed(s) flagged dead/stale of {len(results)} total")
    print(json.dumps(results, indent=2))

    if dead:
        open_issue(dead)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
