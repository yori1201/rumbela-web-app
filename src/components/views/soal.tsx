"use client";

/* Generator Soal & Worksheet Rumbela — khusus penggunaan internal admin.
   • Mode otomatis: bank generator Matematika per jenjang/kelas/topik
   • Mode tulis-sendiri: semua mata pelajaran (PG / isian / uraian)
   • Template khusus Rumbela berlogo → cetak PDF & unduh PNG
   • Arsip worksheet tersimpan otomatis di Google Drive */

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  BookPlus, Download, FileQuestion, Loader2, Plus, Printer, Save,
  Sparkles, Trash2, Wand2,
} from "lucide-react";
import { useApp } from "@/lib/store";
import {
  GEN_MAPEL, KELAS_BY_JENJANG, MAPEL_LIST, TOPIK_GENERATOR, generateQuestions, kelasTersedia, topikLabel,
  type GenMapel, type Kesulitan,
} from "@/lib/generatorSoal";
import { renderWorksheetCanvas, slugify } from "@/lib/renderWorksheet";
import { canvasToBlob } from "@/lib/renderLaporan";
import { todayStr, uid } from "@/lib/constants";
import type { SoalKind, Worksheet, WorksheetQ } from "@/lib/types";
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

const JENJANG = ["SD", "SMP", "SMA"] as const;
const JUMLAH_OPSI = [5, 8, 10, 15, 20, 25];
const LETTERS = ["a", "b", "c", "d"];
const KIND_LABEL: Record<SoalKind, string> = { pg: "Pilihan Ganda", isian: "Isian Singkat", uraian: "Uraian" };

function blankQ(kind: SoalKind = "isian"): WorksheetQ {
  return { id: uid(), text: "", kind, answer: "", ...(kind === "pg" ? { options: ["", "", "", ""] } : {}) };
}

/* ================= Lembar A4 (HTML — tampilan & cetak) =================
   Layout sesuai referensi brand: logo Rumbela penuh kiri atas, halaman
   bersih minimal, footer tengah "Rumbela <tahun>". */

function AnswerLines({ n }: { n: number }) {
  return (
    <div className="mt-1.5 space-y-5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="border-b-[1.5px] border-dotted border-slate-400" />
      ))}
    </div>
  );
}

function SheetHTML({ ws, jenis }: { ws: Worksheet; jenis: "soal" | "kunci" }) {
  const tahun = new Date().getFullYear();
  return (
    <div className="sheet relative mx-auto w-[794px] shrink-0 rounded-xl bg-white p-12 text-slate-800 shadow-lg ring-1 ring-slate-200" style={{ minHeight: 1123 }}>
      {/* kop: logo penuh kiri atas + tanggal kanan atas */}
      <div className="flex items-start justify-between">
        <Image src="/logo.webp" alt="Rumbela — Rumah Belajar Anak" width={225} height={207} className="h-auto w-[225px]" />
        <p className="pt-1 text-[11px] font-medium text-slate-400">
          {new Date(ws.createdAt + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {jenis === "soal" ? (
        <>
          {/* judul */}
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Worksheet · {ws.mapel || "—"}</p>
              <h3 className="truncate text-[26px] font-black leading-tight text-sky-700">{ws.topik || "Latihan"}</h3>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-500">
                {[ws.jenjang, ws.kelas ? `Kelas ${ws.kelas}` : "", `${ws.questions.length} soal`].filter(Boolean).join("  ·  ")}
              </p>
            </div>
            <p className="shrink-0 text-[13px] font-black text-emerald-600">Selamat mengerjakan!</p>
          </div>
          <div className="mt-5 flex gap-10 text-[15px] font-semibold">
            <span className="flex flex-1 items-end gap-2">Nama : <span className="flex-1 border-b-[1.5px] border-dotted border-slate-400" /></span>
            <span className="flex w-56 items-end gap-2">Kelas : <span className="flex-1 border-b-[1.5px] border-dotted border-slate-400" /></span>
          </div>
          {ws.petunjuk && (
            <div className="mt-4 rounded-xl bg-sky-50 px-5 py-3 text-[13.5px] font-semibold leading-relaxed text-sky-900">
              {ws.petunjuk}
            </div>
          )}
          <ol className="mt-5 space-y-5">
            {ws.questions.map((q, i) => (
              <li key={q.id} className="flex gap-2 text-[15px] leading-relaxed">
                <span className="font-black text-sky-700">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{q.text}</p>
                  {q.kind === "pg" && q.options?.length ? (
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2">
                      {q.options.slice(0, 4).map((opt, oi) => (
                        <span key={oi} className="flex items-center gap-2 font-semibold">
                          <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-slate-400 text-[10px] font-bold text-slate-500">{LETTERS[oi]}</span>
                          {opt}
                        </span>
                      ))}
                    </div>
                  ) : q.kind === "uraian" ? (
                    <AnswerLines n={3} />
                  ) : (
                    <AnswerLines n={1} />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <div className="mt-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Kunci Jawaban · {ws.mapel || "—"}</p>
            <h3 className="text-[26px] font-black leading-tight text-sky-700">{ws.topik || "Latihan"}</h3>
            <p className="mt-0.5 text-[16px] font-black text-emerald-600">KUNCI JAWABAN</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-4">
            {ws.questions.map((q, i) => (
              <p key={q.id} className="flex gap-2 text-[15px]">
                <span className="font-black text-sky-700">{i + 1}.</span>
                <span className="font-bold text-slate-800">
                  {q.kind === "pg" && q.options?.length ? q.answer.toUpperCase() : q.answer || "—"}
                </span>
              </p>
            ))}
          </div>
        </>
      )}

      {/* footer sesuai referensi: Rumbela <tahun> tengah bawah */}
      <div className="absolute inset-x-12 bottom-7 text-center">
        <p className="text-[13px] font-medium text-slate-400">Rumbela {tahun}</p>
      </div>
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
  const [topikText, setTopikText] = useState<string>("");
  const [jumlah, setJumlah] = useState<number>(10);
  const [kesulitan, setKesulitan] = useState<Kesulitan>(2);
  const [petunjuk, setPetunjuk] = useState<string>("Kerjakan seluruh soal di bawah ini dengan teliti!");
  const [kunci, setKunci] = useState<boolean>(true);

  const [manualQs, setManualQs] = useState<WorksheetQ[]>([blankQ(), blankQ(), blankQ(), blankQ(), blankQ()]);
  const [sheet, setSheet] = useState<Worksheet | null>(null);
  const [busy, setBusy] = useState(false);

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

  const buat = () => {
    if (mode === "otomatis") {
      const gen = generateQuestions(genMapel, topikId, jenjang, kelas, jumlah, kesulitan);
      if (!gen.length) {
        toast({ title: "Topik belum tersedia", description: "Pilih topik generator untuk jenjang & kelas ini." });
        return;
      }
      setSheet({
        id: "", createdAt: todayStr(), mapel: GEN_MAPEL.find((g) => g.id === genMapel)?.label ?? "Matematika", jenjang, kelas,
        topik: topikLabel(genMapel, topikId, jenjang, kelas), petunjuk, kunci,
        questions: gen.map((g) => ({ id: uid(), text: g.q, kind: "isian" as SoalKind, answer: g.a })),
      });
    } else {
      const qs = manualQs
        .filter((q) => q.text.trim())
        .map((q) => ({
          ...q,
          text: q.text.trim(),
          answer: q.kind === "pg" ? q.answer.toLowerCase() : q.answer.trim(),
          options: q.kind === "pg" ? (q.options ?? []).map((o) => o.trim()) : undefined,
        }));
      if (!qs.length) {
        toast({ title: "Belum ada soal", description: "Tulis minimal satu soal pada mode Tulis sendiri." });
        return;
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

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[400px,1fr]">
        {/* ============ FORM ============ */}
        <div className="space-y-4">
          <SectionCard
            title="Susun worksheet"
            desc="Penggunaan internal Rumbela — lembar latihan bergambar khusus"
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
                <span className="block text-[11px] font-semibold opacity-75">4 bank generator mapel</span>
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
                <span className="block text-[11px] font-semibold opacity-75">Semua mata pelajaran</span>
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
                      <SelectItem key={g.id} value={g.id}>{g.label} — {g.rentang}</SelectItem>
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
                          jenjang === j ? "bg-sky-600 text-white" : tersedia ? "bg-white text-slate-500 hover:bg-sky-50" : "cursor-not-allowed bg-slate-100 text-slate-300"
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
            <div className="mt-3 space-y-1.5">
              <Label>Topik soal</Label>
              {mode === "otomatis" ? (
                <Select value={topikId} onValueChange={setTopikId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih topik" /></SelectTrigger>
                  <SelectContent>
                    {topikList.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={topikText}
                  onChange={(e) => setTopikText(e.target.value)}
                  placeholder="cth. Teks Deskripsi, Perkalian Pecahan…"
                />
              )}
            </div>

            {/* jumlah & kesulitan (otomatis) */}
            {mode === "otomatis" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Jumlah soal</Label>
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
                          kesulitan === Number(v) ? "bg-emerald-500 text-white" : "bg-white text-slate-500 hover:bg-emerald-50"
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
              <Button onClick={buat} className="flex-1 gap-2 rounded-xl bg-sky-600 font-bold hover:bg-sky-700">
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
              desc="Pilih jenis tiap soal; kunci untuk pilihan ganda diisi lewat tombol huruf"
              action={
                <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setManualQs((q) => [...q, blankQ("pg")])}>
                  <Plus className="h-4 w-4" /> Soal
                </Button>
              }
            >
              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {manualQs.map((q, i) => (
                  <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-100 text-xs font-black text-sky-800">{i + 1}</span>
                      <Select
                        value={q.kind}
                        onValueChange={(v) =>
                          setManualQs((arr) => arr.map((x) => x.id === q.id ? { ...x, kind: v as SoalKind, options: v === "pg" ? (x.options ?? ["", "", "", ""]) : undefined } : x))
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
                        className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => setManualQs((arr) => (arr.length > 1 ? arr.filter((x) => x.id !== q.id) : arr))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Textarea
                      value={q.text}
                      onChange={(e) => setManualQs((arr) => arr.map((x) => x.id === q.id ? { ...x, text: e.target.value } : x))}
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
                              onClick={() => setManualQs((arr) => arr.map((x) => x.id === q.id ? { ...x, answer: x.answer === LETTERS[oi] ? "" : LETTERS[oi] } : x))}
                              className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs font-black transition-colors",
                                q.answer === LETTERS[oi] ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-slate-400 hover:border-emerald-300"
                              )}
                              title={q.answer === LETTERS[oi] ? "Kunci jawaban" : "Tandai sebagai kunci"}
                            >
                              {LETTERS[oi]}
                            </button>
                            <Input
                              value={opt}
                              onChange={(e) =>
                                setManualQs((arr) => arr.map((x) => {
                                  if (x.id !== q.id) return x;
                                  const opts = [...(x.options ?? ["", "", "", ""])];
                                  opts[oi] = e.target.value;
                                  return { ...x, options: opts };
                                }))
                              }
                              placeholder={`Opsi ${LETTERS[oi]}`}
                              className="h-8 bg-white text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {q.kind !== "pg" && (
                      <Input
                        value={q.answer}
                        onChange={(e) => setManualQs((arr) => arr.map((x) => x.id === q.id ? { ...x, answer: e.target.value } : x))}
                        placeholder="Kunci jawaban (untuk lembar kunci)…"
                        className="mt-2 h-8 bg-white text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ============ PRATINJAU + EKSPOR ============ */}
        <div className="space-y-4">
          <SectionCard
            title="Pratinjau & cetak"
            desc="Template khusus Rumbela — ukuran A4"
            action={
              sheet ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1.5 rounded-lg bg-sky-600 font-bold hover:bg-sky-700" onClick={cetak}>
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
                </div>
              ) : null
            }
          >
            {!sheet ? (
              <EmptyState title="Belum ada worksheet">
                Isi formulir di samping, lalu klik <b>Buat worksheet</b>. Pratinjau lembar A4 akan muncul di sini.
              </EmptyState>
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
            desc="Tersimpan otomatis di Google Drive — buka kembali kapan saja"
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
