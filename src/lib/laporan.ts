"use client";

/* Perhitungan statistik untuk Laporan Perkembangan Siswa. */

import type { Database, JadwalItem, PayStatus, ReportRec, Siswa } from "./types";
import { dueDateOf, fmtDate, monthKey, nextMonthKey, pad2, rp, waLink } from "./constants";

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

/** Nomor kwitansi yang tersimpan untuk satu pembayaran, bila ada. */
export function kwitansiNoTersimpan(db: Database, siswaId: string, mk: string): string | null {
  const v = db.kwitansiNo?.[siswaId]?.[mk];
  return typeof v === "string" && v ? v : null;
}

/** Nomor kwitansi hasil hitung (tanpa melihat nomor tersimpan):
 *  KWIT/{n}/{4 huruf akhir id siswa} — n = nomor siklus pembayaran.
 *  Satu-satunya sumber rumus; dipakai renderKwitansi bila belum ada
 *  nomor tersimpan, dan dipakai stempel saat pembayaran dicatat. */
export function hitungKwitansiNo(db: Database, siswa: Siswa, mk: string): string {
  const prog = progresSiklus(db, siswa, mk);
  return `KWIT/${prog.siklusKe}/${(siswa.id.slice(-4) || "0000").toUpperCase()}`;
}

/** Bekukan nomor kwitansi di dalam mutate (setelah payments/payDates/
 *  payAmounts diisi). Nomor dihitung dari state draf supaya siklusKe
 *  sudah memperhitungkan pembayaran yang baru dicatat. Bila nomor sudah
 *  tersimpan, jangan ditimpa. Bila pembayaran dihapus (status "belum"),
 *  nomor ikut dihapus karena kwitansinya tidak berlaku lagi. */
export function stempelKwitansiNo(d: Database, sid: string, mk: string): void {
  const siswa = d.students.find((s) => s.id === sid);
  if (!siswa) return;
  if (d.payments[sid]?.[mk] !== "lunas" && d.payments[sid]?.[mk] !== "sebagian") {
    if (d.kwitansiNo?.[sid]) delete d.kwitansiNo[sid][mk];
    return;
  }
  if (kwitansiNoTersimpan(d, sid, mk)) return;
  d.kwitansiNo ??= {};
  d.kwitansiNo[sid] ??= {};
  d.kwitansiNo[sid][mk] = hitungKwitansiNo(d, siswa, mk);
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

/** Progres iuran berbasis pertemuan — model BAYAR DI DEPAN (17 Nov 2026).
 *  Satu pembayaran mencakup `meet` pertemuan (bawaan 12). Siswa membayar
 *  dulu, lalu menjalani pertemuannya; kwitansi terbit saat pembayaran
 *  tercatat, tanpa menunggu pertemuan selesai (kasus Al Hafizhan 12 Nov
 *  2026: 17x hadir tapi kwitansi terkunci karena jendela berbasis payDate).
 *  - `hadir`: pertemuan (H) yang sudah dijalani pada siklus BERBAYAR
 *    terakhir — bukan kumulatif semua pertemuan. Satu pembayaran lunas
 *    menggeser jendela hitung sejauh `target` pertemuan, sehingga setelah
 *    bayar berikutnya penghitung mulai lagi dari 0.
 *  - `selesai`: true bila pertemuan siklus berbayar terakhir sudah habis
 *    (hadir mencapai target) → tagihan berikutnya jatuh tempo.
 *  - `siklusKe`: nomor siklus pembayaran. Tanpa `mk`: siklus BERIKUTNYA
 *    yang harus dibayar (lunas + 1). Dengan `mk`: nomor siklus dari
 *    pembayaran pada bulan `mk` (lunas sebelum `mk` + 1) — dipakai nomor
 *    kwitansi KWIT/{n}/{id}. */
export interface ProgresSiklus {
  /** jumlah pertemuan dihadiri (H) pada siklus berbayar terakhir */
  hadir: number;
  /** pertemuan per pembayaran (siswa.meet, bawaan 12) */
  target: number;
  /** true bila pertemuan siklus berbayar terakhir sudah habis → tagihan berikutnya jatuh tempo */
  selesai: boolean;
  /** nomor siklus pembayaran (lihat keterangan di atas) */
  siklusKe: number;
}

export function progresSiklus(db: Database, siswa: Siswa, mk?: string): ProgresSiklus {
  const target = siswa.meet > 0 ? siswa.meet : 12;
  const pays = db.payments[siswa.id] ?? {};
  const lunasTotal = Object.values(pays).filter((s) => s === "lunas").length;
  const lunasBefore = mk
    ? Object.entries(pays).filter(([m, s]) => s === "lunas" && m < mk).length
    : lunasTotal;
  let hadirTotal = 0;
  for (const day of Object.values(db.attendance)) {
    if (day[siswa.id] === "H") hadirTotal++;
  }
  const hadir =
    lunasTotal > 0
      ? Math.min(Math.max(hadirTotal - (lunasTotal - 1) * target, 0), target)
      : Math.min(hadirTotal, target);
  return { hadir, target, selesai: hadir >= target, siklusKe: lunasBefore + 1 };
}

/** Status tagihan iuran berikutnya seorang siswa — model bayar di depan.
 *  Tagihan berikutnya jatuh tempo pada yang LEBIH DULU terjadi:
 *  (a) bulan kalender berikutnya setelah pembayaran terakhir, atau
 *  (b) setelah pertemuan pada siklus berbayar terakhir selesai.
 *  Pengingat muncul saat siswa mencapai pertemuan ke-(target-1)
 *  (mis. ke-11 dari 12): satu pertemuan tersisa sebelum tagihan jatuh tempo. */
export interface StatusTagihan {
  /** nomor siklus berikutnya yang harus dibayar (1 = pembayaran pertama) */
  siklusBerikutnya: number;
  /** bulan ("YYYY-MM") tempat tagihan berikutnya dicatat: bulan berjalan bila belum lunas, atau bulan setelah pembayaran lunas terakhir */
  bulanTagihan: string;
  /** true bila tagihan berikutnya sudah jatuh tempo sekarang */
  jatuhTempo: boolean;
  /** penyebab jatuh tempo: "kalender" (bulan berganti) atau "pertemuan" (pertemuan siklus habis) */
  sebabJatuhTempo: "kalender" | "pertemuan" | null;
  /** true bila siswa mencapai pertemuan ke-(target-1) dan tagihan berikutnya belum jatuh tempo */
  peringatanPertemuan: boolean;
  /** bulan ("YYYY-MM") pembayaran lunas terakhir, null bila belum pernah lunas */
  bayarTerakhirMk: string | null;
}

export function statusTagihan(db: Database, siswa: Siswa, now: Date = new Date()): StatusTagihan {
  const thisMk = monthKey(now.getFullYear(), now.getMonth());
  const prog = progresSiklus(db, siswa);
  const pays = db.payments[siswa.id] ?? {};
  const lunasList = Object.keys(pays).filter((m) => pays[m] === "lunas").sort();
  const bayarTerakhirMk = lunasList.length ? lunasList[lunasList.length - 1] : null;
  const stThis = pays[thisMk] ?? "belum";
  const bulanTagihan = stThis !== "lunas" ? thisMk : nextMonthKey(bayarTerakhirMk ?? thisMk);
  const jatuhTempoKalender =
    bayarTerakhirMk !== null && stThis !== "lunas" && bayarTerakhirMk < thisMk;
  const belumPernahBayar = bayarTerakhirMk === null && stThis !== "lunas";
  const jatuhTempo = prog.selesai || jatuhTempoKalender || belumPernahBayar;
  const sebabJatuhTempo: StatusTagihan["sebabJatuhTempo"] = !jatuhTempo
    ? null
    : prog.selesai
      ? "pertemuan"
      : "kalender";
  const peringatanPertemuan =
    !jatuhTempo && prog.target > 1 && prog.hadir === prog.target - 1;
  return {
    siklusBerikutnya: prog.siklusKe,
    bulanTagihan,
    jatuhTempo,
    sebabJatuhTempo,
    peringatanPertemuan,
    bayarTerakhirMk,
  };
}

/** Tautan WA pengingat iuran berikutnya — dipakai halaman Iuran & Beranda
 *  (satu sumber, supaya isi pesannya tidak berbeda-beda). Isinya mengikuti
 *  status tagihan baru: jatuh tempo (kalender/pertemuan), pengingat
 *  pertemuan ke-(target-1), atau progres berjalan. */
export function waIngatkanIuran(db: Database, siswa: Siswa, now: Date = new Date()): string {
  const prog = progresSiklus(db, siswa);
  const tag = statusTagihan(db, siswa, now);
  const st = payStatus(db, siswa.id, tag.bulanTagihan);
  const pd = payDate(db, siswa.id, tag.bulanTagihan);
  const amt = payAmount(db, siswa.id, tag.bulanTagihan);
  let kabar: string;
  if (tag.jatuhTempo) {
    kabar =
      tag.sebabJatuhTempo === "pertemuan"
        ? `\nAnanda sudah menyelesaikan ${prog.target} pertemuan pada periode berjalan. Iuran berikutnya (Bulan ke-${tag.siklusBerikutnya}) jatuh tempo, mohon segera dilunasi.`
        : tag.bayarTerakhirMk === null
          ? `\nIuran pertama (Bulan ke-1) belum dibayar, mohon segera dilunasi.`
          : `\nIuran berikutnya (Bulan ke-${tag.siklusBerikutnya}) jatuh tempo bulan ini, mohon segera dilunasi.`;
  } else if (tag.peringatanPertemuan) {
    kabar = `\nAnanda sudah ${prog.hadir} dari ${prog.target} pertemuan pada periode berjalan. Iuran berikutnya (Bulan ke-${tag.siklusBerikutnya}) segera jatuh tempo setelah pertemuan ke-${prog.target} — mohon disiapkan.`;
  } else {
    kabar = `\nProgres pertemuan ananda: ${prog.hadir} dari ${prog.target} pada periode berjalan. Iuran berikutnya (Bulan ke-${tag.siklusBerikutnya}) jatuh tempo bulan berikutnya atau setelah ${prog.target} pertemuan selesai.`;
  }
  const statusBayar =
    st === "sebagian"
      ? `Sudah dibayar sebagian${amt ? ` sebesar *${rp(amt)}* dari ${rp(siswa.fee)}` : ""}${pd ? ` (diterima ${fmtDate(pd)})` : ""}`
      : "Belum lunas";
  return waLink(
    siswa.wa,
    `Assalamu'alaikum Bapak/Ibu ${siswa.parent},\n\nKami dari *${db.pengaturan.namaLembaga}, ${db.pengaturan.tagline}* (Curup) mengingatkan iuran Bulan ke-${tag.siklusBerikutnya} (${prog.target} pertemuan) untuk ananda *${siswa.name}* (${siswa.program}) sebesar *${rp(siswa.fee)}*.${kabar}\n\nStatus saat ini: *${statusBayar}*.\nTerima kasih atas perhatian dan kepercayaannya 🙏`
  );
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
