"""Daglig AI-nyhetsbrev — entry point."""
from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

from curate import curate
from fetch import fetch_all
from render import regenerate_feed, regenerate_index, render_email, render_web
from send import send_email

HERE = Path(__file__).parent
AI_DAILY_DIR = HERE.parent.parent / "ai-daily"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Print to stdout, don't send or commit")
    ap.add_argument("--skip-send", action="store_true", help="Render and write files, but don't email")
    args = ap.parse_args()

    today = date.today()
    print(f"[{today}] Henter feeds...")
    articles = fetch_all(HERE / "sources.yaml")
    print(f"  {len(articles)} artikler etter filter")

    if not articles:
        print("Ingen artikler — sender minimal-utgave.")
        payload = {
            "date": today.isoformat(),
            "take": "Stille dag på alle fronter.",
            "sections": [],
        }
    else:
        print("Kuraterer...")
        payload = curate(articles, prompt_path=HERE / "prompts" / "curator.md")

    payload.setdefault("date", today.isoformat())

    web_html = render_web(payload)
    email_html = render_email(payload)

    if args.dry_run:
        print("\n=== EMAIL (første 2000 tegn) ===\n")
        print(email_html[:2000])
        print("\n=== WEB (første 2000 tegn) ===\n")
        print(web_html[:2000])
        return

    out_dir = AI_DAILY_DIR / f"{today.year}" / f"{today.month:02d}"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"{today.day:02d}.html"
    out_file.write_text(web_html, encoding="utf-8")
    print(f"  Skrev {out_file}")

    regenerate_index(AI_DAILY_DIR)
    regenerate_feed(AI_DAILY_DIR)

    if args.skip_send:
        print("  --skip-send satt; hopper over e-post.")
        return

    send_email(email_html, today)
    print("  Mail sendt.")


if __name__ == "__main__":
    main()
