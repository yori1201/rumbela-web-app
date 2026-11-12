/* Uji menyeluruh bank soal: semua mapel × jenjang × kelas × topik × kesulitan.
   Memastikan: (1) tidak ada lagi soal titik "●", (2) soal bergambar punya
   visual emoji, (3) soal ter-generate & unik, (4) sanity jawaban numerik. */
import {
  GEN_MAPEL, TOPIK_GENERATOR, generateQuestions, kelasTersedia,
  type GenMapel, type Kesulitan,
} from "../src/lib/generatorSoal";

/* topik yang WAJIB punya visual emoji (soal bergambar) */
const WAJIB_VISUAL = new Set([
  "cal-hitung", "cal-tambah-gambar",
  "kiddo-hitung-benda", "kiddo-tambah-kurang", "kiddo-kurang-gambar", "kiddo-banding-banyak",
  "eng-count",
]);

let ok = 0, fail = 0;
const masalah: string[] = [];

for (const m of GEN_MAPEL) {
  const mapel = m.id as GenMapel;
  for (const jenjang of m.jenjang) {
    for (const kelas of kelasTersedia(mapel, jenjang)) {
      const topiks = TOPIK_GENERATOR[mapel]?.[jenjang]?.[kelas] ?? [];
      for (const t of topiks) {
        for (const kes of [1, 2, 3] as Kesulitan[]) {
          const soal = generateQuestions(mapel, t.id, jenjang, kelas, 5, kes);
          if (soal.length < 3) {
            fail++;
            masalah.push(`${mapel}/${jenjang}${kelas}/${t.id} lv${kes}: hanya ${soal.length} soal unik`);
          }
          for (const s of soal) {
            ok++;
            if (s.q.includes("●") || s.q.includes("○")) {
              fail++;
              masalah.push(`${mapel}/${jenjang}${kelas}/${t.id}: masih titik -> ${s.q.slice(0, 60)}`);
            }
            if (WAJIB_VISUAL.has(t.id) && !s.visual) {
              fail++;
              masalah.push(`${mapel}/${jenjang}${kelas}/${t.id}: topik gambar tanpa visual -> ${s.q.slice(0, 60)}`);
            }
            if (!s.a.trim() && s.kind !== "jodoh") {
              fail++;
              masalah.push(`${mapel}/${jenjang}${kelas}/${t.id}: jawaban kosong -> ${s.q.slice(0, 60)}`);
            }
            if (s.visual) {
              const total = s.visual.parts.reduce((a, p) => a + p.n, 0);
              if (total < 1 || total > 40) {
                fail++;
                masalah.push(`${t.id}: visual jumlah aneh ${total}`);
              }
            }
          }
        }
      }
      const jumlahTopik = topiks.length;
      console.log(`${mapel}/${jenjang} kelas ${kelas}: ${jumlahTopik} topik OK`);
    }
  }
}

/* uji visual spesifik: tambahGambar & hitung punya visual */
const tg = generateQuestions("calistung", "cal-tambah-gambar", "SD", "1", 4, 2);
const hb = generateQuestions("kiddo", "kiddo-hitung-benda", "SD", "1", 4, 1);
const kp = generateQuestions("kiddo", "kiddo-kurang-gambar", "SD", "2", 4, 2);
const bb = generateQuestions("kiddo", "kiddo-banding-banyak", "SD", "1", 4, 1);
const kc = generateQuestions("calistung", "cal-kali-ceria", "SD", "3", 4, 1);
console.log("\ncontoh tambahGambar:", JSON.stringify(tg[0], null, 1).slice(0, 400));
console.log("contoh bandingBanyak:", JSON.stringify(bb[0], null, 1).slice(0, 400));
console.log("visual hadir:", { tg: tg.every(s => !!s.visual), hb: hb.every(s => !!s.visual), kp: kp.every(s => !!s.visual), bb: bb.every(s => !!s.visual), kc: kc.filter(s => s.visual).length + "/" + kc.length });

/* verifikasi aritmetika visual vs jawaban */
let aritOK = true;
for (const s of [...tg, ...kp]) {
  const [a, b] = s.visual!.parts.map(p => p.n);
  const j = s.visual!.join === "+" ? a + b : a - b;
  if (String(j) !== s.a) { aritOK = false; masalah.push(`aritmetika salah: ${a}${s.visual!.join}${b} != ${s.a}`); }
}
console.log("aritmetika visual:", aritOK ? "BENAR" : "SALAH");

console.log(`\nTOTAL soal diuji: ${ok}, gagal: ${fail}`);
if (masalah.length) {
  console.log("--- masalah ---");
  masalah.slice(0, 40).forEach(m => console.log(" !", m));
  process.exit(1);
}
console.log("SEMUA LOLOS");
