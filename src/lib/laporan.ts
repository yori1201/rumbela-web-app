"use client";

/* Perhitungan statistik untuk Laporan Perkembangan Siswa. */

import type { Database, PayStatus, ReportRec, Siswa } from "./types";
import { pad2 } from "./constants";

export interface AttStats {
  h: number;
  i: number;
  a: number;
  total: number;
  pct: number | null; // persentase hadir dari semua hari tercatat
}

export function attStatsInMonth(db: Database, siswaId: string, mk: string): AttStats {
  let h = 0, i = 0, a = 0;
  for (const [date, day] of Object.entries(db.attendance)) {
    if (!date.startsWith(mk + "-")) continue;
    const v = day[siswaId];
    if (v === "H") h++;
    else if (v === "I") i++;
    else if (v === "A") a++;
  }
  const total = h + i + a;
  return { h, i, a, total, pct: total ? Math.round((h / total) * 100) : null };
}

export function payStatus(db: Database, siswaId: string, mk: string): PayStatus {
  return db.payments[siswaId]?.[mk] ?? "belum";
}

/** Tanggal pembayaran (YYYY-MM-DD) seorang siswa pada bulan tertentu, bila tercatat. */
export function payDate(db: Database, siswaId: string, mk: string): string | null {
  return db.payDates?.[siswaId]?.[mk] ?? null;
}

/** Jumlah uang yang dibayar seorang siswa pada bulan tertentu (null bila belum dicatat). */
export function payAmount(db: Database, siswaId: string, mk: string): number | null {
  const v = db.payAmounts?.[siswaId]?.[mk];
  return typeof v === "number" && v > 0 ? v : null;
}

/** Jumlah terkumpul efektif seorang siswa pada suatu bulan: pakai jumlah riil bila ada,
 *  selain itu setengah iuran untuk status "sebagian" (perilaku lama). */
export function payEffective(db: Database, siswa: Siswa, mk: string): number {
  const st = payStatus(db, siswa.id, mk);
  if (st === "belum") return 0;
  const amt = payAmount(db, siswa.id, mk);
  if (st === "lunas") return amt ?? siswa.fee;
  return amt ?? Math.round(siswa.fee / 2);
}

export function getReport(db: Database, siswaId: string, mk: string): ReportRec {
  return db.reports[`${siswaId}@${mk}`] ?? { scores: {}, note: "", sent: false };
}

export function jurnalOfMonth(db: Database, mk: string): { date: string; activity: string; progress: string; siswa?: Record<string, string> }[] {
  return Object.entries(db.journal)
    .filter(([date]) => date.startsWith(mk + "-"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, e]) => ({ date, activity: e.activity || "", progress: e.progress || "", siswa: e.siswa }));
}

/** Usulan catatan otomatis dari jurnal bulan tsb (bila catatan manual kosong).
 *  Utamakan progres khusus siswa (fitur pilih siswa di Jurnal), selain itu progres umum. */
export function suggestNote(db: Database, siswa: Siswa, mk: string): string {
  const entries = jurnalOfMonth(db, mk);
  const parts: string[] = [];
  for (const e of entries) {
    const p = (siswa && e.siswa?.[siswa.id]?.trim()) || e.progress.trim();
    if (p) parts.push(p);
  }
  const stats = attStatsInMonth(db, siswa.id, mk);
  if (stats.pct !== null) {
    parts.push(
      stats.pct >= 90
        ? `Kehadiran sangat baik (${stats.pct}%).`
        : `Kehadiran bulan ini ${stats.pct}%.`
    );
  }
  return parts.slice(0, 3).join(" ");
}

export function activeStudents(db: Database): Siswa[] {
  return db.students;
}

export function kelasList(db: Database): string[] {
  const set = new Set<string>();
  db.jadwal.kelas.forEach((k) => set.add(k));
  db.students.forEach((s) => s.group && set.add(s.group));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function datesInMonth(mk: string): string[] {
  const [y, m] = mk.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${mk}-${pad2(i + 1)}`);
}
