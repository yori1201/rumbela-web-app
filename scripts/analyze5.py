#!/usr/bin/env python3
"""Analisis 5: cari semua call site requestAccessToken & init sequence."""
import re

html = open('/home/z/my-project/audit/home.html', encoding='utf-8', errors='replace').read()
js = '\n'.join(re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', html, re.S))
out = []
add = out.append

add("== SEMUA requestAccessToken ==")
for m in re.finditer(r'requestAccessToken', js):
    s = max(0, m.start()-350)
    add(js[s:m.end()+120])
    add("-" * 60)

add("\n== gdReadSession ==")
idx = js.find('function gdReadSession(')
if idx >= 0:
    add(js[idx:idx+900])

add("\n== AKHIR SCRIPT (init sequence, 2500 char terakhir) ==")
add(js[-2500:])

with open('/home/z/my-project/audit/analysis5.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('\n'.join(out))
