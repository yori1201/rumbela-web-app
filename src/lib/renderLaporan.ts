"use client";

/* Renderer Laporan Perkembangan Siswa → gambar PNG via <canvas>.
   3 template: "ceria" (playful, warna brand), "klasik" (formal navy),
   "minimal" (bersih). Ukuran 1000×1414 (rasio A4 potret). */

import { ASPECTS, fmtDate, monthLabel, todayStr } from "./constants";
import type { Database, Siswa, TemplateLaporan } from "./types";
import { attStatsInMonth, getReport, payStatus, type AttStats } from "./laporan";

const W = 1000;
const H = 1414;

export interface RenderOpts {
  template: TemplateLaporan;
  scores: Record<string, number>;
  note: string;
  pesanPenutup: string;
  ttdNama: string;
  ttdJabatan: string;
}

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

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width <= maxWidth) cur = test;
    else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + "…").width > maxWidth && last.length > 4) last = last.slice(0, -1);
    lines[maxLines - 1] = last + "…";
  }
  return lines;
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, filled: boolean, color: string, empty: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + rad * Math.cos(ang);
    const y = cy + rad * Math.sin(ang);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? color : empty;
  ctx.fill();
}

function chip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, bg: string, fg: string, font = "600 22px Nunito") {
  ctx.font = font;
  const wText = ctx.measureText(text).width;
  const padX = 18, h = 40;
  rr(ctx, x, y, wText + padX * 2, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + h / 2 + 1);
  ctx.textBaseline = "alphabetic";
  return wText + padX * 2;
}

export async function renderReportCanvas(
  db: Database,
  siswa: Siswa,
  mk: string,
  opts: RenderOpts
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const logo = await loadLogo();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const stats: AttStats = attStatsInMonth(db, siswa.id, mk);
  const pay = payStatus(db, siswa.id, mk);
  const payInfo =
    pay === "lunas"
      ? { label: "Iuran Lunas", bg: "#dcfce7", fg: "#15803d" }
      : pay === "sebagian"
        ? { label: "Iuran Sebagian", bg: "#fef3c7", fg: "#b45309" }
        : { label: "Iuran Belum Lunas", bg: "#fee2e2", fg: "#b91c1c" };

  const nama = db.pengaturan.namaLembaga || "Rumbela";
  const tagline = db.pengaturan.tagline || "Rumah Belajar Anak";
  const alamat = db.pengaturan.alamat || "Curup, Bengkulu";
  const telp = db.pengaturan.telepon;

  const drawHeader = (bg: string, fg: string, sub: string) => {
    ctx.fillStyle = bg;
    rr(ctx, 40, 40, W - 80, 150, 28);
    ctx.fill();
    if (logo) {
      ctx.save();
      rr(ctx, 70, 68, 94, 94, 47);
      ctx.clip();
      ctx.drawImage(logo, 70, 68, 94, 94);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(117, 115, 47, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.textAlign = "left";
    ctx.fillStyle = fg;
    ctx.font = "800 36px Nunito";
    ctx.fillText("Laporan Perkembangan Belajar", logo ? 190 : 80, 112);
    ctx.font = "600 22px Nunito";
    ctx.globalAlpha = 0.92;
    ctx.fillText(`${nama} — ${tagline}`, logo ? 190 : 80, 148);
    ctx.globalAlpha = 1;
    ctx.fillStyle = sub;
    ctx.font = "700 24px Nunito";
    ctx.textAlign = "right";
    ctx.fillText(monthLabel(mk), W - 76, 115);
    ctx.textAlign = "left";
  };

  if (opts.template === "ceria") {
    // latar + confetti
    ctx.fillStyle = "#fff9f2";
    ctx.fillRect(0, 0, W, H);
    const dots = [
      [90, 260, "#fed7aa"], [905, 300, "#bbf7d0"], [60, 760, "#fef08a"],
      [935, 820, "#fecaca"], [80, 1180, "#bfdbfe"], [920, 1220, "#fed7aa"],
    ];
    for (const [x, y, c] of dots) {
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fillStyle = c as string;
      ctx.fill();
    }
    const g = ctx.createLinearGradient(40, 40, W - 40, 190);
    g.addColorStop(0, "#fb923c");
    g.addColorStop(1, "#f97316");
    drawHeader(g, "#ffffff", "rgba(255,255,255,.95)");

    // kartu siswa
    ctx.fillStyle = "#ffffff";
    rr(ctx, 40, 220, W - 80, 120, 24);
    ctx.fill();
    ctx.strokeStyle = "#fed7aa";
    ctx.lineWidth = 2;
    rr(ctx, 40, 220, W - 80, 120, 24);
    ctx.stroke();
    ctx.fillStyle = "#1f2937";
    ctx.font = "800 34px Nunito";
    ctx.fillText(siswa.name, 76, 272);
    ctx.fillStyle = "#64748b";
    ctx.font = "600 22px Nunito";
    ctx.fillText(`${siswa.program}  ·  ${siswa.level}${siswa.grade ? " kelas " + siswa.grade : ""}${siswa.group ? "  ·  " + siswa.group : ""}`, 76, 310);
    chip(ctx, payInfo.label, W - 76 - (ctx.measureText(payInfo.label).width + 36), 246, payInfo.bg, payInfo.fg);

    // statistik
    const cards: [string, string, string][] = [
      ["Kehadiran", stats.pct === null ? "—" : `${stats.pct}%`, "#f97316"],
      ["Hadir / Izin / Alpa", `${stats.h} / ${stats.i} / ${stats.a}`, "#0ea5e9"],
      ["Iuran Bulan Ini", pay === "lunas" ? "Lunas ✓" : pay === "sebagian" ? "Sebagian" : "Belum", pay === "lunas" ? "#22c55e" : pay === "sebagian" ? "#f59e0b" : "#ef4444"],
    ];
    cards.forEach(([label, value, color], i) => {
      const x = 40 + i * 313;
      ctx.fillStyle = "#ffffff";
      rr(ctx, x, 364, 293, 128, 24);
      ctx.fill();
      ctx.strokeStyle = "#f3f4f6";
      ctx.lineWidth = 2;
      rr(ctx, x, 364, 293, 128, 24);
      ctx.stroke();
      ctx.fillStyle = "#6b7280";
      ctx.font = "700 19px Nunito";
      ctx.textAlign = "center";
      ctx.fillText(label, x + 146, 402);
      ctx.fillStyle = color;
      ctx.font = "800 40px Nunito";
      ctx.fillText(value, x + 146, 458);
    });
    ctx.textAlign = "left";

    // aspek penilaian
    ctx.fillStyle = "#1f2937";
    ctx.font = "800 26px Nunito";
    ctx.fillText("Penilaian Aspek Perkembangan", 44, 556);
    ASPECTS.forEach((a, i) => {
      const y = 606 + i * 62;
      ctx.fillStyle = "#374151";
      ctx.font = "700 24px Nunito";
      ctx.fillText(a, 48, y);
      const v = opts.scores[a] || 0;
      for (let n = 1; n <= 5; n++) {
        star(ctx, 560 + n * 52 - 26, y - 9, 21, n <= v, "#f59e0b", "#e5e7eb");
      }
    });

    // catatan
    ctx.fillStyle = "#ffffff";
    rr(ctx, 40, 876, W - 80, 210, 24);
    ctx.fill();
    ctx.strokeStyle = "#fed7aa";
    rr(ctx, 40, 876, W - 80, 210, 24);
    ctx.stroke();
    ctx.fillStyle = "#c2410c";
    ctx.font = "800 22px Nunito";
    ctx.fillText("Catatan Pengajar", 72, 918);
    ctx.fillStyle = "#374151";
    ctx.font = "500 23px Nunito";
    wrap(ctx, opts.note || "Belum ada catatan khusus bulan ini.", W - 190, 5).forEach((ln, i) =>
      ctx.fillText(ln, 72, 956 + i * 34)
    );

    // pesan penutup
    ctx.fillStyle = "#15803d";
    ctx.font = "italic 600 23px Nunito";
    ctx.textAlign = "center";
    wrap(ctx, `“${opts.pesanPenutup}”`, W - 200, 2).forEach((ln, i) => ctx.fillText(ln, W / 2, 1128 + i * 32));
    ctx.textAlign = "left";

    // footer
    ctx.fillStyle = "#22c55e";
    rr(ctx, 40, H - 130, W - 80, 90, 26);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 21px Nunito";
    ctx.fillText(`${alamat}${telp ? "  ·  " + telp : ""}`, 76, H - 88);
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.95;
    ctx.font = "600 17px Nunito";
    ctx.fillText(`Dicetak ${fmtDate(todayStr())}`, W / 2, H - 50);
    ctx.globalAlpha = 1;
    ctx.textAlign = "right";
    ctx.font = "800 22px Nunito";
    ctx.fillText(opts.ttdNama, W - 76, H - 82);
    ctx.font = "600 18px Nunito";
    ctx.fillText(opts.ttdJabatan, W - 76, H - 56);
    ctx.textAlign = "left";
  }

  if (opts.template === "klasik") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1e3a5f";
    ctx.fillRect(0, 0, W, 170);
    ctx.fillStyle = "#d4a72c";
    ctx.fillRect(0, 170, W, 5);
    if (logo) {
      ctx.save();
      rr(ctx, 60, 38, 94, 94, 47);
      ctx.clip();
      ctx.drawImage(logo, 60, 38, 94, 94);
      ctx.restore();
    }
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.font = "800 38px Nunito";
    ctx.fillText("LAPORAN PERKEMBANGAN BELAJAR", logo ? 180 : 60, 100);
    ctx.font = "600 23px Nunito";
    ctx.globalAlpha = 0.9;
    ctx.fillText(`${nama} — ${tagline}`, logo ? 180 : 60, 138);
    ctx.globalAlpha = 1;
    ctx.textAlign = "right";
    ctx.font = "700 24px Nunito";
    ctx.fillText(monthLabel(mk), W - 60, 100);
    ctx.textAlign = "left";

    let y = 240;
    const row = (label: string, value: string, strong = false) => {
      ctx.fillStyle = "#64748b";
      ctx.font = "700 17px Nunito";
      ctx.fillText(label.toUpperCase(), 60, y);
      ctx.fillStyle = strong ? "#1e3a5f" : "#1f2937";
      ctx.font = strong ? "800 30px Nunito" : "600 24px Nunito";
      ctx.fillText(value, 60, y + 40);
      y += strong ? 78 : 64;
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, y - 18);
      ctx.lineTo(W - 60, y - 18);
      ctx.stroke();
    };
    row("Nama Siswa", siswa.name, true);
    row("Program / Jenjang", `${siswa.program}  ·  ${siswa.level}${siswa.grade ? " kelas " + siswa.grade : ""}${siswa.group ? "  ·  " + siswa.group : ""}`);
    row("Kehadiran", stats.pct === null ? "Belum ada data absensi" : `${stats.pct}%  (Hadir ${stats.h} · Izin ${stats.i} · Alpa ${stats.a})`);
    row("Iuran Bulan Ini", payInfo.label);

    ctx.fillStyle = "#64748b";
    ctx.font = "700 17px Nunito";
    ctx.fillText("PENILAIAN ASPEK PERKEMBANGAN", 60, y);
    y += 26;
    ASPECTS.forEach((a) => {
      ctx.fillStyle = "#374151";
      ctx.font = "600 22px Nunito";
      ctx.fillText(a, 60, y + 30);
      const v = opts.scores[a] || 0;
      for (let n = 1; n <= 5; n++) star(ctx, 560 + n * 52 - 26, y + 22, 20, n <= v, "#1e3a5f", "#e2e8f0");
      y += 58;
    });
    y += 6;

    ctx.fillStyle = "#64748b";
    ctx.font = "700 17px Nunito";
    ctx.fillText("CATATAN PENGAJAR", 60, y);
    y += 18;
    ctx.strokeStyle = "#cbd5e1";
    rr(ctx, 60, y, W - 120, 170, 10);
    ctx.stroke();
    ctx.fillStyle = "#1f2937";
    ctx.font = "500 22px Nunito";
    wrap(ctx, opts.note || "Belum ada catatan khusus bulan ini.", W - 180, 5).forEach((ln, i) =>
      ctx.fillText(ln, 90, y + 44 + i * 32)
    );
    y += 230;

    ctx.fillStyle = "#374151";
    ctx.font = "italic 600 21px Nunito";
    ctx.textAlign = "center";
    wrap(ctx, `“${opts.pesanPenutup}”`, W - 200, 2).forEach((ln, i) => ctx.fillText(ln, W / 2, y + i * 30));
    ctx.textAlign = "left";

    ctx.strokeStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(W / 2 + 80, H - 190);
    ctx.lineTo(W - 90, H - 190);
    ctx.stroke();
    ctx.fillStyle = "#1f2937";
    ctx.font = "700 22px Nunito";
    ctx.textAlign = "center";
    ctx.fillText(opts.ttdNama, (W / 2 + 80 + W - 90) / 2, H - 160);
    ctx.fillStyle = "#64748b";
    ctx.font = "600 18px Nunito";
    ctx.fillText(opts.ttdJabatan, (W / 2 + 80 + W - 90) / 2, H - 134);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 17px Nunito";
    ctx.fillText(`${alamat}${telp ? "  ·  " + telp : ""}  ·  Dicetak ${fmtDate(todayStr())}`, W / 2, H - 60);
    ctx.textAlign = "left";
  }

  if (opts.template === "minimal") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    if (logo) ctx.drawImage(logo, 60, 52, 72, 72);
    ctx.textAlign = "left";
    ctx.fillStyle = "#111827";
    ctx.font = "800 28px Nunito";
    ctx.fillText(nama, logo ? 148 : 60, 84);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "600 19px Nunito";
    ctx.fillText(tagline, logo ? 148 : 60, 112);

    ctx.fillStyle = "#111827";
    ctx.font = "800 52px Nunito";
    ctx.fillText("Laporan Bulanan", 60, 250);
    ctx.fillStyle = "#6b7280";
    ctx.font = "600 24px Nunito";
    ctx.fillText(`${monthLabel(mk)}  ·  ${siswa.name}`, 60, 292);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "600 21px Nunito";
    ctx.fillText(`${siswa.program}${siswa.group ? "  ·  " + siswa.group : ""}`, 60, 326);
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 360);
    ctx.lineTo(W - 60, 360);
    ctx.stroke();

    ctx.fillStyle = "#f97316";
    ctx.font = "800 88px Nunito";
    ctx.fillText(stats.pct === null ? "—" : `${stats.pct}%`, 60, 480);
    ctx.fillStyle = "#6b7280";
    ctx.font = "700 22px Nunito";
    ctx.fillText("tingkat kehadiran", 60, 514);
    ctx.textAlign = "right";
    ctx.fillStyle = "#374151";
    ctx.font = "600 22px Nunito";
    ctx.fillText(`Hadir ${stats.h}   ·   Izin ${stats.i}   ·   Alpa ${stats.a}`, W - 60, 470);
    ctx.fillStyle = pay === "lunas" ? "#16a34a" : pay === "sebagian" ? "#d97706" : "#dc2626";
    ctx.font = "700 22px Nunito";
    ctx.fillText(payInfo.label, W - 60, 506);
    ctx.textAlign = "left";

    let y = 590;
    ctx.fillStyle = "#6b7280";
    ctx.font = "700 18px Nunito";
    ctx.fillText("PENILAIAN ASPEK PERKEMBANGAN", 60, y);
    y += 40;
    ASPECTS.forEach((a) => {
      ctx.fillStyle = "#111827";
      ctx.font = "600 23px Nunito";
      ctx.fillText(a, 60, y + 8);
      const v = opts.scores[a] || 0;
      for (let n = 1; n <= 5; n++) {
        ctx.beginPath();
        ctx.arc(W - 60 - (5 - n) * 44, y, 13, 0, Math.PI * 2);
        ctx.fillStyle = n <= v ? "#f97316" : "#e5e7eb";
        ctx.fill();
      }
      y += 56;
    });
    y += 20;

    ctx.fillStyle = "#6b7280";
    ctx.font = "700 18px Nunito";
    ctx.fillText("CATATAN PENGAJAR", 60, y);
    y += 20;
    ctx.fillStyle = "#f97316";
    rr(ctx, 60, y, 6, 170, 3);
    ctx.fill();
    ctx.fillStyle = "#1f2937";
    ctx.font = "500 23px Nunito";
    wrap(ctx, opts.note || "Belum ada catatan khusus bulan ini.", W - 220, 5).forEach((ln, i) =>
      ctx.fillText(ln, 92, y + 40 + i * 36)
    );
    y += 250;

    ctx.fillStyle = "#374151";
    ctx.font = "italic 600 22px Nunito";
    wrap(ctx, `“${opts.pesanPenutup}”`, W - 220, 2).forEach((ln, i) => ctx.fillText(ln, 60, y + i * 34));
    y += 120;

    ctx.strokeStyle = "#f3f4f6";
    ctx.beginPath();
    ctx.moveTo(60, H - 150);
    ctx.lineTo(W - 60, H - 150);
    ctx.stroke();
    ctx.fillStyle = "#9ca3af";
    ctx.font = "600 19px Nunito";
    ctx.fillText(`${alamat}${telp ? "  ·  " + telp : ""}`, 60, H - 106);
    ctx.fillStyle = "#111827";
    ctx.font = "700 21px Nunito";
    ctx.textAlign = "right";
    ctx.fillText(opts.ttdNama, W - 60, H - 116);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "600 18px Nunito";
    ctx.fillText(`${opts.ttdJabatan}  ·  ${fmtDate(todayStr())}`, W - 60, H - 90);
    ctx.textAlign = "left";
  }

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png", 0.95));
}
