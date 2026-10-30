"""Check the published data against the actual saved workbook, without Excel deps."""
import importlib.util
import json
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("workbook", ROOT / "scripts/import-workbook.py")
workbook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(workbook)


class WorkbookTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = ROOT / "업체정보/업체정보_간편입력.xlsx"
        cls.rows = workbook.read_rows(cls.path)
        cls.data = json.loads((ROOT / "data/venues.json").read_text(encoding="utf-8"))

    def test_excel_table_column_names_match_visible_headers(self):
        with zipfile.ZipFile(self.path) as archive:
            strings = ["".join(x.itertext()) for x in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
            sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
            header = sheet.find("m:sheetData/m:row", workbook.NS)
            names = [strings[int(cell.find("m:v", workbook.NS).text)] for cell in header]
            table = ET.fromstring(archive.read("xl/tables/table1.xml"))
            columns = table.find("m:tableColumns", workbook.NS)
            self.assertEqual([column.get("name") for column in columns], names)

    def test_workbook_does_not_force_excel_repair_mode(self):
        with zipfile.ZipFile(self.path) as archive:
            self.assertIsNone(archive.testzip())
            book = ET.fromstring(archive.read("xl/workbook.xml"))
            recovery = book.find("m:fileRecoveryPr", workbook.NS)
            self.assertTrue(recovery is None or recovery.get("repairLoad") not in ("1", "true"))

    def test_unlocated_venue_address_cells_are_yellow(self):
        with zipfile.ZipFile(self.path) as archive:
            styles = ET.fromstring(archive.read("xl/styles.xml"))
            fills = styles.find("m:fills", workbook.NS)
            xfs = styles.find("m:cellXfs", workbook.NS)
            sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
            cells = {cell.get("r"): cell for cell in sheet.findall(".//m:c", workbook.NS)}
            missing = [p for p in self.data["places"] if p["lat"] is None or p["lng"] is None]
            for place in missing:
                address = cells["B" + str(place["registration"]["row"])]
                fill = fills[int(xfs[int(address.get("s", "0"))].get("fillId", "0"))]
                pattern = fill.find("m:patternFill", workbook.NS)
                self.assertEqual(pattern.get("patternType"), "solid", place["name"])
                self.assertEqual(pattern.find("m:fgColor", workbook.NS).get("rgb"), "FFFFFF00", place["name"])

    def test_saved_rows_are_the_entire_published_list(self):
        self.assertEqual(list(self.rows[0][1])[3:9], ["동반 카페", "운동장 카페", "대형견 카페", "동반 음식점", "동반 술집", "동반 펜션"])
        rows = [(n, r) for n, r in self.rows if r.get("상호명")]
        self.assertEqual([(r["상호명"].strip(), r["주소"].strip()) for _, r in rows], [(p["name"], p["address"]) for p in self.data["places"]])
        columns = {"hoteling": "호텔링", "daycare": "유치원", "grooming": "애견미용", "parking": "주차가능", "indoor": "실내 동반", "terrace": "테라스 동반"}
        for (_, row), p in zip(rows, self.data["places"]):
            for field, column in columns.items():
                self.assertIs(p[field], workbook.flag(row[column]))
            self.assertEqual(p.get("contactNote") or p["phone"] or "", row["업체연락처"])
            self.assertEqual(p["registrationNote"], row.get("동반 조건 및 메모", ""))

    def test_import_is_repeatable_and_keeps_ids(self):
        again = workbook.import_rows(self.data, self.rows, self.path.name, self.data["checkedAt"])
        self.assertEqual(again, self.data)

    def test_contact_instructions_are_preserved_without_becoming_phone_links(self):
        rows = [(n, dict(r)) for n, r in self.rows]
        rows[0][1]["업체연락처"] = "네이버예약"
        place = workbook.import_rows(self.data, rows, self.path.name, self.data["checkedAt"])["places"][0]
        self.assertIsNone(place["phone"])
        self.assertEqual(place["contactNote"], "네이버예약")

    def test_unknowns_and_incomplete_rows_are_never_guessed(self):
        self.assertIsNone(workbook.flag(""))
        self.assertIs(workbook.flag("0"), False)
        with self.assertRaises(ValueError):
            workbook.flag("maybe")
        with self.assertRaises(ValueError):
            workbook.import_rows(self.data, [(2, {"상호명": "미완성 업체"})], "input.xlsx", "2026-10-19")
        with self.assertRaises(ValueError):
            workbook.import_rows(self.data, [], "input.xlsx", "2026-10-19")

    def test_clearing_a_memo_removes_its_derived_restriction(self):
        rows = [(n, dict(r)) for n, r in self.rows]
        for _, row in rows:
            if row.get("상호명") == "구디가든카페":
                row["동반 조건 및 메모"] = ""
        result = workbook.import_rows(self.data, rows, self.path.name, self.data["checkedAt"])
        p = next(p for p in result["places"] if p["name"] == "구디가든카페")
        self.assertEqual(p["registrationNote"], "")
        self.assertNotIn("케이지", p["dogRule"])

    def test_location_keys_keep_districts_provinces_and_townships(self):
        self.assertEqual(workbook.road_key("서울 강남구 영동대로 725 6층"), workbook.road_key("서울특별시 강남구 영동대로 725"))
        for a, b in [
            ("서울특별시 강남구 중앙로 10", "서울특별시 강동구 중앙로 10"),
            ("경기 고성군 중앙로 10", "강원 고성군 중앙로 10"),
            ("경기 포천시 내촌면 중앙로 10", "경기 포천시 가산면 중앙로 10"),
        ]:
            self.assertNotEqual(workbook.road_key(a), workbook.road_key(b))


if __name__ == "__main__":
    unittest.main()
