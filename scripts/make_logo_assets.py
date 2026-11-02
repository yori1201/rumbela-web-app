#!/usr/bin/env python3
"""Rekonstruksi logo Rumbela TRANSPARAN:
- RGB dari PNG berwarna (embed #2), alpha dari luminance siluet putih (embed #1)
  — persis seperti filter <mask> pada SVG aslinya.
Aset output:
- public/logo.webp        logo penuh transparan (~1000px)
- public/logo-round.webp  emblem rumah+tunas persegi (avatar/kanvas)
- src/app/icon.png 512px, src/app/apple-icon.png 180px
- public/logo-white.webp  siluet putih transparan (latar gelap)
"""
from PIL import Image
import os

UP = "/home/z/my-project/upload"
PUB = "/home/z/my-project/rumbela-web-app/public"
APP = "/home/z/my-project/rumbela-web-app/src/app"

color = Image.open(f"{UP}/_extracted_1.png").convert("RGB")
white = Image.open(f"{UP}/_extracted_0.png").convert("RGB")

# alpha dari luminance siluet (id file: 451097ad97 -> 0.2126R+0.7152G+0.0722B)
gray = white.convert("L")
# kontras: buang noise hitam, penuhi putih
lut = [0 if v < 16 else min(255, int((v - 16) * 255 / (250 - 16))) for v in range(256)]
alpha = gray.point(lut)

rgba = color.copy()
rgba.putalpha(alpha)

# simpan versi penuh transparan
def trim(img, pad_ratio=0.012):
    bbox = img.getchannel("A").getbbox()
    img2 = img.crop(bbox)
    pad = int(max(img2.size) * pad_ratio)
    out = Image.new("RGBA", (img2.width + pad*2, img2.height + pad*2), (0, 0, 0, 0))
    out.paste(img2, (pad, pad), img2)
    return out

full = trim(rgba)
s = 1000 / max(full.size)
if s < 1:
    full = full.resize((round(full.width*s), round(full.height*s)), Image.LANCZOS)
full.save(f"{PUB}/logo.webp", "WEBP", quality=93)
print("logo.webp:", full.size, os.path.getsize(f"{PUB}/logo.webp"))

# siluet putih transparan
wrgba = Image.new("RGBA", white.size, (255, 255, 255, 0))
wrgba.putalpha(alpha)
wfull = trim(wrgba)
s = 1000 / max(wfull.size)
if s < 1:
    wfull = wfull.resize((round(wfull.width*s), round(wfull.height*s)), Image.LANCZOS)
wfull.save(f"{PUB}/logo-white.webp", "WEBP", quality=93)
print("logo-white.webp:", wfull.size, os.path.getsize(f"{PUB}/logo-white.webp"))

# --- cari batas bawah rumah: baris pertama >=55% tinggi yang kosong di pita tengah ---
A = full.getchannel("A")
W, H = full.size
px = A.load()
def rowcnt(y, x0, x1): return sum(1 for x in range(x0, x1, 4) if px[x, y] > 30)
y_house = None
for y in range(int(H*0.5), H):
    if rowcnt(y, int(W*0.28), int(W*0.72)) == 0:
        y_house = y
        break
print("y_house_bottom:", y_house, "=", round((y_house or 0)/H, 3), "dari", H)
# cek apakah huruf R menembus area itu di kiri
print("alpha kiri di y_house-8:", rowcnt(max(0,(y_house or 0)-8), int(W*0.10), int(W*0.30)))

x0, y0, x1, y1 = full.getchannel("A").getbbox()
y_cut = y_house or int(H*0.64)
emblem = full.crop((x0, y0, x1, y_cut))
ew, eh = emblem.size
side = max(ew, eh)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(emblem, ((side-ew)//2, (side-eh)//2), emblem)
sq = trim(sq, 0.02)
print("emblem:", sq.size)

def resize_max(img, m):
    s = m / max(img.size)
    return img.resize((round(img.width*s), round(img.height*s)), Image.LANCZOS) if s < 1 else img

resize_max(sq, 640).save(f"{PUB}/logo-round.webp", "WEBP", quality=93)
sq.resize((512, 512), Image.LANCZOS).save(f"{APP}/icon.png", "PNG")
sq.resize((180, 180), Image.LANCZOS).save(f"{APP}/apple-icon.png", "PNG")
print("sizes:", os.path.getsize(f"{PUB}/logo-round.webp"), os.path.getsize(f"{APP}/icon.png"), os.path.getsize(f"{APP}/apple-icon.png"))

# preview: emblem + full di atas krem DAN di atas gelap
prev = Image.new("RGB", (1100, 340), (253, 248, 243))
dark = Image.new("RGB", (520, 340), (30, 41, 59))
prev.paste(dark, (0, 0))
e = sq.copy(); e.thumbnail((300, 300))
f = full.copy(); f.thumbnail((300, 300))
fw = wfull.copy(); fw.thumbnail((300, 300))
tmp = Image.new("RGBA", prev.size, (0, 0, 0, 0))
tmp.paste(e, (20, 20), e); tmp.paste(f, (360, 20), f); tmp.paste(fw, (700, 20), fw)
prev.paste(tmp, (0, 0), tmp)
prev.save(f"{UP}/_logo_preview2.jpg", "JPEG", quality=88)
print("preview2 saved")
