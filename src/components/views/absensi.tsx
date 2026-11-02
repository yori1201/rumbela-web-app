"use client";

import { useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { datesInMonth } from "@/lib/laporan";
import { DAYS, MONTHS, todayStr } from "@/lib/constants";
import type { AttStatus } from "@/lib/types";
import { EmptyState, SectionCard } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const OPTS: { v: AttStatus; label: string; on: string; off: string }[] = [
  { v: "H", label: "Hadir", on: "bg-emerald-500 text-white", off: "text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100" },
  { v: "I", label: "Izin", on: "bg-sky-500 text-white", off: "text-sky-700 bg-sky-50/50 hover:bg-sky-100" },
  { v: "A", label: "Alpa", on: "bg-rose-500 text-white", off: "text-rose-700 bg-rose-50/50 hover:bg-rose-100" },
];

export function AbsensiView() {
  const { db, mutate } = useApp();
  const [date, setDate] = useState(todayStr());
  const [fProgram, setFProgram] = useState("all");

  const programs = useMemo(() => Array.from(new Set(db.students.map((s) => s.program))), [db.students]);
  const day = db.attendance[date] || {};
  const students = db.students.filter((s) => fProgram === "all" || s.program === fProgram);

  const setStatus = (sid: string, st: AttStatus) => {
    mutate((d) => {
      d.attendance[date] ??= {};
      d.attendance[date][sid] = st;
    });
  };
  const allHadir = () => {
    mutate((d) => {
      d.attendance[date] ??= {};
      students.forEach((s) => {
        d.attendance[date][s.id] = "H";
      });
    });
  };

  const [y, m] = date.split("-");
  const mk = `${y}-${m}`;
  const monthDates = datesInMonth(mk);
  const recorded = students.filter((s) => day[s.id]).length;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Absensi harian"
        desc={`${DAYS[new Date(date + "T07:00:00").getDay()]}, ${Number(date.slice(8))} ${MONTHS[Number(m) - 1]} ${y} · ${recorded}/${students.length} tercatat`}
        action={
          <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={allHadir} disabled={!students.length}>
            <CheckCheck className="h-4 w-4" /> Semua hadir
          </Button>
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="sm:w-44" />
          <Select value={fProgram} onValueChange={setFProgram}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Semua program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua program</SelectItem>
              {programs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {students.length === 0 ? (
        <EmptyState title="Belum ada siswa">Tambahkan siswa dulu di menu Siswa.</EmptyState>
      ) : (
        <div className="space-y-2">
          {students.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:gap-4 sm:p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-700">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">{s.program}{s.group ? ` · ${s.group}` : ""}</p>
              </div>
              <div className="flex gap-1.5" role="group" aria-label={`Kehadiran ${s.name}`}>
                {OPTS.map((o) => {
                  const on = day[s.id] === o.v;
                  return (
                    <button
                      key={o.v}
                      onClick={() => setStatus(s.id, o.v)}
                      className={cn(
                        "rounded-xl px-3.5 py-2 text-sm font-bold transition-all active:scale-95",
                        on ? o.on + " shadow-sm" : o.off
                      )}
                      aria-pressed={on}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {students.length > 0 && (
        <SectionCard title="Rekap bulanan" desc={MONTHS[Number(m) - 1] + " " + y}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3 font-bold">Siswa</th>
                  <th className="px-2 py-2 text-center font-bold text-emerald-600">Hadir</th>
                  <th className="px-2 py-2 text-center font-bold text-sky-600">Izin</th>
                  <th className="px-2 py-2 text-center font-bold text-rose-600">Alpa</th>
                  <th className="px-2 py-2 text-right font-bold">% Hadir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map((s) => {
                  let h = 0, i = 0, a = 0;
                  for (const dstr of monthDates) {
                    const v = db.attendance[dstr]?.[s.id];
                    if (v === "H") h++;
                    else if (v === "I") i++;
                    else if (v === "A") a++;
                  }
                  const tot = h + i + a;
                  return (
                    <tr key={s.id}>
                      <td className="py-2.5 pr-3 font-semibold text-slate-700">{s.name}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-emerald-600">{h}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-sky-600">{i}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-rose-600">{a}</td>
                      <td className="px-2 py-2.5 text-right font-bold text-slate-700">{tot ? Math.round((h / tot) * 100) + "%" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
