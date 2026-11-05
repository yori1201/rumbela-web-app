"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, RotateCcw, Settings2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { attStatsInMonth } from "@/lib/laporan";
import {
  DAYS, MONTHS, DEFAULT_TEMPLATE_WA, fillTemplate, fmtDate, todayStr, waLink,
} from "@/lib/constants";
import { EmptyState, SectionCard } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

/** Placeholder yang tersedia pada template laporan WA. */
const TPL_VARS: [string, string][] = [
  ["nama", "nama siswa"],
  ["orangtua", "nama orang tua"],
  ["program", "program les"],
  ["hari", "hari (cth. Senin)"],
  ["tanggal", "tanggal (cth. 5 November 2026)"],
  ["kehadiran", "Hadir / Izin / Alpa"],
  ["kegiatan", "isi kolom Kegiatan hari ini"],
  ["progres", "isi kolom Progres perkembangan"],
  ["rekap", "rekap kehadiran bulan ini (kosong bila belum ada)"],
  ["lembaga", "nama lembaga"],
];

export function JurnalView() {
  const { db, mutate } = useApp();
  const [date, setDate] = useState(todayStr());
  // draft === null → tampilkan nilai tersimpan dari database
  const [draft, setDraft] = useState<{ activity: string; progress: string } | null>(null);
  const [waSid, setWaSid] = useState("");
  // editor template laporan WA
  const [tplOpen, setTplOpen] = useState(false);
  const [tplDraft, setTplDraft] = useState<string | null>(null);

  const entry = draft ?? {
    activity: db.journal[date]?.activity || "",
    progress: db.journal[date]?.progress || "",
  };
  const { activity, progress } = entry;

  const tpl = db.pengaturan.jurnal?.templateWa || DEFAULT_TEMPLATE_WA;
  const tplValue = tplDraft ?? tpl;

  const pickDate = (d: string) => {
    setDate(d);
    setDraft(null);
  };

  const commit = () => {
    const cur = db.journal[date] || {};
    if ((cur.activity || "") === activity && (cur.progress || "") === progress) return;
    mutate((d) => {
      d.journal[date] = { activity, progress };
    });
  };

  const saveTpl = () => {
    if (tplDraft === null) return;
    if (tplDraft.trim() === "") {
      setTplDraft(null);
      toast({ title: "Template kosong — kembali ke teks tersimpan.", variant: "destructive" });
      return;
    }
    if (tplDraft !== tpl) {
      mutate((d) => {
        d.pengaturan.jurnal = { templateWa: tplDraft };
      });
      toast({ title: "Template laporan disimpan." });
    }
  };

  const resetTpl = () => {
    if (tpl !== DEFAULT_TEMPLATE_WA) {
      mutate((d) => {
        d.pengaturan.jurnal = { templateWa: DEFAULT_TEMPLATE_WA };
      });
    }
    setTplDraft(null);
    toast({ title: "Template dikembalikan ke bawaan." });
  };

  /** Sisipkan placeholder pada posisi kursor di editor template. */
  const insertVar = (v: string) => {
    const el = document.getElementById("jr-tpl") as HTMLTextAreaElement | null;
    if (!el) {
      setTplDraft(tplValue + v);
      return;
    }
    const start = el.selectionStart ?? tplValue.length;
    const end = el.selectionEnd ?? start;
    const next = tplValue.slice(0, start) + v + tplValue.slice(end);
    setTplDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + v.length, start + v.length);
    });
  };

  const recent = Object.entries(db.journal).sort(([a], [b]) => b.localeCompare(a)).slice(0, 8);

  /** Data otomatis untuk mengisi {placeholder} template. */
  const dailyVars = (sid: string): Record<string, string> => {
    const s = db.students.find((x) => x.id === sid);
    if (!s) return {};
    const att = db.attendance[date]?.[sid];
    const stats = attStatsInMonth(db, sid, date.slice(0, 7));
    return {
      nama: s.name,
      orangtua: s.parent,
      program: s.program,
      hari: DAYS[new Date(date + "T07:00:00").getDay()],
      tanggal: fmtDate(date),
      kehadiran: att === "H" ? "Hadir 👍" : att === "I" ? "Izin" : att === "A" ? "Alpa" : "Belum dicatat",
      kegiatan: activity.trim() || "—",
      progres: progress.trim() || "—",
      rekap: stats.pct !== null ? `Rekap kehadiran bulan ini: ${stats.pct}%.` : "",
      lembaga: db.pengaturan.namaLembaga,
    };
  };

  const dailyText = (sid: string) => fillTemplate(tpl, dailyVars(sid));

  const previewSid = waSid || db.students[0]?.id || "";

  return (
    <div className="space-y-4">
      <SectionCard
        title="Catatan harian"
        desc="Kegiatan & progres — tersimpan otomatis begitu Anda berpindah kolom"
      >
        <div className="grid gap-3">
          <div className="grid gap-1.5 sm:max-w-xs">
            <Label htmlFor="jr-date">Tanggal</Label>
            <Input id="jr-date" type="date" value={date} onChange={(e) => e.target.value && pickDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="jr-act">Kegiatan hari ini</Label>
            <Textarea
              id="jr-act"
              rows={3}
              value={activity}
              onChange={(e) => setDraft({ ...entry, activity: e.target.value })}
              onBlur={commit}
              placeholder="cth. Calistung — latihan membaca suku kata & dikte kata sederhana…"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="jr-prog">Progres perkembangan</Label>
            <Textarea
              id="jr-prog"
              rows={3}
              value={progress}
              onChange={(e) => setDraft({ ...entry, progress: e.target.value })}
              onBlur={commit}
              placeholder="cth. Aisyah mulai lancar membaca kata tiga suku kata…"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Template teks laporan WA"
        desc="Teks dasar laporan harian — ketik {kurung} untuk data otomatis"
        action={
          <div className="flex gap-2">
            {tplOpen && tpl !== DEFAULT_TEMPLATE_WA && (
              <Button size="sm" variant="outline" onClick={resetTpl}>
                <RotateCcw className="h-4 w-4" /> Bawaan
              </Button>
            )}
            <Button
              size="sm"
              variant={tplOpen ? "default" : "outline"}
              className={tplOpen ? "bg-sky-600 hover:bg-sky-700" : "border-sky-200 text-sky-700 hover:bg-sky-50"}
              onClick={() => {
                setTplOpen(!tplOpen);
                setTplDraft(null);
              }}
            >
              <Settings2 className="h-4 w-4" /> {tplOpen ? "Tutup" : "Ubah template"}
            </Button>
          </div>
        }
      >
        {!tplOpen ? (
          <pre className="line-clamp-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-muted-foreground">
            {tpl}
          </pre>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="jr-tpl">Template — tersimpan otomatis saat berpindah kolom</Label>
              <Textarea
                id="jr-tpl"
                rows={10}
                value={tplValue}
                onChange={(e) => setTplDraft(e.target.value)}
                onBlur={saveTpl}
                className="font-mono text-xs leading-relaxed"
              />
            </div>
            <div className="grid gap-1.5">
              <p className="text-xs font-bold text-slate-500">Ketuk untuk menyisipkan data otomatis:</p>
              <div className="flex flex-wrap gap-1.5">
                {TPL_VARS.map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => insertVar(`{${k}}`)}
                    title={label}
                    className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 transition-colors hover:bg-sky-100"
                  >
                    {`{${k}}`}
                  </button>
                ))}
              </div>
            </div>
            {previewSid && (
              <div className="grid gap-1.5">
                <p className="text-xs font-bold text-slate-500">
                  Pratinjau — {db.students.find((s) => s.id === previewSid)?.name}, {fmtDate(date)}
                </p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs leading-relaxed text-slate-700">
                  {dailyText(previewSid)}
                </pre>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Kirim laporan harian via WhatsApp" desc="Teks mengikuti template di atas + catatan hari ini">
        {db.students.length === 0 ? (
          <EmptyState title="Belum ada siswa" />
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={waSid} onValueChange={setWaSid}>
              <SelectTrigger className="w-full sm:flex-1">
                <SelectValue placeholder="Pilih siswa…" />
              </SelectTrigger>
              <SelectContent>
                {db.students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — {s.program}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!waSid}
                onClick={async () => {
                  await navigator.clipboard.writeText(dailyText(waSid)).catch(() => {});
                  toast({ title: "Teks laporan harian disalin." });
                }}
              >
                <Copy className="h-4 w-4" /> Salin
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600"
                disabled={!waSid}
                onClick={() => window.open(waLink(db.students.find((s) => s.id === waSid)!.wa, dailyText(waSid)), "_blank")}
              >
                <MessageCircle className="h-4 w-4" /> Kirim WA
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Catatan terakhir" desc="Ketuk untuk membuka tanggal tersebut">
        {recent.length === 0 ? (
          <EmptyState title="Belum ada catatan" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map(([dstr, e]) => (
              <li key={dstr}>
                <button
                  onClick={() => pickDate(dstr)}
                  className="w-full rounded-lg px-1 py-2.5 text-left hover:bg-sky-50/60"
                >
                  <p className="text-sm font-bold text-slate-700">
                    {fmtDate(dstr)}
                    {dstr === todayStr() && <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-800">hari ini</span>}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{e.activity || e.progress || "—"}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <p className="text-center text-xs text-muted-foreground">
        Bulan ini: {MONTHS[new Date().getMonth()]} — catatan jurnal otomatis menjadi bahan Laporan Perkembangan.
        <Check className="inline h-3 w-3 text-emerald-500" />
      </p>
    </div>
  );
}
