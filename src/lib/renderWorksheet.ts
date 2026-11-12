"use client";

/* Renderer Worksheet Rumbela → gambar PNG via <canvas>.
   Lembar PUTIH POLOS: kartu seksi putih bergaris tipis netral, judul seksi
   & nomor soal teks polos; soal tersusun 2 kolom (no. 2 di kanan no. 1,
   no. 3 di bawah no. 1, dst.; soal lebar memakai baris penuh). Banner
   judul, pil meta, dan pita footer tetap sebagai identitas. Tinggi
   dinamis (min. rasio A4). Pemakaian ganda: pratinjau HTML di soal.tsx
   memakai palet yang sama. */

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

function dotted(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color = "#A8B7CB") {
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

/** tinggi konten bersusun: 2 baris angka + garis + kotak jawaban */
const BERSUSUN_TINGGI = 122;

/** gambar hitungan bersusun (a di atas, b di bawah, op di kiri, garis,
 *  kotak jawaban); x = tepi kiri soal, w = lebar kolom;
 *  mengembalikan cy bawah konten */
function gambarBersusun(
  ctx: CanvasRenderingContext2D, x: number, cy: number, q: WorksheetQ, w: number
): number {
  const b = q.bersusun!;
  const x0 = x + 36;
  ctx.font = font(800, 26);
  const wA = ctx.measureText(b.a).width;
  const wB = ctx.measureText(b.b).width;
  const opW = ctx.measureText(b.op).width + 12;
  const numW = Math.max(wA, wB);
  const kanan = Math.min(x0 + numW + opW + 30, x + w - 6);
  ctx.fillStyle = WS.ink;
  ctx.textAlign = "right";
  ctx.fillText(b.a, kanan, cy + 26);
  ctx.fillText(b.b, kanan, cy + 62);
  ctx.fillText(b.op, kanan - numW - 12, cy + 62);
  ctx.textAlign = "left";
  // garis penghubung
  ctx.strokeStyle = WS.ink;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(kanan - numW - opW - 8, cy + 74);
  ctx.lineTo(kanan + 6, cy + 74);
  ctx.stroke();
  // kotak jawaban putus-putus di bawah garis (tidak melewati tepi kiri soal)
  const bx = Math.max(x, kanan - 132);
  box(ctx, bx, cy + 86, 132, 36, 10, { fill: "#FFFFFF", stroke: WS.idBoxBorder, lw: 2.2, dash: [6, 5] });
  return cy + BERSUSUN_TINGGI;
}

/** tinggi satu soal dalam kartu seksi (lebar teks sudah diketahui) */
function questionH(ctx: CanvasRenderingContext2D, q: WorksheetQ, textW: number): number {
  ctx.font = font(600, 20);
  const lines = q.bersusun ? [] : wrapLines(ctx, q.text, textW);
  let h = 14 + lines.length * 29;
  if (q.bersusun) {
    h += BERSUSUN_TINGGI;
  } else if (q.kind === "pg" && q.options?.length) {
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
  box(ctx, PAD, y, CW, h, 16, { fill: WS.idBoxBg, stroke: WS.idBoxBorder, lw: 2.5 });
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
  const lines = wrapLines(ctx, teks, CW - 48);
  const h = lines.length * 25 + 24;
  box(ctx, PAD, y, CW, h, 12, { fill: WS.petunjukBg, stroke: WS.petunjukBorder, lw: 1.8 });
  ctx.fillStyle = WS.petunjukInk;
  lines.forEach((ln, i) => ctx.fillText(ln, PAD + 22, y + 27 + i * 25));
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

/** kelompokkan soal ke baris 2 kolom: soal sempit (bersusun / hitungan
 *  pendek) berdua per baris — no. 2 di kanan no. 1, no. 3 di bawah no. 1;
 *  soal lebar (pg, menjodohkan, uraian, susun kata) memakai baris penuh */
interface LItem { q: WorksheetQ; no: number }
function layoutRows(qs: WorksheetQ[]): { items: LItem[]; wide: boolean }[] {
  const rows: { items: LItem[]; wide: boolean }[] = [];
  let cur: LItem[] = [];
  const flush = () => {
    if (cur.length) {
      rows.push({ items: cur, wide: false });
      cur = [];
    }
  };
  qs.forEach((q, i) => {
    if (q.bersusun || isEquationLike(q)) {
      cur.push({ q, no: i + 1 });
      if (cur.length === 2) flush();
    } else {
      flush();
      rows.push({ items: [{ q, no: i + 1 }], wide: true });
    }
  });
  flush();
  return rows;
}

/** satu kartu seksi putih polos, soal 2 kolom; mengembalikan y bawah kartu */
function sectionCard(
  ctx: CanvasRenderingContext2D, y: number, si: number, label: string, qs: WorksheetQ[]
): number {
  const pal = SECTION_PALETTE[si % SECTION_PALETTE.length];
  const inX = PAD + 22;
  const inW = CW - 44;
  const gapX = 34;
  const colW = Math.floor((inW - gapX) / 2);
  const rowGap = 24;
  const rows = layoutRows(qs);

  // estimasi tinggi (conservative, harus ≥ tinggi gambar aktual)
  let inner = 54;
  rows.forEach((r) => {
    const w = r.wide ? inW : colW;
    let h = 0;
    r.items.forEach((it) => (h = Math.max(h, questionH(ctx, it.q, w - 36))));
    inner += h + rowGap;
  });
  const h = inner;

  // kartu putih polos bergaris tipis
  box(ctx, PAD, y, CW, h, 16, { fill: pal.bg, stroke: pal.border, lw: 1.6 });

  // judul seksi teks polos
  ctx.font = font(900, 21);
  ctx.fillStyle = WS.ink;
  ctx.fillText(`${sectionLetter(si)}. ${label}`, inX, y + 37);

  // soal 2 kolom: kiri-kanan per baris
  let yy = y + 58;
  rows.forEach((r) => {
    let bottom = yy;
    r.items.forEach((it, ci) => {
      const cx = r.wide ? inX : inX + ci * (colW + gapX);
      const cw = r.wide ? inW : colW;
      bottom = Math.max(bottom, question(ctx, cx, yy, it.q, it.no, pal, cw));
    });
    yy = bottom + rowGap;
  });
  return y + h;
}

/** satu soal pada kolom selebar w mulai di x; mengembalikan y bawah */
function question(
  ctx: CanvasRenderingContext2D, x: number, y: number, q: WorksheetQ, no: number,
  pal: (typeof SECTION_PALETTE)[number], w: number
): number {
  const numW = 36;
  const x0 = x + numW;
  const right = x + w;
  const textW = w - numW;
  // nomor polos (tanpa lingkaran warna)
  ctx.font = font(800, 17);
  ctx.fillStyle = WS.ink;
  ctx.fillText(`${no}.`, x, y + 22);

  ctx.font = font(600, 20);
  ctx.fillStyle = WS.ink;
  const lines = q.bersusun ? [] : wrapLines(ctx, q.text, textW);
  lines.forEach((ln, li) => ctx.fillText(ln, x0, y + 22 + li * 29));
  let cy = y + 14 + lines.length * 29;

  if (q.bersusun) {
    cy = gambarBersusun(ctx, x, cy, q, w);
  } else if (q.kind === "pg" && q.options?.length) {
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
    for (let i = 0; i < 3; i++) dotted(ctx, x0, right, cy + 24 + i * 38);
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
      if (wx + wwd > right) {
        wx = x0;
        wy += rowH + 10;
      }
      box(ctx, wx, wy, wwd, rowH, 10, { fill: pal.chip, stroke: pal.border, lw: 1.8 });
      ctx.fillStyle = WS.ink;
      ctx.fillText(wd, wx + 15, wy + 28);
      wx += wwd + 10;
    });
    cy = wy + rowH + 24;
    dotted(ctx, x0, right, cy + 18);
    cy += 34;
  } else if (lines.length === 1 && isEquationLike(q)) {
    // kotak jawaban sebaris setelah soal
    const lastW = ctx.measureText(lines[0]).width;
    let bx = x0 + lastW + 14;
    if (bx + 132 > right) bx = x0;
    box(ctx, bx, y + 2, 132, 36, 10, { fill: "#FFFFFF", stroke: WS.idBoxBorder, lw: 2.2, dash: [6, 5] });
    cy += 8;
  } else {
    dotted(ctx, x0, right, cy + 26);
    cy += 40;
  }
  return cy + 18;
}

/** kartu seksi kunci jawaban (judul teks polos, jawaban 2 kolom) */
function kunciSection(ctx: CanvasRenderingContext2D, y: number, si: number, label: string, qs: WorksheetQ[]): number {
  const pal = SECTION_PALETTE[si % SECTION_PALETTE.length];
  ctx.font = font(900, 21);
  ctx.fillStyle = WS.ink;
  ctx.fillText(`${sectionLetter(si)}. ${label}`, PAD + 4, y + 22);

  const colW = (CW - 30) / 2;
  let yy = y + 58;
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

/* ---------- orkestrasi ---------- */

function paint(
  ctx: CanvasRenderingContext2D, ws: Worksheet, jenis: "soal" | "kunci", logo: HTMLImageElement | null
): number {
  const kunci = jenis === "kunci";
  // latar putih polos
  ctx.fillStyle = kunci ? WS.kunciBg : WS.pageBg;
  ctx.fillRect(0, 0, W, 40000);

  const sections = groupSections(ws);
  let y = header(ctx, logo, ws, jenis);

  if (!kunci) {
    y = identitas(ctx, y);
    if (ws.petunjuk?.trim()) y = petunjukBox(ctx, y, ws.petunjuk.trim());
    else y += 6;
    y += 22;
    sections.forEach((s, i) => {
      y = sectionCard(ctx, y + 22, i, s.label, s.questions) + 4;
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
  return canvas;
}

export function slugify(s: string): string {
  return (s || "worksheet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "worksheet";
}
