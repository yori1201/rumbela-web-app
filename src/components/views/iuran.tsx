"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, Copy, Download, MessageCircle, Pencil, Receipt, Wallet } from "lucide-react";
import { useApp } from "@/lib/store";
import { kwitansiNoTersimpan, payAmount, payDate, payEffective, payStatus, progresSiklus, stempelKwitansiNo, statusTagihan, waIngatkanIuran } from "@/lib/laporan";
import { kwitansiWaLink, kwitansiWaText, renderKwitansi } from "@/lib/renderKwitansi";
import {
  MONTHS, MONTHS_SHORT, monthKey, monthLabel, rp, rpShort, todayStr,
  fmtDate, fmtDateShort, DEFAULT_KWITANSI_LABELS,
} from "@/lib/constants";
import type { KwitansiTemplate, PayStatus, Siswa } from "@/lib/types";
import { EmptyState, SectionCard } from "./shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CELL: Record<PayStatus, string> = {
  lunas: "bg-emerald-700 text-white",
  sebagian: "bg-amber-700 text-white",
  belum: "bg-slate-100 text-slate-600 hover:bg-slate-200",
};
const SHORT: Record<PayStatus, string> = { lunas: "L", sebagian: "S", belum: "·" };
const LABEL: Record<PayStatus, string> = { lunas: "Lunas", sebagian: "Sebagian", belum: "Belum" };


/** Isian teks layout kwitansi yang bisa diedit langsung di dialog kwitansi. */
const KWITANSI_LABEL_FIELDS: { key: keyof KwitansiTemplate; label: string }[] = [
  { key: "judul", label: "Judul" },
  { key: "subjudul", label: "Subjudul" },
  { key: "labelNo", label: "Awalan nomor" },
  { key: "labelKota", label: "Kota dan tanggal" },
  { key: "labelDari", label: "Label “Telah diterima dari”" },
  { key: "labelUntuk", label: "Label “Untuk pembayaran”" },
  { key: "labelTerbilang", label: "Label terbilang" },
  { key: "ucapan", label: "Ucapan terima kasih" },
  { key: "catatan", label: "Catatan kaki" },
  { key: "hormatKami", label: "Salam penutup" },
];

export function IuranView() {
  const { db, mutate } = useApp();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  /** sel bulan yang sedang diedit (status + tanggal + jumlah pembayaran) */
  const [editPay, setEditPay] = useState<{ sid: string; mk: string; quick?: boolean } | null>(null);
  /** draf ketikan jumlah bayar (belum dikomit ke database) */
  const [amountDraft, setAmountDraft] = useState<string | null>(null);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const thisMk = monthKey(now.getFullYear(), now.getMonth());
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const terkumpul = db.students.reduce((acc, s) => acc + payEffective(db, s, thisMk), 0);
  const lunasCount = db.students.filter((s) => payStatus(db, s.id, thisMk) === "lunas").length;
  const target = db.students.reduce((a, s) => a + s.fee, 0);

  /** Progres siklus pertemuan tiap siswa (model bayar di depan): satu
   *  pembayaran mencakup `meet` pertemuan (bawaan 12). Tagihan berikutnya
   *  jatuh tempo bulan berikutnya atau setelah pertemuan selesai — mana
   *  yang lebih dulu — dan pengingat muncul di pertemuan ke-(target-1). */
  const siklusInfo = new Map(db.students.map((s) => [s.id, progresSiklus(db, s)]));
  const tagihanInfo = new Map(db.students.map((s) => [s.id, statusTagihan(db, s, now)]));
  /** siswa yang tagihan berikutnya sudah jatuh tempo */
  const dueSiswa = db.students.filter((s) => tagihanInfo.get(s.id)!.jatuhTempo);
  /** siswa yang mencapai pertemuan ke-(target-1): pengingat pembayaran berikutnya */
  const warningSiswa = db.students.filter((s) => tagihanInfo.get(s.id)!.peringatanPertemuan);


  /* ---------- dialog status + tanggal + jumlah pembayaran ---------- */
  const editStudent = editPay ? db.students.find((x) => x.id === editPay.sid) : null;
  const editSt: PayStatus = editPay ? payStatus(db, editPay.sid, editPay.mk) : "belum";
  const editDate = editPay ? payDate(db, editPay.sid, editPay.mk) : null;
  const editAmount = editPay ? payAmount(db, editPay.sid, editPay.mk) : null;
  const editMonthName = editPay ? monthLabel(editPay.mk) : "";

  /** ubah status: lunas/sebagian → tanggal bayar otomatis hari ini + jumlah bayar terisi;
   *  kembali ke belum → tanggal & jumlah dihapus. */
  const setStatus = (next: PayStatus) => {
    if (!editPay || next === editSt) return;
    const { sid, mk } = editPay;
    setAmountDraft(null);
    mutate((d) => {
      d.payments[sid] ??= {};
      d.payments[sid][mk] = next;
      d.payDates[sid] ??= {};
      d.payAmounts[sid] ??= {};
      if (next === "belum") {
        delete d.payDates[sid][mk];
        delete d.payAmounts[sid][mk];
      } else {
        if (!d.payDates[sid][mk]) d.payDates[sid][mk] = todayStr();
        if (!d.payAmounts[sid][mk]) {
          d.payAmounts[sid][mk] = next === "lunas" ? editStudent?.fee ?? 0 : Math.round((editStudent?.fee ?? 0) / 2);
        }
      }
      /* Fase 1: bekukan nomor kwitansi saat pembayaran dicatat (atau
       *  hapus bila pembayaran dibatalkan ke "belum"). */
      stempelKwitansiNo(d, sid, mk);
    });
  };

  const setPaidAt = (iso: string) => {
    if (!editPay) return;
    const { sid, mk } = editPay;
    mutate((d) => {
      d.payDates[sid] ??= {};
      if (iso) d.payDates[sid][mk] = iso;
      else delete d.payDates[sid][mk];
    });
  };

  /** simpan jumlah bayar — status & tanggal ikut disesuaikan otomatis:
   *  jumlah ≥ iuran → Lunas, 0 < jumlah < iuran → Sebagian, kosong → hapus jumlah. */
  const commitAmount = (raw: string) => {
    if (!editPay || !editStudent) return;
    const { sid, mk } = editPay;
    const n = Math.max(0, Math.round(Number(raw.replace(/[^0-9]/g, ""))));
    setAmountDraft(null);
    mutate((d) => {
      d.payAmounts[sid] ??= {};
      d.payments[sid] ??= {};
      d.payDates[sid] ??= {};
      if (!n) {
        delete d.payAmounts[sid][mk];
        return;
      }
      d.payAmounts[sid][mk] = n;
      d.payments[sid][mk] = n >= editStudent.fee ? "lunas" : "sebagian";
      if (!d.payDates[sid][mk]) d.payDates[sid][mk] = todayStr();
      /* Fase 1: bekukan nomor kwitansi saat pembayaran dicatat. */
      stempelKwitansiNo(d, sid, mk);
    });
    toast({
      title: `Pembayaran ${rp(n)} tercatat`,
      description: `${editStudent.name} · ${monthLabel(mk)}`,
    });
  };

  /** buka dialog catat bayar dari baris nama siswa — langsung ke bulan
   *  tagihan berikutnya (bulan berjalan bila belum lunas, atau bulan
   *  setelah pembayaran terakhir bila bulan berjalan sudah lunas tapi
   *  pertemuannya sudah habis) */
  const openQuick = (sid: string) => {
    const s = db.students.find((x) => x.id === sid);
    if (!s) return;
    const tag = statusTagihan(db, s, now);
    setAmountDraft(null);
    setYear(Number(tag.bulanTagihan.split("-")[0]));
    setEditPay({ sid, mk: tag.bulanTagihan, quick: true });
  };

  /* ---------- kwitansi / bukti pembayaran ---------- */
  const [kwit, setKuit] = useState<{ sid: string; mk: string } | null>(null);
  const [kwitCanvas, setKuitCanvas] = useState<HTMLCanvasElement | null>(null);
  const [editTeksKwit, setEditTeksKwit] = useState(false);
  /** template teks layout kwitansi (sama dengan yang di Pengaturan) */
  const kwitTpl = db.pengaturan.kwitansi ?? { ...DEFAULT_KWITANSI_LABELS };
  const setKwitansi = (patch: Partial<KwitansiTemplate>) =>
    mutate((d) => {
      d.pengaturan.kwitansi = {
        ...DEFAULT_KWITANSI_LABELS,
        ...(d.pengaturan.kwitansi ?? {}),
        ...patch,
      };
    });
  const resetKwitansi = () => {
    mutate((d) => {
      d.pengaturan.kwitansi = { ...DEFAULT_KWITANSI_LABELS };
    });
    toast({ title: "Teks kwitansi dikembalikan ke bawaan." });
  };
  const kwitBoxRef = useRef<HTMLDivElement>(null);
  const kwitSiswa = kwit ? db.students.find((s) => s.id === kwit.sid) ?? null : null;

  /** Kwitansi terbit begitu pembayaran tercatat (model bayar di depan) —
   *  tidak menunggu pertemuan selesai. */
  const openKwit = (sid: string, mk: string = thisMk) => {
    if (payStatus(db, sid, mk) === "belum") {
      toast({
        title: "Belum ada pembayaran tercatat",
        description: `Catat bayaran ${monthLabel(mk)} dulu untuk membuat kwitansi.`,
      });
      return;
    }
    /* Fase 1: pembayaran lama (sebelum nomor kwitansi disimpan) ikut
     *  dibekukan nomornya saat kwitansi pertama kali dibuka, supaya
     *  nomornya tidak berubah lagi dan cermin bisa menampilkan yang asli. */
    if (!kwitansiNoTersimpan(db, sid, mk)) {
      mutate((d) => {
        stempelKwitansiNo(d, sid, mk);
      });
    }
    setKuitCanvas(null);
    setKuit({ sid, mk });
  };

  useEffect(() => {
    if (!kwit || !kwitSiswa) return;
    let alive = true;
    void renderKwitansi(db, kwitSiswa, kwit.mk).then((c) => {
      if (!alive) return;
      c.className = "w-full h-auto rounded-lg bg-white shadow-sm";
      setKuitCanvas(c);
      kwitBoxRef.current?.replaceChildren(c);
    }).catch(() => {
      if (!alive) return;
      toast({ title: "Gagal membuat gambar kwitansi", description: "Coba lagi, atau pakai tombol Salin teks.", variant: "destructive" });
    });
    return () => {
      alive = false;
    };
  }, [db, kwit, kwitSiswa]);

  /** Buka kwitansi yang diminta dari pendaftaran siswa baru (bayar di
   *  depan): SiswaView menyimpan { sid, mk } di sessionStorage lalu pindah
   *  ke menu ini. Kunci baru dihapus setelah siswa & pembayarannya ketemu
   *  di database, supaya tidak terbuka lagi di kunjungan berikutnya.
   *  setState ditunda satu microtask agar tidak memicu render berantai
   *  di dalam effect. */
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem("rumbela-buka-kwitansi");
    } catch {
      /* storage tidak tersedia */
    }
    if (!raw) return;
    let parsed: { sid?: string; mk?: string } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* abaikan */
    }
    if (!parsed?.sid) {
      try {
        sessionStorage.removeItem("rumbela-buka-kwitansi");
      } catch {
        /* abaikan */
      }
      return;
    }
    // Tangkap nilai yang sudah dipersempit tipenya ke const, supaya tetap
    // bertipe string di dalam callback queueMicrotask di bawah.
    const sid = parsed.sid;
    const mk = parsed.mk || thisMk;
    if (!db.students.some((s) => s.id === sid)) return;
    if (payStatus(db, sid, mk) === "belum") return;
    try {
      sessionStorage.removeItem("rumbela-buka-kwitansi");
    } catch {
      /* abaikan */
    }
    queueMicrotask(() => {
      setKuitCanvas(null);
      setKuit({ sid, mk });
    });
  }, [db]);

  const unduhKwit = () => {
    if (!kwitCanvas || !kwitSiswa || !kwit) return;
    const a = document.createElement("a");
    a.href = kwitCanvas.toDataURL("image/png");
    a.download = `Kwitansi-${kwitSiswa.name.replace(/\s+/g, "-")}-${kwit.mk}.png`;
    a.click();
  };

  const salinKwit = async () => {
    if (!kwitSiswa || !kwit) return;
    try {
      await navigator.clipboard.writeText(kwitansiWaText(db, kwitSiswa, kwit.mk));
      toast({ title: "Teks kwitansi disalin", description: "Tempel di chat WhatsApp bapak/ibu." });
    } catch {
      toast({ title: "Gagal menyalin", description: "Gunakan tombol Kirim WA sebagai gantinya." });
    }
  };

  /** Teks pengingat WA mengikuti status tagihan baru (jatuh tempo /
   *  pertemuan ke-11 / progres berjalan) — satu sumber dengan Beranda. */
  const remindText = (sid: string) => {
    const s = db.students.find((x) => x.id === sid)!;
    return waIngatkanIuran(db, s, now);
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
          <span className="shrink-0 text-sm font-bold text-emerald-700">
            {lunasCount}/{db.students.length} lunas
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-sky-50/80 px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-900">
            <CalendarClock className="h-4 w-4 shrink-0 text-sky-600" />
            Tagihan berikutnya:
            <span className="text-sky-700">
              {dueSiswa.length
                ? `${dueSiswa.length} siswa jatuh tempo`
                : warningSiswa.length
                  ? `${warningSiswa.length} siswa di pertemuan ke-11`
                  : "belum ada"}
            </span>
          </span>
          {dueSiswa.length > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
              jatuh tempo · {dueSiswa.length} siswa
            </span>
          )}
          {warningSiswa.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              pertemuan ke-11 · {warningSiswa.length} siswa
            </span>
          )}
          {dueSiswa.length === 0 && warningSiswa.length === 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              semua iuran berjalan
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Iuran dibayar <b>di depan</b>: satu pembayaran mencakup 12 pertemuan, sesuai isian “Pertemuan / pembayaran” tiap siswa, dan kwitansinya langsung bisa dibuat begitu pembayaran tercatat. Tagihan berikutnya jatuh tempo <b>bulan berikutnya</b> atau <b>setelah 12 pertemuan selesai</b>, mana yang lebih dulu. Saat siswa mencapai <b>pertemuan ke-11</b>, muncul pengingat untuk pembayaran berikutnya. Ketuk kotak bulan untuk status <b>L</b> lunas atau <b>S</b> sebagian, atau tombol <b>Catat bayaran</b> untuk mengisi tanggal dan jumlah pembayaran lalu mengirim kwitansinya ke WA.
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
                const prog = siklusInfo.get(s.id)!;
                const tag = tagihanInfo.get(s.id)!;
                const pdThis = payDate(db, s.id, thisMk);
                const stThis = payStatus(db, s.id, thisMk);
                const effThis = payEffective(db, s, thisMk);
                return (
                <tr key={s.id} className="hover:bg-sky-50/40">
                  <td className="sticky left-0 z-10 max-w-[230px] bg-white px-4 py-2.5">
                    <p className="truncate font-bold text-slate-700">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.program} · {rp(s.fee)}</p>
                    <button
                      onClick={() => openQuick(s.id)}
                      title={`Catat tanggal & jumlah pembayaran, ${monthLabel(tag.bulanTagihan)}`}
                      className={cn(
                        "mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors",
                        stThis === "lunas"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : stThis === "sebagian"
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-dashed border-sky-300 text-sky-700 hover:bg-sky-50"
                      )}
                    >
                      <Wallet className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {stThis === "belum"
                          ? `Catat bayaran ${MONTHS_SHORT[now.getMonth()]}`
                          : stThis === "lunas" && tag.jatuhTempo
                            ? "Catat bayaran berikutnya"
                            : `${pdThis ? fmtDateShort(pdThis) : monthLabel(thisMk)} · ${rpShort(effThis)}`}
                      </span>
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-center">
                    <p className={cn("text-xs font-extrabold", tag.jatuhTempo ? "text-rose-600" : tag.peringatanPertemuan ? "text-amber-600" : "text-slate-700")}>
                      {Math.min(prog.hadir, prog.target)}/{prog.target} pertemuan
                    </p>
                    <p
                      className={cn(
                        "text-[10px] font-semibold",
                        tag.jatuhTempo ? "text-rose-500" : tag.peringatanPertemuan ? "text-amber-600" : "text-muted-foreground"
                      )}
                    >
                      {tag.jatuhTempo
                        ? tag.sebabJatuhTempo === "pertemuan"
                          ? `jatuh tempo · ${prog.target} pertemuan selesai`
                          : tag.bayarTerakhirMk === null
                            ? "jatuh tempo · belum bayar"
                            : "jatuh tempo · bulan berikutnya"
                        : tag.peringatanPertemuan
                          ? "pertemuan ke-11 · ingatkan bayar"
                          : stThis === "lunas"
                            ? "lunas"
                            : `kurang ${prog.target - prog.hadir} pertemuan`}
                    </p>
                  </td>
                  {MONTHS_SHORT.map((_, mi) => {
                    const mk = monthKey(year, mi);
                    const st = payStatus(db, s.id, mk);
                    const pd = payDate(db, s.id, mk);
                    const am = payAmount(db, s.id, mk);
                    const isNow = mk === thisMk;
                    return (
                      <td key={mk} className="px-1 py-2.5 text-center">
                        <button
                          onClick={() => setEditPay({ sid: s.id, mk })}
                          title={`${MONTHS[mi]} ${year}: ${LABEL[st]}${pd ? ` · dibayar ${fmtDate(pd)}` : ""}${am ? ` · ${rp(am)}` : ""}}`}
                          aria-label={`${MONTHS[mi]} ${year}: ${LABEL[st]}${pd ? `, dibayar ${fmtDate(pd)}` : ""}${am ? `, ${rp(am)}` : ""}`}
                          className={cn(
                            "relative mx-auto grid h-8 w-9 place-items-center rounded-lg text-xs font-extrabold transition-transform active:scale-90",
                            CELL[st],
                            isNow && "ring-2 ring-sky-400 ring-offset-1"
                          )}
                        >
                          {SHORT[st]}
                          {pd && st !== "belum" && (
                            <span
                              aria-hidden
                              className={cn(
                                "absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full",
                                st === "lunas" ? "bg-white/90" : "bg-white/90"
                              )}
                            />
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openKwit(s.id)}
                        title={`Kwitansi & kirim bukti WA, ${monthLabel(thisMk)}`}
                        className="inline-grid h-11 w-11 place-items-center rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100"
                      >
                        <Receipt className="h-4 w-4" />
                      </button>
                      <a
                        href={remindText(s.id)}
                        target="_blank"
                        rel="noreferrer"
                        title="Ingatkan via WhatsApp"
                        className="inline-grid h-11 w-11 place-items-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </div>
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
            {LABEL[st]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded ring-2 ring-sky-400" /> bulan berjalan
        </span>
      </div>

      {/* dialog: status, tanggal & jumlah pembayaran */}
      <Dialog open={!!editPay && !!editStudent} onOpenChange={(o) => !o && (setEditPay(null), setAmountDraft(null))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Iuran {editStudent?.name}</DialogTitle>
            <DialogDescription>
              {editMonthName} · tagihan {editStudent ? rp(editStudent.fee) : ""}
            </DialogDescription>
          </DialogHeader>

          {editPay?.quick && (
            <div className="grid gap-1.5">
              <Label>Bulan iuran</Label>
              <Select
                value={editPay.mk}
                onValueChange={(v) => {
                  setAmountDraft(null);
                  setEditPay({ ...editPay, mk: v });
                }}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_SHORT.map((_, mi) => {
                    const mk = monthKey(year, mi);
                    return (
                      <SelectItem key={mk} value={mk}>{monthLabel(mk)}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Status pembayaran</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["belum", "sebagian", "lunas"] as PayStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  aria-pressed={editSt === st}
                  className={cn(
                    "rounded-xl border-2 py-2 text-sm font-extrabold transition-all",
                    st === "lunas" && "text-emerald-700",
                    st === "sebagian" && "text-amber-700",
                    st === "belum" && "text-slate-600",
                    editSt === st
                      ? st === "lunas"
                        ? "border-emerald-400 bg-emerald-50"
                        : st === "sebagian"
                          ? "border-amber-400 bg-amber-50"
                          : "border-slate-400 bg-slate-50"
                      : "border-slate-200 hover:border-sky-200"
                  )}
                >
                  {LABEL[st]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pay-date">Tanggal pembayaran</Label>
            <Input
              id="pay-date"
              type="date"
              disabled={editSt === "belum"}
              value={editDate ?? ""}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pay-amount">Jumlah dibayar</Label>
            <div className="flex gap-2">
              <span className="grid h-9 shrink-0 place-items-center rounded-md border border-input bg-slate-50 px-2.5 text-sm font-bold text-slate-500">Rp</span>
              <Input
                id="pay-amount"
                type="text"
                inputMode="numeric"
                disabled={editSt === "belum"}
                value={amountDraft ?? (editAmount ? editAmount.toLocaleString("id-ID") : "")}
                onChange={(e) => setAmountDraft(e.target.value)}
                onBlur={(e) => commitAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitAmount((e.target as HTMLInputElement).value)}
                placeholder={editStudent ? String(editStudent.fee) : "0"}
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {editSt !== "belum" && editStudent && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => commitAmount(String(editStudent.fee))}
                  className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  Penuh · {rpShort(editStudent.fee)}
                </button>
                <button
                  type="button"
                  onClick={() => commitAmount(String(Math.round(editStudent.fee / 2)))}
                  className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                >
                  Setengah · {rpShort(Math.round(editStudent.fee / 2))}
                </button>
                {editAmount && editSt === "sebagian" && (
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    sisa {rp(Math.max(0, editStudent.fee - editAmount))}
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Isi jumlah untuk mencatat bayaran, status dan tanggal otomatis menyesuaikan
              (≥ {editStudent ? rpShort(editStudent.fee) : "…"} lunas, di bawahnya sebagian).
            </p>
          </div>

          <DialogFooter>
            {editSt !== "belum" && (
              <Button
                variant="outline"
                className="mr-auto border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  const { sid, mk } = editPay!;
                  setEditPay(null);
                  setAmountDraft(null);
                  openKwit(sid, mk);
                }}
              >
                <Receipt className="h-4 w-4" /> Kwitansi &amp; kirim WA
              </Button>
            )}
            <Button
              className="bg-sky-700 hover:bg-sky-800"
              onClick={() => {
                if (amountDraft !== null) commitAmount(amountDraft);
                setEditPay(null);
              }}
            >
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* dialog: kwitansi / bukti pembayaran */}
      <Dialog open={!!kwit && !!kwitSiswa} onOpenChange={(o) => !o && (setKuit(null), setEditTeksKwit(false))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kwitansi: {kwitSiswa?.name}</DialogTitle>
            <DialogDescription>
              {kwit && kwitSiswa ? `${monthLabel(kwit.mk)} · Bulan ke-${progresSiklus(db, kwitSiswa, kwit.mk).siklusKe} (${progresSiklus(db, kwitSiswa, kwit.mk).target} pertemuan) · unduh PNG lalu lampirkan di chat, atau kirim teksnya via WA.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="relative grid min-h-[220px] place-items-center overflow-hidden rounded-xl bg-slate-100 p-2">
            <div ref={kwitBoxRef} className="w-full" />
            {!kwitCanvas && <p className="absolute p-8 text-sm text-muted-foreground">Menyiapkan kwitansi…</p>}
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditTeksKwit((v) => !v)}>
                <Pencil className="h-4 w-4" /> {editTeksKwit ? "Tutup edit teks" : "Edit teks"}
              </Button>
              {editTeksKwit && (
                <Button variant="ghost" size="sm" onClick={resetKwitansi}>
                  Kembalikan bawaan
                </Button>
              )}
            </div>
            {editTeksKwit && (
              <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
                {KWITANSI_LABEL_FIELDS.map((f) => (
                  <div key={f.key} className="grid gap-1.5">
                    <Label>{f.label}</Label>
                    <Input
                      key={kwitTpl[f.key]}
                      defaultValue={kwitTpl[f.key]}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== kwitTpl[f.key]) setKwitansi({ [f.key]: v } as Partial<KwitansiTemplate>);
                      }}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Perubahan tersimpan sebagai template untuk semua kwitansi. Gambar diperbarui langsung. Desain tidak berubah, hanya teksnya.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={unduhKwit} disabled={!kwitCanvas} className="sm:mr-auto">
              <Download className="h-4 w-4" /> Unduh PNG
            </Button>
            <Button variant="ghost" onClick={() => void salinKwit()}>
              <Copy className="h-4 w-4" /> Salin teks
            </Button>
            {kwitSiswa && (
              <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
                <a href={kwitansiWaLink(db, kwitSiswa, kwit!.mk)} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Kirim WA
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
