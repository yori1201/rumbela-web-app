#!/usr/bin/env python3
"""Analisis source code HTML Rumbela Live untuk audit."""
import re, os, json

SRC = '/home/z/my-project/audit/home.html'
html = open(SRC, encoding='utf-8', errors='replace').read()
out = []
add = out.append

add(f"Ukuran file HTML: {len(html):,} bytes ({len(html)/1024:.1f} KB)")
add(f"Jumlah baris: {html.count(chr(10))+1}")

# --- Head & meta ---
title = re.findall(r'<title[^>]*>(.*?)</title>', html, re.S|re.I)
add(f"\n== TITLE ==\n{title}")
metas = re.findall(r'<meta[^>]+>', html)
add(f"\n== META TAGS ({len(metas)}) ==")
for m in metas[:25]:
    add(f"  {m[:160]}")

# --- Scripts ---
scripts_ext = re.findall(r'<script[^>]*src=["\']([^"\']+)["\'][^>]*>', html)
add(f"\n== SCRIPT EKSTERNAL ({len(scripts_ext)}) ==")
for s in scripts_ext:
    add(f"  {s}")
inline_scripts = re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', html, re.S|re.I)
total_inline = sum(len(s) for s in inline_scripts)
add(f"\n== SCRIPT INLINE: {len(inline_scripts)} blok, total {total_inline:,} bytes ({total_inline/1024:.1f} KB) ==")
for i, s in enumerate(inline_scripts):
    add(f"  blok#{i+1}: {len(s):,} bytes | awal: {s.strip()[:100]!r}")

# --- CSS ---
links_css = re.findall(r'<link[^>]*rel=["\']stylesheet["\'][^>]*>', html)
add(f"\n== LINK CSS EKSTERNAL ({len(links_css)}) ==")
for l in links_css:
    add(f"  {l[:200]}")
styles_inline = re.findall(r'<style[^>]*>(.*?)</style>', html, re.S|re.I)
total_css = sum(len(s) for s in styles_inline)
add(f"== CSS INLINE: {len(styles_inline)} blok, total {total_css:,} bytes ({total_css/1024:.1f} KB) ==")

# --- Referensi Google / API ---
add("\n== REFERENSI GOOGLE/API ==")
gurls = sorted(set(re.findall(r'https?://[^\s"\'<>]*google[^\s"\'<>]*', html)))
for u in gurls[:30]:
    add(f"  {u[:150]}")
client_ids = re.findall(r'client[_-]?id["\']?\s*[:=]\s*["\']([^"\']+)', html, re.I)
add(f"CLIENT_ID ditemukan: {client_ids[:5]}")
api_keys = re.findall(r'(?:AIza[0-9A-Za-z_-]{20,})', html)
add(f"API key Google (AIza...) ditemukan: {api_keys[:5]}")
file_ids = re.findall(r'file[_-]?id["\']?\s*[:=]\s*["\']([^"\']+)', html, re.I)
drive_ids = re.findall(r'drive\.google\.com/[^\s"\'<>]*', html)
add(f"FILE_ID config: {file_ids[:5]}")
add(f"URL Drive: {drive_ids[:5]}")

# --- Framework / library ---
add("\n== JEJAK LIBRARY ==")
for lib in ['react', 'vue', 'angular', 'jquery', 'bootstrap', 'tailwind', 'alpinejs', 'htmx', 'svelte', 'lodash', 'chart.js', 'fontawesome']:
    hits = len(re.findall(lib, html, re.I))
    if hits:
        add(f"  {lib}: {hits} kemunculan")

# --- Struktur heading & section ---
add("\n== HEADING (h1-h3) ==")
for h in re.findall(r'<h([123])[^>]*>(.*?)</h\1>', html, re.S|re.I)[:40]:
    txt = re.sub(r'<[^>]+>', '', h[1]).strip()[:60]
    if txt:
        add(f"  h{h[0]}: {txt}")

# --- Form & aksesibilitas dasar ---
imgs = re.findall(r'<img[^>]*>', html)
add(f"\n== IMG: {len(imgs)} ==")
no_alt = [i for i in imgs if 'alt=' not in i.lower()]
add(f"  tanpa alt: {len(no_alt)}")
aria = len(re.findall(r'aria-', html))
add(f"== atribut aria-*: {aria} ==")
lang = re.findall(r'<html[^>]*lang=["\']([^"\']+)', html)
add(f"== lang: {lang} ==")
labels = len(re.findall(r'<label', html, re.I))
inputs = re.findall(r'<(input|select|textarea)[^>]*>', html)
add(f"== form: {len(inputs)} input/select/textarea, {labels} label ==")

# --- Bahasa konten ---
add(f"\n== cek teks Indonesia (contoh): 'Siswa' x{len(re.findall('Siswa', html))}, 'Iuran' x{len(re.findall('Iuran', html))} ==")

# --- Deteksi pola SPA ---
hash_links = sorted(set(re.findall(r'href="#[^"]+"', html)))
add(f"\n== hash routing: {hash_links[:15]} ==")

with open('/home/z/my-project/audit/analysis.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('\n'.join(out[:80]))
print(f"\n[full output -> audit/analysis.txt, {len(out)} baris]")
