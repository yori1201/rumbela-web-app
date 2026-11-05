"use client";

/* Data contoh untuk Mode Demo — dipakai juga sebagai seed bila database Drive
   baru dibuat dan belum ada siswa (dipakai langsung tanpa flag "sample" agar
   admin bisa langsung merasakan alurnya; mudah dihapus dari menu Pengaturan). */

import { uid, todayStr, monthKey, pad2 } from "./constants";
import { emptyDB, type Database, type AttStatus } from "./types";

export function demoDB(): Database {
  const db = emptyDB();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const thisMk = monthKey(y, m);
  const lastMk = monthKey(y, m === 0 ? 11 : m - 1, );
  const lastY = m === 0 ? y - 1 : y;

  const s = [
    { name: "Aisyah Ramadhani", level: "SD", grade: "2", program: "Calistung Ceria", parent: "Ibu Ratna", wa: "081200000001", start: "2026-10-05", group: "Grup A", fee: 200000, meet: 12 },
    { name: "Bima Pratama", level: "SMP", grade: "7", program: "Matematika", parent: "Bapak Dedi", wa: "081200000002", start: "2026-10-12", group: "Grup B", fee: 220000, meet: 12 },
    { name: "Citra Lestari", level: "SD", grade: "4", program: "Pendampingan Belajar & PR", parent: "Ibu Wati", wa: "081200000003", start: "2026-09-21", group: "Grup A", fee: 200000, meet: 12 },
    { name: "Dimas Saputra", level: "SD", grade: "5", program: "Matematika", parent: "Bapak Hendra", wa: "081200000004", start: "2026-10-01", group: "Grup B", fee: 220000, meet: 8 },
    { name: "Elsa Nuraini", level: "SD", grade: "1", program: "Calistung Ceria", parent: "Ibu Sari", wa: "081200000005", start: "2026-10-19", group: "Grup A", fee: 200000, meet: 12 },
    { name: "Fajar Ramadhan", level: "SMP", grade: "8", program: "Bahasa Inggris Dasar", parent: "Bapak Yudi", wa: "081200000006", start: "2026-09-14", group: "Grup B", fee: 240000, meet: 8 },
  ].map((x) => ({ ...x, id: uid(), sample: true }));

  db.students = s;

  // Iuran: bulan lalu rapi, bulan ini bervariasi
  db.payments[s[0].id] = { [lastMk]: "lunas", [thisMk]: "lunas" };
  db.payments[s[1].id] = { [monthKey(lastY, m === 0 ? 11 : m - 1)]: "lunas", [thisMk]: "sebagian" };
  db.payments[s[2].id] = { [lastMk]: "lunas", [thisMk]: "belum" };
  db.payments[s[3].id] = { [lastMk]: "sebagian", [thisMk]: "belum" };
  db.payments[s[4].id] = { [thisMk]: "lunas" };
  db.payments[s[5].id] = { [lastMk]: "lunas", [thisMk]: "belum" };

  // Tanggal pembayaran (contoh)
  const tgl = (day: number) => `${y}-${pad2(m + 1)}-${pad2(Math.min(day, 28))}`;
  db.payDates = {
    [s[0].id]: { [lastMk]: `${lastY}-${pad2(m === 0 ? 12 : m)}-04`, [thisMk]: tgl(3) },
    [s[1].id]: { [thisMk]: tgl(2) },
    [s[4].id]: { [thisMk]: tgl(1) },
  };

  // Absensi 12 hari kerja terakhir
  const d = new Date();
  let added = 0;
  while (added < 12 && d.getTime() > now.getTime() - 30 * 86400000) {
    if (d.getDay() !== 0) {
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const day: Record<string, AttStatus> = {};
      s.forEach((st, i) => {
        const r = (i * 7 + added * 3) % 10;
        day[st.id] = r === 0 ? "A" : r === 1 || r === 2 ? "I" : "H";
      });
      db.attendance[key] = day;
      added++;
    }
    d.setDate(d.getDate() - 1);
  }

  // Jurnal beberapa hari
  db.journal[todayStr()] = {
    activity: "Calistung Grup A — latihan membaca suku kata terbuka & dikte kata sederhana. Matematika Grup B — operasi hitung campuran.",
    progress: "Aisyah makin lancar membaca kata tiga suku kata; Bima sudah paham urutan operasi hitung, perlu latihan soal cerita.",
  };
  const yst = new Date(now.getTime() - 86400000);
  const ystKey = `${yst.getFullYear()}-${pad2(yst.getMonth() + 1)}-${pad2(yst.getDate())}`;
  db.journal[ystKey] = {
    activity: "Pendampingan PR Citra & Dimas — matematika pecahan. Bahasa Inggris Fajar — vocabulary daily activities.",
    progress: "Citra mulai berani mengerjakan di papan; pengucapan bahasa Inggris Fajar semakin percaya diri.",
  };

  // Laporan bulan lalu (skor aspek)
  const aspects = ["Pemahaman materi", "Keaktifan bertanya", "Kemandirian belajar", "Penyelesaian tugas / PR"];
  db.reports[`${s[0].id}@${lastMk}`] = {
    scores: Object.fromEntries(aspects.map((a, i) => [a, [4, 5, 4, 4][i]])),
    note: "Aisyah menunjukkan kemajuan membaca yang pesat. Sudah berani membaca nyaring di depan kelompok.",
    sent: true,
    sentAt: `${lastY}-${pad2(m === 0 ? 12 : m)}-02`,
  };
  db.reports[`${s[1].id}@${lastMk}`] = {
    scores: Object.fromEntries(aspects.map((a, i) => [a, [3, 4, 3, 4][i]])),
    note: "Bima aktif bertanya. Perlu pendampingan soal cerita dan kebiasaan mengerjakan PR mandiri.",
    sent: false,
  };

  // Bank materi
  db.materials = [
    { id: uid(), sample: true, title: "Latihan Membaca Suku Kata", program: "Calistung Ceria", type: "Dokumen", url: "https://drive.google.com", desc: "Lembar latihan membaca untuk pemula." },
    { id: uid(), sample: true, title: "Video Operasi Hitung Campuran", program: "Matematika", type: "Video", url: "https://www.youtube.com", desc: "Video pembelajaran singkat." },
  ];

  // Jadwal
  db.jadwal.kelas = ["Grup A", "Grup B"];
  const J = (kelas: string, hari: string, slot: number, program: string, pengajar: string, warna: string) => ({
    id: uid(), kelas, hari, slot, program, pengajar, warna,
  });
  db.jadwal.items = [
    J("Grup A", "Senin", 0, "Calistung Ceria", "Bu Maya", "#f97316"),
    J("Grup A", "Senin", 1, "Pendampingan Belajar & PR", "Bu Maya", "#3b82f6"),
    J("Grup A", "Rabu", 0, "Calistung Ceria", "Bu Maya", "#f97316"),
    J("Grup A", "Jumat", 1, "Calistung Ceria", "Bu Maya", "#f97316"),
    J("Grup B", "Selasa", 2, "Matematika", "Pak Andi", "#22c55e"),
    J("Grup B", "Kamis", 2, "Bahasa Inggris Dasar", "Miss Rani", "#a855f7"),
    J("Grup B", "Sabtu", 0, "Matematika", "Pak Andi", "#22c55e"),
  ];

  // Worksheet contoh (Generator Soal)
  db.worksheets = [
    {
      id: uid(),
      createdAt: todayStr(),
      mapel: "Matematika",
      jenjang: "SD",
      kelas: "3",
      topik: "Perkalian & pembagian",
      petunjuk: "Kerjakan seluruh soal di bawah ini dengan teliti!",
      kunci: true,
      questions: [
        { id: uid(), text: "7 × 8 = …", kind: "isian", answer: "56" },
        { id: uid(), text: "6 × 9 = …", kind: "isian", answer: "54" },
        { id: uid(), text: "45 : 5 = …", kind: "isian", answer: "9" },
        { id: uid(), text: "8 × 7 = …", kind: "isian", answer: "56" },
        { id: uid(), text: "72 : 8 = …", kind: "isian", answer: "9" },
        { id: uid(), text: "9 × 6 = …", kind: "isian", answer: "54" },
        { id: uid(), text: "63 : 7 = …", kind: "isian", answer: "9" },
        { id: uid(), text: "12 × 4 = …", kind: "isian", answer: "48" },
      ],
    },
  ];

  return db;
}
