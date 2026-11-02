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

export function monthLabel(mk: string): string {
  const [y, m] = mk.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function rp(n: number): string {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
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
