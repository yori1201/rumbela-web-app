"""Optimasi aset logo: WebP untuk UI, PNG kecil untuk ikon."""
from PIL import Image, ImageDraw
import os

SRC = "/home/z/my-project/upload/photo_6269233281324750500_y.jpg"
PUBLIC = "/home/z/my-project/public"
APP = "/home/z/my-project/src/app"
img = Image.open(SRC).convert("RGB")

def crop_frac(fx, fy, fr):
    frac = fr * img.width
    box = (int(fx * img.width - frac / 2), int(fy * img.height - frac / 2),
           int(fx * img.width + frac / 2), int(fy * img.height + frac / 2))
    return img.crop(box)

# Logo penuh utk login & laporan (WebP 720px)
full = img.copy(); full.thumbnail((720, 720), Image.LANCZOS)
full.save(f"{PUBLIC}/logo.webp", quality=88, method=6)

# Bulat utk header (WebP 256px)
r = crop_frac(0.50, 0.34, 0.63).resize((1024, 1024), Image.LANCZOS)
mask = Image.new("L", (1024, 1024), 0)
ImageDraw.Draw(mask).ellipse((0, 0, 1023, 1023), fill=255)
r.putalpha(mask)
r.save(f"{PUBLIC}/logo-round.webp", quality=88, method=6)

# Ikon PNG kecil (favicon/apple) - quantize biar ringan
sq = crop_frac(0.50, 0.34, 0.66)
def rounded_png(size, out, rad=0.22):
    c = sq.resize((size * 3, size * 3), Image.LANCZOS).convert("RGBA")
    m = Image.new("L", (size * 3, size * 3), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size * 3 - 1, size * 3 - 1), radius=int(rad * size * 3), fill=255)
    c.putalpha(m)
    c = c.resize((size, size), Image.LANCZOS)
    c.quantize(colors=256, method=Image.FASTOCTREE).save(out, optimize=True)
rounded_png(256, f"{APP}/icon.png")
rounded_png(180, f"{APP}/apple-icon.png")

# Bersihkan PNG besar lama
for old in [f"{PUBLIC}/logo.png", f"{PUBLIC}/logo-round.png", f"{PUBLIC}/logo-64.jpg"]:
    if os.path.exists(old): os.remove(old)

for p in [f"{PUBLIC}/logo.webp", f"{PUBLIC}/logo-round.webp", f"{APP}/icon.png", f"{APP}/apple-icon.png"]:
    print(os.path.basename(p), os.path.getsize(p) // 1024, "KB")
print("OK")
