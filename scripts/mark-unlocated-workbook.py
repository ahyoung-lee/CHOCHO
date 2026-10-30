"""Mark only unlocated registered venues' address cells yellow, preserving cell data."""
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

def mark_addresses(path, data):
    rows = {str(p['registration']['row']) for p in data['places'] if p['lat'] is None or p['lng'] is None}
    with zipfile.ZipFile(path) as archive:
        parts = {entry.filename: archive.read(entry.filename) for entry in archive.infolist()}
        original_styles = parts['xl/styles.xml'].decode('utf-8')
        styles = ET.fromstring(original_styles)
        fills = styles.find('m:fills', NS)
        xfs = styles.find('m:cellXfs', NS)
        fill_id = next((i for i, fill in enumerate(fills) if fill.find('m:patternFill', NS) is not None and fill.find('m:patternFill', NS).get('patternType') == 'solid' and fill.find('m:patternFill/m:fgColor', NS) is not None and fill.find('m:patternFill/m:fgColor', NS).get('rgb') == 'FFFFFF00'), None)
        if fill_id is None:
            fill_id = len(fills)
            original_styles = re.sub(r'<fills count="\d+">', f'<fills count="{fill_id + 1}">', original_styles, count=1)
            original_styles = original_styles.replace('</fills>', '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill></fills>', 1)
        serialized_xfs = re.search(r'<cellXfs\b[^>]*>(.*?)</cellXfs>', original_styles).group(1)
        raw_xfs = re.findall(r'<xf\b[^>]*?(?:/>|>.*?</xf>)', serialized_xfs)
        assert len(raw_xfs) == len(xfs)
        additions, mapped = [], {}
        def address_style(match):
            cell = match.group(0)
            if match.group(1) not in rows:
                return cell
            base = int(re.search(r'\bs="(\d+)"', cell).group(1)) if re.search(r'\bs="(\d+)"', cell) else 0
            if xfs[base].get('fillId') == str(fill_id):
                return cell
            if base not in mapped:
                xf = re.sub(r'\bfillId="\d+"', f'fillId="{fill_id}"', raw_xfs[base], count=1)
                xf = re.sub(r'\sapplyFill="[^"]*"', '', xf)
                xf = xf.replace('<xf ', '<xf applyFill="1" ', 1)
                mapped[base] = len(xfs) + len(additions)
                additions.append(xf)
            if re.search(r'\bs="\d+"', cell):
                return re.sub(r'\bs="\d+"', f's="{mapped[base]}"', cell, count=1)
            return cell.replace('<c ', f'<c s="{mapped[base]}" ', 1)
        sheet = parts['xl/worksheets/sheet1.xml'].decode('utf-8')
        sheet = re.sub(r'<c\b[^>]*\br="B(\d+)"[^>]*>', address_style, sheet)
        original_styles = original_styles.replace('</cellXfs>', ''.join(additions) + '</cellXfs>', 1)
        original_styles = re.sub(r'<cellXfs count="\d+">', f'<cellXfs count="{len(xfs)+len(additions)}">', original_styles, count=1)
        parts['xl/styles.xml'] = original_styles.encode('utf-8')
        parts['xl/worksheets/sheet1.xml'] = sheet.encode('utf-8')
        temp = path.with_suffix('.mark-tmp.xlsx')
        with zipfile.ZipFile(temp, 'w') as output:
            for entry in archive.infolist():
                output.writestr(entry, parts[entry.filename])
    temp.replace(path)
    return len(rows)

if __name__ == '__main__':
    count = mark_addresses(ROOT / '업체정보/업체정보_간편입력.xlsx', json.loads((ROOT / 'data/venues.json').read_text(encoding='utf-8')))
    print(f'Marked {count} unlocated venue address cells yellow.')
