"""Build the JSON file Boligjeger reads.

Diffs today's Finn search against the previous snapshot:

- first_seen is the date an ad id was first observed
- ny is true for ads first seen within the last 7 days, except on the
  very first snapshot (otherwise every listing would be marked new)
- prisfall follows a drop in prisantydning, or in totalpris when the
  asking price did not change
- coordinates come from Finn. Missing ones are filled from the previous
  snapshot, then from Kartverket's address search, with a local cache

If the Finn fetch fails or looks incomplete, nothing is written.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from finn import FinnError, fetch_market, place_label

OSLO_TZ = ZoneInfo("Europe/Oslo")
NY_DAYS = 7
KEEP_DAYS = 120
GEOCODE_URL = "https://ws.geonorge.no/adresser/v1/sok"
GEO_AGENT = "Boligjeger/1.0 (+https://abstinensa.no/boligjeger)"
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def listings_path(root: Path) -> Path:
    return root / "boligjeger" / "listings.json"


def state_path(root: Path) -> Path:
    return root / "boligjeger" / "state.json"


def cache_path(root: Path) -> Path:
    return root / "boligjeger" / "geocode-cache.json"


def today_iso(now: datetime | None = None) -> str:
    moment = now or datetime.now(OSLO_TZ)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=OSLO_TZ)
    return moment.astimezone(OSLO_TZ).date().isoformat()


def _load(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def _atomic(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    blob = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(blob, encoding="utf-8")
    temporary.replace(path)


def _days_between(today: str, earlier: str) -> int:
    try:
        return (date.fromisoformat(today) - date.fromisoformat(earlier[:10])).days
    except ValueError:
        return 0


def price_change(history: list[dict]) -> tuple[bool, int | None, str | None, dict | None]:
    if len(history) < 2:
        return False, None, None, None
    previous, current = history[-2], history[-1]
    old_ask, new_ask = previous.get("prisantydning"), current.get("prisantydning")
    old_total, new_total = previous.get("totalpris"), current.get("totalpris")
    if isinstance(old_ask, int) and isinstance(new_ask, int) and new_ask < old_ask:
        return True, new_ask - old_ask, "prisantydning", previous
    asking_same = old_ask == new_ask or old_ask is None or new_ask is None
    if (
        asking_same
        and isinstance(old_total, int)
        and isinstance(new_total, int)
        and new_total < old_total
    ):
        return True, new_total - old_total, "totalpris", previous
    return False, None, None, None


def remember_areas(listings: list[dict], state: dict) -> None:
    previous = state.get("listings") or {}
    for item in listings:
        if item.get("bydeler"):
            continue
        old = previous.get(item["id"]) or {}
        saved = [name for name in old.get("bydeler") or [] if isinstance(name, str)]
        if not saved:
            continue
        item["bydeler"] = saved
        item["omrade"] = place_label(item.get("lokalomrade"), saved)


def remember_coords(listings: list[dict], state: dict) -> None:
    previous = state.get("listings") or {}
    for item in listings:
        if item.get("lat") is not None and item.get("lng") is not None:
            continue
        old = previous.get(item["id"]) or {}
        if isinstance(old.get("lat"), (int, float)) and isinstance(old.get("lng"), (int, float)):
            item["lat"] = old["lat"]
            item["lng"] = old["lng"]


def _cache_key(address: str) -> str:
    return " ".join(address.casefold().replace(",", " ").split())


def _geocode_fetch(address: str) -> dict | None:
    street = address.split(",")[0].strip()
    if not street:
        return None
    query = urllib.parse.urlencode(
        {
            "sok": street,
            "fuzzy": "true",
            "kommunenummer": "0301",
            "treffPerSide": "1",
        }
    )
    request = urllib.request.Request(
        f"{GEOCODE_URL}?{query}",
        headers={"User-Agent": GEO_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def parse_geocode(payload: dict | None) -> tuple[float, float] | None:
    if not isinstance(payload, dict):
        return None
    rows = payload.get("adresser")
    if not isinstance(rows, list) or not rows:
        return None
    hit = rows[0]
    if not isinstance(hit, dict) or str(hit.get("kommunenummer")) != "0301":
        return None
    point = hit.get("representasjonspunkt")
    if not isinstance(point, dict):
        return None
    lat, lng = point.get("lat"), point.get("lon")
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return None
    if not (59.7 <= float(lat) <= 60.15 and 10.4 <= float(lng) <= 11.05):
        return None
    return round(float(lat), 6), round(float(lng), 6)


def geocode_missing(listings: list[dict], cache: dict, fetcher=_geocode_fetch, pause: float = 1.0) -> int:
    """Fill coordinates that Finn did not provide. Returns number of new lookups."""
    looked_up = 0
    for item in listings:
        if item.get("lat") is not None and item.get("lng") is not None:
            continue
        key = _cache_key(item.get("address") or "")
        if not key:
            continue
        cached = cache.get(key)
        if isinstance(cached, dict) and "lat" in cached:
            if cached.get("lat") is not None:
                item["lat"] = cached["lat"]
                item["lng"] = cached["lng"]
            continue
        if looked_up:
            time.sleep(pause)
        looked_up += 1
        try:
            point = parse_geocode(fetcher(item["address"]))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            print(f"boligjeger: geokoding feilet for {item['address']}: {exc}", flush=True)
            continue
        if point is None:
            cache[key] = {"lat": None, "lng": None}
            continue
        item["lat"], item["lng"] = point
        cache[key] = {"lat": point[0], "lng": point[1]}
    return looked_up


def merge(listings: list[dict], state: dict, today: str) -> tuple[list[dict], dict]:
    previous = state.get("listings") or {}
    bootstrap = not previous
    merged = []
    kept: dict[str, dict] = {}
    for item in listings:
        old = previous.get(item["id"]) or {}
        first_seen = old.get("first_seen") or today
        history = [dict(point) for point in old.get("price_history") or []]
        point = {
            "date": today,
            "prisantydning": item.get("prisantydning"),
            "totalpris": item.get("totalpris"),
        }
        if (
            not history
            or history[-1].get("prisantydning") != point["prisantydning"]
            or history[-1].get("totalpris") != point["totalpris"]
        ):
            history.append(point)
        history = history[-30:]
        dropped, delta, field, _previous = price_change(history)
        row = dict(item)
        row.update(
            {
                "first_seen": first_seen,
                "ny": (not bootstrap) and _days_between(today, first_seen) <= NY_DAYS,
                "prisfall": dropped,
                "prisendring": delta,
                "prisendring_felt": field,
                "forrige_prisantydning": history[-2].get("prisantydning") if len(history) > 1 else None,
                "forrige_totalpris": history[-2].get("totalpris") if len(history) > 1 else None,
                "price_history": history,
            }
        )
        merged.append(row)
        kept[item["id"]] = {
            "first_seen": first_seen,
            "last_seen": today,
            "price_history": history,
            "bydeler": item.get("bydeler") or [],
            "lat": item.get("lat"),
            "lng": item.get("lng"),
        }
    for ad_id, old in previous.items():
        if ad_id in kept:
            continue
        last_seen = old.get("last_seen") or old.get("first_seen") or today
        if _days_between(today, last_seen) <= KEEP_DAYS:
            kept[ad_id] = old
    merged.sort(key=lambda row: row["id"])
    new_state = {
        "bootstrapped_on": state.get("bootstrapped_on") or today,
        "listings": kept,
    }
    return merged, new_state


def public_document(listings: list[dict], updated_at: datetime) -> dict:
    return {
        "updated_at": updated_at.isoformat(),
        "date": updated_at.date().isoformat(),
        "query": "Rekkehus til salgs i Oslo",
        "source": "https://www.finn.no/realestate/homes/search.html?location=0.20061&property_type=4",
        "count": len(listings),
        "listings": listings,
    }


def refresh(root: Path, *, fetch=fetch_market, geocoder=geocode_missing, today: str | None = None, dry_run: bool = False) -> int:
    now = datetime.now(OSLO_TZ)
    day = today or today_iso(now)
    try:
        market = fetch()
    except FinnError as exc:
        print(f"::warning::Finn-henting feilet, beholder forrige data: {exc}", flush=True)
        return 1
    listings = market["listings"]
    state = _load(state_path(root), {})
    cache = _load(cache_path(root), {})
    if not isinstance(state, dict):
        state = {}
    if not isinstance(cache, dict):
        cache = {}
    remember_areas(listings, state)
    remember_coords(listings, state)
    try:
        looked_up = geocoder(listings, cache)
    except Exception as exc:  # geocoder is best-effort
        print(f"::warning::Geokoding feilet, fortsetter uten nye koordinater: {exc}", flush=True)
        looked_up = 0
    merged, new_state = merge(listings, state, day)
    located = sum(1 for row in merged if row.get("lat") is not None)
    fresh = sum(1 for row in merged if row.get("ny"))
    drops = sum(1 for row in merged if row.get("prisfall"))
    sold = sum(1 for row in merged if row.get("status") == "solgt")
    print(
        f"boligjeger: {len(merged)} annonser, {located} med kartpunkt, "
        f"{fresh} nye, {drops} prisfall, {sold} solgt, {looked_up} geokodinger",
        flush=True,
    )
    if dry_run:
        print("boligjeger: dry-run, skriver ingen filer", flush=True)
        return 0
    stamp = now if today is None else datetime.fromisoformat(day).replace(tzinfo=OSLO_TZ)
    _atomic(state_path(root), new_state)
    _atomic(cache_path(root), cache)
    _atomic(listings_path(root), public_document(merged, stamp))
    return 0


def main(argv: list[str] | None = None) -> int:
    # Local imports when the script is executed as a file.
    if str(HERE) not in sys.path:
        sys.path.insert(0, str(HERE))
    parser = argparse.ArgumentParser(description="Oppdater Boligjeger fra Finn")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    return refresh(args.root, dry_run=args.dry_run)


if __name__ == "__main__":
    sys.path.insert(0, str(HERE))
    raise SystemExit(main())
