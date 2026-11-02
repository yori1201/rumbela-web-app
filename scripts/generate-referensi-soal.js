/* Referensi Format & Layout Generator Soal — Rumbela v2.2
   Cover: Recipe R1 (Pure Paragraph Left) + palet DS-1 (Deep Sea — biru-hijau)
   Struktur: 3 seksi (cover / daftar isi roman / isi arabic) */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  SectionType, TableLayoutType, LevelFormat, TableOfContents,
} = require("docx");
const fs = require("fs");

/* ---------- Palet DS-1 (Deep Sea) ---------- */
const P = {
  bg: "0B1C2C", accent: "529286",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "529286", headerText: "FFFFFF", accentLine: "529286", innerLine: "BECFCC", surface: "E8ECEB" },
  heading: "0B1C2C", body: "1E293B", secondary: "64748B",
  mono: "0F4C5C",
};

const allNoBorders = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
};
const noBorders = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
};

/* ---------- Helper teks ---------- */
function safeText(v, ph) {
  if (v === undefined || v === null || v === "" || String(v) === "NaN" || String(v) === "undefined") return ph || "-";
  return String(v);
}
const F = { ascii: "Calibri", eastAsia: "Microsoft YaHei" };
const FH = { ascii: "Arial", eastAsia: "Microsoft YaHei" };
const FM = { ascii: "Courier New", eastAsia: "Microsoft YaHei" };

function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: opts.after ?? 120 },
    indent: { firstLine: 420 },
    children: (Array.isArray(text) ? text : [text]).map(raw => {
      const r = typeof raw === "string" ? { t: raw } : raw;
      return new TextRun({
        text: safeText(r.t), bold: r.b, italics: r.i,
        font: r.mono ? FM : F, size: r.mono ? 21 : 24,
        color: r.mono ? P.mono : (r.c || P.body),
      });
    }),
  });
}
/* paragraf tanpa indent (untuk keterangan langsung di bawah tabel/figur) */
function note(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, before: opts.before ?? 40, after: opts.after ?? 200 },
    children: [new TextRun({ text, italics: true, size: 20, color: P.secondary, font: F })],
  });
}
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 380, lineRule: "atLeast" },
    children: [new TextRun({ text, bold: true, size: 32, color: P.heading, font: FH })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120, line: 340, lineRule: "atLeast" },
    children: [new TextRun({ text, bold: true, size: 28, color: P.heading, font: FH })],
  });
}
function caption(text) {
  return new Paragraph({
    keepNext: true, alignment: AlignmentType.LEFT,
    spacing: { before: 160, after: 80, line: 312 },
    children: [new TextRun({ text, bold: true, size: 21, color: P.secondary, font: F })],
  });
}

/* ---------- Tabel data ---------- */
function cell(text, o = {}) {
  const runs = (Array.isArray(text) ? text : [{ t: text }]).map(r =>
    new TextRun({
      text: safeText(r.t, r.ph), bold: r.b || o.bold,
      font: r.mono ? FM : F, size: r.mono ? 20 : (o.size ?? 21),
      color: r.mono ? P.mono : (r.c || o.color || P.body),
    }));
  return new TableCell({
    children: [new Paragraph({ alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { line: 312 }, children: runs })],
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    width: o.w ? { size: o.w, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: "top",
  });
}
function dataTable(headers, rows, widths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: P.table.accentLine },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: headers.map((htext, i) => cell(htext, { bold: true, color: P.table.headerText, fill: P.table.headerBg, w: widths ? widths[i] : undefined, size: 21 })),
      }),
      ...rows.map((r, ri) => new TableRow({
        cantSplit: true,
        children: r.map((cdef, ci) => {
          const o = typeof cdef === "object" && cdef !== null && !Array.isArray(cdef) ? cdef : { v: cdef };
          const val = o.v;
          return cell(Array.isArray(val) || typeof val === "string" ? val : String(val), {
            w: widths ? widths[ci] : undefined,
            fill: ri % 2 === 1 ? P.table.surface : undefined,
            bold: o.b, mono: o.mono, center: o.center,
          });
        }),
      })),
    ],
  });
}

/* ---------- Gambar ---------- */
function figure(path, displayWidth, capText) {
  const buf = fs.readFileSync(path);
  const dims = { w: 794, h: 1123 };
  const h = Math.round(displayWidth * dims.h / dims.w);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 160, after: 60 },
      children: [new ImageRun({ data: buf, transformation: { width: displayWidth, height: h }, type: "png" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200, line: 312 },
      children: [new TextRun({ text: capText, italics: true, size: 20, color: P.secondary, font: F })],
    }),
  ];
}

/* ---------- Daftar bernomor ---------- */
function steps(refName, items) {
  return items.map(it => new Paragraph({
    numbering: { reference: refName, level: 0 },
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 100 },
    children: (Array.isArray(it) ? it : [it]).map(raw => {
      const r = typeof raw === "string" ? { t: raw } : raw;
      return new TextRun({ text: safeText(r.t), bold: r.b, font: r.mono ? FM : F, size: r.mono ? 21 : 24, color: r.mono ? P.mono : P.body });
    }),
  }));
}

/* ================= SAMPUL (R1 — DS-1) ================= */
/* Judul Latin: lebar karakter ~ pt x 12 twips (lebih ramping dari CJK).
   "Referensi Format & Layout" = 25 karakter -> muat pada 34pt (25 x 408 = 10.200 > 9.606? tidak muat)
   -> gunakan 30pt (25 x 360 = 9.000 <= 9.606) — 2 baris semantik. */
function buildCoverR1(config) {
  const padL = 1200, padR = 800;
  const titlePt = 30;
  const titleLines = ["Referensi Format & Layout", "Generator Soal"];
  const titleSize = titlePt * 2;

  /* calcCoverSpacing — parameter aktual */
  const SAFETY = 1200;
  const usableHeight = 16838 - SAFETY;
  const titleHeight = titleLines.length * (titlePt * 23 + 200);
  const subtitleHeight = 12 * 23 + 600;
  const englishLabelHeight = 9 * 23 + 600;
  const metaHeight = config.metaLines.length * (10 * 23 + 100);
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + 400 + 3 * 300;
  const safeRemaining = Math.max(usableHeight - contentHeight, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);

  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];

  children.push(new Paragraph({ spacing: { before: topSpacing } }));

  children.push(new Paragraph({
    indent: { left: padL, right: padR }, spacing: { after: 500 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
    children: [new TextRun({
      text: config.englishLabel.split("").join("  "),
      size: 18, color: P.accent, font: { ascii: "Arial", eastAsia: "SimHei" }, characterSpacing: 40,
    })],
  }));

  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: P.cover.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" } })],
    }));
  }

  children.push(new Paragraph({
    indent: { left: padL, right: padR }, spacing: { after: 800, line: 340, lineRule: "atLeast" },
    children: [new TextRun({ text: config.subtitle, size: 24, color: P.cover.subtitleColor, font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
  }));

  for (const line of config.metaLines) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: P.cover.metaColor, font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: bottomSpacing } }));

  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft, size: 16, color: P.cover.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight, size: 16, color: P.cover.footerColor, font: { ascii: "Arial" } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders, children })],
    })],
  })];
}

/* ================= ISI DOKUMEN ================= */
const bodyChildren = [];

/* ------ 1. Pendahuluan ------ */
bodyChildren.push(h1("1. Pendahuluan"));
bodyChildren.push(body("Modul Generator Soal adalah fitur pada aplikasi admin Rumbela yang dipakai untuk menyusun lembar latihan (worksheet) beserta kunci jawabannya dalam format A4 siap cetak. Dokumen ini menjadi acuan resmi terhadap format, tata letak, dan struktur data yang dipakai modul tersebut, sehingga setiap penambahan bank soal maupun topik baru tetap konsisten dengan lembar yang sudah beredar. Seluruh spesifikasi di sini diambil langsung dari kode sumber aplikasi v2.2 yang berjalan di produksi."));
bodyChildren.push(body("Referensi ini ditujukan untuk dua kelompok pembaca. Pertama, pengelola bimbel yang perlu memahami bagaimana worksheet dihasilkan agar dapat memeriksa hasil cetak dengan cepat. Kedua, pengembang yang akan menambah topik generator baru dan membutuhkan kontrak data, palet warna, serta aturan tata letak yang harus diikuti. Contoh-contoh lembar pada dokumen ini merupakan tangkapan layar langsung dari aplikasi produksi."));

bodyChildren.push(h2("1.1 Dua Mode Generator"));
bodyChildren.push(body("Generator Soal menyediakan dua mode yang saling melengkapi. Mode Otomatis menghasilkan soal dari bank generator per mata pelajaran, jenjang, kelas, dan topik tertentu dengan tingkat kesulitan yang dapat dipilih. Mode Tulis Sendiri (manual) memberi kebebasan penuh bagi pengajar untuk mengetik soal sendiri pada dua belas mata pelajaran yang tersedia, termasuk jenis soal yang tidak dihasilkan mode otomatis."));
bodyChildren.push(caption("Tabel 1 — Perbandingan mode generator"));
bodyChildren.push(dataTable(
  ["Aspek", "Mode Otomatis", "Mode Tulis Sendiri"],
  [
    ["Sumber soal", "Bank generator bawaan (4 mapel)", "Ditulis manual oleh pengajar"],
    ["Jenis soal", "Selalu isian singkat", "PG, isian, atau uraian (per soal)"],
    ["Pilihan mapel", "Matematika, Calistung Ceria, Bahasa Inggris Dasar, Worksheet Coding", "12 mapel: Matematika, B. Indonesia, B. Inggris, IPA, IPS, PAI, Fisika, Kimia, Biologi, Ekonomi, Geografi, Sejarah"],
    ["Pengaturan", "Jenjang, kelas, topik, jumlah soal, kesulitan 1-3", "Jenis per soal, opsi PG, penanda kunci"],
    ["Kunci jawaban", "Dihitung otomatis oleh generator", "Diisi pengajar (tombol huruf a-d untuk PG)"],
    ["Soal kosong", "Tidak mungkin (generator selalu terisi)", "Disaring otomatis, tidak ikut tercetak"],
  ],
  [18, 41, 41]
));
bodyChildren.push(note("Kedua mode menghasilkan struktur keluaran yang sama persis: pratinjau lembar A4, tombol Cetak/PDF, unduh PNG, dan arsip otomatis di Google Drive."));

/* ------ 2. Arsitektur Mode Otomatis ------ */
bodyChildren.push(h1("2. Arsitektur Mode Otomatis"));
bodyChildren.push(h2("2.1 Hierarki Bank Generator"));
bodyChildren.push(body([
  { t: "Mode otomatis tersusun sebagai hierarki empat tingkat: " },
  { t: "mapel generator \u2192 jenjang \u2192 kelas \u2192 daftar topik", mono: true },
  { t: ". Struktur ini disimpan pada konstanta " },
  { t: "TOPIK_GENERATOR", mono: true },
  { t: " di berkas " },
  { t: "src/lib/generatorSoal.ts", mono: true },
  { t: ". Setiap bank mendefinisikan sendiri kelas-kelas yang tersedia; fungsi " },
  { t: "kelasTersedia()", mono: true },
  { t: " secara otomatis menyaring pilihan kelas di antarmuka agar hanya menampilkan kelas yang benar-benar memiliki topik. Tombol jenjang yang tidak relevan (misalnya SMP pada Calistung Ceria) otomatis tampil nonaktif." },
]));
bodyChildren.push(caption("Tabel 2 — Empat bank generator mode otomatis"));
bodyChildren.push(dataTable(
  ["Bank", "ID", "Rentang kelas", "Jenjang aktif"],
  [
    ["Matematika", { v: "matematika", mono: true }, "SD 1 - SMA 12", "SD, SMP, SMA"],
    ["Calistung Ceria", { v: "calistung", mono: true }, "SD kelas 1-3", "SD"],
    ["Bahasa Inggris Dasar", { v: "english", mono: true }, "SD kelas 1-6", "SD"],
    ["Worksheet Coding", { v: "coding", mono: true }, "SD 4-6 dan SMP 7-9", "SD, SMP"],
  ],
  [30, 22, 26, 22]
));

bodyChildren.push(h2("2.2 Kontrak TopikDef"));
bodyChildren.push(body([
  { t: "Setiap topik adalah objek " },
  { t: "TopikDef", mono: true },
  { t: " dengan tiga properti: " },
  { t: "id", mono: true },
  { t: " (pengenal unik), " },
  { t: "label", mono: true },
  { t: " (nama topik yang tampil di UI dan lembar), dan " },
  { t: "gen(lv, R)", mono: true },
  { t: " (fungsi pembuat soal). Fungsi " },
  { t: "gen", mono: true },
  { t: " menerima tingkat kesulitan 1-3 serta sumber acak " },
  { t: "R", mono: true },
  { t: ", lalu mengembalikan pasangan " },
  { t: "{ q, a }", mono: true },
  { t: " yaitu teks soal dan kunci jawabannya. Skala kesulitan diatur helper " },
  { t: "S(lv, base, inc)", mono: true },
  { t: " yang memperbesar rentang angka seiring naiknya level, sedangkan " },
  { t: "ri(R, a, b)", mono: true },
  { t: " menghasilkan bilangan bulat acak inklusif." },
]));
bodyChildren.push(body([
  { t: "Fungsi " },
  { t: "generateQuestions()", mono: true },
  { t: " memanggil " },
  { t: "gen", mono: true },
  { t: " berulang kali sampai jumlah soal terpenuhi. Soal dengan teks yang sama persis akan dibuang melalui mekanisme deduplikasi, dengan pengaman maksimum 40 kali percobaan per soal agar proses tidak berputar selamanya pada topik beruang sampling sempit. Berikut hasil nyata mode otomatis dari bank Matematika." },
]));
bodyChildren.push(...figure("/home/z/my-project/scripts/assets/worksheet-sheet.png", 400, "Gambar 1 — Lembar soal hasil mode otomatis (Matematika SD kelas 1, topik Penjumlahan sampai 20)"));

/* ------ 3. Inventaris Topik ------ */
bodyChildren.push(h1("3. Inventaris Topik per Bank"));
bodyChildren.push(body("Inventaris berikut mencantumkan seluruh topik generator yang terpasang pada v2.2 beserta sebarannya per kelas. Sebuah topik boleh muncul di lebih dari satu kelas (misalnya Merangkai suku kata hadir di kelas 1 dan 2 Calistung Ceria) karena konsep yang sama diulang dengan rentang angka atau kosakatatan yang berbeda. Jumlah soal per pembuatan bebas dipilih 5, 10, 15, 20, 25, atau 30."));

bodyChildren.push(caption("Tabel 3 — Bank Matematika (40 topik)"));
bodyChildren.push(dataTable(
  ["Kelas", "Topik yang tersedia"],
  [
    ["SD 1", "Penjumlahan (sampai 20), Pengurangan (sampai 20), Penjumlahan & pengurangan kecil"],
    ["SD 2", "Penjumlahan (sampai 100), Pengurangan (sampai 100), Perkalian dasar 1-10"],
    ["SD 3", "Perkalian & pembagian, Penjumlahan (sampai 1.000), Pengurangan (sampai 1.000)"],
    ["SD 4", "Operasi hitung campuran, Perkalian 2 digit x 1 digit, Pembagian dengan sisa"],
    ["SD 5", "Pecahan senilai, Penjumlahan desimal, KPK & FPB (angka kecil), Operasi hitung campuran"],
    ["SD 6", "Persen, KPK & FPB, Perkalian desimal, Operasi bilangan cacah"],
    ["SMP 7", "Operasi bilangan bulat, Operasi pecahan, Aljabar dasar, PLSV"],
    ["SMP 8", "SPLDV, Teorema Pythagoras, PLSV dengan kurung, Operasi bilangan bulat"],
    ["SMP 9", "Eksponen & pangkat, Akar kuadrat & kubik, Persamaan kuadrat (faktorisasi), Pola & barisan bilangan"],
    ["SMA 10", "Eksponen & logaritma, Persamaan kuadrat, Barisan & deret aritmetika"],
    ["SMA 11", "Fungsi kuadrat, Barisan & deret geometri, Polinomial (nilai fungsi)"],
    ["SMA 12", "Turunan fungsi, Integral tentu, Limit fungsi"],
  ],
  [16, 84]
));

bodyChildren.push(caption("Tabel 4 — Bank Calistung Ceria (SD kelas 1-3)"));
bodyChildren.push(dataTable(
  ["Kelas", "Topik yang tersedia"],
  [
    ["1", "Mengenal huruf (lingkari), Merangkai suku kata, Huruf yang hilang, Berhitung (hitung bintang), Menjumlah gambar"],
    ["2", "Berhitung lompat (lanjutkan), Tambah & kurang (sampai 100), Mengenal bentuk, Lawan kata (antonim), Merangkai suku kata"],
    ["3", "Perkalian ceria (kelompok benda), Membaca jam, Mengenal uang rupiah, Persamaan kata (sinonim), Huruf yang hilang"],
  ],
  [16, 84]
));

bodyChildren.push(caption("Tabel 5 — Bank Bahasa Inggris Dasar (SD kelas 1-6)"));
bodyChildren.push(dataTable(
  ["Kelas", "Topik yang tersedia"],
  [
    ["1", "Alphabet (urutan huruf), Numbers 1-10, Warna, Sapaan"],
    ["2", "Hewan, Buah, Numbers 1-10, Sapaan"],
    ["3", "Keluarga, Tubuh, Hewan, Buah"],
    ["4", "Tubuh, Kelas, Days of the week, Keluarga"],
    ["5", "Kerja, Kelas, Days of the week, Numbers 20-100"],
    ["6", "Kerja, Numbers 20-100, To be (is / am / are), Days of the week"],
  ],
  [16, 84]
));
bodyChildren.push(note("Topik kosakata (Warna, Sapaan, Hewan, Buah, Keluarga, Tubuh, Kelas, Kerja) bersifat dua arah: level mudah menanyakan terjemahan Indonesia ke Inggris, level sulit sebaliknya."));

bodyChildren.push(caption("Tabel 6 — Bank Worksheet Coding (SD 4-6, SMP 7-9)"));
bodyChildren.push(dataTable(
  ["Kelas", "Topik yang tersedia"],
  [
    ["SD 4", "Sequence (urutan perintah), Pattern (pola berulang), Condition (logika IF), Repetition (perulangan)"],
    ["SD 5", "Pattern (pola berulang), Condition (logika IF), Bilangan biner, Variabel sederhana"],
    ["SD 6", "Bilangan biner, Variabel sederhana, Repetition (perulangan), Pattern (pola berulang)"],
    ["SMP 7", "Variabel berantai, Loop & akumulasi, Logika AND/OR"],
    ["SMP 8", "Variabel berantai, Loop & akumulasi, Sisa bagi (modulo), Logika AND/OR"],
    ["SMP 9", "Sisa bagi (modulo), Loop & akumulasi, Debugging (baca output), Variabel berantai"],
  ],
  [16, 84]
));

/* ------ 4. Struktur Data Soal ------ */
bodyChildren.push(h1("4. Struktur Data Soal"));
bodyChildren.push(body([
  { t: "Semua soal, baik hasil generator maupun tulisan manual, disimpan dalam satu struktur yang sama sehingga renderer cukup mengenal satu format. Struktur tersebut didefinisikan di " },
  { t: "src/lib/types.ts", mono: true },
  { t: " sebagai " },
  { t: "WorksheetQ", mono: true },
  { t: " (per soal) dan " },
  { t: "Worksheet", mono: true },
  { t: " (per lembar). Pemahaman struktur ini penting karena seluruh tampilan lembar, kunci, arsip, maupun ekspor PNG membaca field-field berikut." },
]));
bodyChildren.push(caption("Tabel 7 — Field WorksheetQ (satu soal)"));
bodyChildren.push(dataTable(
  ["Field", "Tipe", "Keterangan"],
  [
    [{ v: "id", mono: true }, "string", "Pengenal unik per soal (uid)"],
    [{ v: "text", mono: true }, "string", "Teks pertanyaan yang tampil di lembar"],
    [{ v: "kind", mono: true }, { v: "\"pg\" | \"isian\" | \"uraian\"", mono: true }, "Jenis soal; menentukan tampilan ruang jawaban"],
    [{ v: "options?", mono: true }, "string[]", "Hanya untuk PG: tepat 4 opsi berlabel a-d"],
    [{ v: "answer", mono: true }, "string", "Kunci jawaban: huruf opsi (PG) atau teks jawaban"],
  ],
  [18, 30, 52]
));
bodyChildren.push(caption("Tabel 8 — Field Worksheet (satu lembar)"));
bodyChildren.push(dataTable(
  ["Field", "Tipe", "Keterangan"],
  [
    [{ v: "id", mono: true }, "string", "Kosong berarti belum diarsipkan; terisi saat disimpan ke Drive"],
    [{ v: "createdAt", mono: true }, "string", "Tanggal pembuatan, format YYYY-MM-DD"],
    [{ v: "mapel", mono: true }, "string", "Nama mapel (label bank atau pilihan manual)"],
    [{ v: "jenjang", mono: true }, "string", "SD, SMP, atau SMA"],
    [{ v: "kelas", mono: true }, "string", "\"1\" hingga \"12\", atau kosong"],
    [{ v: "topik", mono: true }, "string", "Judul besar yang tampil di kop lembar"],
    [{ v: "petunjuk", mono: true }, "string", "Kalimat perintah umum, tampil dalam kotak biru muda"],
    [{ v: "questions", mono: true }, "WorksheetQ[]", "Daftar soal; soal kosong telah disaring sebelum render"],
    [{ v: "kunci", mono: true }, "boolean", "Menentukan lembar kunci ikut dicetak atau tidak"],
  ],
  [18, 26, 56]
));

bodyChildren.push(h2("4.1 Tiga Jenis Soal"));
bodyChildren.push(body("Jenis soal menentukan komponen input pada editor manual sekaligus ruang jawaban pada lembar cetak. Kunci pilihan ganda ditandai lewat tombol huruf (a sampai d) yang berubah hijau saat dipilih; untuk isian dan uraian kunci diketik langsung sebagai teks. Lembar berikut memperlihatkan ketiga jenis sekaligus dalam satu hasil cetak mode manual."));
bodyChildren.push(caption("Tabel 9 — Perilaku tiap jenis soal"));
bodyChildren.push(dataTable(
  ["Jenis", "Editor manual", "Tampilan di lembar", "Format kunci"],
  [
    [{ v: "pg", mono: true }, "4 kolom opsi + tombol huruf kunci", "Opsi dua kolom, lingkaran huruf a-d di kiri tiap opsi", "Huruf besar, mis. B"],
    [{ v: "isian", mono: true }, "Kotak teks soal + kotak kunci", "Satu garis titik-titik", "Teks jawaban singkat"],
    [{ v: "uraian", mono: true }, "Kotak teks soal + kotak kunci", "Tiga garis titik-titik", "Teks panduan jawaban"],
  ],
  [12, 30, 36, 22]
));
bodyChildren.push(...figure("/home/z/my-project/scripts/assets/worksheet-manual.png", 400, "Gambar 2 — Lembar mode manual berisi isian (no. 1), pilihan ganda (no. 2), dan uraian (no. 3)"));

/* ------ 5. Layout Lembar A4 ------ */
bodyChildren.push(h1("5. Layout Lembar A4"));
bodyChildren.push(body("Setiap lembar dirender sebagai kartu putih berukuran tetap selebar 794 piksel dan tinggi minimal 1.123 piksel — setara kertas A4 pada resolusi 96 dpi — dengan ruang kosong (padding) 48 piksel di seluruh sisi. Tata letak mengikuti referensi brand Rumbela: logo penuh di kiri atas, halaman bersih minimal, dan footer bertuliskan nama lembaga di tengah bawah. Struktur zona dari atas ke bawah dirinci pada tabel berikut."));
bodyChildren.push(caption("Tabel 10 — Zona tata letak lembar soal (renderer HTML)"));
bodyChildren.push(dataTable(
  ["Zona", "Spesifikasi"],
  [
    ["Kop", "Logo /logo.webp lebar 225 px di kiri; tanggal panjang format id-ID (11 pt, abu slate-400) di kanan atas"],
    ["Kicker", "Tulis WORKSHEET - NAMA MAPEL, huruf kapital, jarak antarhuruf 0.18em, 11 pt slate-400"],
    ["Judul topik", "26 pt hitam tebal warna sky-700, satu baris (dipotong bila terlalu panjang)"],
    ["Meta info", "Baris jenjang, Kelas n, dan jumlah soal dipisah titik tengah (13 pt slate-500)"],
    ["Sapaan", "Frasa Selamat mengerjakan! 13 pt hitam emerald-600, menempel kanan sejajar meta"],
    ["Identitas", "Dua isian Nama : dan Kelas : dengan garis putus-putus 1,5 px slate-400"],
    ["Petunjuk", "Kotak sudut bulat latar sky-50, teks 13,5 pt sky-900; hanya tampil bila diisi"],
    ["Daftar soal", "Nomor sky-700 tebal; teks soal 15 pt; jarak antar soal 20 px"],
    ["Opsi PG", "Kisi 2 kolom; lingkaran 18 px berhuruf a-d di kiri tiap opsi"],
    ["Ruang jawaban", "Isian 1 garis putus-putus; uraian 3 garis"],
    ["Footer", "Teks Rumbela <tahun> 13 pt slate-400, di tengah 28 px dari dasar lembar"],
  ],
  [22, 78]
));
bodyChildren.push(body("Lembar kunci memakai kerangka kop yang sama, tetapi badannya berbeda: judul kicker berubah menjadi KUNCI JAWABAN - NAMA MAPEL, muncul label hijau KUNCI JAWABAN, dan seluruh jawaban disusun dalam kisi dua kolom berpasangan nomor-jawaban. Jawaban PG ditampilkan sebagai huruf kapital, sedangkan isian dan uraian menampilkan teks jawabannya; jawaban kosong ditandai strip. Layout dua kolom ini menjadikan lembar kunci ringkas meski jumlah soal mencapai 30."));
bodyChildren.push(...figure("/home/z/my-project/scripts/assets/worksheet-kunci.png", 400, "Gambar 3 — Lembar kunci jawaban: kisi dua kolom, jawaban PG tampil sebagai huruf kapital"));

/* ------ 6. Palet Warna & Tipografi ------ */
bodyChildren.push(h1("6. Palet Warna dan Tipografi"));
bodyChildren.push(body("Sejak v2.2, seluruh aplikasi — termasuk lembar worksheet — memakai tema biru-hijau: biru langit (sky) sebagai warna utama dan hijau (emerald) sebagai aksen. Kombinasi ini menggantikan tema oranye terdahulu dan berlaku konsisten pada dasbor, tombol, lembar HTML, maupun hasil render PNG sehingga keluaran cetak dan tampilan aplikasi terasa satu kesatuan. Tabel berikut merinci setiap token warna yang dipakai renderer beserta peruntukannya."));
bodyChildren.push(caption("Tabel 11 — Token warna lembar worksheet"));
bodyChildren.push(dataTable(
  ["Token", "Hex", "Peruntukan"],
  [
    [{ v: "OR (sky-700)", mono: true }, { v: "#0369a1", mono: true }, "Judul topik dan nomor soal — aksen utama lembar"],
    [{ v: "SKY (sky-600)", mono: true }, { v: "#0284c7", mono: true }, "Sapaan Selamat mengerjakan! dan elemen aktif UI"],
    [{ v: "INK (slate-800)", mono: true }, { v: "#1e293b", mono: true }, "Teks soal, opsi, dan jawaban kunci"],
    [{ v: "MUT (slate-400)", mono: true }, { v: "#94a3b8", mono: true }, "Tanggal kop, kicker, meta, dan footer"],
    [{ v: "BODY (slate-500)", mono: true }, { v: "#64748b", mono: true }, "Teks sekunder dan baris meta"],
    ["Petunjuk (sky-50 / sky-800)", { v: "#f0f9ff / #075985", mono: true }, "Latar dan teks kotak petunjuk pengerjaan"],
    ["Kunci (green-600)", { v: "#16a34a", mono: true }, "Label KUNCI JAWABAN pada render PNG"],
    ["Garis opsi (slate-300)", { v: "#cbd5e1", mono: true }, "Lingkaran huruf opsi pilihan ganda"],
  ],
  [30, 24, 46]
));
bodyChildren.push(body("Tipografi lembar memakai satu keluarga huruf Nunito dengan berat 400 hingga 900, dimuat melalui next/font agar konsisten antar perangkat. Hierarki berat dipakai untuk membedakan fungsi: hitam (800-900) untuk judul, nomor soal, dan penanda kunci; tebal (600-700) untuk teks soal serta opsi; dan sedang (500) untuk teks kop dan footer. Karena Nunito tersedia sebagai font web, hasil PNG tidak bergantung pada font sistem pengguna."));

/* ------ 7. Renderer PNG ------ */
bodyChildren.push(h1("7. Renderer PNG (Canvas)"));
bodyChildren.push(body([
  { t: "Selain tampilan HTML untuk cetak, modul ini memiliki renderer kedua di " },
  { t: "src/lib/renderWorksheet.ts", mono: true },
  { t: " yang menggambar lembar langsung ke elemen " },
  { t: "<canvas>", mono: true },
  { t: " untuk diunduh sebagai PNG. Renderer ini tidak sekadar memotret layar, melainkan menggambar ulang seluruh zona dengan koordinat tersendiri sehingga hasilnya tajam dan identik di semua perangkat. Nama berkas unduhan dibuat rapat oleh fungsi " },
  { t: "slugify()", mono: true },
  { t: " dari gabungan mapel dan topik, maksimal 40 karakter." },
]));
bodyChildren.push(caption("Tabel 12 — Parameter renderer canvas"));
bodyChildren.push(dataTable(
  ["Parameter", "Nilai", "Catatan"],
  [
    ["Lebar kanvas", "1.000 px", "Tinggi menyesuaikan konten"],
    ["Padding sisi", "70 px", "Seua zona mengikuti margin ini"],
    ["Tinggi lembar", "min. 1.414 px", "Rasio A4; bertambah otomatis hingga maks. 30.000 px"],
    ["Logo kop", "235 px", "Rasio asli 1000x919 dipertahankan"],
    ["Ruang jawaban PG", "44 px", "Baris opsi dengan lingkaran huruf"],
    ["Ruang jawaban isian", "58 px", "Satu garis putus-putus"],
    ["Ruang jawaban uraian", "118 px", "Tiga garis putus-putus"],
    ["Kunci jawaban", "2 kolom", "Tinggi baris 74 px; jawaban panjang melipat ke bawah"],
    ["Footer", "H - 70 px", "70 px dari dasar kanvas"],
  ],
  [30, 22, 48]
));
bodyChildren.push(body("Renderer menunggu fonts.ready sebelum menggambar sehingga pengukuran lebar teks akurat, kemudian membungkus teks soal otomatis agar tidak melewati batas kolom. Opsi pilihan ganda disusun dua kolom hanya bila seluruh opsi cukup sempit; opsi yang panjang otomatis turun menjadi satu kolom. Karena tinggi dihitung dari estimasi jumlah baris, hasil PNG selalu memuat seluruh soal tanpa terpotong."));

/* ------ 8. Alur Cetak & Arsip ------ */
bodyChildren.push(h1("8. Alur Cetak, Ekspor, dan Arsip"));
bodyChildren.push(body("Tombol Cetak / PDF memanggil dialog cetak peramban dengan aturan halaman A4 potret dan margin 10 mm. Seluruh isi aplikasi disembunyikan lewat properti visibility, lalu hanya wadah ber-id print-area — yang membungkus lembar soal dan lembar kunci — yang dibuat terlihat kembali; dengan trik ini pratinjau apa adanya menjadi hasil cetak tanpa perlu membuka berkas terpisah. Lembar kunci hanya ikut tercetak bila sakelarnya diaktifkan."));
bodyChildren.push(body("Tombol PNG Soal dan PNG Kunci masing-masing mengunduh satu berkas gambar hasil renderer canvas, berguna untuk dikirim lewat WhatsApp kepada wali murid. Tombol Arsipkan menyimpan worksheet ke Google Drive pribadi pengguna melalui penyimpanan otomatis aplikasi; daftar arsip tampil di bagian bawah halaman dengan tombol Buka untuk memuat kembali. Setiap worksheet yang dibuat otomatis tersimpan walau pengguna tidak menekan tombol apa pun setelahnya."));

/* ------ 9. Panduan Topik Baru ------ */
bodyChildren.push(h1("9. Panduan Menambah Topik Baru"));
bodyChildren.push(body("Penambahan topik tidak mengubah apa pun pada tata letak karena semua lembar membaca struktur data yang sama. Ikuti langkah berikut agar topik baru langsung tersedia di antarmuka tanpa penyesuaian tambahan."));
bodyChildren.push(...steps("langkah-topik", [
  [{ t: "Definisikan konstanta bertipe " }, { t: "TopikDef", mono: true }, { t: " pada berkas " }, { t: "generatorSoal.ts", mono: true }, { t: ", dengan id unik mengikuti konvensi prefiks bank: sd-, smp-, sma-, cal- (calistung), eng-, atau cod-." }],
  [{ t: "Tulis fungsi " }, { t: "gen(lv, R)", mono: true }, { t: " yang mengembalikan " }, { t: "{ q, a }", mono: true }, { t: ". Gunakan " }, { t: "ri(R, a, b)", mono: true }, { t: " untuk bilangan acak dan " }, { t: "S(lv, base, inc)", mono: true }, { t: " agar tingkat kesulitan 1-3 terasa berbeda." }],
  ["Rancang kunci jawaban seringkas mungkin — bilangan bulat, pecahan sederhana, atau satu kata — agar rapi pada kisi kunci dua kolom."],
  [{ t: "Daftarkan topik pada pemetaan bank di kelas yang sesuai (" }, { t: "TOPIK_MATEMATIKA", mono: true }, { t: ", " }, { t: "TOPIK_CALISTUNG", mono: true }, { t: ", " }, { t: "TOPIK_ENGLISH", mono: true }, { t: ", atau " }, { t: "TOPIK_CODING", mono: true }, { t: "). Satu topik boleh didaftarkan di beberapa kelas." }],
  ["Pastikan ruang sampel soal cukup luas; generator membuang soal dengan teks duplikat dan berhenti setelah 40 kali percobaan per soal."],
  ["Uji melalui Mode Demo: buka Generator Soal, pilih bank, jenjang, kelas, dan topik baru, lalu periksa lembar soal maupun kuncinya sebelum menerbitkan."],
]));
bodyChildren.push(body("Sebagai catatan penutup, label topik akan langsung dipakai sebagai judul besar lembar sehingga sebaiknya ringkas dan deskriptif. Perubahan apa pun pada bank generator bersifat mundur-kompatibel: arsip lama yang tersimpan di Google Drive tetap terbuka karena arsip menyimpan hasil akhir, bukan parameter pembuatannya."));

/* ================= DOKUMEN ================= */
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

function pageNumFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary, font: F })],
    })],
  });
}
function docHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine, space: 4 } },
      children: [new TextRun({ text: "Referensi Format & Layout Generator Soal — Rumbela v2.2", size: 16, color: P.secondary, font: F })],
    })],
  });
}

const doc = new Document({
  creator: "Rumbela",
  title: "Referensi Format & Layout Generator Soal",
  styles: {
    default: {
      document: {
        run: { font: F, size: 24, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: FH, size: 32, bold: true, color: P.heading },
        paragraph: { spacing: { before: 360, after: 160, line: 380 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: FH, size: 28, bold: true, color: P.heading },
        paragraph: { spacing: { before: 260, after: 120, line: 340 }, outlineLevel: 1 },
      },
    },
  },
  numbering: {
    config: [{
      reference: "langkah-topik",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 640, hanging: 360 } } },
      }],
    }],
  },
  sections: [
    { /* Seksi 1: sampul */
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1({
        englishLabel: "RUMBELA TECHNICAL REFERENCE",
        title: "Referensi Format & Layout Generator Soal",
        subtitle: "Struktur data, bank generator, tata letak lembar A4, palet warna, dan alur cetak worksheet",
        metaLines: [
          "Aplikasi : Rumbela Web App v2.2",
          "Modul : Generator Soal & Worksheet",
          "Tanggal : 2 November 2026",
        ],
        footerLeft: "Rumbela — Rumah Belajar Anak",
        footerRight: "Curup, Bengkulu",
      }),
    },
    { /* Seksi 2: daftar isi (roman) */
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: pageNumFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "Daftar Isi", bold: true, size: 32, font: FH, color: P.heading })],
        }),
        new TableOfContents("Daftar Isi", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Catatan: Daftar isi dibuat dengan field code. Setelah dokumen diedit, klik kanan pada daftar isi lalu pilih Update Field untuk memperbarui nomor halaman.",
            italics: true, size: 18, color: "888888", font: F,
          })],
        }),
      ],
    },
    { /* Seksi 3: isi (arabic) */
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: docHeader() },
      footers: { default: pageNumFooter() },
      children: bodyChildren,
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  const out = "/home/z/my-project/download/Referensi-Format-Layout-Generator-Soal-Rumbela.docx";
  fs.writeFileSync(out, buf);
  console.log("OK ->", out, buf.length, "bytes");
});
