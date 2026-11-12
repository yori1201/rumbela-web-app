"use client";

import { BookOpen, CalendarCheck2, CalendarClock, ClipboardList, Clock, UserPlus, Wallet } from "lucide-react";
import { useApp } from "@/lib/store";
import { attStatsInMonth, itemsOnDay, namaSiswaOfItem, payEffective, payStatus, siswaIdsOnDay } from "@/lib/laporan";
import {
  currentMonthKey, greeting, MONTHS, rp, todayStr, waLink, DAYS,
  dueDateOf, fmtDayDate,
} from "@/lib/constants";
import { EmptyState, SectionCard, StatCard } from "./shared";
import { Button } from "@/components/ui/button";
import type { ViewId } from "@/components/app-shell";

export function BerandaView({ setView }: { setView: (v: ViewId) => void }) {
  const { db } = useApp();
  const mk = currentMonthKey();
  const today = todayStr();
  const now = new Date();

  const totalSiswa = db.students.length;
  const day = db.attendance[today] || {};
  const tercatat = Object.keys(day).length;
  const hadir = Object.values(day).filter((v) => v === "H").length;
  const lunas = db.students.filter((s) => payStatus(db, s.id, mk) === "lunas").length;
  const terkumpul = db.students.reduce((acc, s) => acc + payEffective(db, s, mk), 0);
  const belumLunas = db.students.filter((s) => payStatus(db, s.id, mk) !== "lunas");
  const jurnalHariIni = db.journal[today];

  /* Jadwal les hari ini (siapa saja yang les) */
  const todayName = DAYS[now.getDay()];
  const itemsToday = itemsOnDay(db, todayName);
  const scheduledToday = siswaIdsOnDay(db, todayName);
  const adaJadwal = db.jadwal.items.length > 0;

  /* jatuh tempo iuran berikutnya (tanggal tiap bulan bisa diatur di menu Iuran) */
  const jt = Math.min(31, Math.max(1, db.pengaturan.iuran?.jatuhTempo ?? 5));
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due =
    belumLunas.length > 0
      ? dueDateOf(now.getFullYear(), now.getMonth(), jt)
      : dueDateOf(now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), (now.getMonth() + 1) % 12, jt);
  const dueInDays = Math.round((due.getTime() - today0.getTime()) / 86400000);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-sky-700 via-sky-600 to-emerald-500 p-5 text-white shadow-sm">
        <p className="text-sm font-semibold opacity-90">
          {greeting()} · {DAYS[now.getDay()]}, {now.getDate()} {MONTHS[now.getMonth()]} {now.getFullYear()}
        </p>
        <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">
          {totalSiswa ? `${adaJadwal && itemsToday.length ? `${scheduledToday.size} siswa les hari ini` : `${totalSiswa} siswa menunggu hari ini`} 🌱` : "Selamat mengelola Rumbela!"}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" className="bg-white text-sky-700 hover:bg-sky-50" onClick={() => setView("absensi")}>
            <CalendarCheck2 className="h-4 w-4" /> Absensi hari ini
          </Button>
          <Button size="sm" className="bg-emerald-600/50 text-white hover:bg-emerald-600/70" onClick={() => setView("laporan")}>
            <ClipboardList className="h-4 w-4" /> Buat laporan gambar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Siswa aktif" value={String(totalSiswa)} sub={`${new Set(db.students.map((s) => s.program)).size} program`} accent="sky" />
        <StatCard
          label="Hadir hari ini"
          value={tercatat ? `${hadir}/${adaJadwal && itemsToday.length ? scheduledToday.size : tercatat}` : "—"}
          sub={tercatat ? (adaJadwal && itemsToday.length ? "dari siswa terjadwal hari ini" : `${Math.round((hadir / tercatat) * 100)}% dari tercatat`) : "belum diisi"}
          accent="teal"
        />
        <StatCard label="Iuran bulan ini" value={`${lunas}/${totalSiswa}`} sub={`${rp(terkumpul)} terkumpul`} accent="emerald" />
        <StatCard label="Perlu perhatian" value={String(belumLunas.length)} sub="iuran belum lunas" accent="rose" />
      </div>

      <SectionCard
        title={`Jadwal les hari ini — ${todayName}`}
        desc={itemsToday.length ? `${itemsToday.length} sesi · ${scheduledToday.size} siswa terjadwal` : "Tidak ada sesi hari ini"}
        action={
          <Button size="sm" variant="ghost" className="text-sky-700" onClick={() => setView("jadwal")}>
            Buka jadwal <Clock className="ml-1 h-4 w-4" />
          </Button>
        }
      >
        {itemsToday.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {adaJadwal
              ? `Tidak ada slot les pada ${todayName}. Jadwal lanjut sesuai menu Jadwal.`
              : "Jadwal mingguan belum diisi — atur slot & siswa di menu Jadwal."}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {itemsToday.map((it) => {
              const sl = db.jadwal.slots[it.slot];
              const nama = namaSiswaOfItem(db, it);
              return (
                <div key={it.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                  <span className="shrink-0 rounded-lg bg-sky-50 px-2 py-1 text-xs font-extrabold text-sky-700">
                    {sl ? `${sl.mulai}–${sl.selesai}` : `Slot ${it.slot + 1}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-700">{it.program}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {it.pengajar || "—"} · {it.kelas}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-emerald-700">
                      {nama.length ? nama.join(", ") : "Belum ada peserta"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Iuran belum lunas"
          desc={`${MONTHS[now.getMonth()]} ${now.getFullYear()} · jatuh tempo ${fmtDayDate(due)}`}
          action={
            <Button size="sm" variant="ghost" className="text-sky-700" onClick={() => setView("iuran")}>
              Kelola <Wallet className="ml-1 h-4 w-4" />
            </Button>
          }
        >
          <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800">
            <CalendarClock className="h-3.5 w-3.5" />
            {dueInDays < 0
              ? `Terlambat ${-dueInDays} hari dari ${fmtDayDate(due)}`
              : dueInDays === 0
                ? "Jatuh tempo hari ini"
                : `Pembayaran berikutnya ${dueInDays} hari lagi`}
          </p>
          {belumLunas.length === 0 ? (
            <p className="text-sm text-emerald-600">Semua iuran bulan ini sudah lunas 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {belumLunas.slice(0, 5).map((s) => {
                const st = payStatus(db, s.id, mk);
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-700">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.program} · {rp(s.fee)}/Bulan · {st === "sebagian" ? "sebagian" : "belum bayar"}
                      </p>
                    </div>
                    <a
                      href={waLink(
                        s.wa,
                        `Assalamu'alaikum Bapak/Ibu ${s.parent},\n\nKami dari *${db.pengaturan.namaLembaga} — ${db.pengaturan.tagline}* mengingatkan iuran bulan *${MONTHS[now.getMonth()]} ${now.getFullYear()}* untuk ananda *${s.name}* (${s.program}) sebesar *${rp(s.fee)}*.\n\nBatas pembayaran: *${fmtDayDate(due)}*${dueInDays < 0 ? ` — telah terlewat ${-dueInDays} hari, mohon segera dilunasi` : dueInDays === 0 ? " (hari ini)" : ""}. Terima kasih atas perhatiannya 🙏`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      Ingatkan WA
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Jurnal hari ini"
          desc="Catatan kegiatan & perkembangan"
          action={
            <Button size="sm" variant="ghost" className="text-sky-700" onClick={() => setView("jurnal")}>
              Buka <BookOpen className="ml-1 h-4 w-4" />
            </Button>
          }
        >
          {jurnalHariIni?.activity || jurnalHariIni?.progress ? (
            <div className="space-y-2 text-sm">
              {jurnalHariIni.activity && (
                <p className="text-slate-700">
                  <b className="text-slate-500">Kegiatan: </b>
                  {jurnalHariIni.activity}
                </p>
              )}
              {jurnalHariIni.progress && (
                <p className="text-slate-700">
                  <b className="text-slate-500">Progres: </b>
                  {jurnalHariIni.progress}
                </p>
              )}
            </div>
          ) : (
            <EmptyState title="Belum ada catatan hari ini">
              Tulis kegiatan &amp; progres di menu Jurnal — catatan ini otomatis jadi bahan laporan bulanan.
            </EmptyState>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Pintasan" desc="Kelola Rumbela lebih cepat">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { id: "siswa" as ViewId, icon: UserPlus, label: "Data siswa" },
            { id: "absensi" as ViewId, icon: CalendarCheck2, label: "Absensi" },
            { id: "jadwal" as ViewId, icon: CalendarCheck2, label: "Jadwal kelas" },
            { id: "laporan" as ViewId, icon: ClipboardList, label: "Laporan" },
          ].map((a) => (
            <button
              key={a.id}
              onClick={() => setView(a.id)}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-white p-4 text-xs font-bold text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <a.icon className="h-5 w-5" />
              {a.label}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
