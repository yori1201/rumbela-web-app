"use client";

/* Tema worksheet anak — dipakai bersama oleh pratinjau HTML (soal.tsx)
   dan renderer canvas (renderWorksheet.ts) agar keduanya identik.
   Palet mengikuti referensi: langit biru muda, kartu seksi pastel
   warna-warni, aksen kuning, footer pita biru. */

import type { Worksheet, WorksheetQ } from "./types";

export interface SectionPalette {
  /** latar kartu seksi (pastel) */
  bg: string;
  /** border kartu seksi */
  border: string;
  /** warna badge / lingkaran nomor (kuat) */
  badge: string;
  /** latar opsi / pil di dalam seksi */
  chip: string;
}

/** siklus warna seksi A → F (mengikuti worksheet referensi) */
export const SECTION_PALETTE: SectionPalette[] = [
  { bg: "#E3F3FD", border: "#7CC4EF", badge: "#1E88E9", chip: "#FFFFFF" }, // biru
  { bg: "#FDE9F1", border: "#F2A0BE", badge: "#EC5F94", chip: "#FFFFFF" }, // merah muda
  { bg: "#FFF4D6", border: "#F2C84B", badge: "#E8A200", chip: "#FFFFFF" }, // kuning
  { bg: "#E2F7EC", border: "#8CD4AC", badge: "#2FA968", chip: "#FFFFFF" }, // hijau
  { bg: "#EFE9FD", border: "#B7A3EE", badge: "#7C5CE0", chip: "#FFFFFF" }, // ungu
  { bg: "#E0F6F3", border: "#83CFC7", badge: "#2E9C91", chip: "#FFFFFF" }, // toska
];

export const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/* Warna halaman & elemen tetap */
export const WS = {
  pageBg: "#EAF6FD",
  kunciBg: "#EFFBEF",
  ink: "#25406B",
  bannerGrad: ["#1E88E9", "#39A7F0"],
  bannerKunciGrad: ["#1F9D55", "#43C680"],
  pillYellow: "#FFC93D",
  pillYellowInk: "#8A5A00",
  idBoxBg: "#FFFFFF",
  idBoxBorder: "#59A9E8",
  petunjukBg: "#FFF6D9",
  petunjukBorder: "#F2C84B",
  petunjukInk: "#7A5410",
  footerGrad: ["#1E88E9", "#2FA968"],
  mut: "#7C93B5",
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
  if (q.kind === "pg" && q.options?.length) return q.answer.toUpperCase() || "—";
  if (q.kind === "jodoh" && q.pairs?.length) {
    const order = shuffledOrder(q.pairs.length, q.id);
    return q.pairs
      .map((p, i) => `${i + 1}-${LETTERS[order.indexOf(i)]}`)
      .join(" · ");
  }
  return q.answer || "—";
}
