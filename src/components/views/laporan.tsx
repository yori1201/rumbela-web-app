"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, MessageCircle, RefreshCcw, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { attStatsInMonth, getReport, payStatus, suggestNote } from "@/lib/laporan";
import { renderReportCanvas, canvasToBlob } from "@/lib/renderLaporan";
import { ASPECTS, MONTHS, currentMonthKey, monthLabel, normWa, waLink } from "@/lib/constants";
import type { TemplateLaporan } from "@/lib/types";
import { EmptyState, SectionCard, StarInput } from "./shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TEMPLATES: { id: TemplateLaporan; name: string; desc: string; colors: string[] }[] = [
  { id: "ceria", name: "Ceria", desc: "Ceria khas Rumbela", colors: ["#f97316", "#22c55e", "#facc15"] },
  { id: "klasik", name: "Klasik", desc: "Formal & resmi", colors: ["#1e3a5f", "#d4a72c", "#e2e8f0"] },
  { id: "minimal", name: "Minimal", desc: "Bersih & simpel", colors: ["#111827", "#f97316", "#e5e7eb"] },
];

export function LaporanView() {
  const { db, mutate } = useApp();
  const [sid, setSid] = useState("");
  const [mk, setMk] = useState(currentMonthKey());
  const [template, setTemplate] = useState<TemplateLaporan>(db.pengaturan.laporan.template);
  const [note, setNote] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const canvasHost = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(false);

  const siswa = db.students.find((s) => s.id === sid) || null;
  const rep = siswa ? getReport(db, siswa.id, mk) : { scores: {}, note: "", sent: false };
  const months = Array.from({ length: 12 }, (_, i) => {
    const y = new Date().getFullYear();
    return `${y}-${String(i + 1).padStart(2, "0")}`;
  }).concat([`${new Date().getFullYear() - 1}-12`]).sort().reverse();

  // muat data report yang tersimpan saat siswa/bulan berubah
  useEffect(() => {
    if (!siswa) return;
    const r = getReport(db, siswa.id, mk);
    setScores({ ...r.scores });
    setNote(r.note || suggestNote(db, siswa, mk));
     
  }, [sid, mk]);

  const saveReport = useCallback(
    (patch: { scores?: Record<string, number>; note?: string }) => {
      if (!siswa) return;
      mutate((d) => {
        const key = `${siswa.id}@${mk}`;
        d.reports[key] ??= { scores: {}, note: "", sent: false };
        if (patch.scores) d.reports[key].scores = patch.scores;
        if (patch.note !== undefined) d.reports[key].note = patch.note;
      });
    },
    [siswa, mk, mutate]
  );

  // render preview (debounce ringan)
  useEffect(() => {
    if (!siswa) return;
    let alive = true;
    setRendering(true);
    const t = setTimeout(async () => {
      try {
        const canvas = await renderReportCanvas(db, siswa, mk, {
          template,
          scores,
          note,
          pesanPenutup: db.pengaturan.laporan.pesanPenutup,
          ttdNama: db.pengaturan.laporan.ttdNama,
          ttdJabatan: db.pengaturan.laporan.ttdJabatan,
        });
        if (!alive) return;
        const host = canvasHost.current;
        if (host) {
          host.replaceChildren();
          canvas.className = "mx-auto h-auto w-full max-w-[420px] rounded-xl border border-slate-200 shadow-sm";
          host.appendChild(canvas);
        }
      } finally {
        if (alive) setRendering(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
     
  }, [siswa?.id, mk, template, note, JSON.stringify(scores), db.pengaturan.laporan, db.students.length]);

  const download = async () => {
    if (!siswa) return;
    const canvas = await renderReportCanvas(db, siswa, mk, {
      template, scores, note,
      pesanPenutup: db.pengaturan.laporan.pesanPenutup,
      ttdNama: db.pengaturan.laporan.ttdNama,
      ttdJabatan: db.pengaturan.laporan.ttdJabatan,
    });
    const blob = await canvasToBlob(canvas);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Laporan-${siswa.name.replace(/\s+/g, "-")}-${mk}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast({ title: "Gambar laporan diunduh — siap dikirim ke orang tua." });
  };

  const sendWa = () => {
    if (!siswa) return;
    const stats = attStatsInMonth(db, siswa.id, mk);
    const pay = payStatus(db, siswa.id, mk);
    const txt =
      `Assalamu'alaikum Bapak/Ibu ${siswa.parent},\n\n` +
      `Berikut *Laporan Perkembangan Belajar* ananda *${siswa.name}* (${siswa.program}) untuk bulan *${monthLabel(mk)}* di *${db.pengaturan.namaLembaga}*.\n\n` +
      `• Kehadiran: ${stats.pct === null ? "—" : stats.pct + "%"} (H ${stats.h} · I ${stats.i} · A ${stats.a})\n` +
      `• Iuran: ${pay === "lunas" ? "lunas" : pay === "sebagian" ? "sebagian" : "belum lunas"}\n` +
      `• Catatan: ${note.trim() || "—"}\n\n` +
      `Gambar laporan lengkap terlampir 📎\nTerima kasih atas dukungannya di rumah 🙏`;
    const phone = normWa(siswa.wa).replace(/^62/, "62");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(txt)}`, "_blank");
    if (!rep.sent) {
      mutate((d) => {
        const key = `${siswa.id}@${mk}`;
        d.reports[key] ??= { scores: {}, note: "", sent: false };
        d.reports[key].sent = true;
        d.reports[key].sentAt = new Date().toISOString().slice(0, 10);
      });
    }
  };

  if (db.students.length === 0) {
    return <EmptyState title="Belum ada siswa">Tambahkan siswa dulu di menu Siswa, laporan bisa dibuat dalam sekejap.</EmptyState>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_430px]">
      <div className="space-y-4">
        <SectionCard title="Pilih siswa & bulan" desc="Statistik kehadiran & iuran dihitung otomatis">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Siswa</Label>
              <Select value={sid} onValueChange={setSid}>
                <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Pilih siswa…" className="truncate" /></SelectTrigger>
                <SelectContent>
                  {db.students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {s.program}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Bulan</Label>
              <Select value={mk} onValueChange={setMk}>
                <SelectTrigger className="w-full min-w-0"><SelectValue className="truncate" /></SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Pilih template" desc="Tersimpan sebagai template default di Pengaturan">
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={cn(
                  "rounded-xl border-2 p-3 text-left transition-all",
                  template === t.id ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:border-orange-200"
                )}
                aria-pressed={template === t.id}
              >
                <div className="flex gap-1">
                  {t.colors.map((c) => (
                    <span key={c} className="h-4 w-4 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="mt-2 text-sm font-extrabold text-slate-700">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Penilaian & catatan" desc="Ketuk bintang untuk menilai; catatan bisa diisi otomatis dari jurnal">
          {!siswa ? (
            <p className="text-sm text-muted-foreground">Pilih siswa terlebih dulu.</p>
          ) : (
            <div className="space-y-3">
              {ASPECTS.map((a) => (
                <div key={a} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-700">{a}</span>
                  <StarInput
                    value={scores[a] || 0}
                    onChange={(v) => {
                      const next = { ...scores, [a]: v };
                      setScores(next);
                      saveReport({ scores: next });
                    }}
                  />
                </div>
              ))}
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rep-note">Catatan pengajar</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-orange-600"
                    onClick={() => {
                      setNote(suggestNote(db, siswa, mk));
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Isi otomatis dari jurnal
                  </Button>
                </div>
                <Textarea
                  id="rep-note"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={() => saveReport({ note })}
                  placeholder="cth. Bulan ini Aisyah menunjukkan kemajuan membaca yang pesat…"
                />
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <SectionCard title="Pratinjau gambar" desc="Inilah yang diterima orang tua">
          <div ref={canvasHost} className="grid min-h-[280px] place-items-center rounded-xl bg-slate-50 p-3">
            {!siswa && <p className="p-6 text-center text-sm text-muted-foreground">Pilih siswa untuk melihat pratinjau laporan.</p>}
          </div>
          {rendering && <p className="mt-2 text-center text-xs text-muted-foreground">Merender…</p>}
          {siswa && (
            <div className="mt-3 grid gap-2">
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => void download()}>
                <Download className="h-4 w-4" /> Unduh gambar PNG
              </Button>
              <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={sendWa}>
                <MessageCircle className="h-4 w-4" /> Kirim teks via WhatsApp
              </Button>
              <Button
                variant="ghost"
                className={rep.sent ? "text-emerald-600" : "text-slate-500"}
                onClick={() => {
                  if (!siswa) return;
                  mutate((d) => {
                    const key = `${siswa.id}@${mk}`;
                    d.reports[key] ??= { scores: {}, note: "", sent: false };
                    d.reports[key].sent = !d.reports[key].sent;
                    d.reports[key].sentAt = d.reports[key].sent ? new Date().toISOString().slice(0, 10) : undefined;
                  });
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {rep.sent ? `Terkirim${rep.sentAt ? " " + rep.sentAt : ""} — batalkan?` : "Tandai sudah terkirim"}
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Unduh gambar lalu lampirkan manual di WhatsApp (batas WhatsApp tidak bisa kirim file otomatis).
                Tombol WA mengisi teks pengantar.
              </p>
            </div>
          )}
        </SectionCard>
        <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setTemplate(db.pengaturan.laporan.template)}>
          <RefreshCcw className="h-3.5 w-3.5" /> Kembali ke template default ({db.pengaturan.laporan.template})
        </Button>
      </div>
    </div>
  );
}
