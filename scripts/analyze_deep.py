#!/usr/bin/env python3
"""Analisis mendalam: struktur, logika JS, keamanan data Rumbela."""
import re

html = open('/home/z/my-project/audit/home.html', encoding='utf-8', errors='replace').read()
out = []
add = out.append

# --- Navigasi & struktur section ---
add("== NAVIGASI ==")
navs = re.findall(r'<nav[^>]*>.*?</nav>', html, re.S)
for n in navs[:3]:
    links = re.findall(r'<(?:a|button)[^>]*>(.*?)</(?:a|button)>', n, re.S)
    items = [re.sub(r'<[^>]+>', '', l).strip() for l in links]
    add(f"  nav ({len(items)} item): {[i[:30] for i in items if i]}")

sections = re.findall(r'<(section|main|div)[^>]*(?:id|class)="([^"]*)"[^>]*>', html)
ids = re.findall(r'id="([^"]+)"', html)
add(f"\n== ID unik utama ({len(set(ids))}) ==\n  {sorted(set(ids))[:60]}")

# --- Body class / styling approach ---
body = re.search(r'<body[^>]*>', html)
add(f"\n== BODY == {body.group(0) if body else 'tidak ada'}")

# --- Grep pola penting di JS ---
js_all = '\n'.join(re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', html, re.S))
add(f"\nTotal JS inline: {len(js_all):,} bytes")

add("\n== PENYIMPANAN DATA ==")
for pat, label in [
    (r'localStorage', 'localStorage'),
    (r'sessionStorage', 'sessionStorage'),
    (r'fetchData|loadDB|DB_FILE|rumbela-database\.json', 'rumbela-database.json refs'),
    (r'multipart', 'multipart upload'),
    (r'q=bogus|trashed\s*=\s*false', 'query Drive'),
]:
    hits = re.findall(pat, js_all)
    add(f"  {label}: {len(hits)}x")

add("\n== KEAMANAN / GATE ==")
for pat, label in [
    (r'password|passcode|pin|PIN', 'password/pin'),
    (r'confirm\(', 'confirm()'),
    (r'esc\(', 'fungsi esc()'),
    (r'innerHTML\s*\+=?', 'innerHTML assignment'),
    (r'eval\(', 'eval()'),
    (r'TODO|FIXME|XXX|HACK', 'TODO/FIXME'),
]:
    hits = re.findall(pat, js_all)
    add(f"  {label}: {len(hits)}x")

# --- Konteks CLIENT_ID & scope ---
idx = js_all.find('client_id')
if idx > 0:
    add(f"\n== KONTEKS CLIENT_ID ==\n  {js_all[idx-120:idx+260]}")

# --- Demo/sample data ---
add("\n== DATA CONTOH (hardcoded) ==")
m = re.search(r'var\s+PROGRAMS\s*=\s*\[[^\]]*\]', js_all)
if m:
    add(f"  PROGRAMS: {m.group(0)[:200]}")
for var in ['var\s+(\w+)\s*=', 'const\s+(\w+)\s*=', 'let\s+(\w+)\s*=']:
    vs = re.findall(var, js_all)
    add(f"  variabel ({var[:6]}): {vs[:40]}")

# --- Fungsi utama ---
funcs = re.findall(r'function\s+(\w+)\s*\(', js_all)
add(f"\n== FUNGSI JS ({len(funcs)}) ==\n  {funcs}")

# --- WhatsApp integration ---
wa = re.findall(r'(?:wa\.me|api\.whatsapp\.com)[^\s"\'<>]*', html)
add(f"\n== WHATSAPP ==\n  {sorted(set(wa))[:10]}")

# --- Cek karakteristik UX: modal, toast, table ---
add(f"\n== KOMPONEN UI ==\n  modal: {len(re.findall(r'modal', html, re.I))}x | toast: {len(re.findall(r'toast', html, re.I))}x | tabel: {len(re.findall(r'<table', html))}x")
add(f"  tombol: {len(re.findall(r'<button', html))}x | select: {len(re.findall(r'<select', html))}x")

# --- CSS: media queries untuk responsive ---
css = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', html, re.S))
mq = re.findall(r'@media[^{]+', css)
add(f"\n== RESPONSIVE ==\n  media queries: {mq}")
colors = sorted(set(re.findall(r'#[0-9a-fA-F]{3,8}\b', css)))
add(f"  warna CSS ({len(colors)}): {colors[:40]}")

# --- Dark mode? ---
add(f"  prefers-color-scheme: {len(re.findall(r'prefers-color-scheme', css))}x")

with open('/home/z/my-project/audit/analysis2.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('\n'.join(out))
