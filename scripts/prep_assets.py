#!/usr/bin/env python3
"""Siapkan aset visual untuk laporan audit Rumbela:
1. Crop screenshot ke area viewport
2. 4 chart matplotlib (skor, prioritas temuan, bobot, roadmap)
Palette: Template 07 Crystal Blue body subset.
"""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from PIL import Image, ImageOps

# ---------- Font config (wajib) ----------
fm.fontManager.addfont('/usr/share/fonts/truetype/chinese/NotoSansSC-Regular.ttf')
fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
plt.rcParams['font.sans-serif'] = ['Noto Sans SC', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ---------- Palette Template 07 (body) ----------
ACCENT   = '#2d7ab3'
DEEP     = '#1a4a7a'
LUMEN    = '#4da8da'
MUTED    = '#5a7a96'
TEXT     = '#142840'
BORDER   = '#c0d0e2'
CARD     = '#e4ecf5'

OUT = '/home/z/my-project/audit/assets'
os.makedirs(OUT, exist_ok=True)
SH = '/home/z/my-project/audit/shots'

# ================= 1. CROP SCREENSHOTS =================
def crop_shot(src, dst, box, border=2, border_color=(192, 208, 226)):
    im = Image.open(src).convert('RGB')
    # kunci kotak crop ke dimensi asli (PIL mengisi kelebihan dengan hitam)
    box = (0, 0, min(box[2], im.width), min(box[3], im.height))
    im = im.crop(box)
    if border:
        im = ImageOps.expand(im, border=border, fill=border_color)
    im.save(dst, quality=92)
    print(f'crop: {dst} {im.size}')

crop_shot(f'{SH}/01-beranda-desktop.png', f'{OUT}/shot_beranda_desktop.png', (0, 0, 1366, 940))
crop_shot(f'{SH}/02-siswa-desktop.png',   f'{OUT}/shot_siswa_desktop.png',   (0, 0, 1366, 940))
crop_shot(f'{SH}/08-beranda-mobile.png',  f'{OUT}/shot_beranda_mobile.png',  (0, 0, 390, 760))
crop_shot(f'{SH}/10-form-siswa-mobile.png', f'{OUT}/shot_form_mobile.png',   (0, 0, 390, 760))

# ================= 2. CHART SKOR PER KATEGORI =================
def style_ax(ax):
    for s in ('top', 'right'):
        ax.spines[s].set_visible(False)
    ax.spines['left'].set_color(BORDER)
    ax.spines['bottom'].set_color(BORDER)
    ax.tick_params(colors=MUTED, labelsize=11)

fig, ax = plt.subplots(figsize=(8.2, 3.9), dpi=150, constrained_layout=True)
kateg = ['UI/UX Desktop', 'UI/UX Mobile', 'Keamanan', 'Performa & Kecepatan',
         'Arsitektur Data', 'SEO & Aksesibilitas']
skor  = [8.0, 6.0, 6.5, 5.5, 5.0, 4.0]
warna = [ACCENT if s >= 6.5 else (MUTED if s >= 5 else LUMEN) for s in skor]
bars = ax.barh(kateg[::-1], skor[::-1], color=warna[::-1], height=0.62, edgecolor='none')
for b, s in zip(bars, skor[::-1]):
    ax.text(b.get_width() + 0.15, b.get_y() + b.get_height()/2, f'{s:.1f}',
            va='center', ha='left', fontsize=12, fontweight='bold', color=TEXT)
ax.set_xlim(0, 10)
ax.set_xticks([0, 2, 4, 6, 8, 10])
ax.axvline(5.83, color=DEEP, linestyle='--', linewidth=1.2, alpha=0.55)
ax.text(5.95, -0.42, 'rata-rata 5,8', fontsize=9.5, color=DEEP, ha='left')
ax.set_xlabel('Skor (skala 1-10)', fontsize=11, color=MUTED)
style_ax(ax)
ax.grid(axis='x', linestyle='--', linewidth=0.5, alpha=0.2, color=MUTED)
ax.set_axisbelow(True)
fig.savefig(f'{OUT}/chart_skor.png', facecolor='white')
plt.close(fig)
print('chart_skor.png OK')

# ================= 3. CHART PRIORITAS TEMUAN =================
fig, ax = plt.subplots(figsize=(8.2, 3.7), dpi=150, constrained_layout=True)
kat2 = ['UI/UX', 'Performa', 'Keamanan', 'Arsitektur Data', 'SEO & Aksesibilitas']
p1 = [2, 1, 0, 1, 0]
p2 = [4, 2, 3, 2, 1]
p3 = [4, 3, 1, 1, 4]
y = range(len(kat2))[::-1]
h = 0.55
b1 = ax.barh(y, p1, height=h, color=DEEP,  label='P1 - Kritis')
b2 = ax.barh(y, p2, left=p1, height=h, color=ACCENT, label='P2 - Penting')
b3 = ax.barh(y, p3, left=[a+b for a, b in zip(p1, p2)], height=h, color=BORDER, label='P3 - Penyempurnaan')
ax.set_yticks(list(y))
ax.set_yticklabels(kat2, fontsize=11)
for yi, (a, b, c) in zip(y, zip(p1, p2, p3)):
    total = a + b + c
    ax.text(total + 0.15, yi, f'{total} temuan', va='center', fontsize=10.5, color=TEXT, fontweight='bold')
    if a:
        ax.text(a/2, yi, str(a), va='center', ha='center', fontsize=10, color='white', fontweight='bold')
    if b:
        ax.text(a + b/2, yi, str(b), va='center', ha='center', fontsize=10, color='white', fontweight='bold')
    if c:
        ax.text(a + b + c/2, yi, str(c), va='center', ha='center', fontsize=10, color=TEXT)
ax.set_xlim(0, 12)
ax.set_xlabel('Jumlah temuan', fontsize=11, color=MUTED)
ax.legend(loc='lower right', frameon=False, fontsize=10)
style_ax(ax)
fig.savefig(f'{OUT}/chart_prioritas.png', facecolor='white')
plt.close(fig)
print('chart_prioritas.png OK')

# ================= 4. CHART BOBOT HALAMAN =================
fig, ax = plt.subplots(figsize=(8.2, 3.2), dpi=150, constrained_layout=True)
label = ['Benchmark sangat baik', 'Benchmark baik', 'Rumbela Live (gzip)', 'Rumbela Live (asli)']
val   = [100, 150, 407.8, 607.5]
warna4 = [BORDER, BORDER, ACCENT, DEEP]
bars = ax.barh(label, val, color=warna4, height=0.58)
for b, v in zip(bars, val):
    ax.text(b.get_width() + 8, b.get_y() + b.get_height()/2, f'{v:,.1f} KB'.replace(',', '.'),
            va='center', fontsize=11.5, fontweight='bold', color=TEXT)
ax.set_xlim(0, 720)
ax.set_xlabel('Ukuran transfer dokumen HTML (KB)', fontsize=11, color=MUTED)
ax.axvline(150, color=MUTED, linestyle='--', linewidth=1, alpha=0.5)
ax.text(158, 3.28, 'ambang batas "baik"', fontsize=9, color=MUTED)
style_ax(ax)
fig.savefig(f'{OUT}/chart_bobot.png', facecolor='white')
plt.close(fig)
print('chart_bobot.png OK')

# ================= 5. CHART ROADMAP GANTT =================
fig, ax = plt.subplots(figsize=(8.6, 3.4), dpi=150, constrained_layout=True)
fase = ['Fase 3 - Optimalisasi', 'Fase 2 - Fitur Utama', 'Fase 1 - Fondasi v2.0', 'Fase 0 - Quick Wins']
start = [10, 5, 2, 0]
dur   = [3, 6, 4, 2]
cols  = [BORDER, LUMEN, ACCENT, DEEP]
bars = ax.barh(fase, dur, left=start, height=0.55, color=cols)
for b, s, d in zip(bars, start, dur):
    ax.text(b.get_width() + s + 0.12, b.get_y() + b.get_height()/2, f'{d} minggu',
            va='center', fontsize=10.5, color=TEXT, fontweight='bold')
ax.set_xlim(0, 14.5)
ax.set_xticks(range(0, 15, 2))
ax.set_xlabel('Minggu ke-', fontsize=11, color=MUTED)
ax.grid(axis='x', linestyle='--', linewidth=0.5, alpha=0.2, color=MUTED)
ax.set_axisbelow(True)
style_ax(ax)
fig.savefig(f'{OUT}/chart_roadmap.png', facecolor='white')
plt.close(fig)
print('chart_roadmap.png OK')

print('\nSEMUA ASET SELESAI ->', OUT)
