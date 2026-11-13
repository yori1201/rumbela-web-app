"use client";

/* Generator Soal & Worksheet Rumbela — khusus penggunaan internal admin.
   • Mode otomatis: 4 bank generator (Matematika, Calistung, Inggris, Coding)
     + paket campuran (semua topik kelas jadi seksi A/B/C)
   • Mode tulis-sendiri: semua mapel (PG / isian / uraian / menjodohkan / susun kata)
   • Template anak warna-warni sesuai referensi → cetak PDF & unduh PNG
   • Arsip worksheet tersimpan otomatis di Google Drive */

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  BookPlus, Download, ExternalLink, FileQuestion, Loader2, Pencil, Plus, Printer, Save,
  Sparkles, Trash2, Wand2, X,
} from "lucide-react";
import { useApp } from "@/lib/store";
import {
  GEN_MAPEL, KELAS_BY_JENJANG, KIDDO_SOURCE, MAPEL_LIST, TOPIK_GENERATOR, generateMixed, generateQuestions, kelasTersedia, topikLabel,
  type GenMapel, type Kesulitan,
} from "@/lib/generatorSoal";
import { renderWorksheetCanvas, slugify } from "@/lib/renderWorksheet";
import {
  LETTERS, SECTION_PALETTE, WS, answerOf, groupSections, isEquationLike, sectionLetter, shuffledOrder,
} from "@/lib/worksheetTheme";
import { canvasToBlob } from "@/lib/renderLaporan";
import { todayStr, uid } from "@/lib/constants";
import type { SoalKind, SoalVisual, Worksheet, WorksheetQ } from "@/lib/types";
import { EmptyState, SectionCard } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const JENJANG = ["SD", "SMP"] as const;
const JUMLAH_OPSI = [1, 2, 3, 5, 8, 10, 15, 20, 25];
const KIND_LABEL: Record<SoalKind, string> = {
  pg: "Pilihan Ganda",
  isian: "Isian Singkat",
  uraian: "Uraian",
  jodoh: "Menjodohkan",
  urut: "Susun Kata",
};
const JODOH_PETUNJUK = "Pasangkan pernyataan di kiri dengan jawaban yang tepat!";
const URUT_PETUNJUK = "Susun kata-kata berikut menjadi kalimat yang benar!";
const petunjukKind = (k: SoalKind): string =>
  k === "jodoh" ? JODOH_PETUNJUK : k === "urut" ? URUT_PETUNJUK : "";

function blankQ(kind: SoalKind = "isian"): WorksheetQ {
  const base: WorksheetQ = { id: uid(), text: petunjukKind(kind), kind, answer: "" };
  if (kind === "pg") return { ...base, options: ["", "", "", ""] };
  if (kind === "jodoh") return { ...base, pairs: [] };
  if (kind === "urut") return { ...base, words: [] };
  return base;
}

/* ================= Hiasan SVG ================= */

function Bintang({ size = 22, color = WS.star, className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M12 2l2.9 6.3 6.6 1-4.75 4.4 1.15 6.6L12 17.1l-5.9 3.2 1.15-6.6L2.5 9.3l6.6-1z" fill={color} />
    </svg>
  );
}

function Hati({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M12 21s-8.4-5.3-10.5-10A5.6 5.6 0 0 1 12 6.2 5.6 5.6 0 0 1 22.5 11C20.4 15.7 12 21 12 21z" fill={WS.star} />
    </svg>
  );
}

/* ================= Lembar A4 (HTML — tampilan & cetak) =================
   Seluruh lembar PUTIH POLOS: kartu seksi putih bergaris tipis netral,
   judul seksi & nomor soal teks polos, soal 2 kolom (no. 2 di kanan no. 1,
   no. 3 di bawah no. 1). Aksen warna hanya pada banner judul, pil meta,
   dan pita footer. */

function BarisJawaban() {
  return <div className="mt-2.5 border-b-2 border-dotted" style={{ borderColor: "#A8B7CB" }} />;
}

/** baris benda bergambar (emoji): kelompok ≤10 benda per potongan,
 *  pemisah antar kelompok (+/−) atau jarak; `baru` = mulai baris baru */
function VisualBaris({ v }: { v: SoalVisual }) {
  const tok: React.ReactNode[] = [];
  v.parts.forEach((p, pi) => {
    if (p.baru) tok.push(<span key={`b${pi}`} className="w-full" />);
    if (pi > 0) {
      const j = (v.join ?? "").trim();
      tok.push(
        j ? (
          <span key={`s${pi}`} className="mx-1 text-[22px] font-black leading-none" style={{ color: WS.ink }}>
            {j}
          </span>
        ) : (
          <span key={`s${pi}`} className="w-4" />
        )
      );
    }
    for (let i = 0; i < p.n; i += 10) {
      tok.push(
        <span key={`${pi}-${i}`} className="whitespace-nowrap text-[26px] leading-[1.5]">
          {p.emoji.repeat(Math.min(10, p.n - i))}
        </span>
      );
    }
  });
  return <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5">{tok}</div>;
}

/** hitungan bersusun: angka kanan-rata, op di kiri baris kedua, garis, kotak jawaban */
function BersusunHitung({ a, b, op }: { a: string; b: string; op: string }) {
  return (
    <div className="mt-1.5 w-fit">
      <div className="w-fit font-mono text-[24px] font-extrabold leading-tight" style={{ color: WS.ink }}>
        <div className="text-right" style={{ paddingLeft: 36 }}>{a}</div>
        <div className="flex items-center">
          <span className="w-[26px] text-left" style={{ minWidth: 26 }}>{op}</span>
          <span className="flex-1 text-right">{b}</span>
        </div>
      </div>
      <div className="mt-1 border-t-[3px]" style={{ borderColor: WS.ink }} />
      <div className="mt-2.5 h-10 w-[132px] rounded-[10px] border-2 border-dashed" style={{ borderColor: WS.idBoxBorder }} />
    </div>
  );
}

function SoalItem({ q, no, pal }: { q: WorksheetQ; no: number; pal: (typeof SECTION_PALETTE)[number] }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 w-6 shrink-0 text-[15px] font-extrabold" style={{ color: WS.ink }}>
        {no}.
      </span>
      <div className="min-w-0 flex-1">
        {q.bersusun ? (
          <BersusunHitung a={q.bersusun.a} b={q.bersusun.b} op={q.bersusun.op} />
        ) : (
          <>
            <p className="text-[15px] font-semibold leading-relaxed" style={{ color: WS.ink }}>{q.text}</p>

            {q.visual ? (
              <>
                <VisualBaris v={q.visual} />
                <BarisJawaban />
              </>
            ) : q.kind === "pg" && q.options?.length ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {q.options.slice(0, 4).map((opt, oi) => (
              <span
                key={oi}
                className="flex items-center gap-2 rounded-[10px] border-2 bg-white px-3 py-1.5 text-[14px] font-semibold"
                style={{ borderColor: pal.border, color: WS.ink }}
              >
                <span
                  className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 bg-white text-[11px] font-extrabold"
                  style={{ borderColor: pal.badge, color: pal.badge }}
                >
                  {LETTERS[oi]}
                </span>
                <span className="min-w-0 truncate">{opt}</span>
              </span>
            ))}
          </div>
        ) : q.kind === "uraian" ? (
          <div className="mt-2 space-y-7">
            <div className="border-b-2 border-dotted" style={{ borderColor: "#A8B7CB" }} />
            <div className="border-b-2 border-dotted" style={{ borderColor: "#A8B7CB" }} />
            <div className="border-b-2 border-dotted" style={{ borderColor: "#A8B7CB" }} />
          </div>
        ) : q.kind === "jodoh" && q.pairs?.length ? (
          <div className="mt-3 grid grid-cols-2 gap-7">
            <div className="space-y-2.5">
              {q.pairs.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-[10px] border-2 bg-white px-3 py-2 text-[14px] font-semibold"
                  style={{ borderColor: pal.border, color: WS.ink }}
                >
                  <span className="text-[13px] font-extrabold" style={{ color: pal.badge }}>{i + 1}.</span>
                  <span className="min-w-0">{p[0]}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2.5">
              {(() => {
                const order = shuffledOrder(q.pairs.length, q.id);
                return q.pairs.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-[10px] border-2 bg-white px-3 py-2 text-[14px] font-semibold"
                    style={{ borderColor: pal.border, color: WS.ink }}
                  >
                    <span className="text-[13px] font-extrabold" style={{ color: pal.badge }}>{LETTERS[order.indexOf(i)]}.</span>
                    <span className="min-w-0 flex-1">{p[1]}</span>
                    <span
                      className="h-[24px] w-[24px] shrink-0 rounded-full border-2 border-dashed"
                      style={{ borderColor: pal.badge }}
                    />
                  </div>
                ));
              })()}
            </div>
          </div>
        ) : q.kind === "urut" && q.words?.length ? (
          <>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {q.words.map((w, i) => (
                <span
                  key={i}
                  className="rounded-[10px] border-2 border-solid bg-white px-3.5 py-1.5 text-[14.5px] font-bold"
                  style={{ borderColor: pal.border, color: WS.ink }}
                >
                  {w}
                </span>
              ))}
            </div>
            <BarisJawaban />
          </>
        ) : isEquationLike(q) ? (
          <span
            className="ml-2 inline-block h-9 w-[132px] rounded-[10px] border-2 border-dashed align-middle"
            style={{ borderColor: WS.idBoxBorder }}
          />
        ) : (
          <BarisJawaban />
        )}
          </>
        )}
      </div>
    </div>
  );
}

function KartuSeksi({ si, label, children }: { si: number; label: string; children: React.ReactNode }) {
  return (
    <section
      className="mt-6 rounded-2xl border-[1.6px] bg-white px-5 pb-4 pt-3.5"
      style={{ borderColor: "#D5DDE9" }}
    >
      <h4 className="text-[16.5px] font-black" style={{ color: WS.ink }}>
        {sectionLetter(si)}. {label}
      </h4>
      {children}
    </section>
  );
}

function SheetHTML({ ws, jenis }: { ws: Worksheet; jenis: "soal" | "kunci" }) {
  const tahun = new Date().getFullYear();
  const sections = groupSections(ws);
  const kunci = jenis === "kunci";
  const meta = [ws.jenjang, ws.kelas ? `Kelas ${ws.kelas}` : "", `${ws.questions.length} soal`]
    .filter(Boolean).join("  ·  ");

  return (
    <div
      className="sheet relative mx-auto w-[794px] shrink-0 overflow-hidden rounded-2xl p-10 text-slate-800 shadow-lg ring-1 ring-slate-200"
      style={{
        minHeight: 1123,
        background: kunci ? WS.kunciBg : WS.pageBg,
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {/* latar putih polos — tanpa hiasan */}

      {/* ===== kop ===== */}
      <div className="relative flex items-start justify-between gap-3">
        <Image src="/logo.webp" alt="Rumbela, Rumah Belajar Anak" width={150} height={138} className="h-auto w-[150px] shrink-0" priority />

        <div className="min-w-0 flex-1 text-center">
          <div
            className="rounded-2xl px-6 py-3 text-white shadow"
            style={{ background: `linear-gradient(90deg, ${(kunci ? WS.bannerKunciGrad : WS.bannerGrad).join(", ")})` }}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-white">
              {kunci ? "Kunci Jawaban" : "Worksheet"}{ws.mapel ? ` · ${ws.mapel}` : ""}
            </p>
            <h3 className="truncate text-[26px] font-black leading-tight">{ws.topik || "Latihan"}</h3>
          </div>
          <span
            className="mt-2 inline-block rounded-full px-4 py-1 text-[12.5px] font-extrabold"
            style={{ background: WS.pillYellow, color: WS.pillYellowInk }}
          >
            {meta}
          </span>
        </div>

        <div className="relative w-[150px] shrink-0">
          <div
            className="relative rounded-xl border-[2.5px] bg-white px-3 py-2.5 text-center text-[11.5px] font-extrabold leading-snug"
            style={{ borderColor: "#F2A0BE", color: "#EC5F94" }}
          >
            <Bintang size={15} className="absolute -right-1.5 -top-2" />
            {kunci ? "Khusus tutor, jangan dibocorkan, ya!" : "Ayo, kerjakan dengan teliti, ya!"}
          </div>
          <div
            className="absolute -bottom-[9px] left-6 h-4 w-4 rotate-45 border-b-[2.5px] border-r-[2.5px] bg-white"
            style={{ borderColor: "#F2A0BE" }}
          />
        </div>
      </div>

      {kunci ? (
        <>
          {/* ===== kunci jawaban ===== */}
          {sections.map((s, i) => {
            const pal = SECTION_PALETTE[i % SECTION_PALETTE.length];
            return (
              <div key={s.label + i} className="mt-7">
                <h4 className="text-[16.5px] font-black" style={{ color: WS.ink }}>
                  {sectionLetter(i)}. {s.label}
                </h4>
                <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2.5">
                  {s.questions.map((q, qi) => (
                    <p key={q.id} className="flex gap-2 text-[14.5px] leading-snug">
                      <span className="shrink-0 font-extrabold" style={{ color: pal.badge }}>{qi + 1}.</span>
                      <span className="font-bold" style={{ color: WS.ink }}>{answerOf(q)}</span>
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <>
          {/* ===== kotak identitas ===== */}
          <div
            className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 rounded-2xl border-2 bg-white px-6 py-4"
            style={{ borderColor: WS.idBoxBorder }}
          >
            {["Nama Anak", "Kelas", "Tanggal", "Nilai"].map((label) => (
              <span key={label} className="flex items-end gap-2 text-[14.5px] font-extrabold" style={{ color: WS.ink }}>
                {label} :
                <span className="flex-1 border-b-2 border-dotted" style={{ borderColor: "#A8B7CB" }} />
              </span>
            ))}
          </div>

          {/* ===== petunjuk ===== */}
          {ws.petunjuk?.trim() ? (
            <div
              className="mt-4 rounded-xl border-2 px-4 py-2.5 text-[13.5px] font-semibold"
              style={{ background: WS.petunjukBg, borderColor: WS.petunjukBorder, color: WS.petunjukInk }}
            >
              <span>{ws.petunjuk}</span>
            </div>
          ) : null}

          {/* ===== seksi soal (2 kolom: no. 2 di kanan no. 1, no. 3 di bawah no. 1) ===== */}
          {sections.map((s, i) => {
            const pal = SECTION_PALETTE[i % SECTION_PALETTE.length];
            return (
              <KartuSeksi key={s.label + i} si={i} label={s.label}>
                <div className="mt-2 grid grid-cols-2 items-start gap-x-7 gap-y-3">
                  {s.questions.map((q, qi) => {
                    const lebar = !(q.bersusun || (isEquationLike(q) && !q.visual));
                    return (
                      <div key={q.id} className={lebar ? "col-span-2" : undefined}>
                        <SoalItem q={q} no={qi + 1} pal={pal} />
                      </div>
                    );
                  })}
                </div>
              </KartuSeksi>
            );
          })}
        </>
      )}

      {/* ===== footer pita ===== */}
      <div className="mt-10 flex flex-col items-center">
        <div
          className="flex items-center gap-3.5 rounded-full px-8 py-3 text-white shadow"
          style={{ background: `linear-gradient(90deg, ${WS.footerGrad.join(", ")})` }}
        >
          <Hati />
          <span className="text-[19px] font-black">
            {kunci ? "Kunci tersimpan, jangan lupa beri semangat!" : "Belajar di Rumbela, Yuk!"}
          </span>
          <Hati />
        </div>
        <p className="mt-3 text-[12px] font-medium" style={{ color: WS.mut }}>
          Rumbela, Rumah Belajar Anak · Curup · {tahun}
        </p>
      </div>
    </div>
  );
}

/* ================= Editor soal (dipakai mode manual & edit hasil) ================= */

function SoalEditor({ qs, onChange }: { qs: WorksheetQ[]; onChange: (qs: WorksheetQ[]) => void }) {
  const ubah = (id: string, fn: (q: WorksheetQ) => WorksheetQ) =>
    onChange(qs.map((x) => (x.id === id ? fn(x) : x)));

  return (
    <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
      {qs.map((q, i) => (
        <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-100 text-xs font-black text-sky-800">{i + 1}</span>
            <Select
              value={q.kind}
              onValueChange={(v) =>
                ubah(q.id, (x) => ({
                  ...x,
                  kind: v as SoalKind,
                  options: v === "pg" ? (x.options ?? ["", "", "", ""]) : undefined,
                  pairs: v === "jodoh" ? (x.pairs ?? []) : undefined,
                  words: v === "urut" ? (x.words ?? []) : undefined,
                  text: !x.text.trim() ? petunjukKind(v as SoalKind) || x.text : x.text,
                }))
              }
            >
              <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABEL) as SoalKind[]).map((k) => (
                  <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              aria-label="Hapus soal"
              className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => onChange(qs.length > 1 ? qs.filter((x) => x.id !== q.id) : qs)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <Textarea
            value={q.text}
            onChange={(e) => ubah(q.id, (x) => ({ ...x, text: e.target.value }))}
            rows={2}
            placeholder={`Tulis soal nomor ${i + 1}…`}
            className="bg-white"
          />
          {q.kind === "pg" && (
            <div className="mt-2 space-y-1.5">
              {(q.options ?? []).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => ubah(q.id, (x) => ({ ...x, answer: x.answer === LETTERS[oi] ? "" : LETTERS[oi] }))}
                    className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-xs font-black transition-colors",
                      q.answer === LETTERS[oi] ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-500 hover:border-emerald-300"
                    )}
                    title={q.answer === LETTERS[oi] ? "Kunci jawaban" : "Tandai sebagai kunci"}
                  >
                    {LETTERS[oi]}
                  </button>
                  <Input
                    value={opt}
                    onChange={(e) =>
                      ubah(q.id, (x) => {
                        const opts = [...(x.options ?? ["", "", "", ""])];
                        opts[oi] = e.target.value;
                        return { ...x, options: opts };
                      })
                    }
                    placeholder={`Opsi ${LETTERS[oi]}`}
                    className="h-8 bg-white text-sm"
                  />
                </div>
              ))}
            </div>
          )}
          {q.kind === "jodoh" && (
            <Textarea
              value={(q.pairs ?? []).map((p) => p.join(" = ")).join("\n")}
              onChange={(e) =>
                ubah(q.id, (x) => ({
                  ...x,
                  pairs: e.target.value
                    .split("\n")
                    .map((ln) => {
                      const idx = ln.indexOf("=");
                      return idx === -1 ? [ln, ""] : [ln.slice(0, idx), ln.slice(idx + 1)];
                    })
                    .map((p) => [p[0].trim(), p[1].trim()]),
                }))
              }
              rows={5}
              placeholder={"Satu pasangan per baris (kiri = kanan):\nSelamat pagi = Good morning\nSampai jumpa = Good bye"}
              className="mt-2 bg-white font-mono text-[13px]"
            />
          )}
          {q.kind === "urut" && (
            <div className="mt-2 space-y-1.5">
              <Input
                value={(q.words ?? []).join(", ")}
                onChange={(e) =>
                  ubah(q.id, (x) => ({ ...x, words: e.target.value.split(",").map((w) => w.trim()) }))
                }
                placeholder="Kata acak, pisahkan koma: cth. am, I, student, a"
                className="h-8 bg-white text-sm"
              />
              <Input
                value={q.answer}
                onChange={(e) => ubah(q.id, (x) => ({ ...x, answer: e.target.value }))}
                placeholder="Kunci: kalimat utuh: cth. I am a student"
                className="h-8 bg-white text-sm"
              />
            </div>
          )}
          {q.kind !== "pg" && q.kind !== "jodoh" && q.kind !== "urut" && (
            <Input
              value={q.answer}
              onChange={(e) => ubah(q.id, (x) => ({ ...x, answer: e.target.value }))}
              placeholder="Kunci jawaban (untuk lembar kunci)…"
              className="mt-2 h-8 bg-white text-sm"
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ================= View utama ================= */

export function SoalView() {
  const { db, mutate } = useApp();
  const peng = db.pengaturan;

  const [mode, setMode] = useState<"otomatis" | "manual">("otomatis");
  const [genMapel, setGenMapel] = useState<GenMapel>("matematika");
  const [mapel, setMapel] = useState<string>("Matematika");
  const [jenjang, setJenjang] = useState<string>("SD");
  const [kelas, setKelas] = useState<string>("1");
  const [topikId, setTopikId] = useState<string>(
    TOPIK_GENERATOR.matematika.SD?.["1"]?.[0]?.id ?? ""
  );
  const [campuran, setCampuran] = useState(false);
  const [topikText, setTopikText] = useState<string>("");
  const [jumlah, setJumlah] = useState<number>(10);
  const [kesulitan, setKesulitan] = useState<Kesulitan>(2);
  const [petunjuk, setPetunjuk] = useState<string>("Kerjakan seluruh soal di bawah ini dengan teliti!");
  const [kunci, setKunci] = useState<boolean>(true);

  const [manualQs, setManualQs] = useState<WorksheetQ[]>([blankQ(), blankQ(), blankQ(), blankQ(), blankQ()]);
  const [sheet, setSheet] = useState<Worksheet | null>(null);
  const [busy, setBusy] = useState(false);

  /* mode edit hasil: salin sheet ke working copy agar bisa diubah sebelum cetak/simpan */
  const [editMode, setEditMode] = useState(false);
  const [editQs, setEditQs] = useState<WorksheetQ[]>([]);
  const [editTopik, setEditTopik] = useState("");
  const [editPetunjuk, setEditPetunjuk] = useState("");

  const topikList = useMemo(
    () => TOPIK_GENERATOR[genMapel]?.[jenjang]?.[kelas] ?? [],
    [genMapel, jenjang, kelas]
  );
  const kelasOpsi = useMemo(
    () => (mode === "otomatis" ? kelasTersedia(genMapel, jenjang) : KELAS_BY_JENJANG[jenjang] ?? []),
    [mode, genMapel, jenjang]
  );

  const gantiGenMapel = (m: GenMapel) => {
    setGenMapel(m);
    const def = GEN_MAPEL.find((g) => g.id === m);
    const j = def?.jenjang[0] ?? "SD";
    const kk = kelasTersedia(m, j)[0] ?? "1";
    setJenjang(j);
    setKelas(kk);
    setTopikId(TOPIK_GENERATOR[m]?.[j]?.[kk]?.[0]?.id ?? "");
  };

  const gantiJenjangKelas = (j: string, k?: string) => {
    setJenjang(j);
    const opsi = mode === "otomatis" ? kelasTersedia(genMapel, j) : KELAS_BY_JENJANG[j] ?? [];
    const kk = k && opsi.includes(k) ? k : opsi[0] || "1";
    setKelas(kk);
    setTopikId(TOPIK_GENERATOR[genMapel]?.[j]?.[kk]?.[0]?.id ?? "");
  };

  const gantiTopik = (id: string) => {
    setTopikId(id);
    // topik menjodohkan: satu papan sudah berisi 5 pasangan
    if (id.endsWith("-jodoh")) setJumlah(1);
  };

  const buat = () => {
    if (mode === "otomatis") {
      if (campuran) {
        const gen = generateMixed(genMapel, jenjang, kelas, jumlah, kesulitan);
        if (!gen.length) {
          toast({ title: "Topik belum tersedia", description: "Pilih kelas yang punya bank generator." });
          return;
        }
        setSheet({
          id: "", createdAt: todayStr(), mapel: GEN_MAPEL.find((g) => g.id === genMapel)?.label ?? "Matematika",
          jenjang, kelas, topik: `Paket Campuran Kelas ${kelas}`, petunjuk, kunci,
          questions: gen.map((g) => ({
            id: uid(), text: g.q, kind: (g.kind ?? "isian") as SoalKind, answer: g.a,
            options: g.kind === "pg" ? g.options : undefined,
            pairs: g.kind === "jodoh" ? g.pairs : undefined,
            words: g.kind === "urut" ? g.words : undefined,
            bersusun: g.bersusun,
            visual: g.visual,
            section: g.section,
          })),
        });
      } else {
        const gen = generateQuestions(genMapel, topikId, jenjang, kelas, jumlah, kesulitan);
        if (!gen.length) {
          toast({ title: "Topik belum tersedia", description: "Pilih topik generator untuk jenjang & kelas ini." });
          return;
        }
        setSheet({
          id: "", createdAt: todayStr(), mapel: GEN_MAPEL.find((g) => g.id === genMapel)?.label ?? "Matematika",
          jenjang, kelas, topik: topikLabel(genMapel, topikId, jenjang, kelas), petunjuk, kunci,
          questions: gen.map((g) => ({
            id: uid(), text: g.q, kind: (g.kind ?? "isian") as SoalKind, answer: g.a,
            options: g.kind === "pg" ? g.options : undefined,
            pairs: g.kind === "jodoh" ? g.pairs : undefined,
            words: g.kind === "urut" ? g.words : undefined,
            bersusun: g.bersusun,
            visual: g.visual,
          })),
        });
      }
    } else {
      let dilewati = 0;
      const qs: WorksheetQ[] = [];
      for (const q of manualQs) {
        if (!q.text.trim() && !petunjukKind(q.kind)) continue;
        if (q.kind === "jodoh") {
          const pairs = (q.pairs ?? []).filter((p) => p[0]?.trim() && p[1]?.trim());
          if (pairs.length < 2) { dilewati++; continue; }
          qs.push({ ...q, text: q.text.trim() || JODOH_PETUNJUK, pairs, answer: "" });
        } else if (q.kind === "urut") {
          const words = (q.words ?? []).map((w) => w.trim()).filter(Boolean);
          if (words.length < 2 || !q.answer.trim()) { dilewati++; continue; }
          qs.push({ ...q, text: q.text.trim() || URUT_PETUNJUK, words, answer: q.answer.trim() });
        } else {
          qs.push({
            ...q,
            text: q.text.trim(),
            answer: q.kind === "pg" ? q.answer.toLowerCase() : q.answer.trim(),
            options: q.kind === "pg" ? (q.options ?? []).map((o) => o.trim()) : undefined,
            pairs: undefined,
            words: undefined,
          });
        }
      }
      if (!qs.length) {
        toast({ title: "Belum ada soal", description: "Tulis minimal satu soal lengkap pada mode Tulis sendiri." });
        return;
      }
      if (dilewati) {
        toast({
          title: `${dilewati} soal dilewati`,
          description: "Menjodohkan butuh ≥ 2 pasangan; susun kata butuh ≥ 2 kata + kunci.",
        });
      }
      setSheet({
        id: "", createdAt: todayStr(), mapel, jenjang, kelas,
        topik: topikText.trim() || `Latihan ${mapel}`, petunjuk, kunci, questions: qs,
      });
    }
    toast({ title: "Worksheet siap", description: "Periksa pratinjau, lalu cetak atau simpan." });
  };

  const simpanArsip = () => {
    if (!sheet) return;
    const rec: Worksheet = { ...sheet, id: uid(), createdAt: sheet.createdAt || todayStr() };
    mutate((d) => {
      d.worksheets.unshift(rec);
    });
    setSheet(rec);
    toast({ title: "Tersimpan di arsip", description: `${rec.mapel} · ${rec.topik}` });
  };

  const bukaArsip = (ws: Worksheet) => {
    setSheet(ws);
    setMapel(ws.mapel || "Matematika");
    if (KELAS_BY_JENJANG[ws.jenjang]) {
      setJenjang(ws.jenjang);
      setKelas(ws.kelas || KELAS_BY_JENJANG[ws.jenjang][0]);
    }
    setTopikText(ws.topik);
    setPetunjuk(ws.petunjuk);
    setKunci(ws.kunci);
    setManualQs(ws.questions.length ? ws.questions.map((q) => ({ ...q })) : [blankQ()]);
    setMode("manual");
    toast({ title: "Worksheet dibuka dari arsip", description: ws.topik });
  };

  const unduhPng = async (jenis: "soal" | "kunci") => {
    if (!sheet) return;
    setBusy(true);
    try {
      const canvas = await renderWorksheetCanvas(sheet, peng, jenis);
      const blob = await canvasToBlob(canvas);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `rumbela-${slugify(sheet.topik)}-${jenis}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    } finally {
      setBusy(false);
    }
  };

  const cetak = () => {
    if (!sheet) return;
    window.print();
  };

  /* masuk mode edit: salin sheet saat ini ke working copy */
  const mulaiEdit = () => {
    if (!sheet) return;
    setEditQs(sheet.questions.map((q) => ({ ...q })));
    setEditTopik(sheet.topik);
    setEditPetunjuk(sheet.petunjuk);
    setEditMode(true);
  };

  /* simpan hasil edit kembali ke sheet (filter soal kosong) */
  const simpanEdit = () => {
    if (!sheet) return;
    const bersih = editQs.filter((q) => q.text.trim());
    if (!bersih.length) {
      toast({ title: "Tidak ada soal", description: "Minimal satu soal harus berisi teks." });
      return;
    }
    setSheet({ ...sheet, topik: editTopik.trim() || sheet.topik, petunjuk: editPetunjuk, questions: bersih });
    setEditMode(false);
    toast({ title: "Perubahan disimpan", description: `${bersih.length} soal diperbarui.` });
  };

  const batalEdit = () => setEditMode(false);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[400px,1fr]">
        {/* ============ FORM ============ */}
        <div className="space-y-4">
          <SectionCard
            title="Susun worksheet"
            desc="Penggunaan internal Rumbela, lembar latihan ceria khusus"
          >
            {/* mode */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("otomatis")}
                className={cn(
                  "rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold transition-colors",
                  mode === "otomatis" ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500 hover:border-sky-200"
                )}
              >
                <Wand2 className="mb-1 h-4 w-4" /> Otomatis
                <span className="block text-[11px] font-semibold">5 bank generator mapel</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={cn(
                  "rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold transition-colors",
                  mode === "manual" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:border-emerald-200"
                )}
              >
                <BookPlus className="mb-1 h-4 w-4" /> Tulis sendiri
                <span className="block text-[11px] font-semibold">Semua mata pelajaran</span>
              </button>
            </div>

            {/* mapel */}
            <div className="mt-4 space-y-1.5">
              <Label>Mata pelajaran</Label>
              {mode === "otomatis" ? (
                <Select value={genMapel} onValueChange={(v) => gantiGenMapel(v as GenMapel)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GEN_MAPEL.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.label}, {g.rentang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={mapel} onValueChange={setMapel}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MAPEL_LIST.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* jenjang & kelas */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jenjang</Label>
                <div className="flex overflow-hidden rounded-lg border border-slate-200">
                  {JENJANG.map((j) => {
                    const tersedia = mode === "manual" || (GEN_MAPEL.find((g) => g.id === genMapel)?.jenjang ?? []).includes(j);
                    return (
                      <button
                        key={j}
                        type="button"
                        disabled={!tersedia}
                        onClick={() => gantiJenjangKelas(j)}
                        className={cn(
                          "flex-1 py-2 text-sm font-bold transition-colors",
                          jenjang === j ? "bg-sky-700 text-white" : tersedia ? "bg-white text-slate-500 hover:bg-sky-50" : "cursor-not-allowed bg-slate-100 text-slate-300"
                        )}
                      >
                        {j}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Kelas</Label>
                <Select value={kelas} onValueChange={(k) => gantiJenjangKelas(jenjang, k)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {kelasOpsi.map((k) => (
                      <SelectItem key={k} value={k}>Kelas {k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* topik */}
            {mode === "otomatis" && (
              <div className="mt-3 space-y-1.5">
                <Label>Topik soal</Label>
                {campuran ? (
                  <div className="rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50/60 px-3 py-2.5 text-xs font-semibold text-emerald-700">
                    Paket campuran aktif, semua topik kelas {jenjang} {kelas} digabung jadi seksi A, B, C…
                  </div>
                ) : (
                  <Select value={topikId} onValueChange={gantiTopik}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih topik" /></SelectTrigger>
                    <SelectContent>
                      {topikList.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {genMapel === "kiddo" && (
                  <p className="flex flex-wrap items-center gap-1 text-[11px] leading-relaxed text-muted-foreground">
                    <BookPlus className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                    Materi bank Kiddo mengikuti kategori worksheet
                    <a
                      href={KIDDO_SOURCE}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 font-bold text-sky-700 underline decoration-dotted underline-offset-2 hover:text-sky-700"
                    >
                      kiddoworksheets.com <ExternalLink className="h-3 w-3" />
                    </a>
                    alphabet, angka, berhitung, kosakata, bentuk, pola, bagian tubuh.
                  </p>
                )}
              </div>
            )}

            {/* mode manual: topik bebas */}
            {mode === "manual" && (
              <div className="mt-3 space-y-1.5">
                <Label>Topik soal</Label>
                <Input
                  value={topikText}
                  onChange={(e) => setTopikText(e.target.value)}
                  placeholder="cth. Teks Deskripsi, Perkalian Pecahan…"
                />
              </div>
            )}

            {/* jumlah & kesulitan (otomatis) */}
            {mode === "otomatis" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{campuran ? "Total soal (±)" : "Jumlah soal"}</Label>
                  <Select value={String(jumlah)} onValueChange={(v) => setJumlah(Number(v))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {JUMLAH_OPSI.map((n) => <SelectItem key={n} value={String(n)}>{n} soal</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Kesulitan</Label>
                  <div className="flex overflow-hidden rounded-lg border border-slate-200">
                    {([["1", "Mudah"], ["2", "Sedang"], ["3", "Sulit"]] as const).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setKesulitan(Number(v) as Kesulitan)}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold transition-colors",
                          kesulitan === Number(v) ? "bg-emerald-700 text-white" : "bg-white text-slate-500 hover:bg-emerald-50"
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* paket campuran */}
            {mode === "otomatis" && (
              <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-emerald-100 bg-emerald-50/60 px-4 py-3">
                <span>
                  <span className="block text-sm font-bold text-emerald-800">Paket campuran</span>
                  <span className="block text-xs text-emerald-700/80">Semua topik kelas ini jadi bagian A, B, C… seperti buku latihan</span>
                </span>
                <Switch checked={campuran} onCheckedChange={setCampuran} />
              </label>
            )}

            {/* petunjuk */}
            <div className="mt-3 space-y-1.5">
              <Label>Petunjuk pengerjaan (opsional)</Label>
              <Textarea
                value={petunjuk}
                onChange={(e) => setPetunjuk(e.target.value)}
                rows={2}
                placeholder="cth. Kerjakan pada lembar ini, tunjukkan cara pengerjaanmu!"
              />
            </div>

            {/* kunci */}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-emerald-800">Lembar kunci jawaban</p>
                <p className="text-xs text-emerald-700/80">Ikut tercetak & bisa diunduh terpisah</p>
              </div>
              <Switch checked={kunci} onCheckedChange={setKunci} />
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={buat} className="flex-1 gap-2 rounded-xl bg-sky-700 font-bold hover:bg-sky-800">
                <Sparkles className="h-4 w-4" /> {sheet ? "Perbarui worksheet" : "Buat worksheet"}
              </Button>
              {sheet && (
                <Button variant="outline" className="rounded-xl" onClick={() => setSheet(null)}>
                  Reset
                </Button>
              )}
            </div>
          </SectionCard>

          {/* editor manual */}
          {mode === "manual" && (
            <SectionCard
              title={`Daftar soal (${manualQs.filter((q) => q.text.trim()).length} terisi)`}
              desc="Pilih jenis tiap soal; kunci PG lewat tombol huruf"
              action={
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setManualQs((q) => [...q, blankQ("jodoh")])}>
                    <Plus className="h-4 w-4" /> Jodoh
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setManualQs((q) => [...q, blankQ("urut")])}>
                    <Plus className="h-4 w-4" /> Susun
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setManualQs((q) => [...q, blankQ("pg")])}>
                    <Plus className="h-4 w-4" /> Soal
                  </Button>
                </div>
              }
            >
              <SoalEditor qs={manualQs} onChange={setManualQs} />
            </SectionCard>
          )}
        </div>

        {/* ============ PRATINJAU + EKSPOR ============ */}
        <div className="space-y-4">
          <SectionCard
            title={editMode ? "Edit worksheet" : "Pratinjau & cetak"}
            desc={editMode ? "Ubah soal, topik, atau petunjuk sebelum dicetak" : "Template ceria Rumbela, ukuran A4"}
            action={
              sheet ? (
                <div className="flex flex-wrap gap-2">
                  {editMode ? (
                    <>
                      <Button size="sm" className="gap-1.5 rounded-lg bg-emerald-700 font-bold hover:bg-emerald-800" onClick={simpanEdit}>
                        <Save className="h-4 w-4" /> Simpan perubahan
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={batalEdit}>
                        <X className="h-4 w-4" /> Batal
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg border-sky-300 text-sky-700 hover:bg-sky-50" onClick={mulaiEdit}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button size="sm" className="gap-1.5 rounded-lg bg-sky-700 font-bold hover:bg-sky-800" onClick={cetak}>
                        <Printer className="h-4 w-4" /> Cetak / PDF
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => void unduhPng("soal")} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PNG Soal
                      </Button>
                      {sheet.kunci && (
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => void unduhPng("kunci")} disabled={busy}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PNG Kunci
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={simpanArsip}>
                        <Save className="h-4 w-4" /> Arsipkan
                      </Button>
                    </>
                  )}
                </div>
              ) : null
            }
          >
            {!sheet ? (
              <EmptyState title="Belum ada worksheet">
                Isi formulir di samping, lalu klik <b>Buat worksheet</b>. Pratinjau lembar A4 akan muncul di sini.
              </EmptyState>
            ) : editMode ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Topik</Label>
                    <Input value={editTopik} onChange={(e) => setEditTopik(e.target.value)} placeholder="Topik worksheet" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Petunjuk</Label>
                    <Input value={editPetunjuk} onChange={(e) => setEditPetunjuk(e.target.value)} placeholder="Petunjuk pengerjaan" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setEditQs((q) => [...q, blankQ("pg")])}>
                    <Plus className="h-4 w-4" /> Soal PG
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setEditQs((q) => [...q, blankQ("isian")])}>
                    <Plus className="h-4 w-4" /> Isian
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setEditQs((q) => [...q, blankQ("jodoh")])}>
                    <Plus className="h-4 w-4" /> Jodoh
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setEditQs((q) => [...q, blankQ("urut")])}>
                    <Plus className="h-4 w-4" /> Susun
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {editQs.filter((q) => q.text.trim()).length} dari {editQs.length} soal terisi · soal kosong akan dibuang saat disimpan
                </p>
                <SoalEditor qs={editQs} onChange={setEditQs} />
              </div>
            ) : (
              <div id="print-area">
                {/* tampilan layar */}
                <div className="sheet-scroll">
                  <div className="space-y-6 print:space-y-0">
                    <SheetHTML ws={sheet} jenis="soal" />
                    {sheet.kunci && <SheetHTML ws={sheet} jenis="kunci" />}
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Cetak memakai dialog browser → pilih <b>Save as PDF</b> untuk menyimpan sebagai berkas.
                </p>
              </div>
            )}
          </SectionCard>

          {/* arsip */}
          <SectionCard
            title={`Arsip worksheet (${db.worksheets.length})`}
            desc="Tersimpan otomatis di Google Drive, buka kembali kapan saja"
          >
            {!db.worksheets.length ? (
              <EmptyState title="Arsip masih kosong">
                Worksheet yang diarsipkan akan muncul di sini.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {db.worksheets.map((ws) => (
                  <li key={ws.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
                      <FileQuestion className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-700">{ws.topik}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ws.mapel} · {ws.jenjang}{ws.kelas ? ` kelas ${ws.kelas}` : ""} · {ws.questions.length} soal · {ws.createdAt}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={() => bukaArsip(ws)}>
                        Buka
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => {
                          if (window.confirm(`Hapus worksheet "${ws.topik}" dari arsip?`)) {
                            mutate((d) => {
                              d.worksheets = d.worksheets.filter((x) => x.id !== ws.id);
                            });
                            toast({ title: "Worksheet dihapus" });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
