"use client";

/* Renderer Worksheet Rumbela → gambar PNG via <canvas>.
   Layout warna-warni ramah anak sesuai referensi: latar langit biru muda,
   banner judul biru + pil kuning, kotak identitas, kartu seksi pastel
   (A/B/C…) dengan badge, hiasan bintang & awan, serta pita footer
   "Belajar di Rumbela, Yuk!". Tinggi dinamis (min. rasio A4).
   Pemakaian ganda: pratinjau HTML di soal.tsx memakai palet yang sama. */

import type { Pengaturan, Worksheet, WorksheetQ } from "./types";
import {
  LETTERS, SECTION_PALETTE, WS, answerOf, groupSections, isEquationLike, sectionLetter, shuffledOrder,
} from "./worksheetTheme";

const W = 1000;
const PAD = 64;
const CW = W - PAD * 2;

let FF_CACHE = "";
/** keluarga font aktual dokumen (hasil next/font) agar canvas sama dengan layar */
function ff(): string {
  if (!FF_CACHE) {
    FF_CACHE =
      getComputedStyle(document.body).fontFamily ||
      "'Nunito', ui-sans-serif, system-ui, sans-serif";
  }
  return FF_CACHE;
}
const font = (weight: number, size: number): string => `${weight} ${size}px ${ff()}`;

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/logo.webp";
  });
}

/* ---------- primitif gambar ---------- */

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function box(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
  o: { fill?: string | CanvasGradient; stroke?: string; lw?: number; dash?: number[] }
) {
  rr(ctx, x, y, w, h, r);
  if (o.fill) {
    ctx.fillStyle = o.fill;
    ctx.fill();
  }
  if (o.stroke) {
    ctx.save();
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.lw ?? 2;
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.stroke();
    ctx.restore();
  }
}

function grad(ctx: CanvasRenderingContext2D, x: number, w: number, c: readonly [string, string] | string[]) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, c[0]);
  g.addColorStop(1, c[1]);
  return g;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width <= maxWidth) cur = test;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function dotted(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color = "#8FB3D9") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([3, 7]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

/** bintang 5 titik */
function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, rot = -Math.PI / 2) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = rot + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** awan: gabungan lingkaran putih */
function cloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, alpha = 0.85) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = WS.cloud;
  ctx.beginPath();
  ctx.arc(cx, cy, 20 * s, 0, Math.PI * 2);
  ctx.arc(cx + 24 * s, cy + 4 * s, 15 * s, 0, Math.PI * 2);
  ctx.arc(cx - 24 * s, cy + 5 * s, 14 * s, 0, Math.PI * 2);
  ctx.arc(cx + 6 * s, cy - 10 * s, 14 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** hati kecil */
function heart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.4, cy - s * 0.2, cx - s * 0.6, cy - s, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.6, cy - s, cx + s * 1.4, cy - s * 0.2, cx, cy + s * 0.9);
  ctx.fill();
  ctx.restore();
}

/* ---------- tinggi ruang per jenis soal (untuk estimasi & gambar) ---------- */

/** tinggi satu soal dalam kartu seksi (lebar teks sudah diketahui) */
function questionH(ctx: CanvasRenderingContext2D, q: WorksheetQ, textW: number): number {
  ctx.font = font(600, 20);
  const lines = wrapLines(ctx, q.text, textW);
  let h = 14 + lines.length * 29;
  if (q.kind === "pg" && q.options?.length) {
    const twoCol = q.options.every((o) => ctx.measureText(o).width < textW / 2 - 46);
    h += 16 + Math.ceil(q.options.length / (twoCol ? 2 : 1)) * 44;
  } else if (q.kind === "uraian") {
    h += 3 * 38;
  } else if (q.kind === "jodoh") {
    h += 24 + (q.pairs?.length ?? 0) * 54;
  } else if (q.kind === "urut") {
    const words = q.words?.length ?? 0;
    h += 76 + Math.max(1, Math.ceil((words * 96) / textW)) * 52;
  } else if (lines.length === 1 && isEquationLike(q)) {
    h += 18;
  } else {
    h += 44;
  }
  return h + 18;
}

/* ---------- elemen lembar ---------- */

function header(
  ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, ws: Worksheet, jenis: "soal" | "kunci"
): number {
  // logo kiri
  if (logo) {
    const lw = 148;
    ctx.drawImage(logo, PAD, 44, lw, lw * 0.919);
  }

  const bx = PAD + 168;
  const bw = 508;
  // banner judul
  const by = 46, bh = 96;
  box(ctx, bx, by, bw, bh, 20, { fill: grad(ctx, bx, bw, jenis === "kunci" ? WS.bannerKunciGrad : WS.bannerGrad) });
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = font(800, 15);
  ctx.fillText(
    `${jenis === "kunci" ? "KUNCI JAWABAN" : "WORKSHEET"} · ${(ws.mapel || "—").toUpperCase()}`,
    bx + bw / 2, by + 30
  );
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(900, 30);
  const judul = ws.topik || "Latihan";
  ctx.fillText(judul.length > 34 ? judul.slice(0, 33) + "…" : judul, bx + bw / 2, by + 66);

  // pil kuning meta
  const meta = [
    ws.jenjang, ws.kelas ? `Kelas ${ws.kelas}` : "", `${ws.questions.length} soal`,
  ].filter(Boolean).join("  ·  ");
  ctx.font = font(800, 17);
  const pw = Math.min(bw, ctx.measureText(meta).width + 44);
  const py = by + bh + 12;
  box(ctx, bx + (bw - pw) / 2, py, pw, 34, 17, { fill: WS.pillYellow });
  ctx.fillStyle = WS.pillYellowInk;
  ctx.fillText(meta, bx + bw / 2, py + 23);

  // balon sapaan kanan
  const sbx = W - PAD - 186, sby = 52, sbw = 186, sbh = 96;
  box(ctx, sbx, sby, sbw, sbh, 14, { fill: "#FFFFFF", stroke: "#F2A0BE", lw: 2.5 });
  // ekor balon
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#F2A0BE";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(sbx + 26, sby + sbh - 1);
  ctx.lineTo(sbx + 40, sby + sbh + 14);
  ctx.lineTo(sbx + 52, sby + sbh - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(sbx + 28, sby + sbh);
  ctx.lineTo(sbx + 50, sby + sbh);
  ctx.stroke();
  ctx.restore();
  star(ctx, sbx + sbw - 26, sby + 24, 11, WS.star);
  ctx.fillStyle = "#EC5F94";
  ctx.font = font(800, 15);
  const sapaan = jenis === "kunci" ? "Khusus tutor — jangan dibocorkan, ya!" : "Ayo, kerjakan dengan teliti, ya!";
  wrapLines(ctx, sapaan, sbw - 34).forEach((ln, i) => ctx.fillText(ln, sbx + sbw / 2, sby + 44 + i * 22));
  ctx.textAlign = "left";

  return py + 34 + 26;
}

function identitas(ctx: CanvasRenderingContext2D, y: number): number {
  const h = 112;
  box(ctx, PAD, y, CW, h, 16, { fill: WS.idBoxBg, stroke: WS.idBoxBorder, lw: 3 });
  ctx.font = font(800, 19);
  ctx.fillStyle = WS.ink;
  const rows: [string, string, string][] = [
    ["Nama Anak :", "Kelas :", "left"],
    ["Tanggal :", "Nilai :", "left"],
  ];
  const colW = CW / 2;
  rows.forEach((r, ri) => {
    const ry = y + 34 + ri * 46;
    [0, 1].forEach((c) => {
      const cx = PAD + 26 + c * colW;
      ctx.fillText(r[c], cx, ry);
      const labelW = ctx.measureText(r[c]).width;
      dotted(ctx, cx + labelW + 10, cx + colW - 40, ry - 6);
    });
  });
  return y + h + 22;
}

function petunjukBox(ctx: CanvasRenderingContext2D, y: number, teks: string): number {
  ctx.font = font(600, 17);
  const lines = wrapLines(ctx, teks, CW - 86);
  const h = lines.length * 25 + 24;
  box(ctx, PAD, y, CW, h, 12, { fill: WS.petunjukBg, stroke: WS.petunjukBorder, lw: 2 });
  star(ctx, PAD + 30, y + h / 2, 12, "#F2B84B");
  ctx.fillStyle = WS.petunjukInk;
  lines.forEach((ln, i) => ctx.fillText(ln, PAD + 54, y + 27 + i * 25));
  return y + h + 24;
}

function footerRibbon(ctx: CanvasRenderingContext2D, y: number, kunci: boolean): number {
  const teks = kunci ? "Kunci tersimpan, jangan lupa beri semangat!" : "Belajar di Rumbela, Yuk!";
  ctx.font = font(900, 25);
  const tw = ctx.measureText(teks).width;
  const rw = tw + 150;
  const rx = (W - rw) / 2;
  box(ctx, rx, y, rw, 58, 29, { fill: grad(ctx, rx, rw, WS.footerGrad) });
  heart(ctx, rx + 34, y + 29, 13, WS.star);
  heart(ctx, rx + rw - 34, y + 29, 13, WS.star);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillText(teks, W / 2, y + 38);
  ctx.font = font(500, 15);
  ctx.fillStyle = WS.mut;
  ctx.fillText(
    `Rumbela — Rumah Belajar Anak · Curup · ${new Date().getFullYear()}`,
    W / 2, y + 88
  );
  ctx.textAlign = "left";
  return y + 122;
}

/** satu kartu seksi; mengembalikan y bawah kartu */
function sectionCard(
  ctx: CanvasRenderingContext2D, y: number, si: number, label: string, qs: WorksheetQ[]
): number {
  const pal = SECTION_PALETTE[si % SECTION_PALETTE.length];
  // estimasi tinggi
  const textW = CW - 44 - 46;
  let inner = 46;
  qs.forEach((q) => (inner += questionH(ctx, q, textW)));
  const h = inner + 14;

  // kartu
  box(ctx, PAD, y, CW, h, 22, { fill: pal.bg, stroke: pal.border, lw: 3 });

  // badge pil menimpa border atas
  ctx.font = font(900, 20);
  const teks = `${sectionLetter(si)}. ${label}`;
  const tw = ctx.measureText(teks).width;
  const pw = tw + 74;
  const py = y - 21;
  box(ctx, PAD + 18, py, pw, 42, 21, { fill: pal.badge });
  ctx.beginPath();
  ctx.arc(PAD + 18 + 25, py + 21, 15, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.fillStyle = pal.badge;
  ctx.font = font(900, 19);
  ctx.textAlign = "center";
  ctx.fillText(sectionLetter(si), PAD + 18 + 25, py + 28);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(900, 20);
  ctx.textAlign = "left";
  ctx.fillText(teks, PAD + 18 + 48, py + 28);

  // soal-soal
  let qy = y + 56;
  qs.forEach((q, qi) => {
    qy = question(ctx, qy, q, qi, pal, textW);
  });
  return y + h;
}

/** satu soal; mengembalikan y bawah */
function question(
  ctx: CanvasRenderingContext2D, y: number, q: WorksheetQ, no: number, pal: (typeof SECTION_PALETTE)[number], textW: number
): number {
  const x0 = PAD + 22 + 46; // tepi kartu + lingkaran nomor
  // lingkaran nomor
  ctx.beginPath();
  ctx.arc(PAD + 22 + 16, y + 15, 16, 0, Math.PI * 2);
  ctx.fillStyle = pal.badge;
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(800, 16);
  ctx.textAlign = "center";
  ctx.fillText(String(no + 1), PAD + 22 + 16, y + 21);
  ctx.textAlign = "left";

  ctx.font = font(600, 20);
  ctx.fillStyle = WS.ink;
  const lines = wrapLines(ctx, q.text, textW);
  lines.forEach((ln, li) => ctx.fillText(ln, x0, y + 22 + li * 29));
  let cy = y + 14 + lines.length * 29;

  if (q.kind === "pg" && q.options?.length) {
    const twoCol = q.options.every((o) => ctx.measureText(o).width < textW / 2 - 46);
    const colW = (textW - 10) / 2;
    q.options.slice(0, 4).forEach((opt, oi) => {
      const ox = twoCol ? x0 + (oi % 2) * (colW + 10) : x0;
      const oy = cy + 8 + Math.floor(oi / (twoCol ? 2 : 1)) * 44;
      ctx.font = font(600, 18);
      const ow = Math.max(200, Math.min(textW, ctx.measureText(opt).width + 64));
      box(ctx, ox, oy, twoCol ? colW : ow, 36, 10, {
        fill: pal.chip, stroke: pal.border, lw: 1.6,
      });
      ctx.beginPath();
      ctx.arc(ox + 20, oy + 18, 11, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.strokeStyle = pal.badge;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = pal.badge;
      ctx.font = font(800, 13);
      ctx.textAlign = "center";
      ctx.fillText(LETTERS[oi], ox + 20, oy + 23);
      ctx.textAlign = "left";
      ctx.fillStyle = WS.ink;
      ctx.font = font(600, 18);
      ctx.fillText(opt, ox + 38, oy + 25);
    });
    cy += 12 + Math.ceil(q.options.length / (twoCol ? 2 : 1)) * 44;
  } else if (q.kind === "uraian") {
    for (let i = 0; i < 3; i++) dotted(ctx, x0, PAD + CW - 22, cy + 24 + i * 38);
    cy += 3 * 38;
  } else if (q.kind === "jodoh" && q.pairs?.length) {
    const n = q.pairs.length;
    const colW = (textW - 56) / 2;
    const order = shuffledOrder(n, q.id);
    for (let i = 0; i < n; i++) {
      const ly = cy + 8 + i * 54;
      // kiri: nomor
      box(ctx, x0, ly, colW, 42, 10, { fill: pal.chip, stroke: pal.border, lw: 1.6 });
      ctx.fillStyle = pal.badge;
      ctx.font = font(800, 16);
      ctx.fillText(`${i + 1}.`, x0 + 12, ly + 27);
      ctx.fillStyle = WS.ink;
      ctx.font = font(600, 17);
      const lns = wrapLines(ctx, q.pairs[i][0], colW - 64);
      ctx.fillText(lns[0], x0 + 34, ly + 27);
      // kanan: huruf (urutan acak deterministik)
      const rx = x0 + colW + 56;
      box(ctx, rx, ly, colW - 34, 42, 10, { fill: pal.chip, stroke: pal.border, lw: 1.6 });
      const huruf = LETTERS[order.indexOf(i)];
      ctx.fillStyle = pal.badge;
      ctx.font = font(800, 16);
      ctx.fillText(`${huruf}.`, rx + 12, ly + 27);
      ctx.fillStyle = WS.ink;
      ctx.font = font(600, 17);
      const rlns = wrapLines(ctx, q.pairs[i][1], colW - 108);
      ctx.fillText(rlns[0], rx + 34, ly + 27);
      // lingkaran jawaban di ujung kanan
      ctx.beginPath();
      ctx.arc(rx + colW - 52, ly + 21, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.save();
      ctx.strokeStyle = pal.badge;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.restore();
    }
    cy += 16 + n * 54;
  } else if (q.kind === "urut" && q.words?.length) {
    ctx.font = font(700, 18);
    let wx = x0, wy = cy + 10;
    const rowH = 42;
    q.words.forEach((wd) => {
      const wwd = ctx.measureText(wd).width + 30;
      if (wx + wwd > PAD + CW - 22) {
        wx = x0;
        wy += rowH + 10;
      }
      box(ctx, wx, wy, wwd, rowH, 10, { fill: pal.chip, stroke: pal.border, lw: 1.8 });
      ctx.fillStyle = WS.ink;
      ctx.fillText(wd, wx + 15, wy + 28);
      wx += wwd + 10;
    });
    cy = wy + rowH + 24;
    dotted(ctx, x0, PAD + CW - 22, cy + 18);
    cy += 34;
  } else if (lines.length === 1 && isEquationLike(q)) {
    // kotak jawaban sebaris setelah soal
    const lastW = ctx.measureText(lines[0]).width;
    let bx = x0 + lastW + 14;
    if (bx + 132 > PAD + CW - 22) bx = x0;
    box(ctx, bx, y + 2, 132, 36, 10, { fill: "#FFFFFF", stroke: WS.idBoxBorder, lw: 2.2, dash: [6, 5] });
    cy += 8;
  } else {
    dotted(ctx, x0, PAD + CW - 22, cy + 26);
    cy += 40;
  }
  return cy + 18;
}

/** kartu seksi kunci jawaban */
function kunciSection(ctx: CanvasRenderingContext2D, y: number, si: number, label: string, qs: WorksheetQ[]): number {
  const pal = SECTION_PALETTE[si % SECTION_PALETTE.length];
  ctx.font = font(900, 20);
  const teks = `${sectionLetter(si)}. ${label}`;
  const tw = ctx.measureText(teks).width;
  const pw = tw + 74;
  box(ctx, PAD, y, pw, 42, 21, { fill: pal.badge });
  ctx.beginPath();
  ctx.arc(PAD + 25 + 18, y + 21, 15, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.fillStyle = pal.badge;
  ctx.font = font(900, 19);
  ctx.textAlign = "center";
  ctx.fillText(sectionLetter(si), PAD + 25 + 18, y + 28);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(900, 20);
  ctx.textAlign = "left";
  ctx.fillText(teks, PAD + 25 + 41, y + 28);

  const colW = (CW - 30) / 2;
  let yy = y + 66;
  let col = 0;
  ctx.font = font(700, 19);
  qs.forEach((q, i) => {
    if (col === 1) {
      const lines = wrapLines(ctx, answerOf(q), colW - 60);
      const x = PAD + colW + 30;
      ctx.fillStyle = pal.badge;
      ctx.fillText(`${i + 1}.`, x, yy);
      ctx.fillStyle = WS.ink;
      lines.forEach((ln, li) => ctx.fillText(ln, x + 36, yy + li * 26));
      if (lines.length > 1) yy += (lines.length - 1) * 26;
      col = 0;
      yy += 38;
    } else {
      const lines = wrapLines(ctx, answerOf(q), colW - 60);
      const x = PAD + 4;
      ctx.fillStyle = pal.badge;
      ctx.fillText(`${i + 1}.`, x, yy);
      ctx.fillStyle = WS.ink;
      lines.forEach((ln, li) => ctx.fillText(ln, x + 36, yy + li * 26));
      if (lines.length > 1) yy += (lines.length - 1) * 26;
      col = 1;
    }
  });
  if (col === 1) yy += 38;
  return yy + 8;
}

/* ---------- hiasan latar ---------- */

function decorAtas(ctx: CanvasRenderingContext2D, kunci: boolean) {
  cloud(ctx, 90, 200, 1.15, 0.7);
  cloud(ctx, W - 80, 250, 0.9, 0.6);
  star(ctx, 60, 120, 13, WS.star, -0.4);
  star(ctx, W - 52, 150, 11, WS.star, 0.5);
  star(ctx, W - 110, 92, 8, kunci ? "#8CD4AC" : "#F2A0BE", 0.2);
  star(ctx, 150, 60, 8, kunci ? "#8CD4AC" : "#F2A0BE", 0.9);
}

function decorBawah(ctx: CanvasRenderingContext2D, H: number) {
  // rumput bergelombang di tepi paling bawah
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#BFE6C8";
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, H - 20);
  for (let x = 0; x <= W; x += 50) {
    ctx.quadraticCurveTo(x + 25, H - 38, x + 50, H - 20);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  star(ctx, 70, H - 90, 10, WS.star, 0.3);
  star(ctx, W - 66, H - 80, 12, WS.star, -0.6);
  // konfeti titik
  const dots: [number, number, string][] = [
    [40, H - 140, "#F2A0BE"], [W - 44, H - 130, "#7CC4EF"], [120, H - 60, "#F2C84B"], [W - 130, H - 55, "#B7A3EE"],
  ];
  dots.forEach(([x, y, c]) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });
}

/* ---------- orkestrasi ---------- */

function paint(
  ctx: CanvasRenderingContext2D, ws: Worksheet, jenis: "soal" | "kunci", logo: HTMLImageElement | null
): number {
  const kunci = jenis === "kunci";
  // latar
  ctx.fillStyle = kunci ? WS.kunciBg : WS.pageBg;
  ctx.fillRect(0, 0, W, 40000);
  decorAtas(ctx, kunci);

  const sections = groupSections(ws);
  let y = header(ctx, logo, ws, jenis);

  if (!kunci) {
    y = identitas(ctx, y);
    if (ws.petunjuk?.trim()) y = petunjukBox(ctx, y, ws.petunjuk.trim());
    else y += 6;
    y += 22;
    sections.forEach((s, i) => {
      y = sectionCard(ctx, y + 26, i, s.label, s.questions) + 6;
    });
  } else {
    y += 18;
    sections.forEach((s, i) => {
      y = kunciSection(ctx, y + 20, i, s.label, s.questions) + 6;
    });
  }

  return footerRibbon(ctx, y + 26, kunci);
}

export async function renderWorksheetCanvas(
  ws: Worksheet,
  _pengaturan: Pengaturan,
  jenis: "soal" | "kunci"
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const logo = await loadLogo();

  // pass 1: ukur tinggi pada canvas sementara
  const meas = document.createElement("canvas").getContext("2d")!;
  const bottom = paint(meas, ws, jenis, logo);

  const H = Math.max(1414, Math.ceil(bottom + 10));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  paint(ctx, ws, jenis, logo);
  decorBawah(ctx, H);
  return canvas;
}

export function slugify(s: string): string {
  return (s || "worksheet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "worksheet";
}
