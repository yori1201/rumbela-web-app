"use client";

/* Engine generator soal Matematika otomatis per jenjang (SD/SMP),
   kelas & topik. Semua soal dihitung ulang setiap kali dibuat, jawaban
   selalu bilangan bulat / pecahan sederhana agar rapi untuk lembar kerja.
   Soal yang memakai benda/gambar menampilkan emoji karakter (⭐🍎🎈…)
   melalui field `visual` — bukan sekadar titik — di semua bank & level. */

import type { SoalVisual } from "./types";

export interface GenSoal {
  q: string;
  a: string;
  /** jenis khusus: pg / jodoh / urut (default isian) */
  kind?: "pg" | "jodoh" | "urut";
  /** opsi pilihan ganda (urutan benar = indeks 0 dipindah saat render) */
  options?: string[];
  /** pasangan menjodohkan [kiri, kanan] urutan benar */
  pairs?: string[][];
  /** kata acak untuk disusun */
  words?: string[];
  /** hitungan bersusun: a di atas, b di bawah, op di kiri b (4 operasi) */
  bersusun?: { a: string; b: string; op: "+" | "−" | "×" | "÷" };
  /** baris benda bergambar (emoji) utk soal hitung / jumlah gambar */
  visual?: SoalVisual;
}

export interface TopikDef {
  id: string;
  label: string;
  /** kelas = angka kelas (cth. SD 1–6, SMP 7–9) agar rentang soal bisa naik per kelas */
  gen: (lv: number, R: () => number, kelas: number) => GenSoal;
}

/** bilangan bulat acak a..s.d. b (inklusif) */
const ri = (R: () => number, a: number, b: number): number =>
  a + Math.floor(R() * (b - a + 1));
const pick = <T,>(R: () => number, arr: T[]): T => arr[Math.floor(R() * arr.length)];

/** benda bergambar utk soal hitung: [emoji, nama] — dipakai semua bank */
const EMOJI_BENDA: [string, string][] = [
  ["⭐", "bintang"], ["🍎", "apel"], ["🎈", "balon"], ["🐟", "ikan"], ["🌸", "bunga"],
  ["🐱", "kucing"], ["🍓", "stroberi"], ["🚗", "mobil"], ["⚽", "bola"], ["🍌", "pisang"],
  ["🦆", "bebek"], ["🧁", "kue"], ["🍊", "jeruk"], ["🐞", "kumbang"], ["🌻", "bunga matahari"],
  ["🍬", "permen"], ["🍩", "donat"], ["🐣", "anak ayam"],
];
/** satu kelompok benda */
const visSatu = (emoji: string, n: number): SoalVisual => ({ parts: [{ emoji, n }] });
/** dua kelompok dengan pemisah ("+" / "−") */
const visJumlah = (emoji: string, a: number, b: number, join: string): SoalVisual => ({
  parts: [{ emoji, n: a }, { emoji, n: b }],
  join,
});
/** skala rentang berdasarkan tingkat kesulitan: 1=mudah 2=sedang 3=sulit */
const S = (lv: number, base: number, inc: number) => Math.round(base * (1 + (lv - 1) * inc));

const GCD = (a: number, b: number): number => (b === 0 ? Math.abs(a) : GCD(b, a % b));
const LCM = (a: number, b: number): number => (a * b) / GCD(a, b);
const simp = (p: number, q: number): string => {
  const g = GCD(p, q) || 1;
  let pp = p / g, qq = q / g;
  if (qq < 0) { pp = -pp; qq = -qq; }
  return qq === 1 ? `${pp}` : `${pp}/${qq}`;
};
/** desimal gaya Indonesia: 3,5 */
const idn = (n: number): string => n.toString().replace(".", ",");

/* ================= SD ================= */

const tambah20: TopikDef = {
  id: "sd-tambah-20", label: "Penjumlahan (sampai 20)",
  gen: (lv, R) => {
    const m = S(lv, 10, 0.5);
    const a = ri(R, 1, m), b = ri(R, 1, 20 - a);
    return { q: `${a} + ${b} = …`, a: `${a + b}` };
  },
};
const kurang20: TopikDef = {
  id: "sd-kurang-20", label: "Pengurangan (sampai 20)",
  gen: (lv, R) => {
    const m = S(lv, 12, 0.4);
    const a = ri(R, 2, 20), b = ri(R, 1, Math.min(a - 1, m));
    return { q: `${a} − ${b} = …`, a: `${a - b}` };
  },
};
const campur20: TopikDef = {
  id: "sd-campur-20", label: "Penjumlahan & pengurangan kecil",
  gen: (_lv, R) => {
    const a = ri(R, 2, 10), b = ri(R, 1, 9), c = ri(R, 1, a + b - 1);
    return R() < 0.5
      ? { q: `${a} + ${b} − ${c} = …`, a: `${a + b - c}` }
      : { q: `${a + b} − ${b} + ${c} = …`, a: `${a + c}` };
  },
};
const tambah100: TopikDef = {
  id: "sd-tambah-100", label: "Penjumlahan (sampai 100)",
  gen: (lv, R) => {
    const m = S(lv, 50, 0.3);
    const a = ri(R, 10, m), b = ri(R, 10, Math.min(99, 100 - a));
    return { q: `${a} + ${b} = …`, a: `${a + b}` };
  },
};
const kurang100: TopikDef = {
  id: "sd-kurang-100", label: "Pengurangan (sampai 100)",
  gen: (lv, R) => {
    const m = S(lv, 60, 0.3);
    const a = ri(R, Math.max(20, m), 99), b = ri(R, 5, m);
    return { q: `${a} − ${b} = …`, a: `${a - b}` };
  },
};
const kaliDasar: TopikDef = {
  id: "sd-kali-dasar", label: "Perkalian dasar 1–10",
  gen: (lv, R, kelas = 2) => {
    // kelas 1: tabel kecil dahulu; kelas 1–3 hasil selalu ≤ 100
    if ((kelas || 2) <= 1) {
      const m = lv === 1 ? 5 : 9;
      const a = ri(R, 2, m), b = ri(R, 2, m);
      return { q: `${a} × ${b} = …`, a: `${a * b}` };
    }
    const a = ri(R, 2, Math.min(10, S(lv, 7, 0.2)));
    const b = ri(R, 2, Math.max(2, Math.min(10, Math.floor(100 / a))));
    return { q: `${a} × ${b} = …`, a: `${a * b}` };
  },
};
const kaliBag: TopikDef = {
  id: "sd-kali-bagi", label: "Perkalian & pembagian",
  gen: (lv, R) => {
    // kelas 3: angka & hasil ≤ 100
    const a = ri(R, 2, Math.min(10, S(lv, 9, 0.2)));
    const b = ri(R, 2, Math.max(2, Math.min(9, Math.floor(100 / a))));
    if (R() < 0.5) return { q: `${a} × ${b} = …`, a: `${a * b}` };
    return { q: `${a * b} : ${b} = …`, a: `${a}` };
  },
};
/** Pembagian dasar tanpa sisa (isian biasa, tanpa bersusun). Kelas 1–3:
 *  angka & hasil ≤ 100, makin tinggi kelas makin besar kombinasinya. */
const bagiDasar: TopikDef = {
  id: "sd-bagi-dasar", label: "Pembagian dasar",
  gen: (lv, R, kelas = 2) => {
    const k = Math.min(3, Math.max(1, kelas || 2));
    const b = ri(R, 2, k === 1 ? 5 : lv === 1 ? 5 : 9);
    const hMax =
      k === 1 ? (lv === 1 ? 5 : 10)
        : k === 2 ? (lv === 1 ? 10 : 20)
          : (lv === 1 ? 10 : lv === 2 ? 25 : 50);
    const h = ri(R, 2, Math.max(2, Math.min(hMax, Math.floor(100 / b))));
    return { q: `${b * h} : ${b} = …`, a: `${h}` };
  },
};
const tambah1000: TopikDef = {
  id: "sd-tambah-1000", label: "Penjumlahan (sampai 1.000)",
  gen: (lv, R) => {
    const m = S(lv, 450, 0.35);
    const a = ri(R, 100, m), b = ri(R, 100, Math.min(999, 1000 - a));
    return { q: `${a} + ${b} = …`, a: `${a + b}` };
  },
};
const kurang1000: TopikDef = {
  id: "sd-kurang-1000", label: "Pengurangan (sampai 1.000)",
  gen: (lv, R) => {
    const m = S(lv, 500, 0.35);
    const a = ri(R, Math.max(300, m), 999), b = ri(R, 100, m);
    return { q: `${a} − ${b} = …`, a: `${a - b}` };
  },
};

/** Penjumlahan/pengurangan bersusun (ke bawah). Kelas 1–3: SEMUA angka &
 *  hasil tidak boleh lebih dari 100 (kelas 1 mulai 1 digit, kelas 2–3 dua
 *  digit dengan kombinasi makin besar). Kelas 4–6: jumlah digit naik per
 *  kelas (3–4 digit) dan boleh melebihi 100. */
const RENTANG_DIGIT_BERSUSUN: Record<number, [number, number][]> = {
  4: [[3, 3], [3, 4], [4, 4]],
  5: [[3, 4], [4, 4], [4, 4]],
  6: [[4, 4], [4, 4], [4, 4]],
};
/** rentang nilai bersusun kelas 1–3 per kesulitan: [aMin, aMax, bMin, bMax];
 *  jumlah/hasil selalu dijaga ≤ 100 saat generate */
const RENTANG_NILAI_BERSUSUN: Record<number, [number, number, number, number][]> = {
  1: [[1, 5, 1, 5], [2, 9, 2, 9], [11, 89, 11, 99]],
  2: [[11, 91, 2, 9], [11, 89, 11, 99], [11, 79, 21, 99]],
  3: [[11, 89, 11, 99], [21, 75, 21, 99], [21, 75, 25, 99]],
};
const bersusunTopik = (id: string, label: string, op: "+" | "−"): TopikDef => ({
  id,
  label,
  gen: (lv, R, kelas = 2) => {
    const k = Math.min(6, Math.max(1, kelas));
    if (k <= 3) {
      const [aMin, aMax, bMin, bMax] = RENTANG_NILAI_BERSUSUN[k][lv - 1];
      if (op === "+") {
        const a = ri(R, aMin, aMax);
        const b = ri(R, bMin, Math.max(bMin, Math.min(bMax, 100 - a)));
        return { q: `${a} + ${b} = …`, a: `${a + b}`, bersusun: { a: `${a}`, b: `${b}`, op } };
      }
      const a = ri(R, Math.max(aMin, bMin + 1), aMax);
      const b = ri(R, bMin, Math.max(bMin, Math.min(bMax, a - 1)));
      return { q: `${a} − ${b} = …`, a: `${a - b}`, bersusun: { a: `${a}`, b: `${b}`, op } };
    }
    const [dMin, dMax] = RENTANG_DIGIT_BERSUSUN[k][lv - 1];
    const d = ri(R, dMin, dMax);
    const min = 10 ** (d - 1), max = 10 ** d - 1;
    if (op === "+") {
      const a = ri(R, min, max), b = ri(R, min, max);
      return { q: `${a} + ${b} = …`, a: `${a + b}`, bersusun: { a: `${a}`, b: `${b}`, op } };
    }
    const a = ri(R, min + 1, max), b = ri(R, min, a - 1);
    return { q: `${a} − ${b} = …`, a: `${a - b}`, bersusun: { a: `${a}`, b: `${b}`, op } };
  },
});
const tambahBersusun = bersusunTopik("sd-tambah-bersusun", "Penjumlahan bersusun", "+");
const kurangBersusun = bersusunTopik("sd-kurang-bersusun", "Pengurangan bersusun", "−");
/** Perkalian bersusun (ke bawah). Kelas 1–3: angka & hasil ≤ 100 (kelas 1
 *  tabel dasar 1 digit; kelas 2–3 dua digit × satu digit, hasil maks 100).
 *  Kelas 4–6: naik bertahap hingga 2 digit × 2 digit. */
const kaliBersusun: TopikDef = {
  id: "sd-kali-bersusun", label: "Perkalian bersusun",
  gen: (lv, R, kelas = 3) => {
    const k = Math.min(6, Math.max(1, kelas));
    let a: number, b: number;
    if (k === 1) {
      const m = lv === 1 ? 5 : lv === 2 ? 9 : 10;
      a = ri(R, 2, m);
      b = ri(R, 2, Math.max(2, Math.min(m, Math.floor(100 / a))));
    } else if (k === 2) {
      if (lv === 1) { a = ri(R, 2, 9); b = ri(R, 2, 9); }
      else { a = ri(R, 11, lv === 2 ? 25 : 45); b = ri(R, 2, Math.max(2, Math.floor(100 / a))); }
    } else if (k === 3) {
      a = ri(R, 11, lv === 1 ? 22 : lv === 2 ? 34 : 50);
      b = ri(R, 2, Math.max(2, Math.floor(100 / a)));
    } else if (k === 4) {
      if (lv === 3 && R() < 0.5) { a = ri(R, 11, 29); b = ri(R, 11, 19); }
      else { a = ri(R, 12, Math.min(99, S(lv, 49, 0.6))); b = ri(R, 3, 9); }
    } else {
      if (lv === 1 && R() < 0.5) { a = ri(R, 11, 99); b = ri(R, 3, 9); }
      else { a = ri(R, 11, lv === 3 ? 79 : 49); b = ri(R, 11, lv === 3 ? 39 : 29); }
    }
    return { q: `${a} × ${b} = …`, a: `${a * b}`, bersusun: { a: `${a}`, b: `${b}`, op: "×" } };
  },
};
/** Pembagian bersusun tanpa sisa (ke bawah): a = b × hasil. Kelas 1–3:
 *  angka & hasil ≤ 100 (dividen maks 100). Kelas 4–6: hasil naik s.d. 90. */
const bagiBersusun: TopikDef = {
  id: "sd-bagi-bersusun", label: "Pembagian bersusun",
  gen: (lv, R, kelas = 3) => {
    const k = Math.min(6, Math.max(1, kelas));
    let b: number, h: number;
    if (k <= 3) {
      b = ri(R, 2, k === 1 ? 5 : lv === 1 ? 5 : 9);
      const hMax =
        k === 1 ? (lv === 1 ? 5 : 10)
          : k === 2 ? (lv === 1 ? 10 : 20)
            : (lv === 1 ? 10 : lv === 2 ? 25 : 50);
      h = ri(R, 2, Math.max(2, Math.min(hMax, Math.floor(100 / b))));
    } else {
      b = lv === 1 ? ri(R, 2, 5) : ri(R, 3, 9);
      const hMin = k === 4 ? 3 : k === 5 ? 10 : 20;
      const hMax = Math.round((k === 4 ? 20 : k === 5 ? 40 : 90) * (lv === 3 ? 1 : lv === 2 ? 0.7 : 0.5));
      h = ri(R, hMin, Math.max(hMin + 1, hMax));
    }
    return { q: `${b * h} : ${b} = …`, a: `${h}`, bersusun: { a: `${b * h}`, b: `${b}`, op: "÷" } };
  },
};
const operasiCampur: TopikDef = {
  id: "sd-operasi-campur", label: "Operasi hitung campuran",
  gen: (lv, R) => {
    const m = S(lv, 9, 0.3);
    const a = ri(R, 2, m), b = ri(R, 2, m), c = ri(R, 2, m);
    const t = pick(R, [
      { q: `${a} + ${b} × ${c} = …`, a: a + b * c },
      { q: `(${a} + ${b}) × ${c} = …`, a: (a + b) * c },
      { q: `${a} × ${b} − ${c} = …`, a: a * b - c },
      { q: `${a * b} : ${a} + ${c} = …`, a: b + c },
    ]);
    return { q: t.q, a: `${t.a}` };
  },
};
/** Operasi hitung campuran khusus kelas 3: SEMUA angka & hasil ≤ 100,
 *  mengombinasikan penjumlahan, pengurangan, perkalian, dan pembagian. */
const operasiCampur100: TopikDef = {
  id: "sd-operasi-campur-100", label: "Operasi hitung campuran",
  gen: (lv, R) => {
    const a = ri(R, 2, lv === 1 ? 9 : 20);
    const b = ri(R, 2, 9);
    const c = ri(R, 2, Math.max(2, Math.min(9, Math.floor((100 - a) / b))));
    const p = R();
    if (p < 0.25) return { q: `${a} + ${b} × ${c} = …`, a: `${a + b * c}` };
    if (p < 0.5) return { q: `${b} × ${c} + ${a} = …`, a: `${b * c + a}` };
    if (p < 0.75) {
      const aa = ri(R, 2, Math.max(2, Math.floor(100 / b)));
      const cc = ri(R, 1, Math.max(1, aa * b - 1));
      return { q: `${aa} × ${b} − ${cc} = …`, a: `${aa * b - cc}` };
    }
    return { q: `${b * c} : ${b} + ${a} = …`, a: `${c + a}` };
  },
};
const kali2digit: TopikDef = {
  id: "sd-kali-2digit", label: "Perkalian 2 digit × 1 digit",
  gen: (lv, R) => {
    const a = ri(R, 11, S(lv, 49, 0.6)), b = ri(R, 3, 9);
    return { q: `${a} × ${b} = …`, a: `${a * b}` };
  },
};
const bagiSisa: TopikDef = {
  id: "sd-bagi-sisa", label: "Pembagian dengan sisa",
  gen: (_lv, R) => {
    const b = ri(R, 3, 9), h = ri(R, 2, 12), s = ri(R, 1, b - 1);
    return { q: `${b * h + s} : ${b} = … sisa …`, a: `${h} sisa ${s}` };
  },
};
const pecahanSenilai: TopikDef = {
  id: "sd-pecahan-senilai", label: "Pecahan senilai",
  gen: (_lv, R) => {
    const q = ri(R, 2, 9), p = ri(R, 1, q - 1), k = ri(R, 2, 4);
    return { q: `${p}/${q} = ${p * k}/…`, a: `${q * k}` };
  },
};
const desimalTambah: TopikDef = {
  id: "sd-desimal-tambah", label: "Penjumlahan desimal",
  gen: (lv, R) => {
    const m = S(lv, 9, 0.4);
    const a = ri(R, 10, m * 10) / 10, b = ri(R, 10, m * 10) / 10;
    return { q: `${idn(a)} + ${idn(b)} = …`, a: idn(Math.round((a + b) * 10) / 10) };
  },
};
const kpkfpbMudah: TopikDef = {
  id: "sd-kpkfpb-1", label: "KPK & FPB (angka kecil)",
  gen: (_lv, R) => {
    const pairs = [[4, 6], [6, 8], [4, 8], [6, 9], [5, 10], [4, 10], [6, 10], [8, 12], [9, 12]];
    const [a, b] = pick(R, pairs);
    if (R() < 0.5) return { q: `KPK dari ${a} dan ${b} adalah …`, a: `${LCM(a, b)}` };
    return { q: `FPB dari ${a} dan ${b} adalah …`, a: `${GCD(a, b)}` };
  },
};
const persen: TopikDef = {
  id: "sd-persen", label: "Persen",
  gen: (lv, R) => {
    const p = pick(R, [10, 20, 25, 50, 75]);
    const base = pick(R, [40, 60, 80, 120, 200]) * (lv === 3 ? 2 : 1);
    return { q: `${p}% dari ${base} = …`, a: `${(p * base) / 100}` };
  },
};
const kpkfpb: TopikDef = {
  id: "sd-kpkfpb-2", label: "KPK & FPB (angka lebih besar)",
  gen: (lv, R) => {
    const m = S(lv, 15, 0.5);
    const a = ri(R, 8, m), b = ri(R, 8, m);
    if (a === b) return { q: `KPK dari ${a} dan ${b} adalah …`, a: `${a}` };
    if (R() < 0.5) return { q: `KPK dari ${a} dan ${b} adalah …`, a: `${LCM(a, b)}` };
    return { q: `FPB dari ${a} dan ${b} adalah …`, a: `${GCD(a, b)}` };
  },
};
const desimalKali: TopikDef = {
  id: "sd-desimal-kali", label: "Perkalian desimal",
  gen: (lv, R) => {
    if (R() < 0.5) {
      const a = ri(R, 2, S(lv, 9, 0.3)), b = ri(R, 2, 9);
      return { q: `${idn(a / 10)} × ${b} = …`, a: idn((a * b) / 10) };
    }
    const a = ri(R, 15, 49) / 10, b = ri(R, 2, 4);
    return { q: `${idn(a)} × ${b} = …`, a: idn(a * b) };
  },
};
const cacahCampur: TopikDef = {
  id: "sd-cacah-campur", label: "Operasi bilangan cacah",
  gen: (lv, R) => {
    const m = S(lv, 12, 0.3);
    const a = ri(R, 3, m), b = ri(R, 3, m), c = ri(R, 2, 9);
    return { q: `${a} × ${b} + ${c} × ${b} = …`, a: `${(a + c) * b}` };
  },
};

/* --- topik Matematika SD baru: pembanding, nilai tempat, urutan, uang,
   waktu, keliling-luas, satuan ukur, volume, rata-rata --- */

const bandingBilangan: TopikDef = {
  id: "sd-banding", label: "Membandingkan bilangan",
  gen: (lv, R) => {
    const m = S(lv, 20, 0.8);
    let a = ri(R, 1, m), b = ri(R, 1, m);
    if (a === b) b = a > 1 ? a - 1 : a + 1;
    return { q: `Isi tanda yang tepat ( > , < , atau = ):  ${a} … ${b}`, a: a > b ? ">" : "<" };
  },
};

const genapGanjil: TopikDef = {
  id: "sd-genap-ganjil", label: "Bilangan genap & ganjil",
  gen: (_lv, R) => {
    const n = ri(R, 3, 99);
    return { q: `Bilangan ${n} termasuk bilangan genap atau ganjil?`, a: n % 2 === 0 ? "genap" : "ganjil" };
  },
};

const nilaiTempat: TopikDef = {
  id: "sd-nilai-tempat", label: "Nilai tempat",
  gen: (lv, R) => {
    if (R() < 0.5) {
      const p = ri(R, 1, 9), s = ri(R, 0, 9);
      return { q: `${p} puluhan + ${s} satuan = …`, a: `${p * 10 + s}` };
    }
    const ratus = lv >= 2 ? ri(R, 1, 9) : 0;
    const p = ri(R, 1, 9);
    let s = ri(R, 0, 9);
    while (s === p) s = ri(R, 0, 9);
    const n = ratus * 100 + p * 10 + s;
    const tanyaPuluhan = R() < 0.5;
    return {
      q: `Angka ${tanyaPuluhan ? p : s} pada bilangan ${n} menempati tempat …`,
      a: tanyaPuluhan ? "puluhan" : "satuan",
    };
  },
};

const urutBilangan: TopikDef = {
  id: "sd-urut-bilangan", label: "Mengurutkan bilangan",
  gen: (lv, R) => {
    const m = S(lv, 40, 0.5);
    const set = new Set<number>();
    while (set.size < 4) set.add(ri(R, 1, m));
    const arr = [...set];
    const naik = R() < 0.5;
    const jawab = [...arr].sort((x, y) => (naik ? x - y : y - x)).join(", ");
    return { q: `Urutkan dari yang ${naik ? "terkecil" : "terbesar"}:  ${acakArray(R, arr).join(", ")}`, a: jawab };
  },
};

const rb = (n: number): string => `Rp${(n * 1000).toLocaleString("id-ID")}`;
const uangCerita: TopikDef = {
  id: "sd-uang-cerita", label: "Soal cerita uang",
  gen: (lv, R) => {
    const m = S(lv, 12, 0.5);
    if (R() < 0.5) {
      const a = ri(R, 3, m * 2), b = ri(R, 2, m);
      return { q: `Rina membeli buku seharga ${rb(a)} dan pensil seharga ${rb(b)}. Semua biayanya = …`, a: `${rb(a + b)}` };
    }
    const a = ri(R, m + 5, m * 5), b = ri(R, 2, m);
    return { q: `Dodi membayar ${rb(a)}, ia menerima kembalian ${rb(b)}. Harga barang yang dibeli = …`, a: `${rb(a - b)}` };
  },
};

const waktuSoal: TopikDef = {
  id: "sd-waktu", label: "Satuan waktu (jam & menit)",
  gen: (lv, R) => {
    if (R() < 0.5) {
      const j = ri(R, 1, 6), m = pick(R, [15, 20, 30, 45]);
      return { q: `${j} jam ${m} menit = … menit`, a: `${j * 60 + m}` };
    }
    const h1 = ri(R, 6, 20), m1 = pick(R, [0, 5, 10, 15, 20, 30]);
    const dur = pick(R, lv === 1 ? [15, 30] : [25, 40, 45, 50]);
    const tot = h1 * 60 + m1 + dur;
    const h2 = Math.floor(tot / 60), m2 = tot % 60;
    return {
      q: `Latihan dimulai pukul ${String(h1).padStart(2, "0")}.${String(m1).padStart(2, "0")} selama ${dur} menit. Latihan selesai pukul …`,
      a: `${String(h2).padStart(2, "0")}.${String(m2).padStart(2, "0")}`,
    };
  },
};

const kelilingLuas: TopikDef = {
  id: "sd-keliling-luas", label: "Keliling & luas bangun",
  gen: (lv, R) => {
    const m = S(lv, 12, 0.6);
    if (R() < 0.5) {
      const s = ri(R, 2, m);
      return R() < 0.5
        ? { q: `Persegi dengan sisi ${s} cm. Kelilingnya = … cm`, a: `${4 * s}` }
        : { q: `Persegi dengan sisi ${s} cm. Luasnya = … cm²`, a: `${s * s}` };
    }
    const p = ri(R, 3, m * 2), l = ri(R, 2, m);
    return R() < 0.5
      ? { q: `Persegi panjang berukuran ${p} cm × ${l} cm. Kelilingnya = … cm`, a: `${2 * (p + l)}` }
      : { q: `Persegi panjang berukuran ${p} cm × ${l} cm. Luasnya = … cm²`, a: `${p * l}` };
  },
};

const satuanUkur: TopikDef = {
  id: "sd-satuan-ukur", label: "Satuan pengukuran",
  gen: (lv, R) => {
    const data: [string, number, string][] = [
      ["m", 100, "cm"], ["km", 1000, "m"], ["kg", 1000, "g"],
      ["liter", 1000, "ml"], ["jam", 60, "menit"],
    ];
    const [ua, f, ub] = pick(R, data);
    const k = ri(R, 2, S(lv, 6, 0.4));
    if (R() < 0.5) return { q: `${k} ${ua} = … ${ub}`, a: `${k * f}` };
    return { q: `${k * f} ${ub} = … ${ua}`, a: `${k}` };
  },
};

const volumeBalok: TopikDef = {
  id: "sd-volume", label: "Volume kubus & balok",
  gen: (lv, R) => {
    const m = S(lv, 8, 0.5);
    if (R() < 0.5) {
      const s = ri(R, 2, m);
      return { q: `Volume kubus dengan rusuk ${s} cm = … cm³`, a: `${s * s * s}` };
    }
    const p = ri(R, 3, m * 2), l = ri(R, 2, m), t = ri(R, 2, m);
    return { q: `Volume balok berukuran ${p} cm × ${l} cm × ${t} cm = … cm³`, a: `${p * l * t}` };
  },
};

const rataRata: TopikDef = {
  id: "sd-rata-rata", label: "Rata-rata (mean)",
  gen: (lv, R) => {
    const n = lv === 1 ? 4 : 5;
    for (let guard = 0; guard < 60; guard++) {
      const target = ri(R, 70, 92);
      const nums: number[] = [];
      let sum = 0;
      for (let i = 0; i < n - 1; i++) {
        const v = ri(R, 60, 100);
        nums.push(v);
        sum += v;
      }
      const last = target * n - sum;
      if (last >= 60 && last <= 100 && !nums.includes(last)) {
        nums.push(last);
        return { q: `Nilai ulangan Bima: ${nums.join(", ")}. Rata-ratanya = …`, a: `${target}` };
      }
    }
    return { q: `Nilai ulangan Bima: 70, 80, 90, 80. Rata-ratanya = …`, a: "80" };
  },
};

/* ================= SMP ================= */

const bilBulat: TopikDef = {
  id: "smp-bulat", label: "Operasi bilangan bulat",
  gen: (lv, R) => {
    const m = S(lv, 15, 0.5);
    const a = ri(R, -m, m), b = ri(R, 2, m), c = ri(R, 2, m);
    const t = pick(R, [
      { q: `${a} + ${b} − ${c} = …`, a: a + b - c },
      { q: `${a} − ${b} × ${c} = …`, a: a - b * c },
      { q: `(${a}) × (${b}) + ${c} = …`, a: a * b + c },
      { q: `${a * b} : ${b === 0 ? 1 : b} + ${c} = …`, a: a + c },
    ]);
    return { q: t.q, a: `${t.a}` };
  },
};
const pecahan7: TopikDef = {
  id: "smp-pecahan", label: "Operasi pecahan",
  gen: (_lv, R) => {
    const b = ri(R, 3, 9), d = ri(R, 3, 9);
    const p = ri(R, 1, b - 1), r = ri(R, 1, d - 1);
    if (R() < 0.5) {
      const pn = p * d + r * b, pd = b * d;
      return { q: `${p}/${b} + ${r}/${d} = …`, a: simp(pn, pd) };
    }
    const pn = p * d - r * b, pd = b * d;
    return { q: `${p}/${b} − ${r}/${d} = …`, a: simp(pn, pd) };
  },
};
const aljabarSederhana: TopikDef = {
  id: "smp-aljabar", label: "Aljabar dasar (menyederhanakan)",
  gen: (_lv, R) => {
    const a = ri(R, 2, 9), b = ri(R, 2, 9), c = ri(R, 1, 9);
    const t = pick(R, [
      { q: `${a}x + ${b}x − ${c}x = …`, a: `${a + b - c}x` },
      { q: `${a}(x + ${b}) = …`, a: `${a}x + ${a * b}` },
      { q: `${a}x + ${b} − ${a}x + ${c} = …`, a: `${b + c}` },
    ]);
    return { q: `Sederhanakan: ${t.q}`, a: t.a };
  },
};
const plsv: TopikDef = {
  id: "smp-plsv", label: "Persamaan linear satu variabel",
  gen: (lv, R) => {
    const x = ri(R, 2, S(lv, 12, 0.5)), a = ri(R, 2, 9), b = ri(R, 1, 15);
    return { q: `${a}x + ${b} = ${a * x + b}  →  x = …`, a: `${x}` };
  },
};
const spldv: TopikDef = {
  id: "smp-spldv", label: "SPLDV (sistem persamaan)",
  gen: (_lv, R) => {
    const x = ri(R, 1, 9), y = ri(R, 1, 9);
    const a = ri(R, 1, 4), b = ri(R, 1, 4);
    return {
      q: `${a}x + ${b}y = ${a * x + b * y} ;  ${a}x − ${b}y = ${a * x - b * y}  →  x = …`,
      a: `${x}`,
    };
  },
};
const pythagoras: TopikDef = {
  id: "smp-pythagoras", label: "Teorema Pythagoras",
  gen: (lv, R) => {
    const trip = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25]];
    const [a, b, c] = pick(R, trip);
    const k = lv === 1 ? 1 : lv === 2 ? 2 : 3;
    if (R() < 0.5) return { q: `Segitiga siku-siku, a = ${a * k} cm dan b = ${b * k} cm. Sisi miring c = … cm`, a: `${c * k}` };
    return { q: `Segitiga siku-siku, sisi miring c = ${c * k} cm dan a = ${a * k} cm. Sisi b = … cm`, a: `${b * k}` };
  },
};
const plsvKurung: TopikDef = {
  id: "smp-plsv-kurung", label: "PLSV dengan kurung",
  gen: (_lv, R) => {
    const x = ri(R, 2, 10), a = ri(R, 2, 6), b = ri(R, 1, 9), c = ri(R, 1, 9);
    return { q: `${a}(x + ${b}) − ${c} = ${a * x + a * b - c}  →  x = …`, a: `${x}` };
  },
};
const eksponen9: TopikDef = {
  id: "smp-eksponen", label: "Eksponen & pangkat",
  gen: (_lv, R) => {
    const b = pick(R, [2, 3, 5]), m = ri(R, 2, 4), n = ri(R, 2, 4);
    const t = pick(R, [
      { q: `${b}^${m} × ${b}^${n} = ${b}^…`, a: `${m + n}` },
      { q: `${b}^${m + n} : ${b}^${n} = ${b}^…`, a: `${m}` },
      { q: `${b}^${m} = …`, a: `${Math.pow(b, m)}` },
    ]);
    return { q: t.q, a: t.a };
  },
};
const akar9: TopikDef = {
  id: "smp-akar", label: "Akar kuadrat & kubik",
  gen: (_lv, R) => {
    const k = ri(R, 2, 15), k3 = ri(R, 2, 6);
    if (R() < 0.6) return { q: `√${k * k} = …`, a: `${k}` };
    return { q: `³√${k3 * k3 * k3} = …`, a: `${k3}` };
  },
};
const pkFaktor: TopikDef = {
  id: "smp-pk", label: "Persamaan kuadrat (faktorisasi)",
  gen: (_lv, R) => {
    const p = ri(R, 1, 9), q = ri(R, 1, 9);
    const [r1, r2] = R() < 0.5 ? [p, q] : [-p, -q];
    const b = -(r1 + r2), c = r1 * r2;
    const bS = b === 0 ? "" : `${b > 0 ? " + " : " − "}${Math.abs(b)}x`;
    return {
      q: `x²${bS} ${c > 0 ? "+" : "−"} ${Math.abs(c)} = 0. Akar-akarnya x = … atau x = …`,
      a: `${r1} dan ${r2}`,
    };
  },
};
const polaBarisan: TopikDef = {
  id: "smp-pola", label: "Pola & barisan bilangan",
  gen: (_lv, R) => {
    const a = ri(R, 2, 9), d = ri(R, 2, 8), n = ri(R, 6, 12);
    return {
      q: `Barisan: ${a}, ${a + d}, ${a + 2 * d}, …  Suku ke-${n} = …`,
      a: `${a + (n - 1) * d}`,
    };
  },
};

/* --- topik SMP baru: perbandingan, lingkaran, aritmetika sosial --- */

const perbandinganSenilai: TopikDef = {
  id: "smp-perbandingan", label: "Perbandingan senilai & skala",
  gen: (lv, R) => {
    if (R() < 0.5) {
      const a = ri(R, 2, 5), b = a + ri(R, 1, 4);
      const k = ri(R, 2, S(lv, 5, 0.4));
      const ka = a * k; // harga a buku (ribuan) — selalu habis dibagi a
      return { q: `${a} buku harganya ${rb(ka)}. Harga ${b} buku = …`, a: `${rb(k * b)}` };
    }
    const skala = pick(R, [100000, 200000]);
    const cm = ri(R, 2, 9);
    const m = (cm * skala) / 100 / 1000;
    return { q: `Jarak dua kota pada peta ${cm} cm, skala 1 : ${skala.toLocaleString("id-ID")}. Jarak sebenarnya = … km`, a: `${idn(m)}` };
  },
};

const lingkaranSoal: TopikDef = {
  id: "smp-lingkaran", label: "Lingkaran (keliling & luas)",
  gen: (_lv, R) => {
    const r = pick(R, [7, 14, 21, 3.5]);
    const kel = R() < 0.5;
    if (kel) {
      const v = (2 * 22 * r) / 7;
      return { q: `Lingkaran berjari-jari ${idn(r)} cm (π = 22/7). Kelilingnya = … cm`, a: `${Number.isInteger(v) ? v : idn(v)}` };
    }
    const v = (22 * r * r) / 7;
    return { q: `Lingkaran berjari-jari ${idn(r)} cm (π = 22/7). Luasnya = … cm²`, a: `${Number.isInteger(v) ? v : idn(v)}` };
  },
};

const aritSosial: TopikDef = {
  id: "smp-arit-sosial", label: "Aritmetika sosial (diskon & bunga)",
  gen: (lv, R) => {
    const p = pick(R, [10, 15, 20, 25, 30, 40, 50]);
    const harga = ri(R, 4, S(lv, 20, 0.5)) * 10;
    if (R() < 0.5) {
      const bayar = harga - (harga * p) / 100;
      return { q: `Sebuah tas seharga ${rb(harga)} didiskon ${p}%. Harga yang harus dibayar = …`, a: `${rb(bayar)}` };
    }
    const b = pick(R, [5, 10, 12]);
    const total = harga + (harga * b) / 100;
    return { q: `Tabungan ${rb(harga)} di bank dengan bunga ${b}% per tahun. Saldo setelah 1 tahun = …`, a: `${rb(total)}` };
  },
};

/* ================= Calistung Ceria (SD kelas 1–3) ================= */

const SUKU2: string[][] = [
  ["bu", "ku"], ["ma", "ta"], ["ka", "ki"], ["me", "ja"], ["bo", "la"], ["sa", "pi"],
  ["ku", "da"], ["i", "kan"], ["ba", "ju"], ["ro", "da"], ["na", "si"], ["du", "ku"],
];
const SUKU3: string[][] = [
  ["ke", "re", "ta"], ["se", "pe", "da"], ["pe", "ra", "hu"], ["le", "ma", "ri"],
  ["ke", "la", "pa"], ["ka", "me", "ra"],
];
const KATA_HILANG: [string, string][] = [
  ["buku", "benda untuk membaca"], ["meja", "tempat menulis"], ["bola", "mainan berbentuk bulat"],
  ["sapi", "hewan penghasil susu"], ["kuda", "hewan yang bisa dikendarai"], ["ikan", "hewan yang hidup di air"],
  ["baju", "dipakai di badan"], ["nasi", "makanan dari padi"], ["roti", "makanan panggang"],
  ["jeruk", "buah berwarna oranye"], ["gajah", "hewan bertaring panjang"], ["bunga", "tumbuhan yang indah"],
];
const BENTUK_BENDA: [string, string][] = [
  ["uang koin", "bulat"], ["roda sepeda", "bulat"], ["papan catur", "kotak"],
  ["jendela", "kotak"], ["atap rumah", "segitiga"], ["potongan pizza", "segitiga"],
];
const LAWAN_KATA: [string, string][] = [
  ["besar", "kecil"], ["panjang", "pendek"], ["tinggi", "rendah"], ["terang", "gelap"],
  ["cepat", "lambat"], ["panas", "dingin"], ["basah", "kering"], ["kuat", "lemah"],
  ["berat", "ringan"], ["pagi", "malam"],
];
const PERSAMAAN_KATA: [string, string][] = [
  ["pintar", "cerdas"], ["senang", "gembira"], ["cantik", "indah"],
  ["kaya", "makmur"], ["kuat", "perkasa"], ["cepat", "gesit"],
];

const lingkariHuruf: TopikDef = {
  id: "cal-lingkari-huruf", label: "Mengenal huruf (lingkari)",
  gen: (_lv, R) => {
    const target = pick(R, ["b", "d", "p", "q", "c", "e", "a", "m", "n", "u", "g", "s"]);
    const pengisi = "aceghkmnpqrsuvwdtzblfijo".split("").filter((x) => x !== target);
    const huruf: string[] = [];
    for (let i = 0; i < 8; i++) huruf.push(i < 3 ? target : pick(R, pengisi));
    for (let i = huruf.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [huruf[i], huruf[j]] = [huruf[j], huruf[i]];
    }
    const tampil = huruf.map((h) => (R() < 0.5 ? h : h.toUpperCase())).join("  ");
    return { q: `Lingkari semua huruf ${target.toUpperCase()} pada baris ini!  ${tampil}`, a: `3 huruf ${target.toUpperCase()}` };
  },
};
const sukuKata2: TopikDef = {
  id: "cal-suku-kata", label: "Merangkai suku kata",
  gen: (lv, R) => {
    const s = lv >= 2 ? pick(R, SUKU3) : pick(R, SUKU2);
    const acak = [...s];
    for (let i = acak.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [acak[i], acak[j]] = [acak[j], acak[i]];
    }
    if (acak.join("") === s.join("")) [acak[0], acak[acak.length - 1]] = [acak[acak.length - 1], acak[0]];
    return { q: "Rangkai suku kata menjadi kata yang benar!", a: s.join(""), kind: "urut", words: acak };
  },
};
const kataHilang: TopikDef = {
  id: "cal-kata-hilang", label: "Huruf yang hilang",
  gen: (lv, R) => {
    const [kata, petunjuk] = pick(R, KATA_HILANG);
    const i = Math.max(1, Math.min(kata.length - 2, ri(R, 1, kata.length - 2) + (lv === 3 ? 1 : 0)));
    const tampil = kata.slice(0, i) + "_" + kata.slice(i + 1);
    return { q: `Huruf apa yang hilang?  ${tampil}  (petunjuk: ${petunjuk})`, a: kata[i] };
  },
};
const hitungBendaCal: TopikDef = {
  id: "cal-hitung", label: "Berhitung (hitung benda)",
  gen: (lv, R) => {
    const [em, nama] = pick(R, EMOJI_BENDA);
    const n = ri(R, 1, S(lv, 12, 0.6));
    return { q: `Hitung jumlah ${nama} di bawah ini!`, a: `${n}`, visual: visSatu(em, n) };
  },
};
const tambahGambar: TopikDef = {
  id: "cal-tambah-gambar", label: "Menjumlah gambar",
  gen: (lv, R) => {
    const [em, nama] = pick(R, EMOJI_BENDA);
    const m = S(lv, 6, 0.5);
    const a = ri(R, 1, m), b = ri(R, 1, Math.max(1, m - a + 1));
    return { q: `Jumlahkan kedua kelompok ${nama} di bawah ini!`, a: `${a + b}`, visual: visJumlah(em, a, b, "+") };
  },
};
const lanjutHitung: TopikDef = {
  id: "cal-lanjut-hitung", label: "Berhitung lompat (lanjutkan)",
  gen: (lv, R) => {
    const s = lv === 3 ? pick(R, [3, 4, 25, 50]) : pick(R, [2, 5, 10]);
    const a = s * ri(R, 1, 4);
    return { q: `Lanjutkan barisan: ${a}, ${a + s}, ${a + 2 * s}, ${a + 3 * s}, …, …`, a: `${a + 4 * s}, ${a + 5 * s}` };
  },
};
const operasi100Ceria: TopikDef = {
  id: "cal-operasi-100", label: "Tambah & kurang (sampai 100)",
  gen: (lv, R) => {
    const m = S(lv, 45, 0.3);
    if (R() < 0.5) {
      const a = ri(R, 10, m), b = ri(R, 10, 100 - a);
      return { q: `${a} + ${b} = …`, a: `${a + b}` };
    }
    const a = ri(R, Math.max(20, m), 99), b = ri(R, 5, m);
    return { q: `${a} − ${b} = …`, a: `${a - b}` };
  },
};
const bentukBenda: TopikDef = {
  id: "cal-bentuk", label: "Mengenal bentuk",
  gen: (_lv, R) => {
    const [benda, bentuk] = pick(R, BENTUK_BENDA);
    return { q: `Benda «${benda}» berbentuk …`, a: bentuk };
  },
};
const lawanKata: TopikDef = {
  id: "cal-lawan-kata", label: "Lawan kata (antonim)",
  gen: (lv, R) => {
    const [a, b] = pick(R, LAWAN_KATA);
    return lv === 3
      ? { q: `Sempurnakan pasangan: ${a} ↔ …`, a: b }
      : { q: `Lawan kata dari «${a}» adalah …`, a: b };
  },
};
const kaliCeria: TopikDef = {
  id: "cal-kali-ceria", label: "Perkalian ceria (kelompok benda)",
  gen: (lv, R) => {
    const [em, nama] = pick(R, EMOJI_BENDA);
    const g = ri(R, 2, S(lv, 6, 0.4)), per = ri(R, 2, 6);
    return {
      q: `Ada ${g} keranjang, setiap keranjang berisi ${per} ${nama}. Berapa jumlah ${nama} semuanya?`,
      a: `${g * per}`,
      visual: g * per <= 30 ? { parts: Array.from({ length: g }, () => ({ emoji: em, n: per })) } : undefined,
    };
  },
};
const bacaJam: TopikDef = {
  id: "cal-baca-jam", label: "Membaca jam",
  gen: (lv, R) => {
    const h = ri(R, 1, 12);
    if (lv === 3 && R() < 0.5) return { q: `Jarum pendek menunjuk ${h}, jarum panjang menunjuk 6. Waktunya …`, a: `${h}.30` };
    return { q: `Jarum pendek menunjuk ${h}, jarum panjang menunjuk 12. Waktunya …`, a: `${h}.00` };
  },
};
const uangCeria: TopikDef = {
  id: "cal-uang", label: "Mengenal uang rupiah",
  gen: (lv, R) => {
    const den = pick(R, [100, 200, 500, 1000]);
    const k = ri(R, 2, S(lv, 5, 0.5));
    return { q: `${k} keping Rp${den.toLocaleString("id-ID")} nilainya Rp…`, a: `Rp${(den * k).toLocaleString("id-ID")}` };
  },
};
const persamaanKata: TopikDef = {
  id: "cal-sinonim", label: "Persamaan kata (sinonim)",
  gen: (_lv, R) => {
    const [a, b] = pick(R, PERSAMAAN_KATA);
    return { q: `Persamaan kata dari «${a}» adalah …`, a: b };
  },
};

/* --- topik Calistung baru: kata bergambar, urutan abjad, kalimat --- */

const KATA_EMOJI: [string, string, string][] = [
  ["apel", "a", "🍎"], ["pisang", "p", "🍌"], ["jeruk", "j", "🍊"], ["mobil", "m", "🚗"],
  ["kucing", "k", "🐱"], ["bebek", "b", "🦆"], ["balon", "b", "🎈"], ["bola", "b", "⚽"],
  ["ikan", "i", "🐟"], ["kue", "k", "🧁"], ["bunga", "b", "🌸"], ["stroberi", "s", "🍓"],
];
const hurufAwal: TopikDef = {
  id: "cal-huruf-awal", label: "Huruf awal kata (gambar)",
  gen: (_lv, R) => {
    const [kata, h, em] = pick(R, KATA_EMOJI);
    return { q: `${em}  Gambar di samping adalah «${kata}». Huruf awal kata «${kata}» adalah …`, a: h };
  },
};

const KATA_ABJAD: string[] = [
  "ayam", "bebek", "cacing", "dasi", "elang", "gajah", "harimau", "ikan", "jeruk",
  "kuda", "lemari", "mangga", "nanas", "obor", "payung", "rakit", "sapi", "topi",
  "ubi", "vas", "wortel", "yoyo",
];
const urutKataAbjad: TopikDef = {
  id: "cal-urut-abjad", label: "Urutan abjad (A–Z)",
  gen: (lv, R) => {
    const n = lv === 3 ? 4 : 3;
    const pilihan = acakArray(R, KATA_ABJAD).slice(0, n);
    return { q: `Urutkan kata berikut sesuai abjad (A → Z):  ${acakArray(R, pilihan).join(", ")}`, a: [...pilihan].sort().join(", ") };
  },
};

const KALIMAT_BENAR: [string, string][] = [
  ["Kita mandi menggunakan sabun.", "benar"],
  ["Mata digunakan untuk mendengar suara.", "salah"],
  ["Ibu memasak nasi di dapur.", "benar"],
  ["Air mengalir dari bawah ke atas.", "salah"],
  ["Sapi adalah hewan yang berkaki dua.", "salah"],
  ["Bunga banyak ditemukan di taman.", "benar"],
  ["Matahari terbit dari barat.", "salah"],
  ["Kita berdoa sebelum belajar.", "benar"],
  ["Pensil digunakan untuk memasak.", "salah"],
  ["Belajar dengan rajin membuat pintar.", "benar"],
  ["Ayam berkembang biak dengan bertelur.", "benar"],
  ["Es batu terasa panas di tangan.", "salah"],
];
const kalimatBenar: TopikDef = {
  id: "cal-kalimat-benar", label: "Kalimat benar atau salah",
  gen: (_lv, R) => {
    const [kal, jawab] = pick(R, KALIMAT_BENAR);
    return { q: `Benar atau salah?  «${kal}»`, a: jawab };
  },
};

export const TOPIK_CALISTUNG: Record<string, Record<string, TopikDef[]>> = {
  SD: {
    "1": [lingkariHuruf, sukuKata2, kataHilang, hitungBendaCal, tambahGambar, hurufAwal],
    "2": [lanjutHitung, operasi100Ceria, bentukBenda, lawanKata, sukuKata2, urutKataAbjad],
    "3": [kaliCeria, bacaJam, uangCeria, persamaanKata, kataHilang, kalimatBenar],
  },
};

/* ================= Bahasa Inggris Dasar (SD kelas 1–6) ================= */

const VOK: Record<string, [string, string][]> = {
  warna: [["merah", "red"], ["biru", "blue"], ["hijau", "green"], ["kuning", "yellow"], ["hitam", "black"], ["putih", "white"], ["merah muda", "pink"], ["cokelat", "brown"]],
  sapaan: [["Selamat pagi", "Good morning"], ["Selamat siang", "Good afternoon"], ["Selamat malam", "Good evening"], ["Terima kasih", "Thank you"], ["Sampai jumpa", "Good bye"], ["Apa kabar?", "How are you?"], ["Maaf", "Sorry"], ["Permisi", "Excuse me"]],
  hewan: [["kucing", "cat"], ["anjing", "dog"], ["burung", "bird"], ["ikan", "fish"], ["kuda", "horse"], ["gajah", "elephant"], ["harimau", "tiger"], ["monyet", "monkey"], ["ayam", "chicken"], ["kambing", "goat"]],
  buah: [["apel", "apple"], ["pisang", "banana"], ["jeruk", "orange"], ["mangga", "mango"], ["semangka", "watermelon"], ["anggur", "grape"], ["nanas", "pineapple"], ["pepaya", "papaya"]],
  keluarga: [["ibu", "mother"], ["ayah", "father"], ["nenek", "grandmother"], ["kakek", "grandfather"], ["kakak perempuan", "sister"], ["kakak laki-laki", "brother"], ["paman", "uncle"], ["bibi", "aunt"]],
  tubuh: [["mata", "eye"], ["hidung", "nose"], ["mulut", "mouth"], ["tangan", "hand"], ["kaki", "foot"], ["telinga", "ear"], ["rambut", "hair"], ["gigi", "tooth"]],
  kelas: [["buku", "book"], ["pensil", "pencil"], ["penghapus", "eraser"], ["penggaris", "ruler"], ["tas", "bag"], ["kursi", "chair"], ["jendela", "window"], ["kapur", "chalk"]],
  kerja: [["makan", "eat"], ["minum", "drink"], ["tidur", "sleep"], ["berjalan", "walk"], ["berlari", "run"], ["membaca", "read"], ["menulis", "write"], ["menyanyi", "sing"]],
};
const HARI: [string, string][] = [["Senin", "Monday"], ["Selasa", "Tuesday"], ["Rabu", "Wednesday"], ["Kamis", "Thursday"], ["Jumat", "Friday"], ["Sabtu", "Saturday"], ["Minggu", "Sunday"]];
const PULUHAN: [number, string][] = [[20, "twenty"], [30, "thirty"], [40, "forty"], [50, "fifty"], [60, "sixty"], [70, "seventy"], [80, "eighty"], [90, "ninety"], [100, "one hundred"]];
const ANGKA1: [number, string][] = [[1, "one"], [2, "two"], [3, "three"], [4, "four"], [5, "five"], [6, "six"], [7, "seven"], [8, "eight"], [9, "nine"], [10, "ten"]];
const TOBE: [string, string][] = [["She", "is"], ["He", "is"], ["It", "is"], ["I", "am"], ["You", "are"], ["We", "are"], ["They", "are"], ["My mother", "is"], ["The cats", "are"]];
const TOBE_PREDIKAT = ["a teacher", "a student", "a doctor", "happy today", "my friend"];
const ABJAD = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** soal kosakata dua arah: mudah = ID→EN, sulit = EN→ID */
const vokabuler = (kelompok: string, tanya: (lv: number, R: () => number) => GenSoal): TopikDef => ({
  id: `eng-${kelompok}`,
  label: kelompok[0].toUpperCase() + kelompok.slice(1),
  gen: tanya,
});
const tanyaVok = (kelompok: string) => (lv: number, R: () => number): GenSoal => {
  const [id, en] = pick(R, VOK[kelompok]);
  const arah = lv === 1 ? true : lv === 3 ? false : R() < 0.6;
  return arah
    ? { q: `«${id}» in English is …`, a: en }
    : { q: `«${en}» artinya …`, a: id };
};

const abjad: TopikDef = {
  id: "eng-abjad", label: "Alphabet (urutan huruf)",
  gen: (lv, R) => {
    const i = ri(R, 1, 24);
    if (lv === 3) return { q: `Two letters after «${ABJAD[i]}» are … and …`, a: `${ABJAD[i + 1]}, ${ABJAD[i + 2]}` };
    return R() < 0.5
      ? { q: `What letter is after «${ABJAD[i]}»?`, a: ABJAD[i + 1] }
      : { q: `What letter is before «${ABJAD[i]}»?`, a: ABJAD[i - 1] };
  },
};
const angkaDasar: TopikDef = {
  id: "eng-angka", label: "Numbers 1–10",
  gen: (lv, R) => {
    const [n, w] = pick(R, ANGKA1);
    return lv === 3
      ? { q: `«${w}» means number …`, a: `${n}` }
      : { q: `Write in English: ${n} = …`, a: w };
  },
};
const puluhan: TopikDef = {
  id: "eng-puluhan", label: "Numbers 20–100",
  gen: (lv, R) => {
    const [n, w] = pick(R, PULUHAN);
    return lv === 3
      ? { q: `«${w}» means number …`, a: `${n}` }
      : { q: `Write in English: ${n} = …`, a: w };
  },
};
const hariInggris: TopikDef = {
  id: "eng-hari", label: "Days of the week",
  gen: (lv, R) => {
    if (lv === 3) {
      const i = ri(R, 0, 5);
      return { q: `The day after «${HARI[i][1]}» is …`, a: HARI[i + 1][1] };
    }
    const [id, en] = pick(R, HARI);
    return R() < 0.6
      ? { q: `«${id}» in English is …`, a: en }
      : { q: `«${en}» artinya hari …`, a: id };
  },
};
const tobe: TopikDef = {
  id: "eng-tobe", label: "To be (is / am / are)",
  gen: (_lv, R) => {
    const [subjek, jawab] = pick(R, TOBE);
    const predikat = pick(R, TOBE_PREDIKAT);
    return { q: `Fill in the blank: ${subjek} … ${predikat}.`, a: jawab };
  },
};

/* --- topik English baru: bentuk & hitung bergambar, bulan, jamak, a/an --- */

const SHAPES_EN: [string, string, string][] = [
  ["lingkaran", "circle", "⭕"], ["persegi", "square", "🟥"], ["segitiga", "triangle", "🔺"],
  ["bintang", "star", "⭐"], ["hati", "heart", "❤️"], ["belah ketupat", "diamond", "💠"],
];
const engShapes: TopikDef = {
  id: "eng-shapes", label: "Shapes (bentuk)",
  gen: (lv, R) => {
    const [id, en, em] = pick(R, SHAPES_EN);
    const arah = lv === 1 ? true : lv === 3 ? false : R() < 0.6;
    return arah
      ? { q: `${em}  «${id}» in English is …`, a: en }
      : { q: `«${en}» ${em} artinya …`, a: id };
  },
};

const BENDA_EN: [string, string][] = [
  ["🍎", "apples"], ["🎈", "balloons"], ["🐟", "fish"], ["🐱", "cats"], ["⚽", "balls"],
  ["🍌", "bananas"], ["🧁", "cupcakes"], ["🍊", "oranges"], ["⭐", "stars"], ["🍩", "donuts"],
];
const engCountVisual: TopikDef = {
  id: "eng-count", label: "Counting (count the pictures)",
  gen: (lv, R) => {
    const [em, en] = pick(R, BENDA_EN);
    const n = ri(R, 1, 10);
    const kata = ANGKA1.find((x) => x[0] === n)![1];
    return lv === 3
      ? { q: `Count the pictures, then write the number!`, a: `${n}`, visual: visSatu(em, n) }
      : { q: `How many ${en} are there? Write in English!`, a: kata, visual: visSatu(em, n) };
  },
};

const BULAN_EN: [string, string][] = [
  ["Januari", "January"], ["Februari", "February"], ["Maret", "March"], ["April", "April"],
  ["Mei", "May"], ["Juni", "June"], ["Juli", "July"], ["Agustus", "August"],
  ["September", "September"], ["Oktober", "October"], ["November", "November"], ["Desember", "December"],
];
const engMonths: TopikDef = {
  id: "eng-months", label: "Months of the year",
  gen: (lv, R) => {
    if (lv === 3) {
      const i = ri(R, 0, 10);
      return { q: `The month after «${BULAN_EN[i][1]}» is …`, a: BULAN_EN[i + 1][1] };
    }
    const [id, en] = pick(R, BULAN_EN);
    return R() < 0.6
      ? { q: `«${id}» in English is …`, a: en }
      : { q: `«${en}» artinya bulan …`, a: id };
  },
};

const JAMAK_EN: [string, string][] = [
  ["cat", "cats"], ["dog", "dogs"], ["book", "books"], ["pencil", "pencils"],
  ["box", "boxes"], ["bus", "buses"], ["baby", "babies"], ["story", "stories"],
  ["mango", "mangoes"], ["watch", "watches"],
];
const engPlural: TopikDef = {
  id: "eng-plural", label: "Plural (bentuk jamak)",
  gen: (_lv, R) => {
    const [a, b] = pick(R, JAMAK_EN);
    return { q: `Bentuk jamak (plural) dari «${a}» adalah …`, a: b };
  },
};

const engArticle: TopikDef = {
  id: "eng-article", label: "Articles (a / an)",
  gen: (_lv, R) => {
    const kata = pick(R, [
      "apple", "book", "cat", "egg", "umbrella", "pencil", "orange", "table",
      "ice cream", "elephant", "chair", "ant", "mango", "uniform",
    ]);
    const an = /^[aeiou]/i.test(kata);
    return { q: `Fill in the blank: This is … ${kata}.`, a: an ? "an" : "a" };
  },
};

const engWarna = vokabuler("warna", tanyaVok("warna"));
const engSapaan = vokabuler("sapaan", tanyaVok("sapaan"));
const engHewan = vokabuler("hewan", tanyaVok("hewan"));
const engBuah = vokabuler("buah", tanyaVok("buah"));
const engKeluarga = vokabuler("keluarga", tanyaVok("keluarga"));
const engTubuh = vokabuler("tubuh", tanyaVok("tubuh"));
const engKelas = vokabuler("kelas", tanyaVok("kelas"));
const engKerja = vokabuler("kerja", tanyaVok("kerja"));

/* --- topik interaktif: menjodohkan & susun kalimat (seperti worksheet referensi) --- */

const acakArray = <T,>(R: () => number, arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const PG_LETTERS = ["a", "b", "c", "d"];

/** menjodohkan: pilih 5 pasangan acak dari daftar */
const jodohDari = (daftar: [string, string][], instruksi: string): TopikDef => ({
  id: "", label: "",
  gen: (_lv, R) => ({
    q: instruksi,
    a: "",
    kind: "jodoh",
    pairs: acakArray(R, daftar).slice(0, 5),
  }),
});
const abjadJodoh: TopikDef = {
  ...jodohDari(
    ABJAD.slice(0, 20).map((h): [string, string] => [h, h.toLowerCase()]),
    "Pasangkan huruf besar dengan huruf kecilnya!"
  ),
  id: "eng-abjad-jodoh", label: "Alphabet (pasangkan)",
};
const sapaanJodoh: TopikDef = {
  ...jodohDari(VOK.sapaan, "Pasangkan sapaan di kiri dengan artinya di kanan!"),
  id: "eng-sapaan-jodoh", label: "Greetings (pasangkan)",
};

const KALIMAT_EN: string[][] = [
  ["I", "am", "a", "student"], ["She", "is", "my", "mother"], ["He", "is", "a", "teacher"],
  ["My", "name", "is", "Rina"], ["I", "have", "a", "cat"], ["We", "go", "to", "school"],
  ["This", "is", "my", "book"], ["The", "cat", "is", "black"], ["My", "father", "is", "kind"],
  ["I", "like", "red", "apples"], ["The", "sun", "is", "bright"], ["We", "are", "good", "friends"],
];
const kalimatUrut: TopikDef = {
  id: "eng-kalimat-urut", label: "Susun kalimat sederhana",
  gen: (_lv, R) => {
    const s = pick(R, KALIMAT_EN);
    return {
      q: "Susun kata-kata berikut menjadi kalimat yang benar!",
      a: s.join(" "),
      kind: "urut",
      words: acakArray(R, s),
    };
  },
};

/** kosakata pilihan ganda: pengecoh diambil dari kelompok yang sama */
const kosakataPG: TopikDef = {
  id: "eng-vok-pg", label: "Kosakata (pilihan ganda)",
  gen: (_lv, R) => {
    const grup = pick(R, Object.keys(VOK));
    const [id, en] = pick(R, VOK[grup]);
    const pengecoh = acakArray(R, VOK[grup].filter((v) => v[1] !== en)).slice(0, 3).map((v) => v[1]);
    const opsi = acakArray(R, [en, ...pengecoh]);
    return {
      q: `«${id}» in English is …`,
      a: PG_LETTERS[opsi.indexOf(en)],
      kind: "pg",
      options: opsi,
    };
  },
};

export const TOPIK_ENGLISH: Record<string, Record<string, TopikDef[]>> = {
  SD: {
    "1": [abjad, angkaDasar, engWarna, engSapaan, abjadJodoh, sapaanJodoh, engCountVisual],
    "2": [engHewan, engBuah, angkaDasar, engSapaan, sapaanJodoh, engCountVisual],
    "3": [engKeluarga, engTubuh, engHewan, engBuah, kalimatUrut, kosakataPG, engShapes],
    "4": [engTubuh, engKelas, hariInggris, engKeluarga, kalimatUrut, kosakataPG, engShapes, engArticle],
    "5": [engKerja, engKelas, hariInggris, puluhan, kosakataPG, engArticle, engMonths],
    "6": [engKerja, puluhan, tobe, hariInggris, kosakataPG, engMonths, engPlural],
  },
};

/* ================= Worksheet Coding (SD 4–6, SMP 7–9) ================= */

const urutanRobot: TopikDef = {
  id: "cod-urutan", label: "Sequence (urutan perintah)",
  gen: (lv, R) => {
    const f = ri(R, 3, S(lv, 8, 0.5));
    if (R() < 0.5) {
      const f2 = ri(R, 2, 9);
      return { q: `Robot menerima perintah: MAJU ${f}, MAJU ${f2}. Berapa langkah robot dari titik awal?`, a: `${f + f2}` };
    }
    const b = ri(R, 1, f - 1);
    return { q: `Robot menerima perintah: MAJU ${f}, MUNDUR ${b}. Berapa langkah robot dari titik awal?`, a: `${f - b}` };
  },
};
const polaUlang: TopikDef = {
  id: "cod-pola", label: "Pattern (pola berulang)",
  gen: (lv, R) => {
    const dipakai = acakArray(R, EMOJI_BENDA).slice(0, lv === 1 ? 2 : 3);
    const c = dipakai.length;
    const urut = Array.from({ length: 6 }, (_, i) => dipakai[i % c][0]).join(" ");
    return { q: `Lanjutkan pola: ${urut} … Gambar berikutnya adalah …`, a: dipakai[6 % c][1] };
  },
};
const logikaIf: TopikDef = {
  id: "cod-if", label: "Condition (logika IF)",
  gen: (lv, R) => {
    const t = pick(R, [70, 75, 80]);
    const n = ri(R, 45, S(lv, 90, 0.1));
    return {
      q: `Program: JIKA nilai ≥ ${t} tampilkan "LULUS", selain itu "ULANG". Nilai Rina = ${n}. Output program: …`,
      a: n >= t ? "LULUS" : "ULANG",
    };
  },
};
const langkahLoop: TopikDef = {
  id: "cod-loop-1", label: "Repetition (perulangan)",
  gen: (lv, R) => {
    const k = ri(R, 2, S(lv, 8, 0.6));
    if (R() < 0.5) return { q: `Perintah "Ulangi ${k} kali: tempel stiker" menghasilkan … stiker.`, a: `${k}` };
    const d = ri(R, 2, 9);
    return { q: `Perintah: ulangi ${k} kali → "tambah ${d} poin". Total poin yang didapat = …`, a: `${k * d}` };
  },
};
const binerDasar: TopikDef = {
  id: "cod-biner", label: "Bilangan biner",
  gen: (lv, R) => {
    const v = ri(R, 2, lv === 3 ? 15 : 7);
    const bit = lv === 3 ? 4 : 3;
    const biner = v.toString(2).padStart(bit, "0");
    const uraian = biner.split("").map((b, i) => `${b}×${Math.pow(2, biner.length - 1 - i)}`).join(" + ");
    return { q: `Biner ${biner} berarti ${uraian}. Nilai desimalnya = …`, a: `${v}` };
  },
};
const varDasar: TopikDef = {
  id: "cod-var-1", label: "Variabel sederhana",
  gen: (lv, R) => {
    const a = ri(R, 2, S(lv, 9, 0.8)), b = ri(R, 1, 9);
    return { q: `A = ${a}; B = A + ${b}. Nilai B = …`, a: `${a + b}` };
  },
};
const varChain: TopikDef = {
  id: "cod-var-2", label: "Variabel berantai",
  gen: (lv, R) => {
    const x = ri(R, 2, S(lv, 9, 0.8)), d = ri(R, 1, 9), m = ri(R, 2, 4);
    return { q: `x = ${x}; y = x + ${d}; z = y × ${m}. Nilai z = …`, a: `${(x + d) * m}` };
  },
};
const loopTotal: TopikDef = {
  id: "cod-loop-2", label: "Loop & akumulasi",
  gen: (lv, R) => {
    const k = ri(R, 2, S(lv, 8, 0.5)), d = ri(R, 2, 9);
    return { q: `total = 0; ulangi ${k} kali: total = total + ${d}. Nilai akhir total = …`, a: `${k * d}` };
  },
};
const modulo: TopikDef = {
  id: "cod-modulo", label: "Sisa bagi (modulo)",
  gen: (lv, R) => {
    const a = ri(R, 10, S(lv, 49, 1.5)), b = ri(R, 2, 9);
    return { q: `${a} : ${b} bersisa … (operasi ${a} % ${b})`, a: `${a % b}` };
  },
};
const booleanCek: TopikDef = {
  id: "cod-boolean", label: "Logika AND/OR",
  gen: (_lv, R) => {
    const lo = pick(R, [7, 10, 12]), hi = pick(R, [15, 17, 60]);
    const age = ri(R, 5, hi + 3);
    const ok = age >= lo && age <= hi;
    return {
      q: `Syarat tiket: umur ≥ ${lo} DAN umur ≤ ${hi}. Umur Dewi = ${age}. Apakah Dewi memenuhi syarat? (jawab benar/salah)`,
      a: ok ? "benar" : "salah",
    };
  },
};
const debugOutput: TopikDef = {
  id: "cod-debug", label: "Debugging (baca output)",
  gen: (_lv, R) => {
    const a = ri(R, 3, 15), b = ri(R, 2, a - 1);
    const op = pick(R, [["+", a + b], ["−", a - b], ["×", a * b]] as [string, number][]);
    return { q: `Kode: a = ${a}; b = ${b}; tampil a ${op[0]} b. Output yang muncul: …`, a: `${op[1]}` };
  },
};

/* --- topik Coding baru: algoritma harian (urut langkah) & sandi geser --- */

const LANGKAH_ALGO: string[][] = [
  ["Nyalakan TV", "Pilih channel", "Tonton acara", "Matikan TV"],
  ["Pakai sepatu bola", "Ambil bola", "Bermain bola", "Minum air"],
  ["Buka buku", "Baca halaman", "Tulis catatan", "Tutup buku"],
  ["Cuci tangan", "Ambil piring", "Ambil nasi", "Makan nasi"],
  ["Buka pintu kelas", "Sapa guru", "Duduk rapi", "Buka buku pelajaran"],
  ["Isi ember", "Basahi badan", "Gunakan sabun", "Keringkan badan"],
  ["Bangun tidur", "Merapikan tempat tidur", "Mandi", "Sarapan"],
  ["Buka kran", "Basahi tangan", "Beri sabun", "Keringkan tangan"],
];
const algoUrut: TopikDef = {
  id: "cod-algo-urut", label: "Algorithm (urutkan langkah)",
  gen: (_lv, R) => {
    const s = pick(R, LANGKAH_ALGO);
    return {
      q: "Susun langkah berikut menjadi algoritma yang benar (mulai dari langkah pertama)!",
      a: s.join(" → "),
      kind: "urut",
      words: acakArray(R, s),
    };
  },
};

const sandiGeser: TopikDef = {
  id: "cod-sandi", label: "Secret code (sandi geser)",
  gen: (_lv, R) => {
    const geser = ri(R, 1, 3);
    const hurufGeser = String.fromCharCode(65 + geser);
    const kata = pick(R, ["KUCING", "SAPI", "AYAM", "ROBOT", "KODING", "PIZZA", "MEJA", "BOLA", "GAME", "LAMPU", "MATA", "GURU"]);
    const sandi = kata
      .split("")
      .map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + geser) % 26) + 65))
      .join("");
    if (R() < 0.5) return { q: `Sandi geser ${geser} (A→${hurufGeser}, B→C, …). Tulis «${kata}» dalam sandi!`, a: sandi };
    return { q: `Sandi geser ${geser} (A→${hurufGeser}, B→C, …). Sandi «${sandi}» dibaca …`, a: kata };
  },
};

export const TOPIK_CODING: Record<string, Record<string, TopikDef[]>> = {
  SD: {
    "4": [urutanRobot, polaUlang, logikaIf, langkahLoop, algoUrut],
    "5": [polaUlang, logikaIf, binerDasar, varDasar, algoUrut],
    "6": [binerDasar, varDasar, langkahLoop, polaUlang, algoUrut],
  },
  SMP: {
    "7": [varChain, loopTotal, booleanCek],
    "8": [varChain, loopTotal, modulo, booleanCek, sandiGeser],
    "9": [modulo, loopTotal, debugOutput, varChain, sandiGeser],
  },
};

/* ================= Worksheet Kiddo (sumber materi: kiddoworksheets.com) =================
   Bank mengikuti kategori lembar kerja kiddoworksheets.com — Alphabets, Numbers,
   Maths, Vocabulary (scramble / sight words / matching), Shapes, Colors, Patterns,
   Telling Time, Body Parts (GK), Find the Difference — disesuaikan menjadi
   5 jenis soal Rumbela (PG / isian / uraian / menjodohkan / susun). */

const KATA_ANAK: string[] = ["bola", "mata", "kuda", "ikan", "buku", "sapi", "roti", "nasi", "baju", "roda", "kaki", "gigi"];

const hurufHilangKiddo: TopikDef = {
  id: "kiddo-huruf-hilang", label: "Huruf yang hilang (A–Z)",
  gen: (lv, R) => {
    const besar = R() < 0.7;
    const abj = besar ? ABJAD : ABJAD.map((h) => h.toLowerCase());
    const len = lv === 1 ? 4 : 6;
    const start = ri(R, 0, ABJAD.length - 1 - len);
    const gap = ri(R, 1, len - 2);
    const deret = Array.from({ length: len }, (_, i) => abj[start + i]);
    const jawab = deret[gap];
    deret[gap] = "__";
    return { q: `Lengkapi huruf yang hilang:  ${deret.join("   ")}`, a: jawab };
  },
};

const angkaHilangKiddo: TopikDef = {
  id: "kiddo-angka-hilang", label: "Angka yang hilang",
  gen: (lv, R) => {
    const lang = lv === 1 ? 1 : pick(R, [1, 2, 5, 10]);
    const mulai = ri(R, 1, lang === 1 ? (lv === 3 ? 60 : 25) : 10);
    const gap = ri(R, 1, 3);
    const deret = Array.from({ length: 5 }, (_, i) => mulai + i * lang);
    const jawab = deret[gap];
    deret[gap] = -1;
    return { q: `Lengkapi urutan angka:  ${deret.map((n) => (n < 0 ? "…" : n)).join(", ")}`, a: `${jawab}` };
  },
};

const hitungBendaKiddo: TopikDef = {
  id: "kiddo-hitung-benda", label: "Berhitung benda",
  gen: (lv, R) => {
    const [em, nama] = pick(R, EMOJI_BENDA);
    const n = ri(R, 2, lv === 1 ? 7 : 14);
    return { q: `Hitung jumlah ${nama} di bawah ini!`, a: `${n}`, visual: visSatu(em, n) };
  },
};

const WARNA_BENDA: [string, string][] = [
  ["Pisang", "kuning"], ["Daun", "hijau"], ["Langit", "biru"], ["Tomat", "merah"], ["Susu", "putih"],
  ["Wortel", "oranye"], ["Anggur", "ungu"], ["Cabai", "merah"], ["Jagung", "kuning"], ["Laut", "biru"],
];
const warnaJodohKiddo: TopikDef = {
  ...jodohDari(WARNA_BENDA, "Pasangkan benda di kiri dengan warnanya di kanan!"),
  id: "kiddo-warna-jodoh", label: "Warna benda (pasangkan)",
};

const BENTUK_KIDDO: [string, string][] = [
  ["Segitiga", "3 sisi"], ["Persegi", "4 sisi sama"], ["Lingkaran", "tanpa sudut"],
  ["Bintang", "5 ujung"], ["Belah ketupat", "4 sisi miring"],
];
const bentukJodohKiddo: TopikDef = {
  ...jodohDari(BENTUK_KIDDO, "Pasangkan bangun di kiri dengan ciri-cirinya di kanan!"),
  id: "kiddo-bentuk-jodoh", label: "Bentuk & bangun (pasangkan)",
};

const susunHurufKiddo: TopikDef = {
  id: "kiddo-susun-huruf", label: "Susun huruf (spelling)",
  gen: (_lv, R) => {
    const kata = pick(R, KATA_ANAK);
    const acak = acakArray(R, kata.split(""));
    if (acak.join("") === kata) [acak[0], acak[acak.length - 1]] = [acak[acak.length - 1], acak[0]];
    return { q: "Susun huruf-huruf berikut menjadi sebuah kata!", a: kata, kind: "urut", words: acak };
  },
};

const BENDA_CERITA: [string, string][] = [
  ["apel", "🍎"], ["balon", "🎈"], ["buku", "📕"], ["kue", "🧁"], ["permen", "🍬"],
];
const tambahKurangKiddo: TopikDef = {
  id: "kiddo-tambah-kurang", label: "Cerita tambah & kurang",
  gen: (lv, R) => {
    const [benda, em] = pick(R, BENDA_CERITA);
    const m = S(lv, 6, 0.5);
    if (R() < 0.6) {
      const a = ri(R, 1, m), b = ri(R, 1, m);
      return { q: `Ali punya ${a} ${benda}, lalu dibelikan ${b} ${benda} lagi. Semua ${benda} Ali sekarang ada …`, a: `${a + b}`, visual: visJumlah(em, a, b, "+") };
    }
    const a = ri(R, m + 1, m * 2), b = ri(R, 1, m);
    return { q: `Ada ${a} ${benda} di meja, ${b} ${benda} dimakan. Sisa ${benda} di meja ada …`, a: `${a - b}`, visual: visJumlah(em, a, b, "−") };
  },
};

const KEL_BEDA: [string[], string[]][] = [
  [["kucing", "sapi", "ayam", "kambing", "bebek"], ["jeruk", "mangga", "pisang", "semangka"]],
  [["jeruk", "mangga", "pisang", "semangka", "anggur"], ["kucing", "sapi", "ayam", "kambing"]],
  [["sepeda", "bus", "kapal", "pesawat", "becak"], ["meja", "kursi", "lemari", "jendela"]],
  [["pensil", "penghapus", "penggaris", "buku", "krayon"], ["sepatu", "sandal", "kemeja", "topi"]],
];
const cariBedaKiddo: TopikDef = {
  id: "kiddo-cari-beda", label: "Cari yang berbeda (GK)",
  gen: (_lv, R) => {
    const [utama, lain] = pick(R, KEL_BEDA);
    const ganjil = pick(R, lain);
    const pilihan = acakArray(R, [...acakArray(R, utama).slice(0, 3), ganjil]);
    return { q: `Lingkari yang TIDAK sekelompok:  ${pilihan.join(", ")}`, a: ganjil };
  },
};

const POLA_EMOJI: [string, string][] = [
  ["⭐", "bintang"], ["🍎", "apel"], ["🎈", "balon"], ["🐟", "ikan"],
  ["🌸", "bunga"], ["🐱", "kucing"], ["🚗", "mobil"], ["⚽", "bola"],
];
const polaKiddo: TopikDef = {
  id: "kiddo-pola", label: "Pola berulang",
  gen: (lv, R) => {
    const c = lv === 1 ? 2 : 3;
    const dipakai = acakArray(R, POLA_EMOJI).slice(0, c);
    const deret = Array.from({ length: 6 }, (_, i) => dipakai[i % c][0]).join(" ");
    const lanjut = dipakai[6 % c];
    return { q: `Lanjutkan pola:  ${deret}  … Gambar berikutnya adalah …`, a: lanjut[1] };
  },
};

const VOK_KIDDO: [string, string][] = [
  ["kereta", "train"], ["pesawat", "airplane"], ["kapal", "ship"], ["sepeda", "bicycle"], ["becak", "rickshaw"],
  ["hujan", "rain"], ["panas", "hot"], ["berawan", "cloudy"], ["berangin", "windy"], ["bersalju", "snowy"],
  ["kemeja", "shirt"], ["celana", "trousers"], ["sepatu", "shoes"], ["topi", "hat"], ["sabuk", "belt"],
];
const kosakataJodohKiddo: TopikDef = {
  ...jodohDari(VOK_KIDDO, "Match the words on the left with the English meaning on the right!"),
  id: "kiddo-vok-jodoh", label: "Kosakata Inggris (pasangkan)",
};

const SIGHT_WORDS: [string, string][] = [
  ["I … a student.", "am"], ["She … my sister.", "is"], ["They … happy.", "are"], ["We … at school.", "are"],
  ["It … a cat.", "is"], ["You … my friend.", "are"], ["He … tall.", "is"], ["The dog … big.", "is"],
];
const sightWordsKiddo: TopikDef = {
  id: "kiddo-sight-words", label: "Sight words (is / am / are)",
  gen: (_lv, R) => {
    const [kalimat, jawab] = pick(R, SIGHT_WORDS);
    return { q: `Lengkapi kalimatnya: “${kalimat}”  (is / am / are)`, a: jawab };
  },
};

const TUBUH_KIDDO: [string, string][] = [
  ["Mata", "untuk melihat"], ["Telinga", "untuk mendengar"], ["Hidung", "untuk mencium"],
  ["Tangan", "untuk memegang"], ["Kaki", "untuk berjalan"], ["Mulut", "untuk makan & bicara"],
];
const tubuhJodohKiddo: TopikDef = {
  ...jodohDari(TUBUH_KIDDO, "Pasangkan bagian tubuh di kiri dengan fungsinya di kanan!"),
  id: "kiddo-tubuh-jodoh", label: "Bagian tubuh (pasangkan)",
};

const susunKalimatEnKiddo: TopikDef = {
  id: "kiddo-kalimat-en", label: "Scramble kalimat Inggris",
  gen: (_lv, R) => {
    const s = pick(R, KALIMAT_EN);
    return { q: "Susun kata-kata berikut menjadi kalimat yang benar!", a: s.join(" "), kind: "urut", words: acakArray(R, s) };
  },
};

const lompatHitungKiddo: TopikDef = {
  id: "kiddo-lompat-hitung", label: "Berhitung lompat",
  gen: (lv, R) => {
    const lang = lv === 1 ? pick(R, [2, 5]) : pick(R, [2, 3, 4, 5, 10]);
    const mulai = ri(R, 1, 9);
    const deret = Array.from({ length: 5 }, (_, i) => mulai + i * lang);
    const jawab = deret[4];
    deret[4] = -1;
    return { q: `Lengkapi berhitung lompat-${lang}:  ${deret.map((n) => (n < 0 ? "…" : n)).join(", ")}`, a: `${jawab}` };
  },
};

/* --- topik Kiddo baru: huruf vokal, banding banyak (gambar), kurang gambar --- */

const hurufVokalKiddo: TopikDef = {
  id: "kiddo-vokal", label: "Huruf vokal (lingkari)",
  gen: (_lv, R) => {
    const vokal = ["a", "i", "u", "e", "o"];
    const lain = "bcdfghjklmnpqrstvw".split("");
    const dipakai = acakArray(R, vokal).slice(0, 3);
    const huruf: string[] = [];
    for (let i = 0; i < 8; i++) huruf.push(i < 3 ? dipakai[i] : pick(R, lain));
    const tampil = acakArray(R, huruf).map((h) => (R() < 0.4 ? h.toUpperCase() : h));
    return { q: `Lingkari semua huruf vokal pada baris ini!  ${tampil.join("  ")}`, a: dipakai.join(", ") };
  },
};

const bandingBanyakKiddo: TopikDef = {
  id: "kiddo-banding-banyak", label: "Lebih banyak / sedikit (gambar)",
  gen: (lv, R) => {
    const iA = ri(R, 0, EMOJI_BENDA.length - 1);
    let iB = ri(R, 0, EMOJI_BENDA.length - 1);
    if (iB === iA) iB = (iB + 1) % EMOJI_BENDA.length;
    const [emA, nmA] = EMOJI_BENDA[iA];
    const [emB, nmB] = EMOJI_BENDA[iB];
    const a = ri(R, 2, S(lv, 6, 0.5));
    let b = ri(R, 2, 9);
    if (b === a) b = a + 1;
    const tanyaA = R() < 0.5;
    return {
      q: tanyaA
        ? `Lihat kedua baris di bawah. Apakah jumlah ${nmA} lebih banyak daripada ${nmB}?`
        : `Lihat kedua baris di bawah. Apakah jumlah ${nmB} lebih banyak daripada ${nmA}?`,
      a: (tanyaA ? a > b : b > a) ? "ya" : "tidak",
      visual: { parts: [{ emoji: emA, n: a }, { emoji: emB, n: b, baru: true }] },
    };
  },
};

const kurangGambarKiddo: TopikDef = {
  id: "kiddo-kurang-gambar", label: "Pengurangan gambar",
  gen: (lv, R) => {
    const [em, nama] = pick(R, EMOJI_BENDA);
    const m = S(lv, 7, 0.5);
    const a = ri(R, m + 1, m + 5), b = ri(R, 1, m);
    return { q: `Ada ${a} ${nama}, lalu ${b} ${nama} diambil. Sisa ${nama} ada …`, a: `${a - b}`, visual: visJumlah(em, a, b, "−") };
  },
};

export const TOPIK_KIDDO: Record<string, Record<string, TopikDef[]>> = {
  SD: {
    "1": [hurufHilangKiddo, angkaHilangKiddo, hitungBendaKiddo, warnaJodohKiddo, bentukJodohKiddo, hurufVokalKiddo, bandingBanyakKiddo, kurangGambarKiddo],
    "2": [susunHurufKiddo, tambahKurangKiddo, cariBedaKiddo, polaKiddo, angkaHilangKiddo, kurangGambarKiddo],
    "3": [susunKalimatEnKiddo, sightWordsKiddo, kosakataJodohKiddo, tubuhJodohKiddo, lompatHitungKiddo],
  },
};

/* ============ pemetaan jenjang → kelas → topik ============ */

/* Pola bilangan: naik / turun dengan lompatan tetap */
const polaBilangan: TopikDef = {
  id: "sd-pola-bilangan", label: "Pola Bilangan",
  gen: (lv, R) => {
    if (lv === 1) {
      const s = ri(R, 1, 2), a = ri(R, 1, 5);
      return { q: `Lanjutkan pola: ${a}, ${a + s}, ${a + 2 * s}, ${a + 3 * s}, …, …`, a: `${a + 4 * s}, ${a + 5 * s}` };
    }
    const naik = lv === 3 ? R() < 0.6 : true;
    if (naik) {
      const s = ri(R, 2, S(lv, 6, 0.5)), a = ri(R, 1, 9);
      return { q: `Lanjutkan pola: ${a}, ${a + s}, ${a + 2 * s}, ${a + 3 * s}, …, …`, a: `${a + 4 * s}, ${a + 5 * s}` };
    }
    const a = ri(R, 30, 80);
    const s = ri(R, 2, Math.max(2, Math.min(9, Math.floor((a - 5) / 5))));
    return { q: `Lanjutkan pola: ${a}, ${a - s}, ${a - 2 * s}, ${a - 3 * s}, …, …`, a: `${a - 4 * s}, ${a - 5 * s}` };
  },
};

export const TOPIK_MATEMATIKA: Record<string, Record<string, TopikDef[]>> = {
  SD: {
    /* Kelas 1–3: penjumlahan, pengurangan, perkalian, pembagian (biasa &
       bersusun) — semua angka & hasil ≤ 100, kombinasi makin besar tiap kelas.
       Kelas 4 ke atas boleh melebihi 100 (kesulitan terus naik). */
    "1": [tambah20, kurang20, campur20, bandingBilangan, genapGanjil, kaliDasar, bagiDasar, tambahBersusun, kurangBersusun, polaBilangan],
    "2": [tambah100, kurang100, nilaiTempat, urutBilangan, kaliDasar, bagiDasar, tambahBersusun, kurangBersusun, polaBilangan],
    "3": [tambah100, kurang100, nilaiTempat, urutBilangan, kaliBag, operasiCampur100, uangCerita, waktuSoal, tambahBersusun, kurangBersusun, polaBilangan],
    "4": [tambah1000, kurang1000, tambahBersusun, kurangBersusun, kaliBersusun, bagiBersusun, operasiCampur, kali2digit, bagiSisa, kelilingLuas, satuanUkur],
    "5": [tambahBersusun, kurangBersusun, kaliBersusun, bagiBersusun, pecahanSenilai, desimalTambah, kpkfpbMudah, operasiCampur, kelilingLuas, satuanUkur, volumeBalok],
    "6": [tambahBersusun, kurangBersusun, kaliBersusun, bagiBersusun, persen, kpkfpb, desimalKali, cacahCampur, volumeBalok, rataRata],
  },
  SMP: {
    "7": [bilBulat, pecahan7, aljabarSederhana, plsv, perbandinganSenilai],
    "8": [spldv, pythagoras, plsvKurung, bilBulat, lingkaranSoal],
    "9": [eksponen9, akar9, pkFaktor, polaBarisan, aritSosial],
  },
};

export const KELAS_BY_JENJANG: Record<string, string[]> = {
  SD: ["1", "2", "3", "4", "5", "6"],
  SMP: ["7", "8", "9"],
};

/** Mapel yang punya bank generator otomatis */
export type GenMapel = "matematika" | "calistung" | "english" | "coding" | "kiddo";

/** Sumber materi bank Worksheet Kiddo */
export const KIDDO_SOURCE = "https://www.kiddoworksheets.com";

export interface GenMapelDef {
  id: GenMapel;
  label: string;
  rentang: string;
  jenjang: string[];
}

export const GEN_MAPEL: GenMapelDef[] = [
  { id: "matematika", label: "Matematika", rentang: "SD · SMP", jenjang: ["SD", "SMP"] },
  { id: "calistung", label: "Calistung Ceria", rentang: "SD kelas 1–3", jenjang: ["SD"] },
  { id: "english", label: "Bahasa Inggris Dasar", rentang: "SD kelas 1–6", jenjang: ["SD"] },
  { id: "coding", label: "Worksheet Coding", rentang: "SD 4–6 · SMP", jenjang: ["SD", "SMP"] },
  { id: "kiddo", label: "Worksheet Kiddo", rentang: "TK · SD 1–3 · kiddoworksheets", jenjang: ["SD"] },
];

export const TOPIK_GENERATOR: Record<GenMapel, Record<string, Record<string, TopikDef[]>>> = {
  matematika: TOPIK_MATEMATIKA,
  calistung: TOPIK_CALISTUNG,
  english: TOPIK_ENGLISH,
  coding: TOPIK_CODING,
  kiddo: TOPIK_KIDDO,
};

/** daftar kelas yang punya topik generator untuk mapel+jenjang */
export function kelasTersedia(mapel: GenMapel, jenjang: string): string[] {
  return Object.keys(TOPIK_GENERATOR[mapel]?.[jenjang] ?? {}).sort((a, b) => Number(a) - Number(b));
}

export const MAPEL_LIST = [
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "IPA",
  "IPS",
  "PAI",
  "Fisika",
  "Kimia",
  "Biologi",
  "Ekonomi",
  "Geografi",
  "Sejarah",
] as const;

export type Kesulitan = 1 | 2 | 3;

/** Buat n soal unik dari satu topik pada mapel generator tertentu. */
export function generateQuestions(
  mapel: GenMapel,
  topikId: string,
  jenjang: string,
  kelas: string,
  n: number,
  kesulitan: Kesulitan
): GenSoal[] {
  const topik = (TOPIK_GENERATOR[mapel]?.[jenjang]?.[kelas] ?? []).find((t) => t.id === topikId);
  if (!topik) return [];
  const out: GenSoal[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < n && guard < n * 40) {
    guard++;
    const s = topik.gen(kesulitan, Math.random, Number(kelas) || 0);
    const key =
      s.q + (s.options ? "|" + s.options.join("~") : "") +
      (s.pairs ? "|" + s.pairs.map((p) => p.join("=")).join("~") : "") +
      (s.words ? "|" + s.words.join("~") : "") +
      (s.visual ? "|" + s.visual.parts.map((p) => p.emoji.repeat(p.n) + (p.baru ? "\n" : "")).join(";") + "|" + (s.visual.join ?? "") : "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/** Buat "paket campuran": semua topik kelas ini jadi seksi A/B/C.
    Topik menjodohkan cukup 1 papan per seksi. Mengembalikan soal + nama seksi. */
export function generateMixed(
  mapel: GenMapel,
  jenjang: string,
  kelas: string,
  total: number,
  kesulitan: Kesulitan
): (GenSoal & { section: string })[] {
  const topiks = TOPIK_GENERATOR[mapel]?.[jenjang]?.[kelas] ?? [];
  if (!topiks.length) return [];
  const biasa = topiks.filter((t) => !t.id.endsWith("-jodoh"));
  const perTopik = Math.max(2, Math.ceil(total / Math.max(1, biasa.length)));
  const out: (GenSoal & { section: string })[] = [];
  for (const t of topiks) {
    const n = t.id.endsWith("-jodoh") ? 1 : perTopik;
    const soal = generateQuestions(mapel, t.id, jenjang, kelas, n, kesulitan);
    for (const s of soal) out.push({ ...s, section: t.label });
  }
  return out;
}

/** label topik dari id (untuk arsip); dicari di semua bank generator */
export function topikLabel(mapel: GenMapel, topikId: string, jenjang: string, kelas: string): string {
  return (
    TOPIK_GENERATOR[mapel]?.[jenjang]?.[kelas]?.find((t) => t.id === topikId)?.label ??
    Object.values(TOPIK_GENERATOR)
      .flatMap((bank) => Object.values(bank).flatMap((k) => Object.values(k)))
      .flat()
      .find((t) => t.id === topikId)?.label ??
    topikId
  );
}
