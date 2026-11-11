/* Uji rentang angka & kebenaran jawaban topik bersusun per kelas SD (1–6) & kesulitan (1–3). */
import {
  TOPIK_GENERATOR, generateQuestions, type GenSoal,
} from "../src/lib/generatorSoal.ts";

let gagal = 0;
const cek = (kondisi: boolean, pesan: string) => {
  if (!kondisi) { gagal++; console.log("  GAGAL:", pesan); }
};

const digit = (n: string) => n.length;
const ID = ["sd-tambah-bersusun", "sd-kurang-bersusun", "sd-kali-bersusun", "sd-bagi-bersusun"];
const tersedia = (id: string, kelas: string) =>
  (TOPIK_GENERATOR.matematika.SD[kelas] ?? []).some((t) => t.id === id);

/** tambah/kurang bersusun harus ada di semua kelas; kali mulai kelas 2; bagi mulai kelas 3 */
for (const kelas of ["1", "2", "3", "4", "5", "6"]) {
  for (const id of ["sd-tambah-bersusun", "sd-kurang-bersusun"]) {
    cek(tersedia(id, kelas), `kls ${kelas}: ${id} tidak terdaftar`);
  }
  for (const id of ["sd-kali-bersusun"]) {
    cek(tersedia(id, kelas) === (kelas !== "1"), `kls ${kelas}: ${id} kehadiran salah`);
  }
  for (const id of ["sd-bagi-bersusun"]) {
    cek(tersedia(id, kelas) === (Number(kelas) >= 3), `kls ${kelas}: ${id} kehadiran salah`);
  }
}

for (const kelas of ["1", "2", "3", "4", "5", "6"]) {
  for (const id of ID) {
    if (!tersedia(id, kelas)) continue;
    for (const lv of [1, 2, 3] as const) {
      const soal: GenSoal[] = generateQuestions("matematika", id, "SD", kelas, 60, lv);
      cek(soal.length >= 1, `kls ${kelas} ${id} lv${lv}: tidak ada soal`);
      for (const s of soal) {
        const b = s.bersusun!;
        const A = Number(b.a), B = Number(b.b), jawab = Number(s.a);
        cek(A > 0 && B > 0 && Number.isFinite(A) && Number.isFinite(B), `kls ${kelas} ${id} lv${lv}: operand buruk ${b.a}/${b.b}`);
        if (b.op === "+") cek(A + B === jawab, `kls ${kelas}: ${b.a}+${b.b} ≠ ${s.a}`);
        if (b.op === "−") cek(A - B === jawab && jawab > 0, `kls ${kelas}: ${b.a}−${b.b} ≠ ${s.a}`);
        if (b.op === "×") cek(A * B === jawab, `kls ${kelas}: ${b.a}×${b.b} ≠ ${s.a}`);
        if (b.op === "÷") cek(A % B === 0 && A / B === jawab, `kls ${kelas}: ${b.a}:${b.b} ≠ ${s.a}`);

        const dA = digit(b.a), dB = digit(b.b);
        if (id === "sd-tambah-bersusun" || id === "sd-kurang-bersusun") {
          cek(dA === dB, `kls ${kelas} ${b.op}: operand beda panjang (${b.a},${b.b})`);
          const dOk: Record<string, [number, number]> = { "1": [1, 1], "2": [2, 3], "3": [2, 3], "4": [3, 4], "5": [3, 4], "6": [4, 4] };
          cek(dA >= dOk[kelas][0] && dA <= dOk[kelas][1], `kls ${kelas} ${b.op}: ${b.a} di luar ${dOk[kelas][0]}-${dOk[kelas][1]} digit`);
          if (kelas === "1" && lv === 1 && b.op === "+") cek(A + B <= 10, `kls1 tambah lv1: hasil ${A + B} > 10`);
        }
        if (id === "sd-kali-bersusun") {
          if (kelas === "2") cek(dA === 1 && dB === 1, `kls2 kali: bukan 1×1 (${b.a}×${b.b})`);
          if (kelas === "3") cek(dA === 2 && dB === 1, `kls3 kali: bukan 2×1 (${b.a}×${b.b})`);
          if (kelas === "4") cek((dA === 2 && dB === 1) || (dA === 2 && dB === 2 && A <= 29 && B <= 19), `kls4 kali: ${b.a}×${b.b} di luar skema`);
          if (Number(kelas) >= 5) cek(dA === 2 && (dB === 1 || dB === 2), `kls5-6 kali: ${b.a}×${b.b} di luar skema`);
        }
        if (id === "sd-bagi-bersusun") {
          const hMax = kelas === "3" ? 12 : kelas === "4" ? 20 : kelas === "5" ? 40 : 90;
          cek(jawab >= 2 && jawab <= hMax, `kls ${kelas} bagi: hasil ${jawab} > ${hMax}`);
          cek(B >= 2 && B <= 9, `kls ${kelas} bagi: pembagi ${B} > 9`);
          cek(dA >= dB, `kls ${kelas} bagi: dividend ${b.a} < pembagi ${b.b}`);
        }
      }
    }
  }
}

/* progresi antar kelas: digit lv1 tak pernah turun saat naik kelas */
for (const id of ID) {
  let prev = 0;
  for (const kelas of ["1", "2", "3", "4", "5", "6"]) {
    if (!tersedia(id, kelas)) continue;
    const soal = generateQuestions("matematika", id, "SD", kelas, 60, 1);
    const minD = Math.min(...soal.map((s) => digit(s.bersusun!.a)));
    cek(minD >= prev, `progresi ${id}: min digit kls ${kelas} (${minD}) < kelas sebelumnya (${prev})`);
    prev = minD;
  }
}

console.log("Contoh per kelas (kesulitan sedang):");
const tampil = (id: string, kelas: string) =>
  generateQuestions("matematika", id, "SD", kelas, 4, 2)
    .map((s) => s.bersusun!.op === "×" ? `${s.bersusun!.a}×${s.bersusun!.b}` : s.bersusun!.op === "÷" ? `${s.bersusun!.a}:${s.bersusun!.b}` : `${s.bersusun!.a}${s.bersusun!.op}${s.bersusun!.b}`)
    .join("  ");
for (const k of ["1", "2", "3", "4", "5", "6"]) {
  console.log(`  kls ${k} tambah: ${tampil("sd-tambah-bersusun", k)} | kali: ${tampil("sd-kali-bersusun", k)}${Number(k) >= 3 ? ` | bagi: ${tampil("sd-bagi-bersusun", k)}` : ""}`);
}

console.log(gagal === 0 ? "\nSEMUA UJI LULUS" : `\n${gagal} UJI GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
