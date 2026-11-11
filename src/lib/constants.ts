"use client";

/* Konstanta & helper umum Rumbela v2 */

export const PROGRAMS = [
  "Calistung Ceria",
  "Matematika",
  "Pendampingan Belajar & PR",
  "Bahasa Inggris Dasar",
  "Privat",
] as const;

export const LEVELS = ["SD", "SMP", "SMA"] as const;

export const ASPECTS = [
  "Pemahaman materi",
  "Keaktifan bertanya",
  "Kemandirian belajar",
  "Penyelesaian tugas / PR",
] as const;

export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Hari efektif bimbel (tanpa Minggu) */
export const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const WARNA_JADWAL = [
  "#f97316", "#3b82f6", "#22c55e", "#eab308",
  "#a855f7", "#ec4899", "#14b8a6", "#ef4444",
];

export const DEFAULT_SLOTS = [
  { mulai: "09:00", selesai: "10:00" },
  { mulai: "10:00", selesai: "11:00" },
  { mulai: "11:00", selesai: "12:00" },
  { mulai: "12:00", selesai: "13:00" },
  { mulai: "13:00", selesai: "14:00" },
  { mulai: "14:00", selesai: "15:00" },
  { mulai: "15:00", selesai: "16:00" },
  { mulai: "16:00", selesai: "17:00" },
];

/** Slot bawaan sebelumnya (mulai 08:00) — dipakai untuk migrasi otomatis ke jam 09:00–17:00. */
export const OLD_DEFAULT_SLOTS = [
  { mulai: "08:00", selesai: "09:00" },
  { mulai: "09:00", selesai: "10:00" },
  { mulai: "10:00", selesai: "11:00" },
  { mulai: "11:00", selesai: "12:00" },
  { mulai: "13:00", selesai: "14:00" },
  { mulai: "14:00", selesai: "15:00" },
  { mulai: "15:00", selesai: "16:00" },
];

/** Slot bawaan lama (2 jam) — dipakai untuk migrasi otomatis ke slot 1 jam. */
export const LEGACY_SLOTS = [
  { mulai: "08:00", selesai: "10:00" },
  { mulai: "10:00", selesai: "12:00" },
  { mulai: "13:00", selesai: "15:00" },
  { mulai: "15:30", selesai: "17:00" },
];

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function monthKey(y: number, m: number): string {
  return `${y}-${pad2(m + 1)}`;
}

export function currentMonthKey(): string {
  const n = new Date();
  return monthKey(n.getFullYear(), n.getMonth());
}

export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const p = iso.split("-");
  if (p.length < 3) return iso;
  return `${Number(p[2])} ${MONTHS[Number(p[1]) - 1]} ${p[0]}`;
}

export function fmtDateShort(iso?: string): string {
  if (!iso) return "—";
  const p = iso.split("-");
  if (p.length < 3) return iso;
  return `${Number(p[2])} ${MONTHS_SHORT[Number(p[1]) - 1]}`;
}

/** Tanggal jatuh tempo iuran pada tahun y bulan m (0-index) — diklem ke jumlah hari bulan itu. */
export function dueDateOf(y: number, m: number, day: number): Date {
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(Math.max(1, day), last));
}

/** "Senin, 9 November 2026" */
export function fmtDayDate(d: Date): string {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Sen, 9 Nov" */
export function fmtDayDateShort(d: Date): string {
  return `${DAYS[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Template bawaan laporan harian WA (fitur Jurnal). */
export const DEFAULT_TEMPLATE_WA = `Assalamu'alaikum Bapak/Ibu {orangtua},

Berikut laporan harian ananda *{nama}* ({program}) — *{hari}, {tanggal}* di {lembaga}:

• Kehadiran: {kehadiran}
• Kegiatan: {kegiatan}
• Catatan progres: {progres}
{rekap}
Terima kasih atas dukungannya di rumah 🙏`;

/** Ganti semua {placeholder} dalam template lalu rapikan spasi/baris kosong. */
export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  let out = tpl || "";
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v ?? "");
  }
  return out
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function monthLabel(mk: string): string {
  const [y, m] = mk.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function rp(n: number): string {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

/** Angka → kata bahasa Indonesia (untuk terbilang kuitansi): 150000 → "seratus lima puluh ribu". */
export function terbilang(n: number): string {
  const v = Math.floor(Math.abs(Number(n) || 0));
  if (v === 0) return "nol";
  const dasar = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  const kata = (x: number): string => {
    if (x < 12) return dasar[x];
    if (x < 20) return kata(x - 10) + " belas";
    if (x < 100) return kata(Math.floor(x / 10)) + " puluh" + (x % 10 ? " " + kata(x % 10) : "");
    if (x < 200) return "seratus" + (x % 100 ? " " + kata(x % 100) : "");
    if (x < 1000) return kata(Math.floor(x / 100)) + " ratus" + (x % 100 ? " " + kata(x % 100) : "");
    if (x < 2000) return "seribu" + (x % 1000 ? " " + kata(x % 1000) : "");
    if (x < 1_000_000) return kata(Math.floor(x / 1000)) + " ribu" + (x % 1000 ? " " + kata(x % 1000) : "");
    if (x < 1_000_000_000) return kata(Math.floor(x / 1_000_000)) + " juta" + (x % 1_000_000 ? " " + kata(x % 1_000_000) : "");
    return kata(Math.floor(x / 1_000_000_000)) + " miliar" + (x % 1_000_000_000 ? " " + kata(x % 1_000_000_000) : "");
  };
  return kata(v);
}

/** Ringkas: 150.000 → "150rb", 1.500.000 → "1,5jt" — untuk chip/label matriks iuran. */
export function rpShort(n: number): string {
  const v = Number(n || 0);
  if (v >= 1_000_000) {
    const jt = v / 1_000_000;
    return `${jt.toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  }
  if (v >= 1_000) return `${Math.round(v / 1_000)}rb`;
  return String(v);
}

/** Normalisasi nomor WA Indonesia: 08xx → 628xx */
export function normWa(wa: string): string {
  let w = (wa || "").replace(/[^0-9]/g, "");
  if (w.startsWith("0")) w = "62" + w.slice(1);
  if (w.startsWith("62") && !w.startsWith("620")) return w;
  if (!w.startsWith("62") && w.length >= 9) return "62" + w;
  return w;
}

export function waLink(wa: string, text: string): string {
  return `https://wa.me/${normWa(wa)}?text=${encodeURIComponent(text)}`;
}

export function downloadJSON(db: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}
