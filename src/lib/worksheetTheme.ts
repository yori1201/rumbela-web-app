"use client";

/* Tema worksheet anak — dipakai bersama oleh pratinjau HTML (soal.tsx)
   dan renderer canvas (renderWorksheet.ts) agar keduanya identik.
   Seluruh lembar PUTIH POLOS: kartu seksi putih bergaris tipis netral,
   nomor & judul seksi berupa teks polos, tanpa kartu berwarna. Aksen
   warna hanya tersisa pada banner judul, pil meta, dan pita footer. */

import type { Worksheet, WorksheetQ } from "./types";

export interface SectionPalette {
  /** latar kartu seksi */
  bg: string;
  /** border kartu seksi */
  border: string;
  /** warna aksen teks (nomor, huruf opsi) */
  badge: string;
  /** latar opsi / pil di dalam seksi */
  chip: string;
}

/** satu palet tunggal: putih polos netral untuk semua seksi A–Z */
export const SECTION_PALETTE: SectionPalette[] = [
  { bg: "#FFFFFF", border: "#D5DDE9", badge: "#25406B", chip: "#FFFFFF" },
];

export const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/* Warna halaman & elemen tetap (seluruhnya putih polos) */
export const WS = {
  pageBg: "#FFFFFF",
  kunciBg: "#FFFFFF",
  ink: "#25406B",
  bannerGrad: ["#1565C0", "#0D47A1"],
  bannerKunciGrad: ["#1B7A43", "#15803D"],
  pillYellow: "#FFC93D",
  pillYellowInk: "#6B4300",
  idBoxBg: "#FFFFFF",
  idBoxBorder: "#A9BCD4",
  petunjukBg: "#FFFFFF",
  petunjukBorder: "#D5DDE9",
  petunjukInk: "#44557A",
  footerGrad: ["#1E88E9", "#2FA968"],
  mut: "#5A6B8A",
  star: "#FFC93D",
  cloud: "#FFFFFF",
} as const;

/** Seksi worksheet setelah dikelompokkan */
export interface SheetSection {
  label: string;
  questions: WorksheetQ[];
}

/** Kelompokkan soal menjadi seksi (urut kemunculan pertama).
    Tanpa section → satu seksi berlabel topik. */
export function groupSections(ws: Worksheet): SheetSection[] {
  const out: SheetSection[] = [];
  const idx = new Map<string, number>();
  for (const q of ws.questions) {
    const label = q.section?.trim() || ws.topik?.trim() || "Latihan";
    if (!idx.has(label)) {
      idx.set(label, out.length);
      out.push({ label, questions: [] });
    }
    out[idx.get(label)!].questions.push(q);
  }
  return out;
}

/** nomor huruf seksi A, B, C … */
export function sectionLetter(i: number): string {
  return String.fromCharCode(65 + (i % 26));
}

/* ---- acak deterministik: pratinjau, canvas, & kunci menghasilkan
   urutan kolom kanan yang sama untuk satu soal ---- */

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** urutan acak 0..n-1 yang stabil untuk seed (id soal) */
export function shuffledOrder(n: number, seed: string): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  let state = (hashSeed(seed || "rumbela") % 2147483647) || 42;
  const rnd = () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** soal isian berbentuk hitungan/pola singkat → kotak jawaban sebaris */
export function isEquationLike(q: WorksheetQ): boolean {
  if (q.kind !== "isian") return false;
  const t = q.text.trim();
  if (t.length > 46) return false;
  return /(=|…|\.\.\.)\s*$/.test(t) || /^\d/.test(t);
}

/** kunci ringkas satu soal (dipakai lembar kunci) */
export function answerOf(q: WorksheetQ): string {
  if (q.kind === "pg" && q.options?.length) return q.answer.toUpperCase() || "";
  if (q.kind === "jodoh" && q.pairs?.length) {
    const order = shuffledOrder(q.pairs.length, q.id);
    return q.pairs
      .map((p, i) => `${i + 1}-${LETTERS[order.indexOf(i)]}`)
      .join(" · ");
  }
  return q.answer || "";
}
