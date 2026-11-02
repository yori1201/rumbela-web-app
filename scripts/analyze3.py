#!/usr/bin/env python3
"""Analisis 3: sample data, password ref, favicon, performa."""
import re

html = open('/home/z/my-project/audit/home.html', encoding='utf-8', errors='replace').read()
js = '\n'.join(re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', html, re.S))
out = []
add = out.append

# --- Sample data ---
add("== FUNGSI hasSample & seed ==")
for fn in ['hasSample', 'seed']:
    idx = js.find('function ' + fn + '(')
    if idx >= 0:
        add(f"  {fn}(): {js[idx:idx+800]}")

# --- Password/pin context ---
add("\n== KONTEKS password/pin ==")
for m in re.finditer(r'(password|passcode|pin)', js, re.I):
    s = max(0, m.start()-150)
    add(f"  ...{js[s:m.end()+150]}...")
    break

# --- WA_OFFICIAL ---
add("\n== WA_OFFICIAL ==")
m = re.search(r'WA_OFFICIAL\s*=\s*([^;]+);', js)
add(f"  {m.group(1) if m else 'tidak ditemukan'}")

# --- Favicon / icon / manifest / apple ---
add("\n== FAVICON/MANIFEST ==")
for pat in [r'<link[^>]*icon[^>]*>', r'<link[^>]*manifest[^>]*>', r'<link[^>]*apple[^>]*>']:
    add(f"  {pat[:22]}: {re.findall(pat, html)}")

# --- Script loading: defer/async? ---
add("\n== CARA LOAD SCRIPT EKSTERNAL ==")
for m in re.findall(r'<script[^>]*src[^>]*>', html):
    add(f"  {m}")

# --- Google Fonts: preconnect? ---
add(f"\n== preconnect/dns-prefetch: {re.findall(r'<link[^>]*(?:preconnect|dns-prefetch)[^>]*>', html)} ==")

# --- Inline script position (head or body end?) ---
pos_head = html.find('</head>')
first_script = html.find('<script')
add(f"\n== POSISI: </head> di offset {pos_head}, script inline pertama di {first_script} ({'di HEAD' if first_script < pos_head else 'di BODY'}) ==")

# --- Berapa besar konten visible sebelum JS? ---
body_start = html.find('<body')
add(f"  offset <body>: {body_start} | total: {len(html)} | artinya {body_start/len(html)*100:.0f}% dokumen adalah <head>")

# --- Cek tabel tunggal & bottomnav ---
bn = re.search(r'<nav[^>]*id="bottomnav"[^>]*>(.*?)</nav>', html, re.S)
if bn:
    items = re.findall(r'>([^<>]{2,25})<', bn.group(1))
    add(f"\n== BOTTOMNAV == {[i.strip() for i in items if i.strip()]}")

top = re.search(r'<nav[^>]*id="topnav"[^>]*>(.*?)</nav>', html, re.S)
if not top:
    top = re.search(r'<header[^>]*>(.*?)</header>', html, re.S)
if top:
    items = re.findall(r'>([^<>]{2,25})<', top.group(1))
    add(f"== TOPNAV/HEADER == {[i.strip() for i in items if i.strip()]}")

# --- Cek loading state / skeleton ---
add(f"\n== loading/skeleton: {len(re.findall(r'loading|skeleton|spinner', html, re.I))}x ==")

# --- Netlify HUD di produksi ---
add(f"== Netlify HUD di HTML produksi: {'/.netlify/scripts/hud' in html} ==")

# --- Journal/aspect fields ---
m = re.search(r'var\s+ASPECTS\s*=\s*\[[^\]]*\]', js)
add(f"\n== ASPECTS == {m.group(0)[:300] if m else '-'}")
m = re.search(r'var\s+FEE_DEFAULT\s*=\s*([^;]+);', js)
add(f"== FEE_DEFAULT == {m.group(1) if m else '-'}")
m = re.search(r'var\s+MONTHS\s*=\s*\[[^\]]*\]', js)
add(f"== MONTHS == {m.group(0)[:150] if m else '-'}")

# --- Cek state persistence ---
m = re.search(r'var\s+state\s*=\s*\{.{0,400}', js, re.S)
add(f"\n== STATE == {m.group(0)[:400] if m else '-'}")

with open('/home/z/my-project/audit/analysis3.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('\n'.join(out))
