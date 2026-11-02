"use client";

/* Renderer Worksheet Rumbela → gambar PNG via <canvas>.
   Layout visual sesuai referensi brand: logo Rumbela penuh di kiri atas,
   halaman bersih minimal, footer tengah "Rumbela <tahun>".
   Tinggi dinamis (min. rasio A4). */

import { fmtDate, todayStr } from "./constants";
import type { Pengaturan, Worksheet, WorksheetQ } from "./types";

const W = 1000;
const PAD = 70;

const OR = "#ea580c"; // orange-600
const SKY = "#0284c7";
const INK = "#1e293b";
const MUT = "#94a3b8"; // slate-400
const BODY = "#64748b"; // slate-500
const LINE = "#94a3b8";

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/logo.webp";
  });
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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

function dotted(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  ctx.save();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([3, 7]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

/* Kop sesuai referensi: logo penuh kiri atas, tanggal kecil kanan atas */
function kop(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  tanggal: string
) {
  if (logo) {
    const lw = 235;
    const lh = lw * 0.92; // rasio logo.webp 1000×919
    ctx.drawImage(logo, PAD, 46, lw, lh);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = MUT;
  ctx.font = "500 17px Nunito";
  ctx.fillText(tanggal, W - PAD, 74);
  ctx.textAlign = "left";
}

/* Judul worksheet: kicker kecil + topik besar + meta */
function judul(
  ctx: CanvasRenderingContext2D,
  y: number,
  ws: Worksheet,
  kicker: string,
  sapaan: boolean
): number {
  ctx.fillStyle = MUT;
  ctx.font = "800 17px Nunito";
  ctx.fillText(`${kicker.toUpperCase()} · ${(ws.mapel || "—").toUpperCase()}`, PAD, y);
  ctx.fillStyle = OR;
  ctx.font = "800 31px Nunito";
  ctx.fillText(ws.topik || "Latihan", PAD, y + 40);
  ctx.fillStyle = BODY;
  ctx.font = "600 18px Nunito";
  const meta = [ws.jenjang, ws.kelas ? `Kelas ${ws.kelas}` : "", `${ws.questions.length} soal`]
    .filter(Boolean)
    .join("  ·  ");
  ctx.fillText(meta, PAD, y + 70);
  if (sapaan) {
    ctx.textAlign = "right";
    ctx.fillStyle = SKY;
    ctx.font = "800 18px Nunito";
    ctx.fillText("Selamat mengerjakan!", W - PAD, y + 70);
    ctx.textAlign = "left";
  }
  return y + 92;
}

function footer(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = MUT;
  ctx.font = "500 18px Nunito";
  ctx.textAlign = "center";
  ctx.fillText(`Rumbela ${new Date().getFullYear()}`, W / 2, y);
  ctx.textAlign = "left";
}

/** Tinggi ruang jawaban per jenis soal */
const spaceH = (q: WorksheetQ): number =>
  q.kind === "pg" ? 44 : q.kind === "uraian" ? 118 : 58;

export async function renderWorksheetCanvas(
  ws: Worksheet,
  _pengaturan: Pengaturan,
  jenis: "soal" | "kunci"
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const logo = await loadLogo();
  const tanggal = fmtDate(ws.createdAt || todayStr());

  // ---- kunci jawaban: halaman ringkas ----
  if (jenis === "kunci") {
    const H = Math.max(1414, 620 + Math.ceil(ws.questions.length / 2) * 74 + 150);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    kop(ctx, logo, tanggal);
    let y = judul(ctx, 330, ws, "Kunci Jawaban", false);
    ctx.fillStyle = "#16a34a";
    ctx.font = "800 24px Nunito";
    ctx.fillText("KUNCI JAWABAN", PAD, y + 6);
    y += 46;

    const colW = (W - PAD * 2) / 2;
    ws.questions.forEach((q, i) => {
      const col = i % 2;
      const x = PAD + col * colW;
      if (col === 0 && i > 0) y += 74;
      ctx.fillStyle = OR;
      ctx.font = "800 22px Nunito";
      ctx.fillText(`${i + 1}.`, x, y);
      ctx.fillStyle = INK;
      ctx.font = "700 22px Nunito";
      const ans = q.kind === "pg" && q.options?.length ? q.answer.toUpperCase() : q.answer || "—";
      const lines = wrapLines(ctx, ans, colW - 50);
      lines.forEach((ln, li) => ctx.fillText(ln, x + 46, y + li * 28));
      if (lines.length > 1) y += (lines.length - 1) * 28;
    });
    footer(ctx, H - 70);
    return canvas;
  }

  // ---- lembar soal: ukur tinggi dulu, lalu gambar ----
  const estH = 700 + ws.questions.reduce((acc, q) => {
    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = "600 22px Nunito";
    const lines = wrapLines(measure, q.text, W - PAD * 2 - 60);
    return acc + 42 + lines.length * 31 + spaceH(q) + 26;
  }, 0);
  const H = Math.max(1414, Math.min(estH + 260, 30000));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  kop(ctx, logo, tanggal);

  let y = judul(ctx, 330, ws, "Worksheet", true);

  // garis identitas
  ctx.fillStyle = INK;
  ctx.font = "600 20px Nunito";
  ctx.fillText("Nama :", PAD, y + 12);
  dotted(ctx, PAD + 78, W / 2 - 30, y + 14);
  ctx.fillText("Kelas :", W / 2, y + 12);
  dotted(ctx, W / 2 + 82, W - PAD, y + 14);
  y += 44;

  // petunjuk
  if (ws.petunjuk) {
    ctx.font = "600 18px Nunito";
    const lines = wrapLines(ctx, ws.petunjuk, W - PAD * 2 - 40);
    const bh = lines.length * 26 + 24;
    rr(ctx, PAD, y, W - PAD * 2, bh, 12);
    ctx.fillStyle = "#f0f9ff";
    ctx.fill();
    ctx.fillStyle = "#075985";
    lines.forEach((ln, li) => ctx.fillText(ln, PAD + 20, y + 30 + li * 26));
    y += bh + 24;
  }

  // soal-soal
  const letters = ["a", "b", "c", "d"];
  ws.questions.forEach((q, i) => {
    ctx.fillStyle = OR;
    ctx.font = "800 22px Nunito";
    const numX = PAD;
    const textX = PAD + 42;
    ctx.fillText(`${i + 1}.`, numX, y + 20);
    ctx.fillStyle = INK;
    ctx.font = "600 22px Nunito";
    const lines = wrapLines(ctx, q.text, W - PAD * 2 - 60);
    lines.forEach((ln, li) => ctx.fillText(ln, textX, y + 20 + li * 31));
    y += 42 + (lines.length - 1) * 31;

    if (q.kind === "pg" && q.options && q.options.length) {
      const twoCol = q.options.every((o) => ctx.measureText(o).width < (W - PAD * 2) / 2 - 60);
      const colW = (W - PAD * 2) / 2;
      q.options.slice(0, 4).forEach((opt, oi) => {
        const ox = twoCol ? textX + (oi % 2) * colW : textX;
        const oy = y + Math.floor(oi / (twoCol ? 2 : 1)) * 36 + 22;
        ctx.fillStyle = INK;
        ctx.font = "600 20px Nunito";
        ctx.fillText(`${letters[oi]}. ${opt}`, ox + 26, oy);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(ox + 9, oy - 6, 8, 0, Math.PI * 2);
        ctx.stroke();
      });
      y += Math.ceil(q.options.length / (twoCol ? 2 : 1)) * 36;
    } else {
      const nLines = q.kind === "uraian" ? 3 : 1;
      for (let li = 0; li < nLines; li++) {
        dotted(ctx, textX, W - PAD, y + 34 + li * 34);
      }
      y += nLines * 34;
    }
    y += 24;
  });

  footer(ctx, H - 70);
  return canvas;
}

export function slugify(s: string): string {
  return (s || "worksheet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "worksheet";
}
