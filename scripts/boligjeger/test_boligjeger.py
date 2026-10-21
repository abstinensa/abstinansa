import json
import tempfile
import unittest
from pathlib import Path

import finn
import pipeline


class DecodeTests(unittest.TestCase):
    def test_turbo_stream_round_trip(self):
        array = [
            {"_1": 2},
            "loaderData",
            {"_3": 4},
            "search",
            {"_5": 6},
            "results",
            {"_7": 8, "_9": 11},
            "docs",
            [10],
            "id",
            {"_9": 12, "_13": -5},
            "metadata",
            "478",
            "gone",
        ]
        html = (
            '<script>window.__reactRouterContext.streamController.enqueue('
            + json.dumps(json.dumps(array))
            + ");</script>"
        )
        results = finn.parse_search_html(html)
        self.assertEqual(results["docs"][0]["id"], "478")
        self.assertIsNone(results["docs"][0]["gone"])

    def test_image_size(self):
        url = "https://images.finncdn.no/dynamic/default/item/1/photo.jpg"
        self.assertEqual(
            finn.image_url(url),
            "https://images.finncdn.no/dynamic/480w/item/1/photo.jpg",
        )

    def test_normalize_used_home_and_project(self):
        home = finn.normalize_doc(
            {
                "id": 100,
                "type": "realestate",
                "location": "  Bispeluelia 10C, Oslo ",
                "heading": "NY PRIS",
                "canonical_url": "https://www.finn.no/realestate/homes/ad.html?finnkode=100",
                "flags": ["sold", "viewingtoday", "private"],
                "price_suggestion": {"amount": 6190000},
                "price_total": {"amount": 6346140},
                "price_shared_cost": {"amount": 4595},
                "area_range": {"size_from": 117, "size_to": 117, "description": "size"},
                "number_of_bedrooms": 3,
                "local_area_name": "HOLMLIA / ASPERUD",
                "organisation_name": "Noen Privat",
                "coordinates": {"lat": 59.85, "lon": 10.82},
                "timestamp": 1792502879000,
                "viewing_times": ["2099-01-02T15:30:00.000Z"],
            },
            ["Søndre Nordstrand"],
        )
        self.assertEqual(home["status"], "solgt")
        self.assertTrue(home["visning_i_dag"])
        self.assertIsNone(home["megler"])
        self.assertTrue(home["privat"])
        self.assertEqual(home["lokalomrade"], "Holmlia / Asperud")
        self.assertEqual(home["omrade"], "Holmlia / Asperud · Søndre Nordstrand")
        self.assertEqual(home["bra_til"], None)
        self.assertEqual(home["kvm_pris"], int(round(6190000 / 117)))
        self.assertEqual(home["lat"], 59.85)

        project = finn.normalize_doc(
            {
                "id": "200",
                "type": "realestate_project",
                "location": "Nordstrandveien 81, Oslo",
                "canonical_url": "https://www.finn.no/realestate/project/ad.html?finnkode=200",
                "flags": ["coming_for_sale"],
                "price_range_suggestion": {"amount_from": 3996536, "amount_to": 5388748},
                "price_range_total": {"amount_from": 9991339, "amount_to": 13471870},
                "area_range": {"size_from": 108, "size_to": 144, "description": "p-rom"},
                "bedrooms_range": {"start": 3, "end": 5},
                "coordinates": {"lat": 10, "lon": 10},
            }
        )
        self.assertEqual(project["status"], "kommer_for_salg")
        self.assertEqual(project["type"], "prosjekt")
        self.assertEqual(project["soverom"], 3)
        self.assertEqual(project["soverom_til"], 5)
        self.assertEqual(project["arealtype"], "P-rom")
        self.assertIsNone(project["lat"])
        self.assertEqual(project["omrade"], "Oslo")

    def test_zero_price_means_unknown(self):
        row = finn.normalize_doc(
            {
                "id": "9",
                "type": "realestate",
                "location": "Kirkehaugsveien 2, Oslo",
                "flags": ["coming_for_sale"],
                "price_suggestion": {"amount": 0},
                "price_total": {"amount": 0},
                "price_shared_cost": {"amount": 0},
                "number_of_bedrooms": 4,
                "coordinates": {"lat": 59.91, "lon": 10.64},
            }
        )
        self.assertIsNone(row["prisantydning"])
        self.assertIsNone(row["totalpris"])
        self.assertIsNone(row["kvm_pris"])
        self.assertEqual(row["felleskost"], 0)


class DiffTests(unittest.TestCase):
    def sample(self, **overrides):
        row = {
            "id": "1",
            "address": "Gate 1, Oslo",
            "bydeler": ["Furuset"],
            "lokalomrade": "Lindeberg",
            "omrade": "Lindeberg · Furuset",
            "prisantydning": 4_000_000,
            "totalpris": 4_200_000,
            "lat": 59.9,
            "lng": 10.8,
            "status": "til_salgs",
        }
        row.update(overrides)
        return row

    def test_bootstrap_is_not_all_new(self):
        merged, state = pipeline.merge([self.sample()], {}, "2026-10-21")
        self.assertFalse(merged[0]["ny"])
        self.assertFalse(merged[0]["prisfall"])
        self.assertEqual(merged[0]["first_seen"], "2026-10-21")
        self.assertEqual(state["bootstrapped_on"], "2026-10-21")

    def test_new_and_price_drop(self):
        _, state = pipeline.merge([self.sample()], {}, "2026-10-01")
        cheaper = self.sample(prisantydning=3_800_000, totalpris=4_000_000)
        arrived = self.sample(id="2", address="Gate 2, Oslo")
        merged, state = pipeline.merge([cheaper, arrived], state, "2026-10-21")
        by_id = {row["id"]: row for row in merged}
        self.assertTrue(by_id["1"]["prisfall"])
        self.assertEqual(by_id["1"]["prisendring"], -200_000)
        self.assertEqual(by_id["1"]["prisendring_felt"], "prisantydning")
        self.assertFalse(by_id["1"]["ny"])
        self.assertTrue(by_id["2"]["ny"])
        self.assertEqual(by_id["2"]["first_seen"], "2026-10-21")
        self.assertEqual(len(state["listings"]["1"]["price_history"]), 2)

    def test_total_drop_when_asking_is_unchanged(self):
        history = [
            {"date": "2026-10-01", "prisantydning": 4_000_000, "totalpris": 4_500_000},
            {"date": "2026-10-21", "prisantydning": 4_000_000, "totalpris": 4_300_000},
        ]
        dropped, delta, field, _previous = pipeline.price_change(history)
        self.assertTrue(dropped)
        self.assertEqual(delta, -200_000)
        self.assertEqual(field, "totalpris")

    def test_failed_fetch_keeps_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = pipeline.listings_path(root)
            target.parent.mkdir(parents=True)
            target.write_text('{"count": 1}\n', encoding="utf-8")
            state = pipeline.state_path(root)
            state.write_text("{}\n", encoding="utf-8")

            def boom():
                raise finn.FinnError("timeout")

            code = pipeline.refresh(root, fetch=boom, today="2026-10-21")
            self.assertEqual(code, 1)
            self.assertEqual(target.read_text(encoding="utf-8"), '{"count": 1}\n')
            self.assertEqual(state.read_text(encoding="utf-8"), "{}\n")

    def test_remembers_district_when_tagging_fails(self):
        state = {"listings": {"1": {"bydeler": ["Røa"], "lat": 59.95, "lng": 10.65}}}
        row = self.sample(bydeler=[], omrade="Oslo", lat=None, lng=None)
        pipeline.remember_areas([row], state)
        pipeline.remember_coords([row], state)
        self.assertEqual(row["bydeler"], ["Røa"])
        self.assertEqual(row["omrade"], "Lindeberg · Røa")
        self.assertEqual(row["lat"], 59.95)


class GeocodeTests(unittest.TestCase):
    def test_parse_and_cache(self):
        payload = {
            "adresser": [
                {
                    "kommunenummer": "0301",
                    "representasjonspunkt": {"lat": 59.933764, "lon": 10.884632},
                }
            ]
        }
        self.assertEqual(pipeline.parse_geocode(payload), (59.933764, 10.884632))
        self.assertIsNone(pipeline.parse_geocode({"adresser": [{"kommunenummer": "4601"}]}))

        calls = []

        def fetcher(address):
            calls.append(address)
            return payload

        row = {"id": "1", "address": "Jerikoveien 33, Oslo", "lat": None, "lng": None}
        cache = {}
        self.assertEqual(pipeline.geocode_missing([row], cache, fetcher=fetcher, pause=0), 1)
        self.assertEqual(row["lat"], 59.933764)
        row["lat"] = None
        self.assertEqual(pipeline.geocode_missing([row], cache, fetcher=fetcher, pause=0), 0)
        self.assertEqual(calls, ["Jerikoveien 33, Oslo"])
        self.assertEqual(row["lat"], 59.933764)

    def test_skips_when_finn_has_coordinates(self):
        def fetcher(_address):
            raise AssertionError("should not geocode")

        row = {"id": "1", "address": "Gate 1", "lat": 59.9, "lng": 10.8}
        self.assertEqual(pipeline.geocode_missing([row], {}, fetcher=fetcher, pause=0), 0)


@unittest.skipUnless(Path("/tmp/finn/p1.html").exists(), "live html not downloaded")
class LiveHtmlTests(unittest.TestCase):
    def test_page_has_coordinates_and_images(self):
        html = Path("/tmp/finn/p1.html").read_text(encoding="utf-8")
        results = finn.parse_search_html(html)
        docs = results["docs"]
        self.assertGreaterEqual(len(docs), 40)
        normalized = [finn.normalize_doc(doc) for doc in docs]
        self.assertTrue(all(row["bilde"] for row in normalized))
        self.assertTrue(all(row["lat"] for row in normalized))
        self.assertGreaterEqual(len(finn.oslo_districts(results)), 20)


if __name__ == "__main__":
    unittest.main()
