"use client";

/* Perhitungan statistik untuk Laporan Perkembangan Siswa. */

import type { Database, JadwalItem, PayStatus, ReportRec, Siswa } from "./types";
import { dueDateOf, pad2 } from "./constants";

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

/** Progres satu siklus iuran berbasis pertemuan (v2.3.2): satu pembayaran
 *  mencakup `meet` pertemuan (bawaan 12). Dihitung dari jumlah kehadiran (H)
 *  sejak pembayaran lunas terakhir sebelum bulan mk — atau sejak tanggal masuk
 *  bila belum pernah lunas. Jatuh tempo muncul saat hadir mencapai target,
 *  bukan hitungan 30 hari atau bulan kalender. */
export interface ProgresSiklus {
  /** jumlah pertemuan dihadiri (H) dalam siklus berjalan */
  hadir: number;
  /** pertemuan per pembayaran (siswa.meet, bawaan 12) */
  target: number;
  /** true bila siklus selesai → iuran jatuh tempo, kwitansi boleh terbit */
  selesai: boolean;
  /** nomor siklus yang sedang berjalan (1 = siklus pertama) */
  siklusKe: number;
}

export function progresSiklus(db: Database, siswa: Siswa, mk?: string): ProgresSiklus {
  const target = siswa.meet > 0 ? siswa.meet : 12;
  const pays = db.payments[siswa.id] ?? {};
  const dates = db.payDates?.[siswa.id] ?? {};
  let lunasCount = 0;
  let lastPay: string | null = null;
  for (const m of Object.keys(pays)) {
    if (pays[m] !== "lunas") continue;
    if (mk && m >= mk) continue;
    lunasCount++;
    const d = dates[m];
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && (!lastPay || d > lastPay)) lastPay = d;
  }
  const fromStart = !lastPay;
  const batas = lastPay ?? siswa.start ?? "";
  let hadir = 0;
  for (const [date, day] of Object.entries(db.attendance)) {
    if (date <= batas && !(fromStart && date === batas)) continue;
    if (day[siswa.id] === "H") hadir++;
  }
  return { hadir, target, selesai: hadir >= target, siklusKe: lunasCount + 1 };
}

/** LEGACY (v2.3.2): jatuh tempo berbasis tanggal kalender. Tidak lagi dipakai
 *  sejak iuran berbasis pertemuan — dipertahankan agar data dan dokumen lama
 *  tetap konsisten. Tanggal jatuh tempo iuran seorang siswa untuk bulan mk
 *  ("YYYY-MM"). Siklus per siswa — mengikuti tanggal input pembayaran
 *  terakhirnya SEBELUM bulan tsb. Belum pernah bayar → mengikuti tanggal
 *  masuk (s.start); tidak ada keduanya → jatuh tempo global
 *  (pengaturan.iuran.jatuhTempo). */
export function dueDateForStudent(db: Database, siswa: Siswa, mk: string): Date {
  const p = mk.split("-");
  const y = Number(p[0]);
  const m = Number(p[1]) - 1; // 0-index
  // 1) tanggal pembayaran terakhir sebelum awal bulan mk
  let lastPay: string | null = null;
  const dates = db.payDates?.[siswa.id] ?? {};
  for (const dstr of Object.values(dates)) {
    if (typeof dstr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dstr) && dstr < `${mk}-01`) {
      if (!lastPay || dstr > lastPay) lastPay = dstr;
    }
  }
  if (lastPay) return dueDateOf(y, m, Number(lastPay.split("-")[2]));
  // 2) tanggal masuk siswa
  const st = (siswa.start || "").split("-");
  if (st.length === 3 && Number(st[2]) >= 1 && Number(st[2]) <= 31) {
    return dueDateOf(y, m, Number(st[2]));
  }
  // 3) jatuh tempo global
  return dueDateOf(y, m, Math.min(31, Math.max(1, db.pengaturan.iuran?.jatuhTempo ?? 5)));
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

/* ===== Jadwal per hari & per siswa (dipakai Absensi, Dashboard, Jadwal) ===== */

/** Daftar item jadwal pada suatu hari, urut slot. */
export function itemsOnDay(db: Database, hari: string): JadwalItem[] {
  return db.jadwal.items
    .filter((i) => i.hari === hari)
    .sort((a, b) => a.slot - b.slot);
}

/** Siswa peserta satu item jadwal: daftar eksplisit bila diisi,
 *  selain itu seluruh siswa dengan grup = kelas item (perilaku lama). */
export function siswaIdsOfItem(db: Database, it: JadwalItem): string[] {
  if (it.siswaIds && it.siswaIds.length) return it.siswaIds;
  return db.students.filter((s) => s.group === it.kelas).map((s) => s.id);
}

/** Nama peserta satu item jadwal (urut abjad). */
export function namaSiswaOfItem(db: Database, it: JadwalItem): string[] {
  const byId = new Map(db.students.map((s) => [s.id, s.name]));
  return siswaIdsOfItem(db, it)
    .map((id) => byId.get(id))
    .filter((n): n is string => !!n)
    .sort((a, b) => a.localeCompare(b));
}

/** Semua id siswa yang punya jadwal belajar pada hari tertentu. */
export function siswaIdsOnDay(db: Database, hari: string): Set<string> {
  const set = new Set<string>();
  for (const it of db.jadwal.items) {
    if (it.hari !== hari) continue;
    siswaIdsOfItem(db, it).forEach((id) => set.add(id));
  }
  return set;
}

/** Label jam les seorang siswa pada hari tertentu, cth. ["09:00–10:00", "13:00–14:00"]. */
export function slotLabelsForStudent(db: Database, hari: string, siswaId: string): string[] {
  const out: string[] = [];
  for (const it of db.jadwal.items) {
    if (it.hari !== hari) continue;
    if (!siswaIdsOfItem(db, it).includes(siswaId)) continue;
    const sl = db.jadwal.slots[it.slot];
    out.push(sl ? `${sl.mulai}–${sl.selesai}` : `Slot ${it.slot + 1}`);
  }
  return out;
}

export function datesInMonth(mk: string): string[] {
  const [y, m] = mk.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${mk}-${pad2(i + 1)}`);
}
