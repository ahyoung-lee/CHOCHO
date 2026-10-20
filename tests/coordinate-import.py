"""Ensure coordinate enrichment follows workbook address edits safely."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("workbook", ROOT / "scripts/import-workbook.py")
workbook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(workbook)


class CoordinateImportTests(unittest.TestCase):
    def test_floor_edit_keeps_address_coordinates_and_moving_clears_them(self):
        data = json.loads((ROOT / "data/venues.json").read_text(encoding="utf-8"))
        source = ROOT / "업체정보/업체정보_간편입력.xlsx"
        rows = workbook.read_rows(source)
        original = data["places"][0]
        floor_rows = copy.deepcopy(rows)
        floor_rows[0][1]["주소"] = "서울 강남구 영동대로 725 7층"
        floor = workbook.import_rows(data, floor_rows, source.name, data["checkedAt"])["places"][0]
        self.assertEqual(floor["coordinateEvidence"], original["coordinateEvidence"])
        self.assertEqual((floor["lat"], floor["lng"]), (original["lat"], original["lng"]))
        moved_rows = copy.deepcopy(rows)
        moved_rows[0][1]["주소"] = "서울 강남구 영동대로 726 6층"
        moved = workbook.import_rows(data, moved_rows, source.name, data["checkedAt"])["places"][0]
        self.assertIsNone(moved["lat"])
        self.assertIsNone(moved["lng"])
        self.assertNotIn("coordinateEvidence", moved)
        self.assertFalse(any(s.get("type") == "등록 도로명 주소 좌표" for s in moved["sources"]))


if __name__ == "__main__":
    unittest.main()
