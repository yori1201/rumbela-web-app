/* Uji revisi template laporan WA harian: tanpa rekap kehadiran bulanan (18 Nov 2026).
 * Alasan pemilik: jurnal itu harian, bukan bulanan — rekap kehadiran bulan ini
 * tidak perlu ada di teks laporan harian.
 * Menguji kode ASLI src/lib/constants.ts: file itu dikompilasi dulu dengan
 * tsc ke direktori sementara, lalu di-require. Daftar placeholder (TPL_VARS)
 * dan isi dailyVars tinggal di komponen React (jurnal.tsx), jadi diperiksa
 * lewat isi berkas sumber.
 * Jalankan: node scripts/test-template-tanpa-rekap.mjs (dari root repo).
 *
 * Yang diuji:
 *  T1  template bawaan (DEFAULT_TEMPLATE_WA) tidak mengandung {rekap}
 *  T2  hasil isi template untuk satu siswa tidak mengandung baris rekap
 *      dan tidak mengandung sisa placeholder {rekap}
 *  T3  daftar placeholder (TPL_VARS) tidak lagi menawarkan {rekap}
 *  T4  dailyVars tidak lagi menghitung rekap (tidak ada kunci rekap dan
 *      tidak ada pemakaian attStatsInMonth di jurnal.tsx)
 *  T5  template lama (versi sebelum revisi) bila diisi tetap memuat rekap
 *      — memastikan uji T2 memang mendeteksi keberadaan rekap, bukan lolos
 *      karena perbandingan kosong
 *
 * Yang TIDAK bisa diuji di sini (butuh browser, diuji live):
 *  - pratinjau di editor template tidak menampilkan baris rekap
 *  - teks yang disalin/dikirim via WA tidak mengandung rekap */

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tmp = mkdtempSync(join(tmpdir(), "rumbela-template-test-"));
try {
  execSync(
    `npx tsc src/lib/constants.ts ` +
      `--outDir ${tmp} --module commonjs --target es2022 --moduleResolution node ` +
      `--skipLibCheck --esModuleInterop --lib es2022,dom`,
    { stdio: "pipe" }
  );
} catch (e) {
  console.error("Gagal mengkompilasi constants.ts:\n" + (e.stdout?.toString() || "") + (e.stderr?.toString() || ""));
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
const { DEFAULT_TEMPLATE_WA, fillTemplate } = require(join(tmp, "constants.js"));
const jurnalSrc = readFileSync("src/components/views/jurnal.tsx", "utf8");

let passed = 0;
let failed = 0;
function cek(nama, fn) {
  try {
    fn();
    passed++;
    console.log(`OK  ${nama}`);
  } catch (e) {
    failed++;
    console.log(`GAGAL  ${nama}\n     ${e.message}`);
  }
}

const VARS_CONTOH = {
  nama: "Shanum Arumi Fadli",
  orangtua: "Lia Waroka",
  program: "Privat",
  hari: "Rabu",
  tanggal: "18 November 2026",
  kehadiran: "Hadir",
  kegiatan: "Huruf Vokal, Konsonan",
  progres: "Makin lancar membaca kata tiga suku kata",
  lembaga: "Rumbela",
};

cek("T1 template bawaan tidak mengandung {rekap}", () => {
  assert.equal(DEFAULT_TEMPLATE_WA.includes("{rekap}"), false);
  assert.equal(DEFAULT_TEMPLATE_WA.includes("Rekap"), false);
});

cek("T2 hasil isi template tidak mengandung baris rekap", () => {
  const teks = fillTemplate(DEFAULT_TEMPLATE_WA, VARS_CONTOH);
  assert.equal(teks.includes("{rekap}"), false);
  assert.equal(teks.includes("Rekap kehadiran"), false);
  assert.equal(teks.includes("Rekap"), false);
  assert.equal(teks.includes("Shanum Arumi Fadli"), true);
  assert.equal(teks.includes("Huruf Vokal, Konsonan"), true);
  assert.equal(teks.includes("Terima kasih atas dukungannya di rumah"), true);
});

cek("T3 daftar placeholder tidak lagi menawarkan {rekap}", () => {
  assert.equal(jurnalSrc.includes('["rekap"'), false);
  assert.equal(jurnalSrc.includes("{rekap}"), false);
});

cek("T4 dailyVars tidak lagi menghitung rekap", () => {
  assert.equal(jurnalSrc.includes("attStatsInMonth"), false);
  assert.equal(/rekap\s*:/.test(jurnalSrc), false);
});

cek("T5 template lama bila diisi tetap memuat rekap (kontrol)", () => {
  const tplLama =
    "Assalamu'alaikum Bapak/Ibu {orangtua},\n\nBerikut laporan harian ananda *{nama}* ({program}), *{hari}, {tanggal}* di {lembaga}:\n\n• Kehadiran: {kehadiran}\n• Kegiatan: {kegiatan}\n• Catatan progres: {progres}\n{rekap}\nTerima kasih atas dukungannya di rumah 🙏";
  const teks = fillTemplate(tplLama, { ...VARS_CONTOH, rekap: "Rekap kehadiran bulan ini: 100%." });
  assert.equal(teks.includes("Rekap kehadiran bulan ini: 100%."), true);
});

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} skenario LOLOS, ${failed} GAGAL.`);
process.exit(failed ? 1 : 0);
