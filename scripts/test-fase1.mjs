/* Uji logika Fase 1 perlindungan data (17 Nov 2026).
 * Menguji kode ASLI src/lib/outbox.ts + types.ts + laporan.ts +
 * renderKwitansi.ts: file-file itu dikompilasi dulu dengan tsc ke
 * direktori sementara, lalu di-require.
 * Jalankan: node scripts/test-fase1.mjs (dari root repo).
 *
 * Yang diuji (logika murni, tanpa React/browser):
 *  O1-O6  antrean perubahan persisten (R1)
 *  V1-V2  validasi unduhan looksValidV1 (R6)
 *  K1-K7  nomor kwitansi tersimpan di database (temuan Fase 2)
 *
 * Yang TIDAK bisa diuji di sini (butuh browser, diuji live):
 *  - layar peringatan "database tidak ditemukan" (R2) dan tiga pilihannya
 *  - indikator status "Belum tersimpan (N)" di header (R5)
 *  - flush keepalive saat tab ditutup
 *  - pemulihan antrean saat boot / sambung ulang */

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tmp = mkdtempSync(join(tmpdir(), "rumbela-fase1-test-"));
try {
  execSync(
    `npx tsc src/lib/constants.ts src/lib/types.ts src/lib/laporan.ts src/lib/renderKwitansi.ts src/lib/outbox.ts ` +
      `--outDir ${tmp} --module commonjs --target es2022 --moduleResolution node ` +
      `--skipLibCheck --esModuleInterop --lib es2022,dom`,
    { stdio: "pipe" }
  );
} catch (e) {
  console.error("Gagal mengkompilasi logika Fase 1:\n" + (e.stdout?.toString() || "") + (e.stderr?.toString() || ""));
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
const { writeOutbox, readOutbox, clearOutbox, outboxHasUnsyncedChanges } = require(join(tmp, "outbox.js"));
const { normalizeDB, looksValidV1, defaultPengaturan } = require(join(tmp, "types.js"));
const { progresSiklus, stempelKwitansiNo, kwitansiNoTersimpan } = require(join(tmp, "laporan.js"));
const { kwitansiNo } = require(join(tmp, "renderKwitansi.js"));

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

/** Storage palsu (pengganti localStorage di Node). */
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}

const ID_LUTFANA = "mwkbqtft9j2i719"; // suffix I719, seperti data asli
function mkDb({ id = ID_LUTFANA, payments = {}, payDates = {}, payAmounts = {}, kwitansiNo: kw = {} } = {}) {
  return {
    students: [{ id, name: "Lutfana", level: "SD", grade: "1", program: "Calistung Ceria", parent: "Ibu Ani", wa: "081234567890", start: "2026-11-17", group: "Grup A", fee: 150000, meet: 12 }],
    payments: { [id]: payments },
    payDates: { [id]: payDates },
    payAmounts: { [id]: payAmounts },
    kwitansiNo: { [id]: kw },
    attendance: {},
    reports: {},
    materials: [],
    journal: {},
    jadwal: { slots: [], kelas: [], items: [] },
    pengaturan: defaultPengaturan(),
    worksheets: [],
  };
}
const SISWA = (db) => db.students[0];

/* ================= antrean persisten (R1) ================= */

cek("O1 tulis lalu baca antrean: db kembali utuh + jumlah perubahan", () => {
  const st = memStorage();
  const db = mkDb({ payments: { "2026-11": "lunas" } });
  writeOutbox(st, db, 3);
  const e = readOutbox(st);
  assert.ok(e);
  assert.equal(e.changes, 3);
  assert.equal(e.db.payments[ID_LUTFANA]["2026-11"], "lunas");
  assert.equal(e.db.students[0].name, "Lutfana");
  assert.ok(typeof e.updatedAt === "number" && e.updatedAt > 0);
});

cek("O2 antrean rusak ditolak (bukan JSON / bukan db / students bukan array)", () => {
  const st = memStorage();
  st.setItem("rumbela-v2-outbox", "bukan json{");
  assert.equal(readOutbox(st), null);
  st.setItem("rumbela-v2-outbox", JSON.stringify({ db: { foo: 1 }, changes: 1, updatedAt: Date.now() }));
  assert.equal(readOutbox(st), null);
  st.setItem("rumbela-v2-outbox", JSON.stringify({ db: { students: "x", materials: [] }, changes: 1, updatedAt: Date.now() }));
  assert.equal(readOutbox(st), null);
  st.setItem("rumbela-v2-outbox", JSON.stringify({ db: mkDb(), changes: 1 }));
  assert.equal(readOutbox(st), null); // updatedAt wajib ada
});

cek("O3 antrean dianggap belum tersimpan bila isi beda dari cache; tidak bila sama", () => {
  const st = memStorage();
  const dbA = mkDb({ payments: { "2026-11": "lunas" } });
  const dbB = mkDb({ payments: { "2026-11": "lunas", "2026-12": "lunas" } });
  writeOutbox(st, dbB, 2);
  const e = readOutbox(st);
  assert.equal(outboxHasUnsyncedChanges(e, dbA), true); // beda isi → belum tersimpan
  assert.equal(outboxHasUnsyncedChanges(e, dbB), false); // sama → sudah tersimpan
  assert.equal(outboxHasUnsyncedChanges(e, null), true); // tidak ada cache → anggap belum tersimpan
  assert.equal(outboxHasUnsyncedChanges(null, dbA), false); // tidak ada antrean
});

cek("O4 clearOutbox menghapus antrean; tulis baru menimpa yang lama", () => {
  const st = memStorage();
  writeOutbox(st, mkDb({ payments: { "2026-11": "lunas" } }), 1);
  writeOutbox(st, mkDb({ payments: { "2026-11": "lunas", "2026-12": "sebagian" } }), 2);
  const e = readOutbox(st);
  assert.equal(e.changes, 2);
  assert.equal(e.db.payments[ID_LUTFANA]["2026-12"], "sebagian");
  clearOutbox(st);
  assert.equal(readOutbox(st), null);
});

cek("O5 simpan gagal lalu reload: perubahan kembali dari antrean (simulasi)", () => {
  // Skenario: mutate menulis antrean; simpan ke Drive gagal (antrean
  // tidak dikosongkan); "reload" = baca ulang antrean, cache masih lama.
  const st = memStorage();
  const cacheLama = mkDb({}); // cache = state terakhir tersimpan (belum bayar)
  const dbBaru = mkDb({ payments: { "2026-11": "lunas" }, payDates: { "2026-11": "2026-11-17" }, payAmounts: { "2026-11": 150000 } });
  writeOutbox(st, dbBaru, 1);
  // simpan gagal → antrean TIDAK dikosongkan (tidak ada clearOutbox)
  const e = readOutbox(st);
  assert.ok(outboxHasUnsyncedChanges(e, cacheLama));
  assert.equal(e.db.payments[ID_LUTFANA]["2026-11"], "lunas");
  assert.equal(e.db.payAmounts[ID_LUTFANA]["2026-11"], 150000);
});

/* ================= validasi unduhan (R6) ================= */

cek("V1 looksValidV1 menolak unduhan rusak (null, {}, tanpa materials, students bukan array)", () => {
  assert.equal(looksValidV1(null), false);
  assert.equal(looksValidV1(undefined), false);
  assert.equal(looksValidV1({}), false);
  assert.equal(looksValidV1({ students: [] }), false);
  assert.equal(looksValidV1({ students: "x", materials: [] }), false);
  assert.equal(looksValidV1({ students: [], materials: "x" }), false);
  assert.equal(looksValidV1("rusak"), false);
});

cek("V2 looksValidV1 menerima database kosong yang valid dan database lengkap", () => {
  assert.equal(looksValidV1({ students: [], materials: [] }), true);
  assert.equal(looksValidV1(mkDb({ payments: { "2026-11": "lunas" } })), true);
});

cek("V3 normalizeDB tidak mengubah unduhan rusak jadi database kosong yang lolos validasi", () => {
  // normalizeDB tetap mengembalikan struktur kosong untuk input rusak
  // (perilaku lama) — yang berubah di Fase 1: syncFromDrive TIDAK BOLEH
  // memanggilnya tanpa looksValidV1 dulu. Tes ini mengunci perilaku
  // normalizeDB supaya tidak diam-diam "memperbaiki" data rusak.
  const n = normalizeDB({ rusak: true });
  assert.deepEqual(n.students, []);
  assert.equal(looksValidV1({ rusak: true }), false);
});

/* ================= nomor kwitansi tersimpan ================= */

cek("K1 pembayaran pertama dicatat → nomor KWIT/1/I719 dibekukan dan terbaca kembali", () => {
  const db = mkDb({ payments: { "2026-11": "lunas" }, payDates: { "2026-11": "2026-11-17" }, payAmounts: { "2026-11": 150000 } });
  stempelKwitansiNo(db, ID_LUTFANA, "2026-11");
  assert.equal(db.kwitansiNo[ID_LUTFANA]["2026-11"], "KWIT/1/I719");
  assert.equal(kwitansiNo(db, SISWA(db), "2026-11"), "KWIT/1/I719");
  assert.equal(kwitansiNoTersimpan(db, ID_LUTFANA, "2026-11"), "KWIT/1/I719");
  // bertahan lewat normalizeDB (simulasi simpan → muat ulang dari Drive)
  const n2 = normalizeDB(JSON.parse(JSON.stringify(db)));
  assert.equal(n2.kwitansiNo[ID_LUTFANA]["2026-11"], "KWIT/1/I719");
  assert.equal(kwitansiNo(n2, SISWA(n2), "2026-11"), "KWIT/1/I719");
});

cek("K2 pembayaran kedua → KWIT/2/I719; nomor pertama tidak berubah", () => {
  const db = mkDb({ payments: { "2026-11": "lunas" }, payDates: { "2026-11": "2026-11-17" }, payAmounts: { "2026-11": 150000 } });
  stempelKwitansiNo(db, ID_LUTFANA, "2026-11");
  db.payments[ID_LUTFANA]["2026-12"] = "lunas";
  db.payDates[ID_LUTFANA]["2026-12"] = "2026-12-17";
  db.payAmounts[ID_LUTFANA]["2026-12"] = 150000;
  stempelKwitansiNo(db, ID_LUTFANA, "2026-12");
  assert.equal(db.kwitansiNo[ID_LUTFANA]["2026-11"], "KWIT/1/I719");
  assert.equal(db.kwitansiNo[ID_LUTFANA]["2026-12"], "KWIT/2/I719");
  assert.equal(progresSiklus(db, SISWA(db), "2026-12").siklusKe, 2);
});

cek("K3 stempel tidak menimpa nomor yang sudah tersimpan", () => {
  const db = mkDb({ payments: { "2026-11": "lunas" } });
  db.kwitansiNo[ID_LUTFANA]["2026-11"] = "KWIT/9/ZZZZ";
  stempelKwitansiNo(db, ID_LUTFANA, "2026-11");
  assert.equal(db.kwitansiNo[ID_LUTFANA]["2026-11"], "KWIT/9/ZZZZ");
  assert.equal(kwitansiNo(db, SISWA(db), "2026-11"), "KWIT/9/ZZZZ");
});

cek("K4 pembayaran dibatalkan ke belum → nomor terhapus; kwitansi kembali ke hitung", () => {
  const db = mkDb({ payments: { "2026-11": "lunas" } });
  stempelKwitansiNo(db, ID_LUTFANA, "2026-11");
  assert.equal(db.kwitansiNo[ID_LUTFANA]["2026-11"], "KWIT/1/I719");
  db.payments[ID_LUTFANA]["2026-11"] = "belum";
  stempelKwitansiNo(db, ID_LUTFANA, "2026-11");
  assert.equal(db.kwitansiNo[ID_LUTFANA]["2026-11"], undefined);
  assert.equal(kwitansiNo(db, SISWA(db), "2026-11"), "KWIT/1/I719"); // fallback hitung
});

cek("K5 data lama tanpa kwitansiNo tetap terbaca; nomor dihitung seperti dulu", () => {
  const raw = mkDb({ payments: { "2026-11": "lunas" } });
  delete raw.kwitansiNo;
  const db = normalizeDB(raw);
  assert.deepEqual(db.kwitansiNo, {});
  assert.equal(kwitansiNo(db, SISWA(db), "2026-11"), "KWIT/1/I719");
});

cek("K6 normalizeDB membuang nomor berformat salah, mempertahankan yang benar (huruf kecil → besar)", () => {
  const raw = mkDb({});
  raw.kwitansiNo = {
    [ID_LUTFANA]: {
      "2026-11": "kwit/1/i719", // huruf kecil → diterima, dijadikan besar
      "2026-12": "KWIT/1", // tidak lengkap → dibuang
      "2026-10": "NOPE", // bukan format kwitansi → dibuang
      "2026-09": 123, // bukan string → dibuang
    },
  };
  const db = normalizeDB(raw);
  assert.equal(db.kwitansiNo[ID_LUTFANA]["2026-11"], "KWIT/1/I719");
  assert.equal(db.kwitansiNo[ID_LUTFANA]["2026-12"], undefined);
  assert.equal(db.kwitansiNo[ID_LUTFANA]["2026-10"], undefined);
  assert.equal(db.kwitansiNo[ID_LUTFANA]["2026-09"], undefined);
});

cek("K7 stempel untuk siswa yang tidak ada tidak crash dan tidak menambah apa-apa", () => {
  const db = mkDb({ payments: { "2026-11": "lunas" } });
  stempelKwitansiNo(db, "tidak-ada", "2026-11");
  assert.deepEqual(Object.keys(db.kwitansiNo), [ID_LUTFANA]);
  assert.deepEqual(db.kwitansiNo[ID_LUTFANA], {});
});

cek("K8 nomor untuk id siswa pendek tetap selamat lewat normalizeDB", () => {
  const db = mkDb({ id: "s1", payments: { "2026-11": "lunas" } });
  stempelKwitansiNo(db, "s1", "2026-11");
  assert.equal(db.kwitansiNo["s1"]["2026-11"], "KWIT/1/S1");
  const n2 = normalizeDB(JSON.parse(JSON.stringify(db)));
  assert.equal(n2.kwitansiNo["s1"]["2026-11"], "KWIT/1/S1");
});

console.log(`\n${passed} skenario LOLOS, ${failed} GAGAL.`);
rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
