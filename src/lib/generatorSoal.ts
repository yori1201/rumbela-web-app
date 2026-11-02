"use client";

/* Engine generator soal Matematika otomatis per jenjang (SD/SMP/SMA),
   kelas & topik. Semua soal dihitung ulang setiap kali dibuat, jawaban
   selalu bilangan bulat / pecahan sederhana agar rapi untuk lembar kerja. */

export interface GenSoal {
  q: string;
  a: string;
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

/* ============ pemetaan jenjang → kelas → topik ============ */

export const TOPIK_MATEMATIKA: Record<string, Record<string, TopikDef[]>> = {
  SD: {
    "1": [tambah20, kurang20, campur20],
    "2": [tambah100, kurang100, kaliDasar],
    "3": [kaliBag, tambah1000, kurang1000],
    "4": [operasiCampur, kali2digit, bagiSisa],
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

/** Buat n soal unik dari satu topik. */
export function generateQuestions(
  topikId: string,
  jenjang: string,
  kelas: string,
  n: number,
  kesulitan: Kesulitan
): GenSoal[] {
  const topik = (TOPIK_MATEMATIKA[jenjang]?.[kelas] ?? []).find((t) => t.id === topikId);
  if (!topik) return [];
  const out: GenSoal[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < n && guard < n * 40) {
    guard++;
    const s = topik.gen(kesulitan, Math.random);
    const key = s.q;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/** label topik dari id (untuk arsip) */
export function topikLabel(topikId: string, jenjang: string, kelas: string): string {
  return (
    TOPIK_MATEMATIKA[jenjang]?.[kelas]?.find((t) => t.id === topikId)?.label ?? topikId
  );
}
