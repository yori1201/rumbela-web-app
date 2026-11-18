/* Uji logika revisi Jurnal (18 Nov 2026).
 * Menguji kode ASLI src/lib/types.ts + src/lib/laporan.ts: file-file itu
 * dikompilasi dulu dengan tsc ke direktori sementara, lalu di-require.
 * Aturan yang tinggal di komponen React (jurnal.tsx) diwakili fungsi murni
 * yang menyalin persis rumus komponen setelah revisi — sama seperti pola
 * test-jadwal-nama.mjs.
 * Jalankan: node scripts/test-jurnal-revisi.mjs (dari root repo).
 *
 * Yang diuji:
 *  R1  simpan manual dengan teks kosong tetap menulis entri (dan toast
 *      muncul karena simpan manual yang menulis selalu diiringi toast)
 *  R2  simpan manual dengan teks sama seperti tersimpan tetap no-op
 *  R3  auto-save (senyap) melewati teks kosong, tidak menulis entri
 *  R4  previewSid mengikuti sid, lalu waSid, lalu siswa pertama
 *  R5  laporan/pratinjau jatuh ke progres umum bila progres khusus kosong
 *      (kode ASLI suggestNote dari laporan.ts)
 *  R6  penanda tersimpan mengenali entri kosong (keberadaan entri, bukan isi)
 *  R7  normalizeDB mempertahankan entri progres kosong saat muat ulang
 *      (kode ASLI types.ts) dan tetap membuang nilai bukan string
 *  R8  hitungan "N siswa" di Catatan terakhir menghitung entri kosong juga
 *
 * Yang TIDAK bisa diuji di sini (butuh browser, diuji live):
 *  - tombol "Simpan progres" benar-benar menulis + toast muncul di layar
 *  - chip "Progres tersimpan hari ini" muncul untuk entri kosong
 *  - pratinjau template menampilkan nama siswa yang dipilih di atas
 *  - kirim WA tetap memakai siswa yang dipilih di bagian kirim */

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tmp = mkdtempSync(join(tmpdir(), "rumbela-jurnal-test-"));
try {
  execSync(
    `npx tsc src/lib/constants.ts src/lib/types.ts src/lib/laporan.ts ` +
      `--outDir ${tmp} --module commonjs --target es2022 --moduleResolution node ` +
      `--skipLibCheck --esModuleInterop --lib es2022,dom`,
    { stdio: "pipe" }
  );
} catch (e) {
  console.error("Gagal mengkompilasi logika Jurnal:\n" + (e.stdout?.toString() || "") + (e.stderr?.toString() || ""));
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
const { normalizeDB } = require(join(tmp, "types.js"));
const { suggestNote } = require(join(tmp, "laporan.js"));

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

/* ---- Rumus komponen (menyalin persis jurnal.tsx setelah revisi) ---- */

/** Aturan simpanProgres: kembalikan true bila simpan akan menulis entri.
 *  adaEntri = entri siswa sudah ada di jurnal tanggal ini (walau kosong). */
function aturanSimpanProgres({ txt, tersimpan, adaEntri, senyap }) {
  if (adaEntri && txt.trim() === tersimpan.trim()) return false;
  if (!txt.trim() && senyap) return false;
  return true;
}

/** Aturan previewSid: sid (Catat progres untuk) dulu, lalu waSid, lalu siswa pertama. */
function aturanPreviewSid({ sid, waSid, firstId }) {
  return sid || waSid || firstId || "";
}

/** Penanda "sudah ada catatan tersimpan": keberadaan entri, bukan isi teks. */
function adaProgresTersimpan(entry, sid) {
  return !!sid && entry?.siswa?.[sid] !== undefined;
}

/** Daftar chip "Progres tersimpan hari ini": entri kosong tetap terhitung. */
function tersimpanHariIni(entry, students) {
  return Object.entries(entry?.siswa ?? {})
    .map(([id]) => students.find((x) => x.id === id))
    .filter(Boolean);
}

/** Hitungan "N siswa" di Catatan terakhir: jumlah entri, teks kosong terhitung. */
function jumlahSiswaCatatan(entry) {
  return Object.keys(entry?.siswa ?? {}).length;
}

/** Fallback progres di dailyVars (pratinjau): khusus dulu, bila kosong pakai umum. */
function progresPratinjau(progresKhusus, progresUmum) {
  return (progresKhusus?.trim() || "") || progresUmum.trim() || "";
}

/* ---- Data uji ---- */
const SISWA = [
  { id: "s-ais", name: "Aishwa Humaira Arafahni" },
  { id: "s-sha", name: "Shanum Arumi Fadli" },
  { id: "s-haf", name: "Al Hafizhan Ramadhan Lubis" },
];

function dbDenganJurnal(journal) {
  return normalizeDB({
    students: [
      { id: "s-ais", name: "Aishwa Humaira Arafahni", level: "SD", grade: "1", program: "Pendampingan Belajar & PR", parent: "Ibu Ais", wa: "", start: "2026-10-01", group: "", fee: 150000, meet: 12 },
      { id: "s-sha", name: "Shanum Arumi Fadli", level: "SD", grade: "2", program: "Privat", parent: "", wa: "", start: "2026-10-01", group: "", fee: 250000, meet: 12 },
      { id: "s-haf", name: "Al Hafizhan Ramadhan Lubis", level: "SD", grade: "3", program: "Privat", parent: "", wa: "", start: "2026-11-01", group: "", fee: 250000, meet: 12 },
    ],
    payments: {},
    attendance: {},
    reports: {},
    materials: [],
    journal,
    jadwal: { slots: [], kelas: [], items: [] },
    pengaturan: {},
    worksheets: [],
  });
}

/* ---- R1: simpan manual dengan teks kosong tetap menulis entri ---- */
cek("R1 simpan manual teks kosong menulis entri (toast ikut karena manual)", () => {
  // Belum ada entri tersimpan, draf kosong, tombol Simpan ditekan:
  assert.equal(aturanSimpanProgres({ txt: "", tersimpan: "", adaEntri: false, senyap: false }), true);
  // Entri kosong yang sudah tersimpan tidak ditulis ulang:
  assert.equal(aturanSimpanProgres({ txt: "", tersimpan: "", adaEntri: true, senyap: false }), false);
  // Simulasi tulisnya seperti mutate di komponen:
  const entry = { activity: "", progress: "", siswa: {} };
  entry.siswa["s-sha"] = "";
  assert.equal("s-sha" in entry.siswa, true);
  assert.equal(entry.siswa["s-sha"], "");
  // Entri kosong bertahan melewati normalizeDB (muat ulang dari Drive):
  const db = dbDenganJurnal({ "2026-11-18": { activity: "", progress: "", siswa: { "s-sha": "" } } });
  assert.equal(db.journal["2026-11-18"].siswa["s-sha"], "");
});

/* ---- R2: simpan manual dengan teks sama tetap no-op ---- */
cek("R2 simpan manual teks sama seperti tersimpan tidak menulis ulang", () => {
  assert.equal(aturanSimpanProgres({ txt: "Makin lancar", tersimpan: "Makin lancar", adaEntri: true, senyap: false }), false);
  assert.equal(aturanSimpanProgres({ txt: "  ", tersimpan: "", adaEntri: true, senyap: false }), false);
  assert.equal(aturanSimpanProgres({ txt: "Baru", tersimpan: "Lama", adaEntri: true, senyap: false }), true);
  // Mengosongkan progres yang sudah berisi (sengaja dihapus lalu Simpan) menulis "" :
  assert.equal(aturanSimpanProgres({ txt: "", tersimpan: "Lama", adaEntri: true, senyap: false }), true);
});

/* ---- R3: auto-save melewati teks kosong ---- */
cek("R3 auto-save (senyap) melewati teks kosong, tidak menulis entri", () => {
  assert.equal(aturanSimpanProgres({ txt: "", tersimpan: "", adaEntri: false, senyap: true }), false);
  assert.equal(aturanSimpanProgres({ txt: "   ", tersimpan: "Lama", adaEntri: true, senyap: true }), false);
  // Auto-save dengan teks berisi tetap berjalan seperti dulu:
  assert.equal(aturanSimpanProgres({ txt: "Makin lancar", tersimpan: "", adaEntri: false, senyap: true }), true);
});

/* ---- R4: previewSid mengikuti sid dulu ---- */
cek("R4 pratinjau mengikuti siswa 'Catat progres untuk' (sid) dulu", () => {
  // Kasus pemilik: sid=Shanum, waSid kosong, siswa pertama=Aishwa → Shanum:
  assert.equal(aturanPreviewSid({ sid: "s-sha", waSid: "", firstId: "s-ais" }), "s-sha");
  // sid kosong (Umum) → waSid dipakai seperti dulu:
  assert.equal(aturanPreviewSid({ sid: "", waSid: "s-haf", firstId: "s-ais" }), "s-haf");
  // sid dan waSid kosong → siswa pertama:
  assert.equal(aturanPreviewSid({ sid: "", waSid: "", firstId: "s-ais" }), "s-ais");
  // sid mengalahkan waSid yang sudah terisi:
  assert.equal(aturanPreviewSid({ sid: "s-ais", waSid: "s-sha", firstId: "s-haf" }), "s-ais");
  // tidak ada siswa sama sekali → string kosong:
  assert.equal(aturanPreviewSid({ sid: "", waSid: "", firstId: "" }), "");
});

/* ---- R5: laporan jatuh ke progres umum bila khusus kosong (kode asli) ---- */
cek("R5 suggestNote: progres khusus kosong jatuh ke progres umum", () => {
  const dbKosong = dbDenganJurnal({
    "2026-11-18": { activity: "", progress: "Progres umum hari ini", siswa: { "s-sha": "" } },
  });
  const shanum = dbKosong.students.find((s) => s.id === "s-sha");
  const hasil = suggestNote(dbKosong, shanum, "2026-11");
  assert.ok(hasil.includes("Progres umum hari ini"), `hasil: ${hasil}`);
});
cek("R5b suggestNote: progres khusus berisi dipakai, umum tidak dipakai", () => {
  const dbIsi = dbDenganJurnal({
    "2026-11-18": { activity: "", progress: "Progres umum hari ini", siswa: { "s-sha": "Makin lancar membaca" } },
  });
  const shanum = dbIsi.students.find((s) => s.id === "s-sha");
  const hasil = suggestNote(dbIsi, shanum, "2026-11");
  assert.ok(hasil.includes("Makin lancar membaca"), `hasil: ${hasil}`);
  assert.ok(!hasil.includes("Progres umum hari ini"), `hasil: ${hasil}`);
});

/* ---- R6: penanda tersimpan mengenali entri kosong ---- */
cek("R6 penanda 'sudah ada catatan tersimpan' mengenali entri kosong", () => {
  const entryKosong = { activity: "", progress: "", siswa: { "s-sha": "" } };
  assert.equal(adaProgresTersimpan(entryKosong, "s-sha"), true);
  assert.equal(adaProgresTersimpan(entryKosong, "s-ais"), false);
  assert.equal(adaProgresTersimpan(undefined, "s-sha"), false);
  assert.equal(adaProgresTersimpan(entryKosong, ""), false);
});
cek("R6b chip 'Progres tersimpan hari ini' memuat siswa berentri kosong", () => {
  const entry = { activity: "", progress: "", siswa: { "s-sha": "", "s-ais": "Makin lancar" } };
  const chips = tersimpanHariIni(entry, SISWA);
  assert.deepEqual(chips.map((s) => s.id).sort(), ["s-ais", "s-sha"]);
});

/* ---- R7: normalizeDB mempertahankan entri kosong (kode asli) ---- */
cek("R7 normalizeDB mempertahankan progres kosong, membuang bukan string", () => {
  const db = dbDenganJurnal({
    "2026-11-18": { activity: "", progress: "", siswa: { "s-sha": "", "s-ais": "Isi", "s-haf": 123 } },
  });
  const siswa = db.journal["2026-11-18"].siswa;
  assert.equal(siswa["s-sha"], "");
  assert.equal(siswa["s-ais"], "Isi");
  assert.equal("s-haf" in siswa, false);
});

/* ---- R8: hitungan N siswa menghitung entri kosong ---- */
cek("R8 'N siswa' di Catatan terakhir menghitung entri kosong", () => {
  assert.equal(jumlahSiswaCatatan({ siswa: { "s-sha": "" } }), 1);
  assert.equal(jumlahSiswaCatatan({ siswa: { "s-sha": "", "s-ais": "Isi" } }), 2);
  assert.equal(jumlahSiswaCatatan({}), 0);
  assert.equal(jumlahSiswaCatatan(undefined), 0);
});

/* ---- Fallback progres pratinjau (dailyVars) ---- */
cek("R5c pratinjau: progres khusus kosong jatuh ke progres umum", () => {
  assert.equal(progresPratinjau("", "Progres umum hari ini"), "Progres umum hari ini");
  assert.equal(progresPratinjau("   ", "Progres umum hari ini"), "Progres umum hari ini");
  assert.equal(progresPratinjau("Makin lancar", "Progres umum hari ini"), "Makin lancar");
});

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} skenario LOLOS, ${failed} GAGAL.`);
if (failed > 0) process.exit(1);
