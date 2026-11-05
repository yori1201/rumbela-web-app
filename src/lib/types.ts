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
}

export type TemplateLaporan = "ceria" | "klasik" | "minimal";

/* ===== Generator Soal / Worksheet ===== */
export type SoalKind = "pg" | "isian" | "uraian" | "jodoh" | "urut";

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
}

export interface Worksheet {
  id: string;
  /** tanggal pembuatan YYYY-MM-DD */
  createdAt: string;
  mapel: string;
  /** SD | SMP | SMA */
  jenjang: string;
  /** "1"–"12" atau "" */
  kelas: string;
  topik: string;
  petunjuk: string;
  questions: WorksheetQ[];
  /** cetak lembar kunci jawaban */
  kunci: boolean;
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
  attendance: Record<string, Record<string, AttStatus>>;
  reports: Record<string, ReportRec>;
  materials: Materi[];
  journal: Record<string, JournalEntry>;
  jadwal: { slots: SlotJam[]; kelas: string[]; items: JadwalItem[] };
  pengaturan: Pengaturan;
  worksheets: Worksheet[];
}

import { DEFAULT_SLOTS, DEFAULT_TEMPLATE_WA, todayStr } from "./constants";

export function defaultPengaturan(): Pengaturan {
  return {
    namaLembaga: "Rumbela",
    tagline: "Rumah Belajar Anak",
    alamat: "Curup, Bengkulu",
    telepon: "",
    emailAdmin: "",
    iuran: { jatuhTempo: 5 },
    jurnal: { templateWa: DEFAULT_TEMPLATE_WA },
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
    journal: isObj(d.journal) ? (d.journal as Database["journal"]) : {},
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
              }))
            : [],
        }))
      : [],
  };

  if (isObj(d.jadwal)) {
    const j = d.jadwal as Record<string, unknown>;
    if (Array.isArray(j.slots) && j.slots.length) {
      db.jadwal.slots = (j.slots as Record<string, unknown>[]).map((s) => ({
        mulai: STR(s.mulai, "08:00"),
        selesai: STR(s.selesai, "10:00"),
      }));
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
