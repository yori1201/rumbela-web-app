#!/usr/bin/env python3
"""Analisis 4: auto-login trigger, gdCheck, inisialisasi."""
import re

html = open('/home/z/my-project/audit/home.html', encoding='utf-8', errors='replace').read()
scripts = re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', html, re.S)
js = '\n'.join(scripts)
out = []
add = out.append

def show(name, needle, before=100, after=700):
    idx = js.find(needle)
    add(f"\n== {name} (cari: {needle!r}) ==")
    if idx < 0:
        add("  TIDAK DITEMUKAN")
    else:
        add(js[max(0,idx-before):idx+after])

show("gdCheck", "function gdCheck(")
show("gdOnToken", "function gdOnToken(")
show("pemanggilan gdCheck", "gdCheck(")
show("init / DOMContentLoaded", "DOMContentLoaded")
show("init / window.onload", "window.onload")
show("gdLogin", "function gdLogin(")
show("prompt parameter", "prompt")

# Cari pemanggilan gdEnsureClient dan gdLogin
add("\n== PANGGIL gdEnsureClient/gdLogin ==")
for m in re.finditer(r'gd(EnsureClient|Login)\s*\(', js):
    s = max(0, m.start()-120)
    ctx = js[s:m.end()+80].replace('\n', ' ')
    add(f"  ...{ctx}...")

with open('/home/z/my-project/audit/analysis4.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('\n'.join(out))
