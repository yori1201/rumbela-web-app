#!/usr/bin/env python3
"""Pasca-proses footer & pgNumType untuk kompatibilitas WPS/Word:
1. Ganti instrText PAGE polos -> PAGE \\* ROMAN (footer seksi roman) atau PAGE \\* arabic (footer isi)
2. Hapus <w:pgNumType/> kosong dari seksi sampul
"""
import re
import shutil
import sys
import zipfile
from pathlib import Path

path = Path(sys.argv[1])
tmp = path.with_suffix(".tmp.docx")

with zipfile.ZipFile(path, "r") as zin:
    names = zin.namelist()
    items = {n: zin.read(n) for n in names}

# --- 1. Hapus pgNumType kosong pada document.xml ---
docxml = items["word/document.xml"].decode("utf-8")
before = docxml.count("<w:pgNumType/>")
docxml = docxml.replace("<w:pgNumType/>", "")
items["word/document.xml"] = docxml.encode("utf-8")
print(f"pgNumType kosong dihapus: {before}")

# --- 2. Patch footer XML: identifikasi footer roman vs arabic ---
# Relasi: cari footerReference per seksi di document.xml.
# Seksi 2 (roman) muncul lebih dulu, seksi 3 (arabic) kemudian.
rels = items["word/_rels/document.xml.rels"].decode("utf-8")
rid2file = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="(footer\d+\.xml)"', rels))

# urutan kemunculan footerReference di document.xml
refs = re.findall(r'<w:footerReference w:type="default" r:id="(rId\d+)"/>', docxml)
print("footerReference (urutan):", [rid2file.get(r) for r in refs])

roman_footer = rid2file.get(refs[0]) if refs else None      # seksi daftar isi
arabic_footers = [rid2file[r] for r in refs[1:]] if len(refs) > 1 else []  # seksi isi

for fname in names:
    if fname.startswith("word/footer") and fname.endswith(".xml"):
        xml = items[fname].decode("utf-8")
        if fname == f"word/{roman_footer}":
            xml2 = re.sub(r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
                          r"\1 PAGE \\* ROMAN \\* MERGEFORMAT \2", xml)
            tag = "ROMAN"
        else:
            xml2 = re.sub(r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
                          r"\1 PAGE \\* arabic \\* MERGEFORMAT \2", xml)
            tag = "arabic"
        if xml2 != xml:
            items[fname] = xml2.encode("utf-8")
            print(f"{fname}: instrText di-patch -> {tag}")

with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for n in names:
        zout.writestr(n, items[n])
shutil.move(tmp, path)
print("Selesai:", path)
