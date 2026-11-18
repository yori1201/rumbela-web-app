/* Uji logika revisi Jadwal per nama anak (18 Nov 2026).
 * Menguji kode ASLI src/lib/types.ts + src/lib/laporan.ts: file-file itu
 * dikompilasi dulu dengan tsc ke direktori sementara, lalu di-require.
 * Logika itemAt/saveItem yang baru tinggal di komponen React (tidak bisa
 * jalan di Node), jadi di sini diwakili dua fungsi murni yang menyalin
 * persis rumus komponen lama dan baru, lalu dibandingkan pada data live.
 * Jalankan: node scripts/test-jadwal-nama.mjs (dari root repo).
 *
 * Fixture = 10 item jadwal live per 18 Nov 2026 14:20 WIB (dari
 * rumbela-database.json): 8 slot 09:00-17:00, jadwal.kelas ['Privat'],
 * semua item punya siswaIds eksplisit.
 *
 * Yang diuji:
 *  J1  tidak ada tabrakan (hari, slot) antar kelas
 *  J2  itemAt baru (hari+slot saja) menemukan tepat 10 item yang sama
 *      seperti logika lama per kelas
 *  J3  menyimpan di sel yang sudah terisi mengganti item lama tanpa duplikat
 *  J4  normalizeDB tetap membaca item lama (kelas tersimpan, siswaIds utuh)
 *  J5  itemsOnDay (dipakai Beranda/Absensi) tetap bekerja
 *
 * Yang TIDAK bisa diuji di sini (butuh browser, diuji live):
 *  - tab kelas hilang, grid selalu tampil walau belum ada item
 *  - dialog sel: pilihan awal kosong untuk sel baru, daftar semua siswa
 *  - kartu "jadwal hari ini" di Beranda tanpa "· kelas" */

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tmp = mkdtempSync(join(tmpdir(), "rumbela-jadwal-test-"));
try {
  execSync(
    `npx tsc src/lib/constants.ts src/lib/types.ts src/lib/laporan.ts ` +
      `--outDir ${tmp} --module commonjs --target es2022 --moduleResolution node ` +
      `--skipLibCheck --esModuleInterop --lib es2022,dom`,
    { stdio: "pipe" }
  );
} catch (e) {
  console.error("Gagal mengkompilasi logika jadwal:\n" + (e.stdout?.toString() || "") + (e.stderr?.toString() || ""));
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
const { HARI } = require(join(tmp, "constants.js"));
const { normalizeDB, defaultPengaturan } = require(join(tmp, "types.js"));
const { kelasList, itemsOnDay, siswaIdsOfItem, namaSiswaOfItem } = require(join(tmp, "laporan.js"));

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

/* ===== Fixture: data jadwal live 18 Nov 2026 ===== */

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

const SLOTS = [
  { mulai: "09:00", selesai: "10:00" },
  { mulai: "10:00", selesai: "11:00" },
  { mulai: "11:00", selesai: "12:00" },
  { mulai: "12:00", selesai: "13:00" },
  { mulai: "13:00", selesai: "14:00" },
  { mulai: "14:00", selesai: "15:00" },
  { mulai: "15:00", selesai: "16:00" },
  { mulai: "16:00", selesai: "17:00" },
];

/* 10 item live (urut hari, slot). Slot 0 = 09:00. */
const ITEMS = [
  { id: "mwlrv5voju32p5i", kelas: "Privat", hari: "Senin", slot: 7, program: "Calistung Ceria", pengajar: "Bubu Shani", warna: "#1d4ed8", siswaIds: [ID_HAFIZ] },
  { id: "mwls2yoql1m30ts", kelas: "Privat", hari: "Selasa", slot: 2, program: "Privat", pengajar: "Bubu Shani", warna: "#be185d", siswaIds: [ID_SHANUM] },
  { id: "mwls3uezaqn4xlt", kelas: "Grup A", hari: "Selasa", slot: 3, program: "Calistung Ceria", pengajar: "Bubu Shani", warna: "#b91c1c", siswaIds: [ID_LUTFANA, ID_AISHWA] },
  { id: "mwlrz4v8y1bjykn", kelas: "Privat", hari: "Rabu", slot: 2, program: "Privat", pengajar: "Bubu Shani", warna: "#be185d", siswaIds: [ID_SHANUM] },
  { id: "mwls4dcwp1y16i8", kelas: "Grup A", hari: "Rabu", slot: 3, program: "Calistung Ceria", pengajar: "Bubu Shani", warna: "#b91c1c", siswaIds: [ID_LUTFANA] },
  { id: "mwls0but8wozgld", kelas: "Privat", hari: "Rabu", slot: 7, program: "Privat", pengajar: "Bubu Shani", warna: "#1d4ed8", siswaIds: [ID_HAFIZ] },
  { id: "mwlrzs33t5q1eic", kelas: "Privat", hari: "Kamis", slot: 2, program: "Privat", pengajar: "Bubu Shani", warna: "#be185d", siswaIds: [ID_SHANUM] },
  { id: "mwls4vhx44javs9", kelas: "Grup A", hari: "Kamis", slot: 3, program: "Calistung Ceria", pengajar: "Bubu Shani", warna: "#b91c1c", siswaIds: [ID_LUTFANA, ID_AISHWA] },
  { id: "mwls0onvh5s4dqk", kelas: "Privat", hari: "Jumat", slot: 7, program: "Privat", pengajar: "", warna: "#1d4ed8", siswaIds: [ID_HAFIZ] },
  { id: "mwls5nhju9qssgo", kelas: "Grup A", hari: "Sabtu", slot: 1, program: "Calistung Ceria", pengajar: "Bubu Shani", warna: "#b91c1c", siswaIds: [ID_AISHWA] },
];

function mkDb(items = ITEMS) {
  return {
    students: JSON.parse(JSON.stringify(STUDENTS)),
    payments: {}, payDates: {}, payAmounts: {}, kwitansiNo: {},
    attendance: {}, reports: {}, materials: [], journal: {},
    jadwal: { slots: JSON.parse(JSON.stringify(SLOTS)), kelas: ["Privat"], items: JSON.parse(JSON.stringify(items)) },
    pengaturan: defaultPengaturan(),
    worksheets: [],
  };
}

/* Rumus komponen LAMA: saring per kelas dulu, baru cari hari+slot. */
function itemAtLama(items, kelas, hari, slot) {
  return items.filter((i) => i.kelas === kelas).find((i) => i.hari === hari && i.slot === slot);
}
/* Rumus komponen BARU: cari hari+slot saja, tanpa kelas. */
function itemAtBaru(items, hari, slot) {
  return items.find((i) => i.hari === hari && i.slot === slot);
}
/* Rumus simpan BARU: ganti item apa pun di sel (hari, slot), kelas "". */
function saveItemBaru(items, hari, slot, data) {
  const next = items.filter((i) => !(i.hari === hari && i.slot === slot));
  next.push({ id: `baru-${hari}-${slot}`, kelas: "", hari, slot, ...data });
  return next;
}

cek("J1 tidak ada tabrakan (hari, slot) antar kelas pada 10 item live", () => {
  const kunci = ITEMS.map((i) => `${i.hari}|${i.slot}`);
  assert.equal(new Set(kunci).size, 10);
  assert.equal(ITEMS.length, 10);
});

cek("J2 itemAt baru menemukan tepat 10 item yang sama seperti logika lama per kelas", () => {
  const db = mkDb();
  const kelas = kelasList(db);
  assert.deepEqual(kelas, ["Grup A", "Privat"]);
  let terisi = 0;
  for (const h of HARI) {
    for (let s = 0; s < SLOTS.length; s++) {
      const lama = kelas.map((k) => itemAtLama(db.jadwal.items, k, h, s)).filter(Boolean);
      assert.ok(lama.length <= 1, `sel ${h} slot ${s} punya ${lama.length} item lama`);
      const baru = itemAtBaru(db.jadwal.items, h, s);
      assert.equal(baru?.id, lama[0]?.id, `sel ${h} slot ${s}: baru vs lama beda`);
      if (baru) terisi++;
    }
  }
  assert.equal(terisi, 10);
  /* tiap item live ditemukan logika baru di selnya sendiri */
  for (const it of ITEMS) {
    assert.equal(itemAtBaru(db.jadwal.items, it.hari, it.slot)?.id, it.id);
  }
});

cek("J3 menyimpan di sel terisi mengganti item lama tanpa duplikat", () => {
  const db = mkDb();
  /* Selasa slot 3 ditempati Calistung Ceria (Grup A, Lutfana + Aishwa). */
  const lama = itemAtBaru(db.jadwal.items, "Selasa", 3);
  assert.equal(lama.program, "Calistung Ceria");
  const next = saveItemBaru(db.jadwal.items, "Selasa", 3, {
    program: "Privat", pengajar: "Bubu Shani", warna: "#be185d", siswaIds: [ID_SHANUM],
  });
  assert.equal(next.length, 10);
  assert.equal(new Set(next.map((i) => i.id)).size, 10);
  const sel = itemAtBaru(next, "Selasa", 3);
  assert.equal(sel.program, "Privat");
  assert.equal(sel.kelas, "");
  assert.deepEqual(sel.siswaIds, [ID_SHANUM]);
  assert.ok(!next.some((i) => i.id === lama.id), "item lama harus hilang");
  /* sel kosong: Senin slot 0 menambah item, jumlah jadi 11 */
  const next2 = saveItemBaru(next, "Senin", 0, {
    program: "Calistung Ceria", pengajar: "Bubu Shani", warna: "#b91c1c", siswaIds: [ID_AISHWA],
  });
  assert.equal(next2.length, 11);
  assert.equal(itemAtBaru(next2, "Senin", 0).program, "Calistung Ceria");
});

cek("J4 normalizeDB tetap membaca item lama (kelas tersimpan, siswaIds utuh)", () => {
  const n = normalizeDB(mkDb());
  assert.equal(n.jadwal.items.length, 10);
  assert.deepEqual(n.jadwal.kelas, ["Privat"]);
  assert.deepEqual(n.jadwal.slots, SLOTS);
  for (const it of ITEMS) {
    const baca = n.jadwal.items.find((x) => x.id === it.id);
    assert.ok(baca, `item ${it.id} hilang setelah normalizeDB`);
    assert.equal(baca.kelas, it.kelas);
    assert.equal(baca.hari, it.hari);
    assert.equal(baca.slot, it.slot);
    assert.equal(baca.program, it.program);
    assert.deepEqual(baca.siswaIds, it.siswaIds);
  }
  /* nama peserta Selasa slot 3 tetap Lutfana + Aishwa (urut abjad) */
  const selasa3 = n.jadwal.items.find((x) => x.id === "mwls3uezaqn4xlt");
  assert.deepEqual(namaSiswaOfItem(n, selasa3), ["Aishwa Humaira Arafahni", "Lutfana Dwi Fahira"]);
  /* item lama tanpa siswaIds tetap memakai fallback sekelas (perilaku lama) */
  const legacy = {
    id: "legacy-1", kelas: "Grup A", hari: "Senin", slot: 1,
    program: "Calistung Ceria", pengajar: "Bubu Shani", warna: "#b91c1c",
  };
  const n2 = normalizeDB(mkDb([...ITEMS, legacy]));
  const bacaLegacy = n2.jadwal.items.find((x) => x.id === "legacy-1");
  assert.equal(bacaLegacy.kelas, "Grup A");
  assert.deepEqual(siswaIdsOfItem(n2, bacaLegacy), [ID_LUTFANA]);
});

cek("J5 itemsOnDay tetap bekerja (dipakai Beranda/Absensi)", () => {
  const db = mkDb();
  const selasa = itemsOnDay(db, "Selasa");
  assert.equal(selasa.length, 2);
  assert.deepEqual(selasa.map((i) => i.slot), [2, 3]);
  assert.deepEqual(itemsOnDay(db, "Minggu"), []);
});

console.log(`\n${passed} skenario LOLOS, ${failed} GAGAL.`);
rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
