"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { useApp } from "@/lib/store";
import { attStatsInMonth } from "@/lib/laporan";
import { DAYS, MONTHS, fmtDate, todayStr, waLink } from "@/lib/constants";
import { EmptyState, SectionCard } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export function JurnalView() {
  const { db, mutate } = useApp();
  const [date, setDate] = useState(todayStr());
  // draft === null → tampilkan nilai tersimpan dari database
  const [draft, setDraft] = useState<{ activity: string; progress: string } | null>(null);
  const [waSid, setWaSid] = useState("");

  const entry = draft ?? {
    activity: db.journal[date]?.activity || "",
    progress: db.journal[date]?.progress || "",
  };
  const { activity, progress } = entry;

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

  const recent = Object.entries(db.journal).sort(([a], [b]) => b.localeCompare(a)).slice(0, 8);

  const dailyText = (sid: string) => {
    const s = db.students.find((x) => x.id === sid);
    if (!s) return "";
    const att = db.attendance[date]?.[sid];
    const stats = attStatsInMonth(db, sid, date.slice(0, 7));
    const attLabel = att === "H" ? "Hadir 👍" : att === "I" ? "Izin" : att === "A" ? "Alpa" : "Belum dicatat";
    return (
      `Assalamu'alaikum Bapak/Ibu ${s.parent},\n\nBerikut laporan harian ananda *${s.name}* (${s.program}) — *${DAYS[new Date(date + "T07:00:00").getDay()]}, ${fmtDate(date)}* di ${db.pengaturan.namaLembaga}:\n\n` +
      `• Kehadiran: ${attLabel}\n` +
      `• Kegiatan: ${activity.trim() || "—"}\n` +
      `• Catatan progres: ${progress.trim() || "—"}\n` +
      (stats.pct !== null ? `\nRekap kehadiran bulan ini: ${stats.pct}%.\n` : "") +
      `\nTerima kasih atas dukungannya di rumah 🙏`
    );
  };

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

      <SectionCard title="Kirim laporan harian via WhatsApp" desc="Teks otomatis dari catatan di atas + kehadiran siswa">
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
                  className="w-full rounded-lg px-1 py-2.5 text-left hover:bg-orange-50/60"
                >
                  <p className="text-sm font-bold text-slate-700">
                    {fmtDate(dstr)}
                    {dstr === todayStr() && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] text-orange-700">hari ini</span>}
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
