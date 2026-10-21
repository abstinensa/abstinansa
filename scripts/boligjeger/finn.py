"""Fetch and parse Finn's public rekkehus search for Oslo.

The search HTML embeds a React Router turbo-stream. No API key and no login.
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

SEARCH = "https://www.finn.no/realestate/homes/search.html"
OSLO = "0.20061"
REKKEHUS = "4"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
MAX_PAGES = 8
PAUSE_SECONDS = 0.4


class FinnError(Exception):
    """The Finn search could not be fetched or parsed completely."""


def search_url(location: str, page: int) -> str:
    return f"{SEARCH}?location={location}&property_type={REKKEHUS}&page={page}"


def image_url(url: str | None, size: str = "480w") -> str | None:
    if not url or not isinstance(url, str):
        return None
    return re.sub(r"/dynamic/[^/]+/", f"/dynamic/{size}/", url, count=1)


def decode_stream(html: str):
    parts = re.findall(
        r'streamController\.enqueue\((".*?")\);?</script>', html, re.S
    )
    if not parts:
        raise FinnError("fant ikke Finn-data i siden")
    raw = "".join(json.loads(part) for part in parts)
    line = raw.split("\n", 1)[0]
    try:
        arr = json.loads(line)
    except json.JSONDecodeError:
        arr = json.loads(raw)
    if not isinstance(arr, list) or not arr:
        raise FinnError("uforventet Finn-format")
    memo: dict[int, object] = {}

    def walk(index):
        if isinstance(index, int):
            if index < 0:
                return None
            if index in memo:
                return memo[index]
            memo[index] = None
            value = resolve(arr[index])
            memo[index] = value
            return value
        return index

    def resolve(node):
        if isinstance(node, list):
            return [walk(item) for item in node]
        if isinstance(node, dict):
            return {arr[int(key[1:])]: walk(val) for key, val in node.items()}
        return node

    return resolve(arr[0])


def parse_search_html(html: str) -> dict:
    data = decode_stream(html)
    loader = data.get("loaderData") if isinstance(data, dict) else None
    if not isinstance(loader, dict):
        raise FinnError("mangler loaderData")
    for value in loader.values():
        if isinstance(value, dict) and isinstance(value.get("results"), dict):
            return value["results"]
    raise FinnError("mangler results")


def _get(url: str, timeout: int = 40) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "nb-NO,nb;q=0.9,en;q=0.8",
        },
    )
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                status = getattr(response, "status", 200)
                if status != 200:
                    raise FinnError(f"HTTP {status} for {url}")
                return response.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise FinnError(f"HTTP {exc.code} for {url}") from exc
        except urllib.error.URLError as exc:
            last_error = exc
            if attempt == 2:
                raise FinnError(f"nettverksfeil for {url}: {exc.reason}") from exc
        time.sleep(1.5 * (attempt + 1))
    raise FinnError(f"nettverksfeil for {url}: {last_error}")


def _money(node) -> int | None:
    if not isinstance(node, dict):
        return None
    amount = node.get("amount")
    if isinstance(amount, bool) or not isinstance(amount, (int, float)):
        return None
    return int(amount)


def _money_span(node) -> tuple[int | None, int | None]:
    if not isinstance(node, dict):
        return None, None
    start = node.get("amount_from")
    end = node.get("amount_to")
    left = int(start) if isinstance(start, (int, float)) and not isinstance(start, bool) else None
    right = int(end) if isinstance(end, (int, float)) and not isinstance(end, bool) else None
    if left is not None and right is not None and left > right:
        left, right = right, left
    return left, right


def _tidy(value) -> str | None:
    if not isinstance(value, str):
        return None
    text = " ".join(value.split())
    if not text:
        return None
    letters = [ch for ch in text if ch.isalpha()]
    if letters and all(ch.isupper() for ch in letters):
        return text.title()
    return text


def _span(start, end) -> tuple[int | None, int | None]:
    left = int(start) if isinstance(start, (int, float)) and not isinstance(start, bool) else None
    right = int(end) if isinstance(end, (int, float)) and not isinstance(end, bool) else None
    if left is not None and right is not None and left == right:
        right = None
    if left is not None and right is not None and left > right:
        left, right = right, left
    return left, right


def _next_viewing(times) -> str | None:
    if not isinstance(times, list):
        return None
    parsed: list[tuple[datetime, str]] = []
    for item in times:
        if not isinstance(item, str):
            continue
        try:
            when = datetime.fromisoformat(item.replace("Z", "+00:00"))
        except ValueError:
            continue
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        parsed.append((when, item))
    if not parsed:
        return None
    parsed.sort(key=lambda pair: pair[0])
    now = datetime.now(timezone.utc)
    for when, original in parsed:
        if when >= now:
            return original
    return None


def _published(timestamp) -> str | None:
    if not isinstance(timestamp, (int, float)) or isinstance(timestamp, bool):
        return None
    seconds = timestamp / 1000 if timestamp > 10_000_000_000 else timestamp
    try:
        return datetime.fromtimestamp(seconds, timezone.utc).isoformat()
    except (OverflowError, OSError, ValueError):
        return None


def _coords(node) -> tuple[float | None, float | None]:
    if not isinstance(node, dict):
        return None, None
    lat = node.get("lat")
    lng = node.get("lon", node.get("lng"))
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return None, None
    if isinstance(lat, bool) or isinstance(lng, bool):
        return None, None
    lat_f, lng_f = float(lat), float(lng)
    if not (59.7 <= lat_f <= 60.15 and 10.4 <= lng_f <= 11.05):
        return None, None
    return round(lat_f, 6), round(lng_f, 6)


def oslo_districts(results: dict) -> list[tuple[str, str]]:
    filters = results.get("filters") or []
    location = next((item for item in filters if item.get("name") == "location"), None)
    if not location:
        return []

    def find(items):
        for item in items or []:
            if item.get("value") == OSLO:
                return item
            found = find(item.get("filter_items"))
            if found:
                return found
        return None

    oslo = find(location.get("filter_items"))
    if not oslo:
        return []
    districts = []
    for child in oslo.get("filter_items") or []:
        hits = child.get("hits") or 0
        code = child.get("value")
        name = _tidy(child.get("display_name"))
        if hits and code and name and code != OSLO:
            districts.append((name, code))
    return districts


def normalize_doc(doc: dict, districts: list[str] | None = None) -> dict | None:
    if not isinstance(doc, dict) or not doc.get("id"):
        return None
    flags = set(doc.get("flags") or [])
    if "sold" in flags:
        status = "solgt"
    elif "coming_for_sale" in flags:
        status = "kommer_for_salg"
    else:
        status = "til_salgs"

    asking, asking_to = _money_span(doc.get("price_range_suggestion"))
    total, total_to = _money_span(doc.get("price_range_total"))
    if asking is None:
        asking = _money(doc.get("price_suggestion"))
    if total is None:
        total = _money(doc.get("price_total"))
    # Finn uses 0 as "not set" on coming-for-sale ads. A real price is never 0.
    asking = asking if asking else None
    asking_to = asking_to if asking_to else None
    total = total if total else None
    total_to = total_to if total_to else None
    if asking is not None and asking_to == asking:
        asking_to = None
    if total is not None and total_to == total:
        total_to = None

    area = doc.get("area_range") if isinstance(doc.get("area_range"), dict) else {}
    bra, bra_to = _span(area.get("size_from"), area.get("size_to"))
    description = area.get("description")
    arealtype = "P-rom" if description == "p-rom" else "BRA"

    bedrooms = doc.get("bedrooms_range") if isinstance(doc.get("bedrooms_range"), dict) else {}
    if bedrooms:
        rooms, rooms_to = _span(bedrooms.get("start"), bedrooms.get("end"))
    else:
        rooms, rooms_to = _span(doc.get("number_of_bedrooms"), None)

    image = doc.get("image") if isinstance(doc.get("image"), dict) else {}
    lat, lng = _coords(doc.get("coordinates"))
    bydeler = []
    for name in districts or []:
        tidy = _tidy(name)
        if tidy and tidy not in bydeler:
            bydeler.append(tidy)
    local = _tidy(doc.get("local_area_name"))
    kvm = None
    if asking and bra:
        kvm = int(round(asking / bra))
    kind = "prosjekt" if doc.get("type") == "realestate_project" else "bruktbolig"
    ad_id = str(doc.get("id"))
    url = doc.get("canonical_url")
    if not isinstance(url, str) or not url.startswith("https://www.finn.no/"):
        path = "project" if kind == "prosjekt" else "homes"
        url = f"https://www.finn.no/realestate/{path}/ad.html?finnkode={ad_id}"
    private = "private" in flags
    return {
        "id": ad_id,
        "url": url,
        "type": kind,
        "address": _tidy(doc.get("location")) or "Ukjent adresse",
        "bydeler": bydeler,
        "lokalomrade": local,
        "omrade": place_label(local, bydeler),
        "status": status,
        "prisantydning": asking,
        "prisantydning_til": asking_to,
        "totalpris": total,
        "totalpris_til": total_to,
        "felleskost": _money(doc.get("price_shared_cost")),
        "bra": bra,
        "bra_til": bra_to,
        "arealtype": arealtype,
        "soverom": rooms,
        "soverom_til": rooms_to,
        "eierform": _tidy(doc.get("owner_type_description")),
        "megler": None if private else _tidy(doc.get("organisation_name")),
        "visning": _next_viewing(doc.get("viewing_times")),
        "visning_i_dag": "viewingtoday" in flags,
        "overskrift": _tidy(doc.get("heading")),
        "bilde": image_url(image.get("url")),
        "lat": lat,
        "lng": lng,
        "publisert": _published(doc.get("timestamp")),
        "privat": private,
        "kvm_pris": kvm,
    }


def place_label(local: str | None, bydeler: list[str]) -> str:
    district = " / ".join(bydeler)
    if local and district and local.casefold() not in district.casefold():
        return f"{local} · {district}"
    return local or district or "Oslo"


def _page_docs(results: dict) -> list[dict]:
    docs = results.get("docs")
    if not isinstance(docs, list):
        raise FinnError("mangler annonser")
    return [doc for doc in docs if isinstance(doc, dict)]


def _paging_last(results: dict) -> tuple[int, int]:
    meta = results.get("metadata") if isinstance(results.get("metadata"), dict) else {}
    paging = meta.get("paging") if isinstance(meta.get("paging"), dict) else {}
    size = meta.get("result_size") if isinstance(meta.get("result_size"), dict) else {}
    last = paging.get("last") or 1
    expected = size.get("group_count") or 0
    try:
        last_n = max(1, min(int(last), MAX_PAGES))
    except (TypeError, ValueError):
        last_n = 1
    try:
        expected_n = int(expected)
    except (TypeError, ValueError):
        expected_n = 0
    return last_n, expected_n


def fetch_market(pause: float = PAUSE_SECONDS) -> dict:
    """Return every current Oslo rekkehus ad, tagged with Finn district names."""
    print("boligjeger: henter Oslo-søk side 1", flush=True)
    first = parse_search_html(_get(search_url(OSLO, 1)))
    last, expected = _paging_last(first)
    docs = _page_docs(first)
    for page in range(2, last + 1):
        time.sleep(pause)
        print(f"boligjeger: henter Oslo-søk side {page}", flush=True)
        results = parse_search_html(_get(search_url(OSLO, page)))
        docs.extend(_page_docs(results))

    by_id: dict[str, dict] = {}
    for doc in docs:
        ad_id = str(doc.get("id") or "")
        if ad_id and ad_id not in by_id:
            by_id[ad_id] = doc

    districts = oslo_districts(first)
    area_of: dict[str, list[str]] = {}
    area_errors = 0
    for name, code in districts:
        try:
            time.sleep(pause)
            print(f"boligjeger: merker område {name}", flush=True)
            area_first = parse_search_html(_get(search_url(code, 1)))
            area_docs = _page_docs(area_first)
            area_last, _ = _paging_last(area_first)
            for page in range(2, area_last + 1):
                time.sleep(pause)
                more = parse_search_html(_get(search_url(code, page)))
                area_docs.extend(_page_docs(more))
        except FinnError as exc:
            area_errors += 1
            print(f"boligjeger: hoppet over {name}: {exc}", flush=True)
            continue
        for doc in area_docs:
            ad_id = str(doc.get("id") or "")
            if not ad_id:
                continue
            names = area_of.setdefault(ad_id, [])
            if name not in names:
                names.append(name)

    normalized = []
    for ad_id, doc in by_id.items():
        item = normalize_doc(doc, area_of.get(ad_id))
        if item:
            normalized.append(item)
    print(
        f"boligjeger: {len(normalized)} annonser, forventet {expected}, "
        f"områdenekt {area_errors}",
        flush=True,
    )
    if not expected or not normalized or len(normalized) < expected * 0.9:
        raise FinnError(
            f"ufullstendig treff ({len(normalized)} av {expected}) — beholder forrige data"
        )
    return {
        "listings": normalized,
        "expected": expected,
        "area_errors": area_errors,
    }
