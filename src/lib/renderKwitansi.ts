"use client";

/* Renderer Kwitansi / Bukti Pembayaran Iuran → gambar PNG via <canvas>.
   Kartu lanskap 1000×660 dengan tema biru–hijau Rumbela, siap diunduh
   dan dilampirkan ke WhatsApp orang tua. Juga menyediakan teks kwitansi
   untuk dikirim via wa.me (gambar dilampirkan manual oleh admin). */

import { DEFAULT_KWITANSI_LABELS, fillTemplate, fmtDate, monthLabel, rp, terbilang, todayStr, waLink } from "./constants";
import type { Database, Siswa } from "./types";
import { payAmount, payDate, payEffective, payStatus, progresSiklus } from "./laporan";

const W = 1000;
const H = 660;

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/logo-round.webp";
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

/** Kecilkan font hingga teks muat pada maxWidth (untuk baris terbilang). */
function fitWidth(ctx: CanvasRenderingContext2D, text: string, weight: number, px: number, italic: boolean, maxWidth: number): number {
  let size = px;
  for (; size > 11; size -= 1) {
    ctx.font = `${italic ? "italic " : ""}${weight} ${size}px Nunito`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  return size;
}

/** Nomor kwitansi per siklus pertemuan: KWIT/1/5S72 (siklus ke-1, akhir id siswa).
 *  Siklus dihitung dari pembayaran lunas sebelumnya, bukan dari tanggal bulan. */
export function kwitansiNo(db: Database, siswa: Siswa, mk: string): string {
  const prog = progresSiklus(db, siswa, mk);
  return `KWIT/${prog.siklusKe}/${(siswa.id.slice(-4) || "0000").toUpperCase()}`;
}

/** Teks kwitansi untuk dikirim via WhatsApp (gambar PNG dilampirkan manual).
 *  Teks ini tetap (tidak pakai template) — yang bisa diedit lewat Pengaturan
 *  hanya teks-teks di layout gambar kwitansi. */
export function kwitansiWaText(db: Database, siswa: Siswa, mk: string): string {
  const st = payStatus(db, siswa.id, mk);
  const amt = payAmount(db, siswa.id, mk) ?? (st === "lunas" ? siswa.fee : Math.round(siswa.fee / 2));
  const pdIso = payDate(db, siswa.id, mk) || todayStr();
  const sisa = Math.max(0, siswa.fee - payEffective(db, siswa, mk));
  const prog = progresSiklus(db, siswa, mk);
  const p = db.pengaturan;
  return [
    `Assalamu'alaikum Bapak/Ibu ${siswa.parent},`,
    ``,
    `Terima kasih 🙏 pembayaran iuran ananda *${siswa.name}* telah kami terima:`,
    ``,
    `• Program: ${siswa.program}`,
    `• Untuk pembayaran: Iuran ${siswa.program}, ${prog.target} pertemuan (siklus ke-${prog.siklusKe})`,
    `• Jumlah dibayar: *${rp(amt)}* (${terbilang(amt)} rupiah)`,
    `• Tanggal bayar: ${fmtDate(pdIso)}`,
    st === "lunas" ? `• Status: *LUNAS* ✅` : `• Status: sebagian, sisa *${rp(sisa)}*`,
    `• No. kwitansi: *${kwitansiNo(db, siswa, mk)}*`,
    ``,
    `Bukti kwitansi berupa gambar menyusul di chat ini.`,
    ``,
    `${p.namaLembaga || "Rumbela"} (${p.tagline || "Rumah Belajar Anak"}), Curup`,
  ].join("\n");
}

export function kwitansiWaLink(db: Database, siswa: Siswa, mk: string): string {
  return waLink(siswa.wa, kwitansiWaText(db, siswa, mk));
}

export async function renderKwitansi(db: Database, siswa: Siswa, mk: string): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const logo = await loadLogo();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const st = payStatus(db, siswa.id, mk);
  const amt = payAmount(db, siswa.id, mk) ?? (st === "lunas" ? siswa.fee : Math.round(siswa.fee / 2));
  const pdIso = payDate(db, siswa.id, mk) || todayStr();
  const sisa = Math.max(0, siswa.fee - payEffective(db, siswa, mk));
  const p = db.pengaturan;
  const lembaga = p.namaLembaga || "Rumbela";
  const tagline = p.tagline || "Rumah Belajar Anak";
  /* label kanvas dari template Pengaturan — posisi, warna, dan font tidak berubah */
  const L = { ...DEFAULT_KWITANSI_LABELS, ...(p.kwitansi ?? {}) };
  const prog = progresSiklus(db, siswa, mk);

  /* latar & kartu */
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  rr(ctx, 28, 28, W - 56, H - 56, 24);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.stroke();

  /* pita header biru → hijau (pojok atas membulat, bawah kotak) */
  const g = ctx.createLinearGradient(28, 28, W - 28, 170);
  g.addColorStop(0, "#0369a1");
  g.addColorStop(1, "#059669");
  rr(ctx, 28, 28, W - 56, 142, 24);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillRect(28, 28 + 142 - 26, W - 56, 26);

  if (logo) {
    ctx.save();
    rr(ctx, 62, 54, 88, 88, 44);
    ctx.clip();
    ctx.drawImage(logo, 62, 54, 88, 88);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(106, 98, 44, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 42px Nunito";
  ctx.fillText(L.judul, 172, 96);
  ctx.font = "600 20px Nunito";
  ctx.globalAlpha = 0.92;
  ctx.fillText(L.subjudul, 172, 126);
  ctx.globalAlpha = 1;
  ctx.textAlign = "right";
  ctx.font = "800 24px Nunito";
  ctx.fillText(lembaga, W - 68, 80);
  ctx.font = "500 16px Nunito";
  ctx.globalAlpha = 0.9;
  ctx.fillText(`${tagline} · Curup, Bengkulu`, W - 68, 106);
  if (p.telepon) ctx.fillText(p.telepon, W - 68, 128);
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";

  /* nomor kwitansi + tanggal */
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 20px Nunito";
  ctx.fillText(`No. ${kwitansiNo(db, siswa, mk)}`, 64, 212);
  ctx.textAlign = "right";
  ctx.fillStyle = "#475569";
  ctx.font = "500 19px Nunito";
  ctx.fillText(`Curup, ${fmtDate(pdIso)}`, W - 64, 212);
  ctx.textAlign = "left";

  /* baris data */
  const row = (label: string, value: string, y: number) => {
    ctx.fillStyle = "#64748b";
    ctx.font = "700 14px Nunito";
    ctx.fillText(label.toUpperCase(), 64, y);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 23px Nunito";
    ctx.fillText(value, 64, y + 31);
  };

  row(L.labelDari, `Bapak/Ibu ${siswa.parent}, orang tua/wali ananda ${siswa.name}`, 268);
  row(L.labelUntuk, `Iuran ${siswa.program}, ${prog.target} pertemuan (siklus ke-${prog.siklusKe})`, 356);

  /* kotak jumlah */
  rr(ctx, 64, 424, W - 128, 106, 20);
  ctx.fillStyle = "#ecfdf5";
  ctx.fill();
  ctx.strokeStyle = "#a7f3d0";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#065f46";
  ctx.font = "800 40px Nunito";
  ctx.fillText(rp(amt), 92, 486);

  ctx.fillStyle = "#047857";
  const tb = `Terbilang: #${terbilang(amt).charAt(0).toUpperCase() + terbilang(amt).slice(1)} rupiah#`;
  const tbSize = fitWidth(ctx, tb, 600, 18, true, W - 128 - 500);
  ctx.font = `italic 600 ${tbSize}px Nunito`;
  ctx.fillText(tb, 92, 514);

  ctx.textAlign = "right";
  ctx.font = "800 19px Nunito";
  if (st === "lunas") {
    ctx.fillStyle = "#15803d";
    ctx.fillText("LUNAS", W - 92, 486);
  } else {
    ctx.fillStyle = "#b45309";
    ctx.fillText(`SEBAGIAN, sisa ${rp(sisa)}`, W - 92, 486);
  }
  ctx.textAlign = "left";

  /* footer */
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 556);
  ctx.lineTo(W - 64, 556);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#334155";
  ctx.font = "600 17px Nunito";
  ctx.fillText(fillTemplate(L.ucapan, { orangtua: siswa.parent, lembaga }), 64, 590);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 14px Nunito";
  ctx.fillText(fillTemplate(L.catatan, { lembaga }), 64, 612);

  ctx.textAlign = "right";
  ctx.fillStyle = "#475569";
  ctx.font = "600 16px Nunito";
  ctx.fillText(L.hormatKami, W - 64, 588);
  ctx.fillStyle = "#0369a1";
  ctx.font = "800 20px Nunito";
  ctx.fillText(lembaga, W - 64, 614);
  ctx.textAlign = "left";

  return canvas;
}
