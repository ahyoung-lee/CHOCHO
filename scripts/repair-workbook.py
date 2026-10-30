"""Repair stale Excel table headers without rewriting cells or formatting."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

def repair(path):
    with zipfile.ZipFile(path) as archive:
        parts = {entry.filename: archive.read(entry.filename) for entry in archive.infolist()}
        strings = ["".join(x.itertext()) for x in ET.fromstring(parts["xl/sharedStrings.xml"])]
        header = ET.fromstring(parts["xl/worksheets/sheet1.xml"]).find("m:sheetData/m:row", NS)
        names = [strings[int(cell.find("m:v", NS).text)] for cell in header]
        table = ET.fromstring(parts["xl/tables/table1.xml"])
        columns = table.find("m:tableColumns", NS)
        if len(columns) != len(names):
            raise ValueError("Table/header column count differs; refusing automatic repair")
        replacements = iter(names)
        def rename(match):
            name = escape(next(replacements), {'"': '&quot;'})
            return re.sub(r'\bname="[^"]*"', lambda _: 'name="' + name + '"', match.group(0), count=1)
        parts["xl/tables/table1.xml"] = re.sub(r'<tableColumn\s[^>]*>', rename, parts["xl/tables/table1.xml"].decode("utf-8")).encode("utf-8")
        parts["xl/workbook.xml"] = re.sub(rb'<fileRecoveryPr\b[^>]*/>', b'', parts["xl/workbook.xml"])
        temp = path.with_suffix('.repair-tmp.xlsx')
        with zipfile.ZipFile(temp, 'w') as output:
            for entry in archive.infolist():
                output.writestr(entry, parts[entry.filename])
    temp.replace(path)

if __name__ == '__main__':
    repair(ROOT / '업체정보/업체정보_간편입력.xlsx')
    print('Repaired Excel table header names and removed forced repair mode; cells and styles preserved.')
