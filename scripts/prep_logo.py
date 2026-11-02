"""Proses logo Rumbela menjadi aset web: full, round, favicon, apple-icon."""
from PIL import Image, ImageDraw, ImageOps
import os

SRC = "/home/z/my-project/upload/photo_6269233281324750500_y.jpg"
PUBLIC = "/home/z/my-project/public"
APP = "/home/z/my-project/src/app"
os.makedirs(PUBLIC, exist_ok=True)

img = Image.open(SRC).convert("RGB")
W, H = img.size
print("source:", W, "x", H)

# 1) Logo penuh (dipakai di login & header laporan) - PNG 900px
full = img.copy()
full.thumbnail((900, 900), Image.LANCZOS)
full.save(f"{PUBLIC}/logo.png", optimize=True)

# 2) Logo bulat (avatar header) - fokus ke karakter + rumah, potong teks
#    berdasarkan proporsi: pusat (0.50, 0.34), radius 0.31*W
def circular(src, cx, cy, r, out, size=512):
    frac = r * 2 * src.width
    box = (int(cx * src.width - frac / 2), int(cy * src.height - frac / 2),
           int(cx * src.width + frac / 2), int(cy * src.height + frac / 2))
    crop = src.crop(box).resize((size * 4, size * 4), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    crop.putalpha(mask)
    crop = crop.resize((size, size), Image.LANCZOS)
    crop.save(out, optimize=True)
    return crop

circular(img, 0.50, 0.34, 0.315, f"{PUBLIC}/logo-round.png", 512)

# 3) Ikon rounded-square (favicon & apple) - latar putih, sudut membulat
def rounded(src, out, size, radius_frac=0.22):
    frac = 0.66 * src.width  # crop persegi bagian karakter
    box = (int(0.50 * src.width - frac / 2), int(0.34 * src.height - frac / 2),
           int(0.50 * src.width + frac / 2), int(0.34 * src.height + frac / 2))
    crop = src.crop(box).resize((size * 4, size * 4), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (size * 4, size * 4), 0)
    d = ImageDraw.Draw(mask)
    rad = int(radius_frac * size * 4)
    d.rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=rad, fill=255)
    crop.putalpha(mask)
    crop = crop.resize((size, size), Image.LANCZOS)
    crop.save(out, optimize=True)

rounded(img, f"{APP}/icon.png", 512)
rounded(img, f"{APP}/apple-icon.png", 180)

# 4) Mini 64px untuk header kalau butuh
ImageOps.fit(img, (64, 64), Image.LANCZOS).save(f"{PUBLIC}/logo-64.jpg", quality=85)

for p in [f"{PUBLIC}/logo.png", f"{PUBLIC}/logo-round.png", f"{APP}/icon.png", f"{APP}/apple-icon.png"]:
    print(p, os.path.getsize(p) // 1024, "KB")
print("OK")
