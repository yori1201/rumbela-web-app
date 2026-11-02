"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useApp } from "@/lib/store";
import { payStatus } from "@/lib/laporan";
import { MONTHS, MONTHS_SHORT, monthKey, monthLabel, rp, waLink } from "@/lib/constants";
import type { PayStatus } from "@/lib/types";
import { EmptyState, SectionCard } from "./shared";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CYCLE: PayStatus[] = ["belum", "lunas", "sebagian"];
const NEXT: Record<PayStatus, PayStatus> = { belum: "lunas", lunas: "sebagian", sebagian: "belum" };
const CELL: Record<PayStatus, string> = {
  lunas: "bg-emerald-500 text-white",
  sebagian: "bg-amber-400 text-white",
  belum: "bg-slate-100 text-slate-400 hover:bg-slate-200",
};
const SHORT: Record<PayStatus, string> = { lunas: "L", sebagian: "S", belum: "·" };

export function IuranView() {
  const { db, mutate } = useApp();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const thisMk = monthKey(now.getFullYear(), now.getMonth());

  const terkumpul = db.students.reduce((acc, s) => {
    const st = payStatus(db, s.id, thisMk);
    return acc + (st === "lunas" ? s.fee : st === "sebagian" ? Math.round(s.fee / 2) : 0);
  }, 0);
  const lunasCount = db.students.filter((s) => payStatus(db, s.id, thisMk) === "lunas").length;
  const target = db.students.reduce((a, s) => a + s.fee, 0);

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
    return waLink(
      s.wa,
      `Assalamu'alaikum Bapak/Ibu ${s.parent},\n\nKami dari *${db.pengaturan.namaLembaga} — ${db.pengaturan.tagline}* (Curup) mengingatkan iuran bulan *${monthLabel(thisMk)}* untuk ananda *${s.name}* (${s.program}) sebesar *${rp(s.fee)}*.\n\nStatus saat ini: *${st === "sebagian" ? "Sudah dibayar sebagian" : "Belum lunas"}*.\nTerima kasih atas perhatian dan kepercayaannya 🙏`
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
        <p className="mt-2 text-xs text-muted-foreground">
          Ketuk kotak bulan untuk mengubah status: · belum → <b>L</b> lunas → <b>S</b> sebagian.
        </p>
      </SectionCard>

      {db.students.length === 0 ? (
        <EmptyState title="Belum ada siswa">Tambahkan siswa dulu di menu Siswa.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500">
                <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-bold">Siswa</th>
                {MONTHS_SHORT.map((m) => (
                  <th key={m} className="px-1 py-3 text-center font-bold">{m}</th>
                ))}
                <th className="px-3 py-3 text-center font-bold" aria-label="Aksi" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {db.students.map((s) => (
                <tr key={s.id} className="hover:bg-sky-50/40">
                  <td className="sticky left-0 z-10 max-w-[220px] bg-white px-4 py-2.5">
                    <p className="truncate font-bold text-slate-700">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.program} · {rp(s.fee)}</p>
                  </td>
                  {MONTHS_SHORT.map((_, mi) => {
                    const mk = monthKey(year, mi);
                    const st = payStatus(db, s.id, mk);
                    const isNow = mk === thisMk;
                    return (
                      <td key={mk} className="px-1 py-2.5 text-center">
                        <button
                          onClick={() => cycle(s.id, mk)}
                          title={`${MONTHS[mi]} ${year} — ${st}`}
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
              ))}
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
