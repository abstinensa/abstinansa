"""Runar Daily — entry point."""
from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

from curate import curate
from fetch import fetch_all
from render import render_runar

HERE = Path(__file__).parent
RUNAR_DIR = HERE.parent.parent / "runar"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Print to stdout, don't write or commit")
    args = ap.parse_args()

    today = date.today()
    print(f"[{today}] Henter feeds...")
    articles = fetch_all(HERE / "sources.yaml")
    print(f"  {len(articles)} artikler etter filter")

    payload = curate(articles)
    payload.setdefault("date", today.isoformat())

    html = render_runar(payload)

    if args.dry_run:
        print("\n=== RUNAR (første 2000 tegn) ===\n")
        print(html[:2000])
        return

    RUNAR_DIR.mkdir(parents=True, exist_ok=True)
    out_file = RUNAR_DIR / "index.html"
    out_file.write_text(html, encoding="utf-8")
    print(f"  Skrev {out_file}")


if __name__ == "__main__":
    main()
