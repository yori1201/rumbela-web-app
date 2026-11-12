"use client";

/* Tipe data Rumbela v2 — 100% kompatibel dengan rumbela-database.json v1.
   v1: { students, payments, attendance, reports, materials, journal }
   v2 menambah: jadwal (slots/kelas/items), pengaturan & worksheets (generator soal). */

export interface Siswa {
  id: string;
  sample?: boolean;
  name: string;
  level: string;
  grade: string;
  program: string;
  parent: string;
  wa: string;
  start: string;
  group: string;
  fee: number;
  meet: number;
}

export type PayStatus = "lunas" | "sebagian" | "belum";
export type AttStatus = "H" | "I" | "A";

export interface ReportRec {
  scores: Record<string, number>;
  note: string;
  sent: boolean;
  sentAt?: string;
}

export interface Materi {
  id: string;
  sample?: boolean;
  title: string;
  program: string;
  type: string;
  url: string;
  desc: string;
  fileId?: string;
}

export interface JournalEntry {
  activity: string;
  progress: string;
  /** progres per siswa pada tanggal ini: id siswa → teks (fitur Jurnal) */
  siswa?: Record<string, string>;
}

export interface SlotJam {
  mulai: string;
  selesai: string;
}

export interface JadwalItem {
  id: string;
  kelas: string;
  hari: string;
  slot: number;
  program: string;
  pengajar: string;
  warna: string;
  /** siswa peserta slot ini (id). Kosong/tak ada = seluruh siswa dengan grup = kelas item. */
  siswaIds?: string[];
}

export type TemplateLaporan = "ceria" | "klasik" | "minimal";

/* ===== Generator Soal / Worksheet ===== */
export type SoalKind = "pg" | "isian" | "uraian" | "jodoh" | "urut";

/** satu kelompok benda bergambar pada soal visual */
export interface SoalVisualPart {
  /** karakter emoji yang digambar (cth. "⭐") */
  emoji: string;
  /** jumlah benda dalam kelompok ini */
  n: number;
  /** mulai baris baru sebelum kelompok ini (cth. membandingkan 2 baris) */
  baru?: boolean;
}

/** baris benda bergambar (emoji) untuk soal hitung / jumlah gambar */
export interface SoalVisual {
  parts: SoalVisualPart[];
  /** teks pemisah antar kelompok pada baris yang sama: "+", "−", "" (jarak) */
  join?: string;
}

export interface WorksheetQ {
  id: string;
  text: string;
  kind: SoalKind;
  /** pilihan ganda: 4 opsi (a–d) */
  options?: string[];
  /** kunci jawaban */
  answer: string;
  /** nama seksi (cth. "Penjumlahan") — soal dikelompokkan jadi bagian A/B/C */
  section?: string;
  /** menjodohkan: pasangan [kiri, kanan] dalam urutan benar */
  pairs?: string[][];
  /** susun kata: kata acak yang dirangkai jadi kalimat */
  words?: string[];
  /** hitungan bersusun (ke bawah, 4 operasi): a di atas, b di bawah, op di kiri */
  bersusun?: { a: string; b: string; op: "+" | "−" | "×" | "÷" };
  /** baris benda bergambar (emoji) utk soal hitung / jumlah gambar */
  visual?: SoalVisual;
}

export interface Worksheet {
  id: string;
  /** tanggal pembuatan YYYY-MM-DD */
  createdAt: string;
  mapel: string;
  /** SD | SMP (SMA dihapus 12 Nov 2026; data lama SMA tetap terbaca, tidak bisa dibuat baru) */
  jenjang: string;
  /** "1"–"9" atau "" */
  kelas: string;
  topik: string;
  petunjuk: string;
  questions: WorksheetQ[];
  /** cetak lembar kunci jawaban */
  kunci: boolean;
}

/** Template kwitansi: label-label teks yang tampil di kanvas kwitansi.
 *  Semua label mendukung placeholder {kurung} (mis. {orangtua}, {lembaga}). */
export interface KwitansiTemplate {
  judul: string;
  subjudul: string;
  labelDari: string;
  labelUntuk: string;
  ucapan: string;
  catatan: string;
  hormatKami: string;
  labelNo: string;
  labelKota: string;
  labelTerbilang: string;
}

export interface Pengaturan {
  namaLembaga: string;
  tagline: string;
  alamat: string;
  telepon: string;
  emailAdmin: string;
  /** iuran: tanggal jatuh tempo setiap bulan (1–31) */
  iuran?: { jatuhTempo: number };
  /** jurnal: template teks laporan harian WA (placeholder {kurung}) */
  jurnal?: { templateWa: string };
  /** kwitansi: label-label teks kanvas (placeholder {kurung}).
   *  Desain kanvas tidak berubah, hanya teksnya yang bisa diedit. */
  kwitansi?: KwitansiTemplate;
  laporan: {
    template: TemplateLaporan;
    pesanPenutup: string;
    ttdNama: string;
    ttdJabatan: string;
  };
}

export interface Database {
  students: Siswa[];
  payments: Record<string, Record<string, PayStatus>>;
  /** tanggal pembayaran ("YYYY-MM-DD") per siswa per bulan — sejajar dgn payments */
  payDates: Record<string, Record<string, string>>;
  /** jumlah uang dibayar (rupiah) per siswa per bulan — sejajar dgn payments */
  payAmounts: Record<string, Record<string, number>>;
  attendance: Record<string, Record<string, AttStatus>>;
  reports: Record<string, ReportRec>;
  materials: Materi[];
  journal: Record<string, JournalEntry>;
  jadwal: { slots: SlotJam[]; kelas: string[]; items: JadwalItem[] };
  pengaturan: Pengaturan;
  worksheets: Worksheet[];
}

import { DEFAULT_SLOTS, LEGACY_SLOTS, OLD_DEFAULT_SLOTS, DEFAULT_TEMPLATE_WA, DEFAULT_KWITANSI_LABELS, todayStr } from "./constants";

export function defaultPengaturan(): Pengaturan {
  return {
    namaLembaga: "Rumbela",
    tagline: "Rumah Belajar Anak",
    alamat: "Curup, Bengkulu",
    telepon: "",
    emailAdmin: "",
    iuran: { jatuhTempo: 5 },
    jurnal: { templateWa: DEFAULT_TEMPLATE_WA },
    kwitansi: { ...DEFAULT_KWITANSI_LABELS },
    laporan: {
      template: "ceria",
      pesanPenutup:
        "Terima kasih atas dukungan Bapak/Ibu di rumah. Mari terus bimbing ananda belajar dengan gembira!",
      ttdNama: "Tim Pengajar Rumbela",
      ttdJabatan: "Pengajar",
    },
  };
}

export function emptyDB(): Database {
  return {
    students: [],
    payments: {},
    payDates: {},
    payAmounts: {},
    attendance: {},
    reports: {},
    materials: [],
    journal: {},
    jadwal: { slots: DEFAULT_SLOTS.map((s) => ({ ...s })), kelas: [], items: [] },
    pengaturan: defaultPengaturan(),
    worksheets: [],
  };
}

const STR = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const NUM = (v: unknown, d = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/** Normalisasi data apa pun (v1 / v2 / hasil impor) menjadi bentuk Database v2 yang utuh. */
export function normalizeDB(raw: unknown): Database {
  const base = emptyDB();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Record<string, unknown>;

  const db: Database = {
    ...base,
    students: Array.isArray(d.students)
      ? (d.students as Record<string, unknown>[]).map((s) => ({
          id: STR(s.id) || Math.random().toString(36).slice(2),
          sample: !!s.sample,
          name: STR(s.name),
          level: STR(s.level, "SD"),
          grade: STR(s.grade),
          program: STR(s.program, "Calistung Ceria"),
          parent: STR(s.parent),
          wa: STR(s.wa),
          start: STR(s.start),
          group: STR(s.group),
          fee: NUM(s.fee),
          meet: NUM(s.meet, 12),
        }))
      : [],
    payments: isObj(d.payments) ? (d.payments as Database["payments"]) : {},
    payDates: isObj(d.payDates)
      ? Object.fromEntries(
          Object.entries(d.payDates as Record<string, unknown>)
            .filter(([, mm]) => isObj(mm))
            .map(([sid, mm]) => [
              sid,
              Object.fromEntries(
                Object.entries(mm as Record<string, unknown>)
                  .filter(([, v]) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v as string))
                  .map(([mk, v]) => [mk, v as string])
              ),
            ])
        )
      : {},
    payAmounts: isObj(d.payAmounts)
      ? Object.fromEntries(
          Object.entries(d.payAmounts as Record<string, unknown>)
            .filter(([, mm]) => isObj(mm))
            .map(([sid, mm]) => [
              sid,
              Object.fromEntries(
                Object.entries(mm as Record<string, unknown>)
                  .map(([mk, v]) => [mk, Math.max(0, Math.round(NUM(v)))] as [string, number])
                  .filter(([, v]) => v > 0)
              ),
            ])
        )
      : {},
    attendance: isObj(d.attendance) ? (d.attendance as Database["attendance"]) : {},
    reports: isObj(d.reports) ? (d.reports as Database["reports"]) : {},
    materials: Array.isArray(d.materials)
      ? (d.materials as Record<string, unknown>[]).map((m) => ({
          id: STR(m.id) || Math.random().toString(36).slice(2),
          sample: !!m.sample,
          title: STR(m.title),
          program: STR(m.program),
          type: STR(m.type, "Dokumen"),
          url: STR(m.url),
          desc: STR(m.desc),
          fileId: STR(m.fileId) || undefined,
        }))
      : [],
    journal: isObj(d.journal)
      ? Object.fromEntries(
          Object.entries(d.journal as Record<string, unknown>)
            .filter(([, v]) => isObj(v))
            .map(([tgl, v]) => {
              const e = v as Record<string, unknown>;
              return [
                tgl,
                {
                  activity: STR(e.activity),
                  progress: STR(e.progress),
                  ...(isObj(e.siswa)
                    ? {
                        siswa: Object.fromEntries(
                          Object.entries(e.siswa as Record<string, unknown>)
                            .filter(([, t]) => typeof t === "string" && t.trim())
                            .map(([sid, t]) => [sid, t as string])
                        ),
                      }
                    : {}),
                },
              ] as [string, JournalEntry];
            })
        )
      : {},
    worksheets: Array.isArray(d.worksheets)
      ? (d.worksheets as Record<string, unknown>[]).map((ws) => ({
          id: STR(ws.id) || Math.random().toString(36).slice(2),
          createdAt: STR(ws.createdAt, todayStr()),
          mapel: STR(ws.mapel),
          jenjang: STR(ws.jenjang),
          kelas: STR(ws.kelas),
          topik: STR(ws.topik),
          petunjuk: STR(ws.petunjuk),
          kunci: ws.kunci !== false,
          questions: Array.isArray(ws.questions)
            ? (ws.questions as Record<string, unknown>[]).map((q) => ({
                id: STR(q.id) || Math.random().toString(36).slice(2),
                text: STR(q.text),
                kind: (["pg", "isian", "uraian", "jodoh", "urut"].includes(STR(q.kind))
                  ? STR(q.kind)
                  : "isian") as WorksheetQ["kind"],
                options: Array.isArray(q.options)
                  ? (q.options as unknown[]).map((o) => STR(o)).filter(Boolean)
                  : undefined,
                answer: STR(q.answer),
                section: STR(q.section) || undefined,
                pairs: Array.isArray(q.pairs)
                  ? (q.pairs as unknown[])
                      .map((p) => (Array.isArray(p) ? p.map((x) => STR(x)) : []))
                      .filter((p) => p.length >= 2 && p[0] && p[1])
                  : undefined,
                words: Array.isArray(q.words)
                  ? (q.words as unknown[]).map((w) => STR(w)).filter(Boolean)
                  : undefined,
                ...(isObj(q.bersusun)
                  ? {
                      bersusun: (() => {
                        const bz = q.bersusun as Record<string, unknown>;
                        const op = STR(bz.op, "+");
                        return {
                          a: STR(bz.a),
                          b: STR(bz.b),
                          op: (["+", "−", "×", "÷"].includes(op)
                            ? (op as "+" | "−" | "×" | "÷")
                            : op === "-"
                              ? "−"
                              : op === "*" || op === "x" || op === "X"
                                ? "×"
                                : op === "/" || op === ":"
                                  ? "÷"
                                  : "+"),
                        };
                      })(),
                    }
                  : {}),
                ...(isObj(q.visual)
                  ? {
                      visual: (() => {
                        const vz = q.visual as Record<string, unknown>;
                        const parts = Array.isArray(vz.parts)
                          ? (vz.parts as Record<string, unknown>[])
                              .map((p) => ({
                                emoji: STR(p.emoji, "⭐").slice(0, 8),
                                n: Math.min(60, Math.max(1, Math.floor(Number(p.n) || 0))),
                                baru: p.baru === true,
                              }))
                              .filter((p) => p.n > 0 && p.emoji)
                          : [];
                        return parts.length
                          ? { parts, join: typeof vz.join === "string" ? vz.join : undefined }
                          : undefined;
                      })(),
                    }
                  : {}),
              }))
            : [],
        }))
      : [],
  };

  if (isObj(d.jadwal)) {
    const j = d.jadwal as Record<string, unknown>;
    if (Array.isArray(j.slots) && j.slots.length) {
      const stored = (j.slots as Record<string, unknown>[]).map((s) => ({
        mulai: STR(s.mulai, "08:00"),
        selesai: STR(s.selesai, "10:00"),
      }));
      // migrasi 1: slot bawaan lama (2 jam) otomatis menjadi slot 1 jam
      const legacy =
        stored.length === LEGACY_SLOTS.length &&
        stored.every((s, i) => s.mulai === LEGACY_SLOTS[i].mulai && s.selesai === LEGACY_SLOTS[i].selesai);
      // migrasi 2: slot bawaan lama (mulai 08:00) → jam buka baru 09:00–17:00.
      // Indeks item TIDAK digeser: pelajaran pagi (08:00) ikut naik ke 09:00,
      // pelajaran siang/sore tetap di jam yang sama.
      const oldDefault =
        stored.length === OLD_DEFAULT_SLOTS.length &&
        stored.every((s, i) => s.mulai === OLD_DEFAULT_SLOTS[i].mulai && s.selesai === OLD_DEFAULT_SLOTS[i].selesai);
      if (legacy || oldDefault) {
        db.jadwal.slots = DEFAULT_SLOTS.map((s) => ({ ...s }));
      } else {
        db.jadwal.slots = stored;
      }
    }
    if (Array.isArray(j.kelas)) db.jadwal.kelas = (j.kelas as unknown[]).map((k) => STR(k)).filter(Boolean);
    if (Array.isArray(j.items)) {
      db.jadwal.items = (j.items as Record<string, unknown>[]).map((it) => ({
        id: STR(it.id) || Math.random().toString(36).slice(2),
        kelas: STR(it.kelas),
        hari: STR(it.hari),
        slot: NUM(it.slot),
        program: STR(it.program),
        pengajar: STR(it.pengajar),
        warna: STR(it.warna, "#f97316"),
        ...(Array.isArray(it.siswaIds)
          ? {
              siswaIds: (it.siswaIds as unknown[]).map((x) => STR(x)).filter(Boolean),
            }
          : {}),
      }));
    }
  }

  if (isObj(d.pengaturan)) {
    const p = d.pengaturan as Record<string, unknown>;
    db.pengaturan = {
      ...base.pengaturan,
      namaLembaga: STR(p.namaLembaga, base.pengaturan.namaLembaga),
      tagline: STR(p.tagline, base.pengaturan.tagline),
      alamat: STR(p.alamat, base.pengaturan.alamat),
      telepon: STR(p.telepon),
      emailAdmin: STR(p.emailAdmin),
    };
    if (isObj(p.iuran)) {
      const iu = p.iuran as Record<string, unknown>;
      const jt = Math.min(31, Math.max(1, Math.round(NUM(iu.jatuhTempo, 5))));
      db.pengaturan.iuran = { jatuhTempo: jt };
    }
    if (isObj(p.jurnal)) {
      const ju = p.jurnal as Record<string, unknown>;
      const t = STR(ju.templateWa).trim();
      if (t) db.pengaturan.jurnal = { templateWa: t };
    }
    if (isObj(p.kwitansi)) {
      const kw = p.kwitansi as Record<string, unknown>;
      const base = defaultPengaturan().kwitansi!;
      db.pengaturan.kwitansi = {
        judul: STR(kw.judul).trim() || base.judul,
        subjudul: STR(kw.subjudul).trim() || base.subjudul,
        labelDari: STR(kw.labelDari).trim() || base.labelDari,
        labelUntuk: STR(kw.labelUntuk).trim() || base.labelUntuk,
        ucapan: STR(kw.ucapan).trim() || base.ucapan,
        catatan: STR(kw.catatan).trim() || base.catatan,
        hormatKami: STR(kw.hormatKami).trim() || base.hormatKami,
        labelNo: STR(kw.labelNo).trim() || base.labelNo,
        labelKota: STR(kw.labelKota).trim() || base.labelKota,
        labelTerbilang: STR(kw.labelTerbilang).trim() || base.labelTerbilang,
      };
    }
    if (isObj(p.laporan)) {
      const l = p.laporan as Record<string, unknown>;
      db.pengaturan.laporan = {
        template: (["ceria", "klasik", "minimal"].includes(STR(l.template))
          ? STR(l.template)
          : "ceria") as Database["pengaturan"]["laporan"]["template"],
        pesanPenutup: STR(l.pesanPenutup, base.pengaturan.laporan.pesanPenutup),
        ttdNama: STR(l.ttdNama, base.pengaturan.laporan.ttdNama),
        ttdJabatan: STR(l.ttdJabatan, base.pengaturan.laporan.ttdJabatan),
      };
    }
  }

  return db;
}

function isObj(v: unknown): boolean {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Validasi minimum ala v1: harus punya students & materials berupa array. */
export function looksValidV1(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const d = raw as Record<string, unknown>;
  return Array.isArray(d.students) && Array.isArray(d.materials);
}
