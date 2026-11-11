"use client";

/* Engine generator soal Matematika otomatis per jenjang (SD/SMP/SMA),
   kelas & topik. Semua soal dihitung ulang setiap kali dibuat, jawaban
   selalu bilangan bulat / pecahan sederhana agar rapi untuk lembar kerja. */

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
}

export interface TopikDef {
  id: string;
  label: string;
  gen: (lv: number, R: () => number) => GenSoal;
}

/** bilangan bulat acak a..s.d. b (inklusif) */
const ri = (R: () => number, a: number, b: number): number =>
  a + Math.floor(R() * (b - a + 1));
const pick = <T,>(R: () => number, arr: T[]): T => arr[Math.floor(R() * arr.length)];
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
  gen: (lv, R) => {
    const a = ri(R, 2, S(lv, 7, 0.2)), b = ri(R, 2, S(lv, 8, 0.2));
    return { q: `${a} × ${b} = …`, a: `${a * b}` };
  },
};
const kaliBag: TopikDef = {
  id: "sd-kali-bagi", label: "Perkalian & pembagian",
  gen: (lv, R) => {
    const a = ri(R, 2, S(lv, 9, 0.2)), b = ri(R, 2, 9);
    if (R() < 0.5) return { q: `${a} × ${b} = …`, a: `${a * b}` };
    return { q: `${a * b} : ${b} = …`, a: `${a}` };
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

/** Penjumlahan/pengurangan bersusun (ke bawah). lv1: 2 digit, lv3: 3 digit. */
const bersusunTopik = (id: string, label: string, op: "+" | "−"): TopikDef => ({
  id,
  label,
  gen: (lv, R) => {
    const digit = lv === 1 ? 2 : lv === 3 ? 3 : R() < 0.5 ? 2 : 3;
    const min = digit === 2 ? 10 : 100;
    const max = digit === 2 ? 99 : 999;
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
/** Perkalian bersusun (ke bawah). lv1: dasar 1–9, lv2+: 2 digit × 1 digit. */
const kaliBersusun: TopikDef = {
  id: "sd-kali-bersusun", label: "Perkalian bersusun",
  gen: (lv, R) => {
    const a = lv === 1 ? ri(R, 2, 9) : ri(R, 11, S(lv, 49, 0.6));
    const b = lv === 1 ? ri(R, 2, 9) : ri(R, 3, 9);
    return { q: `${a} × ${b} = …`, a: `${a * b}`, bersusun: { a: `${a}`, b: `${b}`, op: "×" } };
  },
};
/** Pembagian bersusun tanpa sisa (ke bawah): a = hasil kali b × hasil. */
const bagiBersusun: TopikDef = {
  id: "sd-bagi-bersusun", label: "Pembagian bersusun",
  gen: (lv, R) => {
    const b = lv === 1 ? ri(R, 2, 5) : ri(R, 3, 9);
    const h = ri(R, lv === 3 ? 5 : 3, lv === 3 ? 20 : 12);
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

/* ================= SMA ================= */

const eksLog: TopikDef = {
  id: "sma-ekslog", label: "Eksponen & logaritma",
  gen: (_lv, R) => {
    const b = pick(R, [2, 3, 5]), m = ri(R, 2, 5);
    if (R() < 0.4) return { q: `${b}^x = ${Math.pow(b, m)}  →  x = …`, a: `${m}` };
    return { q: `²log ${Math.pow(2, m)} = …`, a: `${m}` };
  },
};
const pk10: TopikDef = {
  id: "sma-pk", label: "Persamaan kuadrat",
  gen: (_lv, R) => {
    const p = ri(R, 2, 12), q = ri(R, 1, 12);
    const [r1, r2] = R() < 0.5 ? [p, -q] : [-p, -q];
    const b = -(r1 + r2), c = r1 * r2;
    const bS = b === 0 ? "" : `${b > 0 ? " + " : " − "}${Math.abs(b)}x`;
    return {
      q: `x²${bS} ${c > 0 ? "+" : "−"} ${Math.abs(c)} = 0. Nilai x₁ · x₂ = …`,
      a: `${c}`,
    };
  },
};
const barisanArit: TopikDef = {
  id: "sma-barisan", label: "Barisan & deret aritmetika",
  gen: (lv, R) => {
    const a = ri(R, 3, 15), d = ri(R, 2, 9), n = ri(R, S(lv, 10, 0.5), S(lv, 25, 0.5));
    return { q: `Barisan aritmetika ${a}, ${a + d}, ${a + 2 * d}, …  Suku ke-${n} (Un) = …`, a: `${a + (n - 1) * d}` };
  },
};
const fungsiKuadrat: TopikDef = {
  id: "sma-fk", label: "Fungsi kuadrat",
  gen: (_lv, R) => {
    const p = ri(R, 1, 9), q = ri(R, 1, 9), r1 = p, r2 = -q;
    const b = -(r1 + r2), c = r1 * r2;
    const bS = b === 0 ? "" : `${b > 0 ? " + " : " − "}${Math.abs(b)}x`;
    const ask = R() < 0.5;
    return ask
      ? { q: `f(x) = x²${bS} ${c > 0 ? "+" : "−"} ${Math.abs(c)}. Titik potong sumbu-x: x = … atau x = …`, a: `${r1} dan ${r2}` }
      : { q: `f(x) = x²${bS} ${c > 0 ? "+" : "−"} ${Math.abs(c)}. Sumbu simetri x = −b/2a = …`, a: idn(b / 2) };
  },
};
const geometri11: TopikDef = {
  id: "sma-geometri", label: "Barisan & deret geometri",
  gen: (_lv, R) => {
    const a = ri(R, 2, 6), r = pick(R, [2, 3]), n = ri(R, 5, 9);
    return {
      q: `Barisan geometri ${a}, ${a * r}, ${a * r * r}, …  Suku ke-${n} = …`,
      a: `${a * Math.pow(r, n - 1)}`,
    };
  },
};
const polinom11: TopikDef = {
  id: "sma-polinom", label: "Polinomial (nilai fungsi)",
  gen: (_lv, R) => {
    const a = ri(R, 1, 3), b = ri(R, -5, 5), c = ri(R, -9, 9), x = ri(R, 2, 5);
    const v = a * x * x * x + b * x * x + c * x + 7;
    const bS = b === 0 ? "" : ` ${b > 0 ? "+" : "−"} ${Math.abs(b)}x²`;
    const cS = c === 0 ? "" : ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}x`;
    return { q: `f(x) = ${a}x³${bS}${cS} + 7. Nilai f(${x}) = …`, a: `${v}` };
  },
};
const turunan12: TopikDef = {
  id: "sma-turunan", label: "Turunan fungsi",
  gen: (_lv, R) => {
    const a = ri(R, 2, 6), b = ri(R, 2, 9), x = ri(R, 2, 6);
    if (R() < 0.5) return { q: `f(x) = ${a}x² − ${b}x + 3. f′(${x}) = …`, a: `${2 * a * x - b}` };
    return { q: `f(x) = ${a}x³. f′(x) = …`, a: `${3 * a}x²` };
  },
};
const integral12: TopikDef = {
  id: "sma-integral", label: "Integral tentu",
  gen: (_lv, R) => {
    const a = ri(R, 2, 6), b = ri(R, 2, 5), u = ri(R, 2, 4);
    return { q: `∫(${a}x + ${b}) dx dari x = 0 sampai x = ${u} = …`, a: `${(a * u * u) / 2 + b * u}` };
  },
};
const limit12: TopikDef = {
  id: "sma-limit", label: "Limit fungsi",
  gen: (_lv, R) => {
    const k = ri(R, 2, 7);
    return { q: `lim x→${k}  (x² − ${k * k})/(x − ${k}) = …`, a: `${2 * k}` };
  },
};

/* ================= Calistung Ceria (SD kelas 1–3) ================= */

const dots = (n: number): string => Array.from({ length: n }, () => "●").join(" ");
const dots5 = (n: number): string =>
  Array.from({ length: Math.ceil(n / 5) }, (_, i) => dots(Math.min(5, n - i * 5))).join("  ");

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
const hitungBintang: TopikDef = {
  id: "cal-hitung", label: "Berhitung (hitung bintang)",
  gen: (lv, R) => {
    const n = ri(R, 1, S(lv, 12, 0.6));
    return { q: `Hitung bintang di bawah ini!  ${dots5(n)}`, a: `${n}` };
  },
};
const tambahGambar: TopikDef = {
  id: "cal-tambah-gambar", label: "Menjumlah gambar",
  gen: (lv, R) => {
    const m = S(lv, 6, 0.5);
    const a = ri(R, 1, m), b = ri(R, 1, Math.max(1, m - a + 1));
    return { q: `${dots(a)}  +  ${dots(b)}  = … bintang`, a: `${a + b}` };
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
    const g = ri(R, 2, S(lv, 6, 0.4)), per = ri(R, 2, 6);
    return { q: `Ada ${g} keranjang, setiap keranjang berisi ${per} buah. Semua buah = ${g} × ${per} = …`, a: `${g * per}` };
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

export const TOPIK_CALISTUNG: Record<string, Record<string, TopikDef[]>> = {
  SD: {
    "1": [lingkariHuruf, sukuKata2, kataHilang, hitungBintang, tambahGambar],
    "2": [lanjutHitung, operasi100Ceria, bentukBenda, lawanKata, sukuKata2],
    "3": [kaliCeria, bacaJam, uangCeria, persamaanKata, kataHilang],
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
    "1": [abjad, angkaDasar, engWarna, engSapaan, abjadJodoh, sapaanJodoh],
    "2": [engHewan, engBuah, angkaDasar, engSapaan, sapaanJodoh],
    "3": [engKeluarga, engTubuh, engHewan, engBuah, kalimatUrut, kosakataPG],
    "4": [engTubuh, engKelas, hariInggris, engKeluarga, kalimatUrut, kosakataPG],
    "5": [engKerja, engKelas, hariInggris, puluhan, kosakataPG],
    "6": [engKerja, puluhan, tobe, hariInggris, kosakataPG],
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
    const simbol = ["●", "▲", "★", "■", "◆"];
    const c = lv === 1 ? 2 : 3;
    const dipakai = [...simbol].sort(() => R() - 0.5).slice(0, c);
    const urut = Array.from({ length: 6 }, (_, i) => dipakai[i % c]).join(" ");
    return { q: `Lanjutkan pola: ${urut} … Bentuk berikutnya adalah …`, a: dipakai[6 % c] };
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

export const TOPIK_CODING: Record<string, Record<string, TopikDef[]>> = {
  SD: {
    "4": [urutanRobot, polaUlang, logikaIf, langkahLoop],
    "5": [polaUlang, logikaIf, binerDasar, varDasar],
    "6": [binerDasar, varDasar, langkahLoop, polaUlang],
  },
  SMP: {
    "7": [varChain, loopTotal, booleanCek],
    "8": [varChain, loopTotal, modulo, booleanCek],
    "9": [modulo, loopTotal, debugOutput, varChain],
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
    const [sim, nama] = pick(R, [["★", "bintang"], ["●", "bulatan"], ["■", "kotak"], ["▲", "segitiga"], ["♥", "hati"]] as [string, string][]);
    const n = ri(R, 2, lv === 1 ? 7 : 14);
    return { q: `Hitung jumlah ${nama}:  ${Array.from({ length: n }, () => sim).join(" ")}`, a: `${n}` };
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
  ["apel", "apel"], ["kelereng", "kelereng"], ["balon", "balon"], ["buku", "buku"], ["kue", "kue"],
];
const tambahKurangKiddo: TopikDef = {
  id: "kiddo-tambah-kurang", label: "Cerita tambah & kurang",
  gen: (lv, R) => {
    const [benda] = pick(R, BENDA_CERITA);
    const m = S(lv, 6, 0.5);
    if (R() < 0.6) {
      const a = ri(R, 1, m), b = ri(R, 1, m);
      return { q: `Ali punya ${a} ${benda}, lalu dibelikan ${b} ${benda} lagi. Semua ${benda} Ali sekarang ada …`, a: `${a + b}` };
    }
    const a = ri(R, m + 1, m * 2), b = ri(R, 1, m);
    return { q: `Ada ${a} ${benda} di meja, ${b} ${benda} dimakan. Sisa ${benda} di meja ada …`, a: `${a - b}` };
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

const POLA_SIMBOL: [string, string][] = [["●", "bulatan"], ["▲", "segitiga"], ["■", "kotak"], ["★", "bintang"]];
const polaKiddo: TopikDef = {
  id: "kiddo-pola", label: "Pola berulang",
  gen: (lv, R) => {
    const c = lv === 1 ? 2 : 3;
    const dipakai = acakArray(R, POLA_SIMBOL).slice(0, c);
    const deret = Array.from({ length: 6 }, (_, i) => dipakai[i % c][0]).join(" ");
    const lanjut = dipakai[6 % c];
    return { q: `Lanjutkan pola:  ${deret}  … Bentuk berikutnya adalah …`, a: lanjut[1] };
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

export const TOPIK_KIDDO: Record<string, Record<string, TopikDef[]>> = {
  SD: {
    "1": [hurufHilangKiddo, angkaHilangKiddo, hitungBendaKiddo, warnaJodohKiddo, bentukJodohKiddo],
    "2": [susunHurufKiddo, tambahKurangKiddo, cariBedaKiddo, polaKiddo, angkaHilangKiddo],
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
    "1": [tambah20, kurang20, campur20, polaBilangan],
    "2": [tambah100, kurang100, tambahBersusun, kurangBersusun, kaliDasar, kaliBersusun, polaBilangan],
    "3": [kaliBag, tambah1000, kurang1000, tambahBersusun, kurangBersusun, kaliBersusun, bagiBersusun, polaBilangan],
    "4": [operasiCampur, kali2digit, bagiSisa, kaliBersusun, bagiBersusun],
    "5": [pecahanSenilai, desimalTambah, kpkfpbMudah, operasiCampur],
    "6": [persen, kpkfpb, desimalKali, cacahCampur],
  },
  SMP: {
    "7": [bilBulat, pecahan7, aljabarSederhana, plsv],
    "8": [spldv, pythagoras, plsvKurung, bilBulat],
    "9": [eksponen9, akar9, pkFaktor, polaBarisan],
  },
  SMA: {
    "10": [eksLog, pk10, barisanArit],
    "11": [fungsiKuadrat, geometri11, polinom11],
    "12": [turunan12, integral12, limit12],
  },
};

export const KELAS_BY_JENJANG: Record<string, string[]> = {
  SD: ["1", "2", "3", "4", "5", "6"],
  SMP: ["7", "8", "9"],
  SMA: ["10", "11", "12"],
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
  { id: "matematika", label: "Matematika", rentang: "SD · SMP · SMA", jenjang: ["SD", "SMP", "SMA"] },
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
    const s = topik.gen(kesulitan, Math.random);
    const key =
      s.q + (s.options ? "|" + s.options.join("~") : "") +
      (s.pairs ? "|" + s.pairs.map((p) => p.join("=")).join("~") : "") +
      (s.words ? "|" + s.words.join("~") : "");
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
