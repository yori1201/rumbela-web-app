"use client";

import { useState } from "react";
import { CalendarClock, MessageCircle } from "lucide-react";
import { useApp } from "@/lib/store";
import { payStatus } from "@/lib/laporan";
import {
  MONTHS, MONTHS_SHORT, monthKey, monthLabel, rp, waLink,
  dueDateOf, fmtDayDate, fmtDayDateShort,
} from "@/lib/constants";
import type { PayStatus, Siswa } from "@/lib/types";
import { EmptyState, SectionCard } from "./shared";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CYCLE: PayStatus[] = ["belum", "lunas", "sebagian"];
const NEXT: Record<PayStatus, PayStatus> = { belum: "lunas", lunas: "sebagian", sebagian: "belum" };
const CELL: Record<PayStatus, string> = {
  lunas: "bg-emerald-500 text-white",
  sebagian: "bg-amber-400 text-white",
  belum: "bg-slate-100 text-slate-400 hover:bg-slate-200",
};
const SHORT: Record<PayStatus, string> = { lunas: "L", sebagian: "S", belum: "·" };

interface DueInfo {
  date: Date;
  /** hari menuju jatuh tempo (negatif = sudah lewat) */
  inDays: number;
  /** hari keterlambatan (0 bila belum terlambat) */
  overdue: number;
  /** iuran bulan berjalan sudah lunas → tampil jatuh tempo bulan depan */
  lunas: boolean;
}

export function IuranView() {
  const { db, mutate } = useApp();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const thisMk = monthKey(now.getFullYear(), now.getMonth());
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  /* tanggal jatuh tempo iuran (bisa diatur admin) */
  const jt = Math.min(31, Math.max(1, db.pengaturan.iuran?.jatuhTempo ?? 5));
  const setJt = (v: number) =>
    mutate((d) => {
      d.pengaturan.iuran = { jatuhTempo: v };
    });

  const terkumpul = db.students.reduce((acc, s) => {
    const st = payStatus(db, s.id, thisMk);
    return acc + (st === "lunas" ? s.fee : st === "sebagian" ? Math.round(s.fee / 2) : 0);
  }, 0);
  const lunasCount = db.students.filter((s) => payStatus(db, s.id, thisMk) === "lunas").length;
  const target = db.students.reduce((a, s) => a + s.fee, 0);
  const belumCount = db.students.length - lunasCount;

  /** Jatuh tempo pembayaran berikutnya seorang siswa:
   *  bulan berjalan belum lunas → tanggal jt bulan ini;
   *  sudah lunas → tanggal jt bulan depan. */
  const nextDue = (s: Siswa): DueInfo => {
    const st = payStatus(db, s.id, thisMk);
    let y = now.getFullYear();
    let m = now.getMonth();
    if (st === "lunas") {
      y += m === 11 ? 1 : 0;
      m = (m + 1) % 12;
    }
    const date = dueDateOf(y, m, jt);
    const inDays = Math.round((date.getTime() - today0.getTime()) / 86400000);
    return { date, inDays, overdue: st !== "lunas" && inDays < 0 ? -inDays : 0, lunas: st === "lunas" };
  };
  const dueInfo = new Map(db.students.map((s) => [s.id, nextDue(s)]));

  /** jatuh tempo umum: bulan ini bila masih ada yang belum lunas, selain itu bulan depan */
  const groupDue: DueInfo = (() => {
    const nmY = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const nmM = (now.getMonth() + 1) % 12;
    const date = belumCount > 0 ? dueDateOf(now.getFullYear(), now.getMonth(), jt) : dueDateOf(nmY, nmM, jt);
    const inDays = Math.round((date.getTime() - today0.getTime()) / 86400000);
    return { date, inDays, overdue: belumCount > 0 && inDays < 0 ? -inDays : 0, lunas: belumCount === 0 };
  })();

  const cycle = (sid: string, mk: string) => {
    mutate((d) => {
      d.payments[sid] ??= {};
      const cur = d.payments[sid][mk] ?? "belum";
      d.payments[sid][mk] = NEXT[cur];
    });
  };

  const remindText = (sid: string) => {
    const s = db.students.find((x) => x.id === sid)!;
    const st = payStatus(db, sid, thisMk);
    const nd = dueInfo.get(sid)!;
    const dueLine = nd.overdue
      ? `\nJatuh tempo *${fmtDayDate(nd.date)}* telah terlewat ${nd.overdue} hari — mohon segera dilunasi.`
      : `\nBatas pembayaran: *${fmtDayDate(nd.date)}*${nd.inDays === 0 ? " (hari ini)" : nd.inDays === 1 ? " (besok)" : ` (${nd.inDays} hari lagi)`}.`;
    return waLink(
      s.wa,
      `Assalamu'alaikum Bapak/Ibu ${s.parent},\n\nKami dari *${db.pengaturan.namaLembaga} — ${db.pengaturan.tagline}* (Curup) mengingatkan iuran bulan *${monthLabel(thisMk)}* untuk ananda *${s.name}* (${s.program}) sebesar *${rp(s.fee)}*.${dueLine}\n\nStatus saat ini: *${st === "sebagian" ? "Sudah dibayar sebagian" : "Belum lunas"}*.\nTerima kasih atas perhatian dan kepercayaannya 🙏`
    );
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Rekap iuran"
        desc={`Terkumpul bulan ini ${rp(terkumpul)} dari target ${rp(target)}`}
        action={
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      >
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
              style={{ width: `${target ? Math.round((terkumpul / target) * 100) : 0}%` }}
            />
          </div>
          <span className="shrink-0 text-sm font-bold text-emerald-600">
            {lunasCount}/{db.students.length} lunas
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-sky-50/80 px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-900">
            <CalendarClock className="h-4 w-4 shrink-0 text-sky-600" />
            Pembayaran iuran berikutnya:
            <span className="text-sky-700">{fmtDayDate(groupDue.date)}</span>
          </span>
          {groupDue.overdue > 0 ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
              terlambat {groupDue.overdue} hari · {belumCount} siswa
            </span>
          ) : groupDue.inDays === 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">jatuh tempo hari ini</span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              {groupDue.lunas ? "semua lunas — bulan depan" : `${groupDue.inDays} hari lagi`}
            </span>
          )}
          <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            Jatuh tempo tiap tanggal
            <Input
              type="number"
              min={1}
              max={31}
              aria-label="Tanggal jatuh tempo iuran setiap bulan"
              className="h-8 w-16 border-sky-200 bg-white text-center"
              defaultValue={jt}
              key={`jt-${jt}`}
              onBlur={(e) => {
                const v = Math.min(31, Math.max(1, Math.round(Number(e.target.value)) || 5));
                if (v !== jt) {
                  e.target.value = String(v);
                  setJt(v);
                  toast({ title: `Jatuh tempo tiap tanggal ${v} disimpan.` });
                }
              }}
            />
          </label>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Ketuk kotak bulan untuk mengubah status: · belum → <b>L</b> lunas → <b>S</b> sebagian.
        </p>
      </SectionCard>

      {db.students.length === 0 ? (
        <EmptyState title="Belum ada siswa">Tambahkan siswa dulu di menu Siswa.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500">
                <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-bold">Siswa</th>
                <th className="px-2 py-3 text-center font-bold">Jatuh tempo</th>
                {MONTHS_SHORT.map((m) => (
                  <th key={m} className="px-1 py-3 text-center font-bold">{m}</th>
                ))}
                <th className="px-3 py-3 text-center font-bold" aria-label="Aksi" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {db.students.map((s) => {
                const nd = dueInfo.get(s.id)!;
                return (
                <tr key={s.id} className="hover:bg-sky-50/40">
                  <td className="sticky left-0 z-10 max-w-[220px] bg-white px-4 py-2.5">
                    <p className="truncate font-bold text-slate-700">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.program} · {rp(s.fee)}</p>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-center">
                    <p className={cn("text-xs font-extrabold", nd.overdue ? "text-rose-600" : "text-slate-700")}>
                      {fmtDayDateShort(nd.date)}
                    </p>
                    <p className={cn("text-[10px] font-semibold", nd.overdue ? "text-rose-500" : "text-muted-foreground")}>
                      {nd.overdue
                        ? `terlambat ${nd.overdue} hr`
                        : nd.inDays === 0
                          ? "hari ini"
                          : nd.lunas
                            ? "bln depan"
                            : `dalam ${nd.inDays} hr`}
                    </p>
                  </td>
                  {MONTHS_SHORT.map((_, mi) => {
                    const mk = monthKey(year, mi);
                    const st = payStatus(db, s.id, mk);
                    const isNow = mk === thisMk;
                    const dueM = dueDateOf(year, mi, jt);
                    return (
                      <td key={mk} className="px-1 py-2.5 text-center">
                        <button
                          onClick={() => cycle(s.id, mk)}
                          title={`${MONTHS[mi]} ${year} — ${st} · jatuh tempo ${fmtDayDateShort(dueM)}`}
                          aria-label={`${MONTHS[mi]} ${year}: ${st}`}
                          className={cn(
                            "mx-auto grid h-8 w-9 place-items-center rounded-lg text-xs font-extrabold transition-transform active:scale-90",
                            CELL[st],
                            isNow && "ring-2 ring-sky-400 ring-offset-1"
                          )}
                        >
                          {SHORT[st]}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center">
                    <a
                      href={remindText(s.id)}
                      target="_blank"
                      rel="noreferrer"
                      title="Ingatkan via WhatsApp"
                      className="inline-grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground lg:hidden">Geser tabel ke samping untuk melihat semua bulan →</p>
      <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        {(["lunas", "sebagian", "belum"] as PayStatus[]).map((st) => (
          <span key={st} className="inline-flex items-center gap-1.5">
            <span className={cn("grid h-5 w-6 place-items-center rounded text-[10px] font-bold", CELL[st])}>{SHORT[st]}</span>
            {st === "lunas" ? "Lunas" : st === "sebagian" ? "Sebagian" : "Belum"}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded ring-2 ring-sky-400" /> bulan berjalan
        </span>
      </div>
      <span className="hidden">{CYCLE.length}</span>
    </div>
  );
}
