/* Antrean perubahan persisten (outbox) — Fase 1, 17 Nov 2026 (R1).
 *
 * Masalah yang diatasi: perubahan (siswa, bayaran, absensi) hanya hidup
 * di memori React; bila sesi Google berakhir atau simpan gagal lalu tab
 * di-reload, perubahan lenyap tanpa jejak.
 *
 * Cara kerja: setiap mutate menulis salinan penuh database terbaru ke
 * localStorage secara sinkron (sebelum simpan ke Drive dicoba). Simpan
 * yang sukses mengosongkan antrean. Saat aplikasi dibuka lagi, antrean
 * dibandingkan dengan cache "terakhir tersimpan": bila isinya berbeda,
 * berarti ada perubahan yang belum tersimpan → dipulihkan ke state dan
 * ditandai belum tersimpan, lalu dikirim otomatis saat tersambung.
 *
 * Perbandingan memakai ISI, bukan jam: jam perangkat dan jam server
 * Google bisa selisih, jadi stempel waktu tidak bisa diandalkan untuk
 * memutuskan "mana yang lebih baru". Cache selalu berisi state terakhir
 * yang terkonfirmasi tersimpan/dimuat, sehingga beda isi = belum tersimpan.
 *
 * Modul ini murni (tanpa React/DOM) supaya logikanya bisa diuji di Node:
 * penyimpanan diwakili antarmuka StorageLike (localStorage di aplikasi). */

import { looksValidV1, normalizeDB, type Database } from "./types";

export const OUTBOX_KEY = "rumbela-v2-outbox";

export interface OutboxEntry {
  /** salinan penuh database pada perubahan terakhir */
  db: Database;
  /** jumlah perubahan sejak simpan terakhir yang terkonfirmasi */
  changes: number;
  /** jam perangkat saat perubahan terakhir ditulis (ms epoch, diagnostik) */
  updatedAt: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Tulis antrean secara sinkron. Dipanggil di setiap mutate — sebelum
 *  simpan ke Drive dicoba — supaya perubahan selamat walau tab langsung
 *  ditutup sebelum debounce jalan. */
export function writeOutbox(storage: StorageLike, db: Database, changes: number): void {
  try {
    storage.setItem(OUTBOX_KEY, JSON.stringify({ db, changes, updatedAt: Date.now() }));
  } catch {
    /* storage penuh / tidak tersedia — antrean hilang, simpan ke Drive
     * tetap dicoba seperti biasa */
  }
}

/** Baca antrean. Mengembalikan null bila tidak ada, rusak, atau isinya
 *  bukan database Rumbela (ditolak, bukan dinormalisasi jadi kosong). */
export function readOutbox(storage: StorageLike): OutboxEntry | null {
  try {
    const raw = storage.getItem(OUTBOX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { db?: unknown; changes?: unknown; updatedAt?: unknown };
    if (!parsed || typeof parsed !== "object") return null;
    if (!looksValidV1(parsed.db)) return null;
    if (typeof parsed.updatedAt !== "number" || !Number.isFinite(parsed.updatedAt)) return null;
    const changes =
      typeof parsed.changes === "number" && Number.isFinite(parsed.changes) && parsed.changes > 0
        ? Math.floor(parsed.changes)
        : 1;
    return { db: normalizeDB(parsed.db), changes, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

export function clearOutbox(storage: StorageLike): void {
  try {
    storage.removeItem(OUTBOX_KEY);
  } catch {
    /* abaikan */
  }
}

/** true bila antrean berisi perubahan yang belum tersimpan: isinya
 *  berbeda dari state terakhir yang terkonfirmasi (cache). Bila tidak
 *  ada state tersimpan yang diketahui (savedDb null/rusak), antrean
 *  dianggap belum tersimpan. */
export function outboxHasUnsyncedChanges(entry: OutboxEntry | null, savedDb: unknown): boolean {
  if (!entry) return false;
  if (!looksValidV1(savedDb)) return true;
  try {
    return JSON.stringify(entry.db) !== JSON.stringify(normalizeDB(savedDb));
  } catch {
    return true;
  }
}
