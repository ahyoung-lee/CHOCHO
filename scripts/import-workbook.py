"""Import the saved venue workbook using only Python's standard library.

Usage: python scripts/import-workbook.py [path.xlsx]
Only the rows saved in this workbook are published; blank cells stay unknown.
"""
import datetime
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REGION_ALIASES = {
    "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
    "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
    "경기도": "경기", "강원도": "강원", "강원특별자치도": "강원", "충청북도": "충북",
    "충청남도": "충남", "전라북도": "전북", "전북특별자치도": "전북", "전라남도": "전남",
    "경상북도": "경북", "경상남도": "경남", "제주도": "제주", "제주특별자치도": "제주",
}


def read_rows(path):
    with zipfile.ZipFile(path) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(t.itertext()) for t in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        book = ET.fromstring(archive.read("xl/workbook.xml"))
        sheet = next(s for s in book.find("m:sheets", NS) if s.attrib["name"] == "업체정보")
        rid = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        target = next(r.attrib["Target"] for r in rels if r.attrib["Id"] == rid)
        target = target.lstrip("/") if target.startswith("/") else "xl/" + target
        rows = []
        for row in ET.fromstring(archive.read(target)).findall("m:sheetData/m:row", NS):
            values = {}
            for cell in row:
                col = re.sub(r"\d", "", cell.attrib["r"])
                value = cell.find("m:v", NS)
                text = value.text if value is not None else ""
                if cell.attrib.get("t") == "s":
                    text = strings[int(text)]
                elif cell.attrib.get("t") == "inlineStr":
                    text = "".join(t.text or "" for t in cell.findall("m:is//m:t", NS))
                values[col] = (text or "").strip()
            rows.append((int(row.attrib["r"]), values))
    aliases = {"운동장카페": "운동장 카페", "대형견카페": "대형견 카페"}
    header = {column: aliases.get(name, name) for column, name in rows[0][1].items()}
    required = {"상호명", "주소", "운동장 카페", "동반 카페", "대형견 카페", "동반 음식점", "동반 술집", "동반 펜션", "주차가능", "실내 동반", "테라스 동반", "호텔링", "유치원", "애견미용"}
    if not required.issubset(set(header.values())):
        raise ValueError("엑셀 열 제목을 확인하세요: " + ", ".join(sorted(required - set(header.values()))))
    return [(number, {name: values.get(col, "") for col, name in header.items()}) for number, values in rows[1:]]


def flag(value):
    if value in (1, "1", "예", "가능", True):
        return True
    if value in (0, "0", "아니오", "아니요", "불가", False):
        return False
    if value in (None, "", "미확인"):
        return None
    raise ValueError(f"지원하지 않는 선택값: {value!r}")


def road_key(address):
    # Floors and business labels may change without moving the street address.
    match = re.search(r"([^\s]+(?:로|길))\s+(\d+(?:-\d+)?)", address)
    if not match:
        return None
    administrative = address[:match.start()].split()
    if not administrative:
        return None
    administrative[0] = REGION_ALIASES.get(administrative[0], administrative[0])
    return (*administrative, *match.groups())


def normalize_name(name):
    return re.sub(r"\s+", "", name).lower()


def import_rows(previous, rows, filename, today):
    places, seen = [], set()
    category_columns = {"playground": "운동장 카페", "companion": "동반 카페", "restaurant": "동반 음식점", "bar": "동반 술집", "pension": "동반 펜션"}
    condition_columns = {"parking": "주차가능", "indoor": "실내 동반", "terrace": "테라스 동반", "hoteling": "호텔링", "daycare": "유치원", "grooming": "애견미용"}
    for row_number, row in rows:
        # The formula-only region column does not make a venue row populated.
        if not any(value for key, value in row.items() if key != "지역"):
            continue
        name, address = row.get("상호명", "").strip(), row.get("주소", "").strip()
        if not name or not address:
            raise ValueError(f"{row_number}행: 상호명과 주소를 모두 입력하세요.")
        key = (normalize_name(name), address)
        if key in seen:
            raise ValueError(f"{row_number}행: 중복 업체 {name}")
        seen.add(key)
        categories = [key for key, column in category_columns.items() if flag(row.get(column, row.get(column.replace(" ", ""), ""))) is True]
        if not categories:
            raise ValueError(f"{row_number}행: {name}의 카테고리를 1개 이상 선택하세요.")
        phone = row.get("업체연락처", "").strip() or None
        same_name = [p for p in previous["places"] if normalize_name(p["name"]) == normalize_name(name)]
        same_phone = [p for p in previous["places"] if phone and p.get("phone") == phone and road_key(p["address"]) == road_key(address)]
        old = same_name[0] if len(same_name) == 1 else same_phone[0] if len(same_phone) == 1 else None
        same_location = old and road_key(address) is not None and road_key(old["address"]) == road_key(address)
        p = dict(old) if same_location else {}
        p["id"] = old["id"] if old else "manual-" + hashlib.sha256((name + "|" + address).encode()).hexdigest()[:12]
        parts = address.split()
        region = parts[1] if len(parts) > 1 else parts[0]
        area = parts[2] if len(parts) > 2 and re.search(r"[읍면동]$", parts[2]) else region
        p.update(number=len(places)+1, name=name, address=address, phone=phone, region=region, area=area,
                 category=categories[0], categories=categories, playground="playground" in categories,
                 status="listed", level="owner", registration={"file": filename, "row": row_number, "updatedAt": today})
        for field, column in condition_columns.items():
            p[field] = flag(row.get(column, ""))
        p["largeDogPlayground"] = flag(row.get("대형견 카페", row.get("대형견카페", ""))) is True and p["playground"]
        if p["largeDogPlayground"]:
            p["largeDogPlaygroundEvidence"] = f"사용자 직접 등록 엑셀 {row_number}행: 운동장 카페·대형견 카페 선택"
        else:
            p.pop("largeDogPlaygroundEvidence", None)
        reference_rule = p.get("referenceDogRule") or (p.get("dogRule") if p.get("dogRule") != p.get("registrationNote") else None)
        p["referenceDogRule"] = reference_rule or "체중·견종·출입 조건은 방문 전 문의"
        p["registrationNote"] = row.get("동반 조건 및 메모", "")
        p["dogRule"] = p["registrationNote"] or reference_rule or "체중·견종·출입 조건은 방문 전 문의"
        p["parkingText"] = "사용자 등록: " + {True: "주차 가능", False: "주차 불가", None: "주차 미확인"}[p["parking"]]
        p["petArea"] = " · ".join(label for field, label in [("indoor", "실내 동반"), ("terrace", "테라스 동반")] if p[field] is True) or "동반 구역 미확인"
        p["yard"] = "사용자 등록: 운동장 있음" if p["playground"] else "사용자 등록: 운동장 미선택"
        p["evidence"] = f"사용자가 {filename} {row_number}행에 직접 입력한 업체·동반 조건입니다. 사이트에서 전화·현장 확인하지 않았습니다."
        p["feature"] = p["registrationNote"] or " · ".join([category_columns[c] for c in categories] + [condition_columns[f] for f in ["hoteling", "daycare", "grooming"] if p[f] is True])
        if not same_location:
            p.update(lat=None, lng=None, position="좌표 미확인", positionNote="직접 등록한 주소입니다. 좌표 확인 전에는 지도 핀을 표시하지 않습니다. 네이버 지도에서 주소를 확인하세요.",
                     times={origin: None for origin in previous["origins"]}, surface="바닥 재질 미확인", outdoor=None,
                     weightLimit=None, exclusive=False, kids="어린이 입장 조건 문의", hours="영업시간 미등록 · 방문 전 문의",
                     hoursNote="엑셀에 영업시간이 입력되지 않았습니다.", schedule=None, hoursConflict=False,
                     fee="이용요금 미등록 · 문의", feeNote="최신 요금과 추가요금은 업체에 문의하세요.",
                     checkedAt=today, sources=[], checks=["오늘 영업 여부와 입장 조건", "실제 출입구·주차 위치", "최신 요금·서비스 예약 가능 여부"])
        p["sources"] = [s for s in p["sources"] if s.get("type") != "사용자 직접 등록 주소 검색"]
        p["sources"].append({"name": "직접 등록 주소 · 네이버 지도 검색", "url": "https://map.naver.com/p/search/" + quote(address), "type": "사용자 직접 등록 주소 검색"})
        places.append(p)
    if not places:
        raise ValueError("등록된 업체가 없어 반영을 중단합니다.")
    if len({p["id"] for p in places}) != len(places):
        raise ValueError("업체 ID 중복: 같은 업체를 여러 행에 등록했는지 확인하세요.")
    return {"checkedAt": today, "origins": previous["origins"], "coverage": {"complete": False, "source": filename, "mode": "manual-workbook", "registeredCount": len(places)}, "places": places}


if __name__ == "__main__":
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "업체정보/업체정보_간편입력.xlsx"
    path = ROOT / "data/venues.json"
    previous = json.loads(path.read_text(encoding="utf-8"))
    result = import_rows(previous, read_rows(source), source.name, datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).date().isoformat())
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(result['places'])} registered venues from {source.name}")
