/* Uji logika iuran model BAYAR DI DEPAN (17 Nov 2026).
 * Menguji kode ASLI src/lib/laporan.ts + renderKwitansi.ts: file-file itu
 * dikompilasi dulu dengan tsc ke direktori sementara, lalu di-require.
 * Jalankan: node scripts/test-iuran-baru.mjs (dari root repo).
 * Skenario memakai tanggal "sekarang" yang eksplisit supaya deterministik. */

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tmp = mkdtempSync(join(tmpdir(), "rumbela-iuran-test-"));
try {
  execSync(
    `npx tsc src/lib/constants.ts src/lib/types.ts src/lib/laporan.ts src/lib/renderKwitansi.ts ` +
      `--outDir ${tmp} --module commonjs --target es2022 --moduleResolution node ` +
      `--skipLibCheck --esModuleInterop --lib es2022,dom`,
    { stdio: "pipe" }
  );
} catch (e) {
  console.error("Gagal mengkompilasi logika iuran:\n" + (e.stdout?.toString() || "") + (e.stderr?.toString() || ""));
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
const { progresSiklus, statusTagihan, waIngatkanIuran } = require(join(tmp, "laporan.js"));
const { kwitansiNo, kwitansiWaText } = require(join(tmp, "renderKwitansi.js"));
const { defaultPengaturan } = require(join(tmp, "types.js"));
const { nextMonthKey } = require(join(tmp, "constants.js"));

let passed = 0;
function cek(nama, fn) {
  fn();
  passed++;
  console.log(`OK  ${nama}`);
}

/** Tanggal-tanggal hadir (H) berurutan mulai 2026-11-01. */
function tglHadir(n, id = "s1") {
  const out = {};
  const d = new Date(2026, 10, 1);
  for (let i = 0; i < n; i++) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out[iso] = { [id]: "H" };
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function mkDb({ id = "s1", meet = 12, fee = 150000, payments = {}, payDates = {}, payAmounts = {}, hadir = 0 }) {
  return {
    students: [{ id, name: "Aisyah", level: "SD", grade: "2", program: "Calistung Ceria", parent: "Ibu Ratna", wa: "081234567890", start: "2026-11-03", group: "Grup A", fee, meet }],
    payments: { [id]: payments },
    payDates: { [id]: payDates },
    payAmounts: { [id]: payAmounts },
    attendance: tglHadir(hadir, id),
    reports: {},
    materials: [],
    journal: {},
    jadwal: { slots: [], kelas: [], items: [] },
    pengaturan: defaultPengaturan(),
    worksheets: [],
  };
}
const SISWA = (db) => db.students[0];
const NOV = new Date(2026, 10, 15); // 15 Nov 2026
const DES = new Date(2026, 11, 10); // 10 Des 2026

cek("S1 siswa baru belum bayar → jatuh tempo (tagihan pertama), bulan tagihan Nov", () => {
  const db = mkDb({});
  const p = progresSiklus(db, SISWA(db));
  assert.equal(p.hadir, 0);
  assert.equal(p.siklusKe, 1);
  assert.equal(p.selesai, false);
  const t = statusTagihan(db, SISWA(db), NOV);
  assert.equal(t.jatuhTempo, true);
  assert.equal(t.sebabJatuhTempo, "kalender");
  assert.equal(t.bulanTagihan, "2026-11");
  assert.equal(t.siklusBerikutnya, 1);
  assert.equal(t.peringatanPertemuan, false);
});

cek("S2 bayar di depan Nov, 0 hadir → lunas, belum jatuh tempo, tagihan berikutnya Des", () => {
  const db = mkDb({ payments: { "2026-11": "lunas" }, payDates: { "2026-11": "2026-11-03" }, payAmounts: { "2026-11": 150000 } });
  const p = progresSiklus(db, SISWA(db));
  assert.equal(p.siklusKe, 2);
  const t = statusTagihan(db, SISWA(db), NOV);
  assert.equal(t.jatuhTempo, false);
  assert.equal(t.bulanTagihan, "2026-12");
  assert.equal(t.peringatanPertemuan, false);
});

cek("S3 bayar di depan, hadir 11/12 → pengingat pertemuan ke-11, belum jatuh tempo", () => {
  const db = mkDb({ payments: { "2026-11": "lunas" }, payDates: { "2026-11": "2026-11-03" }, payAmounts: { "2026-11": 150000 }, hadir: 11 });
  const t = statusTagihan(db, SISWA(db), NOV);
  assert.equal(t.peringatanPertemuan, true);
  assert.equal(t.jatuhTempo, false);
  const teks = decodeURIComponent(waIngatkanIuran(db, SISWA(db), NOV).split("text=")[1]);
  assert.ok(teks.includes("11 dari 12 pertemuan"), "teks WA harus menyebut 11 dari 12");
});

cek("S4 bayar di depan, hadir 12/12 → jatuh tempo karena pertemuan selesai", () => {
  const db = mkDb({ payments: { "2026-11": "lunas" }, payDates: { "2026-11": "2026-11-03" }, payAmounts: { "2026-11": 150000 }, hadir: 12 });
  const p = progresSiklus(db, SISWA(db));
  assert.equal(p.hadir, 12);
  assert.equal(p.selesai, true);
  const t = statusTagihan(db, SISWA(db), NOV);
  assert.equal(t.jatuhTempo, true);
  assert.equal(t.sebabJatuhTempo, "pertemuan");
  assert.equal(t.bulanTagihan, "2026-12");
});

cek("S5 bayar Nov saja, hadir 5, bulan berganti ke Des → jatuh tempo karena kalender", () => {
  const db = mkDb({ payments: { "2026-11": "lunas" }, payDates: { "2026-11": "2026-11-03" }, payAmounts: { "2026-11": 150000 }, hadir: 5 });
  const t = statusTagihan(db, SISWA(db), DES);
  assert.equal(t.jatuhTempo, true);
  assert.equal(t.sebabJatuhTempo, "kalender");
  assert.equal(t.bulanTagihan, "2026-12");
});

cek("S6 bayar Nov+Des, hadir 5 → penghitung siklus baru mulai 0, belum jatuh tempo", () => {
  const db = mkDb({
    payments: { "2026-11": "lunas", "2026-12": "lunas" },
    payDates: { "2026-11": "2026-11-03", "2026-12": "2026-12-10" },
    payAmounts: { "2026-11": 150000, "2026-12": 150000 },
    hadir: 5,
  });
  const p = progresSiklus(db, SISWA(db));
  assert.equal(p.hadir, 0); // 5 pertemuan masuk siklus pertama, siklus ke-2 baru 0
  assert.equal(p.siklusKe, 3);
  const t = statusTagihan(db, SISWA(db), DES);
  assert.equal(t.jatuhTempo, false);
  assert.equal(t.bulanTagihan, "2027-01");
});

cek("S7 bayar Nov+Des, hadir 23 → pengingat pertemuan ke-11 siklus ke-2", () => {
  const db = mkDb({
    payments: { "2026-11": "lunas", "2026-12": "lunas" },
    payDates: { "2026-11": "2026-11-03", "2026-12": "2026-12-10" },
    payAmounts: { "2026-11": 150000, "2026-12": 150000 },
    hadir: 23,
  });
  const p = progresSiklus(db, SISWA(db));
  assert.equal(p.hadir, 11);
  assert.equal(statusTagihan(db, SISWA(db), DES).peringatanPertemuan, true);
});

cek("S8 bayar Nov+Des, hadir 24 → jatuh tempo karena pertemuan (siklus ke-2 habis)", () => {
  const db = mkDb({
    payments: { "2026-11": "lunas", "2026-12": "lunas" },
    payDates: { "2026-11": "2026-11-03", "2026-12": "2026-12-10" },
    payAmounts: { "2026-11": 150000, "2026-12": 150000 },
    hadir: 24,
  });
  const t = statusTagihan(db, SISWA(db), DES);
  assert.equal(t.jatuhTempo, true);
  assert.equal(t.sebabJatuhTempo, "pertemuan");
});

cek("S9 baru bayar sebagian (belum lunas) → tetap jatuh tempo, bulan tagihan Nov", () => {
  const db = mkDb({ payments: { "2026-11": "sebagian" }, payDates: { "2026-11": "2026-11-03" }, payAmounts: { "2026-11": 75000 }, hadir: 3 });
  const t = statusTagihan(db, SISWA(db), NOV);
  assert.equal(t.jatuhTempo, true);
  assert.equal(t.bulanTagihan, "2026-11");
});

cek("S10 data lama: bayar Okt, hadir 17, Nov → jatuh tempo (pertemuan habis)", () => {
  const db = mkDb({ payments: { "2026-10": "lunas" }, payDates: { "2026-10": "2026-10-05" }, payAmounts: { "2026-10": 150000 }, hadir: 17 });
  const p = progresSiklus(db, SISWA(db));
  assert.equal(p.hadir, 12);
  assert.equal(p.selesai, true);
  assert.equal(statusTagihan(db, SISWA(db), NOV).jatuhTempo, true);
});

cek("S11 data lama setelah bayar Nov (L=2), hadir 17 → penghitung jalan lagi (5/12), tidak jatuh tempo", () => {
  const db = mkDb({
    payments: { "2026-10": "lunas", "2026-11": "lunas" },
    payDates: { "2026-10": "2026-10-05", "2026-11": "2026-11-12" },
    payAmounts: { "2026-10": 150000, "2026-11": 150000 },
    hadir: 17,
  });
  const p = progresSiklus(db, SISWA(db));
  assert.equal(p.hadir, 5);
  assert.equal(p.selesai, false);
  assert.equal(statusTagihan(db, SISWA(db), NOV).jatuhTempo, false);
});

cek("S12 nomor kwitansi mengikuti urutan pembayaran (KWIT/1 lalu KWIT/2), teks WA tanpa syarat pertemuan", () => {
  const db = mkDb({ id: "abc1234", payments: { "2026-11": "lunas" }, payDates: { "2026-11": "2026-11-03" }, payAmounts: { "2026-11": 150000 } });
  assert.equal(kwitansiNo(db, SISWA(db), "2026-11"), "KWIT/1/1234");
  db.payments["abc1234"]["2026-12"] = "lunas";
  assert.equal(kwitansiNo(db, SISWA(db), "2026-12"), "KWIT/2/1234");
  const teks = kwitansiWaText(db, SISWA(db), "2026-11");
  assert.ok(teks.includes("LUNAS"), "kwitansi pembayaran pertama harus LUNAS");
  assert.ok(!teks.includes("setelah"), "teks kwitansi tidak boleh mensyaratkan pertemuan selesai");
});

cek("S13 nextMonthKey ganti tahun dengan benar", () => {
  assert.equal(nextMonthKey("2026-11"), "2026-12");
  assert.equal(nextMonthKey("2026-12"), "2027-01");
});

cek("S14 pertemuan per pembayaran custom (meet=10): pengingat di 9, jatuh tempo di 10", () => {
  const db9 = mkDb({ meet: 10, payments: { "2026-11": "lunas" }, payDates: { "2026-11": "2026-11-03" }, payAmounts: { "2026-11": 150000 }, hadir: 9 });
  assert.equal(statusTagihan(db9, SISWA(db9), NOV).peringatanPertemuan, true);
  const db10 = mkDb({ meet: 10, payments: { "2026-11": "lunas" }, payDates: { "2026-11": "2026-11-03" }, payAmounts: { "2026-11": 150000 }, hadir: 10 });
  assert.equal(statusTagihan(db10, SISWA(db10), NOV).jatuhTempo, true);
  assert.equal(statusTagihan(db10, SISWA(db10), NOV).sebabJatuhTempo, "pertemuan");
});

rmSync(tmp, { recursive: true, force: true });
console.log(`\nSemua ${passed} skenario iuran baru LOLOS.`);
