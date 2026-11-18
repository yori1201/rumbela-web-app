/* Uji perbaikan hitung pertemuan: hadir hanya sejak awal siklus berbayar
 * pertama (18 Nov 2026).
 * Menguji kode ASLI src/lib/laporan.ts: file itu dikompilasi dulu dengan
 * tsc ke direktori sementara, lalu di-require. Jalankan:
 * node scripts/test-siklus-awal.mjs (dari root repo).
 *
 * Latar: Al Hafizhan tampil "jatuh tempo" padahal baru 6x pertemuan di
 * bulan ini. Akar: progresSiklus menghitung SEMUA absensi Hadir yang
 * pernah ada; 12x hadir Oktober Hafidz (sebelum bayar pertama 2 Nov)
 * ikut terhitung, sehingga hadir mentok 12 dan selesai=true.
 * Perbaikan: hadir hanya dihitung sejak tanggal 1 bulan lunas paling
 * awal (iuran dicatat per bulan; pertemuan di bulan yang sama tetap
 * dihitung walau tanggal bayarnya di tengah bulan).
 *
 * Fixture = data live per 18 Nov 2026 (dari rumbela-database.json,
 * hanya baca): 4 siswa, absensi Okt–Nov 2026 persis tanggalnya.
 *
 * Yang diuji:
 *  S1  Hafidz (kasus pemilik) → hadir 6, tidak jatuh tempo,
 *      tagihan berikut 2026-12
 *  S2  Aishwa → tetap hadir 12, jatuh tempo sebab pertemuan
 *  S3  Shanum → tetap hadir 2, tidak jatuh tempo
 *  S4  Lutfana → tetap hadir 1, tidak jatuh tempo
 *  S5  siswa tanpa pembayaran sama sekali → fallback lama
 *      (hadir = total dibatasi target)
 *  S6  bayar di tengah bulan tanpa payDate → awal siklus tanggal 1
 *      bulan lunas pertama (semua absensi bulan itu terhitung)
 *  S7  bayar di tengah bulan dengan payDate → payDate diabaikan, awal
 *      siklus tetap tanggal 1 bulan lunas pertama (semua absensi bulan
 *      itu terhitung)
 *  S8  nomor kwitansi tidak berubah (hitungKwitansiNo: Hafidz Nov
 *      KWIT/1/M6FV, Shanum Nov KWIT/2/CAQ3)
 *
 * Yang TIDAK bisa diuji di sini (butuh browser, diuji live):
 *  - tampilan "6 dari 12" dan hilangnya label jatuh tempo di Iuran/Beranda
 *  - isi teks pengingat WA Hafidz (berubah dari "jatuh tempo" menjadi
 *    progres berjalan)
 *  - pengingat pertemuan ke-11 muncul saat hadir mencapai 11 */

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tmp = mkdtempSync(join(tmpdir(), "rumbela-siklus-test-"));
try {
  execSync(
    `npx tsc src/lib/constants.ts src/lib/types.ts src/lib/laporan.ts ` +
      `--outDir ${tmp} --module commonjs --target es2022 --moduleResolution node ` +
      `--skipLibCheck --esModuleInterop --lib es2022,dom`,
    { stdio: "pipe" }
  );
} catch (e) {
  console.error("Gagal mengkompilasi logika laporan:\n" + (e.stdout?.toString() || "") + (e.stderr?.toString() || ""));
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
const { defaultPengaturan } = require(join(tmp, "types.js"));
const { progresSiklus, statusTagihan, hitungKwitansiNo } = require(join(tmp, "laporan.js"));

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

/* ===== Fixture: data live 18 Nov 2026 ===== */

const ID_AISHWA = "id-mvjniody-oh17g1";
const ID_SHANUM = "id-mvjniody-i4caq3";
const ID_HAFIZ = "mw8o0owaqscm6fv";
const ID_LUTFANA = "mwkbqtft9j2i719";

const STUDENTS = [
  { id: ID_AISHWA, name: "Aishwa Humaira Arafahni", level: "SD", grade: "1", program: "Calistung Ceria", parent: "", wa: "", start: "2026-10-01", group: "", fee: 150000, meet: 12 },
  { id: ID_SHANUM, name: "Shanum Arumi Fadli", level: "SD", grade: "1", program: "Privat", parent: "", wa: "", start: "2026-10-01", group: "", fee: 250000, meet: 12 },
  { id: ID_HAFIZ, name: "Al Hafizhan Ramadhan Lubis", level: "SD", grade: "1", program: "Privat", parent: "", wa: "", start: "2026-11-02", group: "", fee: 250000, meet: 12 },
  { id: ID_LUTFANA, name: "Lutfana Dwi Fahira", level: "SD", grade: "1", program: "Calistung Ceria", parent: "", wa: "", start: "2026-11-17", group: "Grup A", fee: 150000, meet: 12 },
];

/* Absensi Hadir persis tanggal live (Okt–Nov 2026). */
const HADIR = {
  [ID_HAFIZ]: [
    "2026-10-02", "2026-10-09", "2026-10-13", "2026-10-14", "2026-10-16", "2026-10-19",
    "2026-10-20", "2026-10-21", "2026-10-23", "2026-10-26", "2026-10-28", "2026-10-30",
    "2026-11-02", "2026-11-04", "2026-11-07", "2026-11-09", "2026-11-11", "2026-11-13",
  ],
  [ID_AISHWA]: [
    "2026-10-02", "2026-10-03", "2026-10-06", "2026-10-07", "2026-10-09", "2026-10-10",
    "2026-10-12", "2026-10-14", "2026-10-15", "2026-10-19", "2026-10-20", "2026-10-21",
    "2026-10-22", "2026-10-23", "2026-11-10", "2026-11-12",
  ],
  [ID_SHANUM]: [
    "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-26", "2026-10-27", "2026-10-28",
    "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-10", "2026-11-11", "2026-11-12",
    "2026-11-17", "2026-11-18",
  ],
  [ID_LUTFANA]: ["2026-11-18"],
};

const PAYMENTS = {
  [ID_HAFIZ]: { "2026-10": "belum", "2026-11": "lunas" },
  [ID_AISHWA]: { "2026-10": "lunas" },
  [ID_SHANUM]: {
    "2026-01": "belum", "2026-02": "belum", "2026-03": "belum", "2026-04": "belum",
    "2026-05": "belum", "2026-06": "belum", "2026-07": "belum", "2026-08": "belum",
    "2026-09": "belum", "2026-10": "lunas", "2026-11": "lunas",
  },
  [ID_LUTFANA]: { "2026-11": "lunas", "2026-12": "belum" },
};

const PAYDATES = {
  [ID_HAFIZ]: { "2026-11": "2026-11-02" },
  [ID_LUTFANA]: { "2026-11": "2026-11-17" },
  /* Aishwa & Shanum: tidak ada payDate tercatat → awal siklus tanggal 1 */
};

function mkDb(extra = {}) {
  const attendance = {};
  for (const [sid, dates] of Object.entries(HADIR)) {
    for (const d of dates) {
      attendance[d] ??= {};
      attendance[d][sid] = "H";
    }
  }
  return {
    students: JSON.parse(JSON.stringify(STUDENTS)),
    payments: JSON.parse(JSON.stringify(PAYMENTS)),
    payDates: JSON.parse(JSON.stringify(PAYDATES)),
    payAmounts: {
      [ID_HAFIZ]: { "2026-11": 250000 },
      [ID_LUTFANA]: { "2026-11": 150000 },
    },
    kwitansiNo: {},
    attendance, reports: {}, materials: [], journal: {},
    jadwal: { slots: [], kelas: ["Privat"], items: [] },
    pengaturan: defaultPengaturan(),
    worksheets: [],
    ...extra,
  };
}

const siswa = (db, id) => db.students.find((s) => s.id === id);
/* "Sekarang" untuk statusTagihan: 18 Nov 2026 (tanggal laporan pemilik). */
const NOW = new Date(2026, 10, 18);

cek("S1 Hafidz → hadir 6, tidak jatuh tempo, tagihan berikut 2026-12", () => {
  const db = mkDb();
  const prog = progresSiklus(db, siswa(db, ID_HAFIZ));
  assert.equal(prog.hadir, 6);
  assert.equal(prog.target, 12);
  assert.equal(prog.selesai, false);
  assert.equal(prog.siklusKe, 2);
  const tag = statusTagihan(db, siswa(db, ID_HAFIZ), NOW);
  assert.equal(tag.jatuhTempo, false);
  assert.equal(tag.sebabJatuhTempo, null);
  assert.equal(tag.bulanTagihan, "2026-12");
  assert.equal(tag.peringatanPertemuan, false);
});

cek("S2 Aishwa → tetap hadir 12, jatuh tempo sebab pertemuan", () => {
  const db = mkDb();
  const prog = progresSiklus(db, siswa(db, ID_AISHWA));
  assert.equal(prog.hadir, 12);
  assert.equal(prog.selesai, true);
  const tag = statusTagihan(db, siswa(db, ID_AISHWA), NOW);
  assert.equal(tag.jatuhTempo, true);
  assert.equal(tag.sebabJatuhTempo, "pertemuan");
});

cek("S3 Shanum → tetap hadir 2, tidak jatuh tempo", () => {
  const db = mkDb();
  const prog = progresSiklus(db, siswa(db, ID_SHANUM));
  assert.equal(prog.hadir, 2);
  assert.equal(prog.selesai, false);
  const tag = statusTagihan(db, siswa(db, ID_SHANUM), NOW);
  assert.equal(tag.jatuhTempo, false);
  assert.equal(tag.bulanTagihan, "2026-12");
});

cek("S4 Lutfana → tetap hadir 1, tidak jatuh tempo", () => {
  const db = mkDb();
  const prog = progresSiklus(db, siswa(db, ID_LUTFANA));
  assert.equal(prog.hadir, 1);
  assert.equal(prog.selesai, false);
  const tag = statusTagihan(db, siswa(db, ID_LUTFANA), NOW);
  assert.equal(tag.jatuhTempo, false);
  assert.equal(tag.bulanTagihan, "2026-12");
});

cek("S5 siswa tanpa pembayaran → fallback lama (hadir = total dibatasi target)", () => {
  const db = mkDb();
  const baru = {
    id: "siswa-baru-1", name: "Siswa Baru", level: "SD", grade: "1",
    program: "Calistung Ceria", parent: "", wa: "", start: "2026-11-01",
    group: "", fee: 150000, meet: 12,
  };
  db.students.push(baru);
  for (const d of ["2026-11-03", "2026-11-05", "2026-11-10", "2026-11-12", "2026-11-17"]) {
    db.attendance[d] ??= {};
    db.attendance[d][baru.id] = "H";
  }
  const prog = progresSiklus(db, baru);
  assert.equal(prog.hadir, 5);
  assert.equal(prog.selesai, false);
  assert.equal(prog.siklusKe, 1);
  /* batas target: 15x hadir tanpa bayar tetap mentok 12 */
  for (let i = 1; i <= 10; i++) {
    const d = `2026-10-${String(i).padStart(2, "0")}`;
    db.attendance[d] ??= {};
    db.attendance[d][baru.id] = "H";
  }
  assert.equal(progresSiklus(db, baru).hadir, 12);
  assert.equal(progresSiklus(db, baru).selesai, true);
});

cek("S6 bayar tengah bulan tanpa payDate → awal siklus tanggal 1 bulan lunas pertama", () => {
  const db = mkDb();
  const s = {
    id: "siswa-s6", name: "Siswa S6", level: "SD", grade: "1",
    program: "Privat", parent: "", wa: "", start: "2026-10-01",
    group: "", fee: 250000, meet: 12,
  };
  db.students.push(s);
  db.payments[s.id] = { "2026-10": "lunas" };
  /* tanpa payDates: awal siklus = 2026-10-01, semua terhitung */
  for (const d of ["2026-10-03", "2026-10-05", "2026-10-10", "2026-11-02", "2026-11-04"]) {
    db.attendance[d] ??= {};
    db.attendance[d][s.id] = "H";
  }
  assert.equal(progresSiklus(db, s).hadir, 5);
});

cek("S7 bayar tengah bulan dengan payDate → payDate diabaikan, awal siklus tetap tanggal 1 bulan lunas pertama", () => {
  const db = mkDb();
  const s = {
    id: "siswa-s7", name: "Siswa S7", level: "SD", grade: "1",
    program: "Privat", parent: "", wa: "", start: "2026-10-01",
    group: "", fee: 250000, meet: 12,
  };
  db.students.push(s);
  db.payments[s.id] = { "2026-10": "lunas" };
  db.payDates[s.id] = { "2026-10": "2026-10-10" };
  for (const d of ["2026-10-03", "2026-10-05", "2026-10-10", "2026-10-12", "2026-11-02"]) {
    db.attendance[d] ??= {};
    db.attendance[d][s.id] = "H";
  }
  /* Iuran dicatat per bulan: awal siklus = 2026-10-01 walau bayar 10 Okt,
   * jadi 3 & 5 Okt ikut terhitung; total 5 */
  assert.equal(progresSiklus(db, s).hadir, 5);
});

cek("S8 nomor kwitansi tidak berubah (Hafidz KWIT/1/M6FV, Shanum KWIT/2/CAQ3)", () => {
  const db = mkDb();
  assert.equal(hitungKwitansiNo(db, siswa(db, ID_HAFIZ), "2026-11"), "KWIT/1/M6FV");
  assert.equal(hitungKwitansiNo(db, siswa(db, ID_SHANUM), "2026-11"), "KWIT/2/CAQ3");
  assert.equal(hitungKwitansiNo(db, siswa(db, ID_AISHWA), "2026-10"), "KWIT/1/17G1");
  assert.equal(hitungKwitansiNo(db, siswa(db, ID_LUTFANA), "2026-11"), "KWIT/1/I719");
});

console.log(`\n${passed} skenario LOLOS, ${failed} GAGAL.`);
rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
