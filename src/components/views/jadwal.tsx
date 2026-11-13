"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check, Clock, Plus, Trash2, Users } from "lucide-react";
import { useApp } from "@/lib/store";
import { kelasList, namaSiswaOfItem } from "@/lib/laporan";
import { HARI, PROGRAMS, uid, WARNA_JADWAL } from "@/lib/constants";
import type { JadwalItem, Siswa } from "@/lib/types";
import { EmptyState, SectionCard } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CellRef {
  kelas: string;
  hari: string;
  slot: number;
  item?: JadwalItem;
}

/** Label peserta untuk sel jadwal: nama bila ≤2 siswa, selain itu "N siswa". */
function labelSiswa(db: ReturnType<typeof useApp>["db"], it: JadwalItem): string {
  const nama = namaSiswaOfItem(db, it);
  if (!nama.length) return "Tanpa siswa";
  return nama.length <= 2 ? nama.join(", ") : `${nama.length} siswa: ${nama.slice(0, 2).join(", ")}…`;
}

export function JadwalView() {
  const { db, mutate } = useApp();
  const kelas = useMemo(() => kelasList(db), [db]);
  const [activeKelas, setActiveKelas] = useState("");
  const [hariMobile, setHariMobile] = useState(HARI[0]);
  const [cell, setCell] = useState<CellRef | null>(null);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [newKelas, setNewKelas] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const k = activeKelas || kelas[0] || "";
  const slots = db.jadwal.slots;
  const programs = Array.from(new Set([...PROGRAMS, ...db.students.map((s) => s.program)]));
  const studentsSorted = useMemo(
    () => [...db.students].sort((a, b) => a.name.localeCompare(b.name)),
    [db.students]
  );
  const items = db.jadwal.items.filter((i) => i.kelas === k);
  const itemAt = (hari: string, slot: number) => items.find((i) => i.hari === hari && i.slot === slot);

  const openCell = (hari: string, slot: number) => setCell({ kelas: k, hari, slot, item: itemAt(hari, slot) });

  const saveItem = (program: string, pengajar: string, warna: string, siswaIds: string[]) => {
    if (!cell) return;
    mutate((d) => {
      d.jadwal.items = d.jadwal.items.filter(
        (i) => !(i.kelas === cell.kelas && i.hari === cell.hari && i.slot === cell.slot)
      );
      d.jadwal.items.push({ id: uid(), kelas: cell.kelas, hari: cell.hari, slot: cell.slot, program, pengajar, warna, siswaIds });
    });
    setCell(null);
  };

  const removeItem = () => {
    if (!cell) return;
    mutate((d) => {
      d.jadwal.items = d.jadwal.items.filter((i) => i.id !== cell.item?.id);
    });
    setCell(null);
  };

  const addKelas = () => {
    const name = newKelas.trim();
    if (!name) return;
    mutate((d) => {
      if (!d.jadwal.kelas.includes(name)) d.jadwal.kelas.push(name);
    });
    setActiveKelas(name);
    setNewKelas("");
    setAddOpen(false);
  };

  const removeKelas = (name: string) => {
    mutate((d) => {
      d.jadwal.kelas = d.jadwal.kelas.filter((x) => x !== name);
      d.jadwal.items = d.jadwal.items.filter((i) => i.kelas !== name);
    });
    if (activeKelas === name) setActiveKelas("");
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Jadwal mingguan"
        desc="Ketuk kotak untuk mengisi/mengubah jadwal"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSlotsOpen(true)}>
              <Clock className="h-4 w-4" /> Jam pelajaran
            </Button>
            <Button size="sm" variant="outline" className="border-sky-200 text-sky-700" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Kelas
            </Button>
          </div>
        }
      >
        {kelas.length === 0 ? (
          <EmptyState title="Belum ada kelas">
            Tambahkan kelas (mis. <b>Grup A</b>) atau isi kolom “Kelas / grup” pada data siswa.
          </EmptyState>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {kelas.map((name) => (
                <span key={name} className="relative">
                  <button
                    onClick={() => setActiveKelas(name)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
                      k === name ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-700"
                    )}
                    aria-pressed={k === name}
                  >
                    {name}
                  </button>
                  <button
                    onClick={() => removeKelas(name)}
                    className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-slate-500 text-[9px] text-white hover:bg-red-500"
                    aria-label={`Hapus kelas ${name}`}
                    title="Hapus kelas"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Desktop: grid lengkap */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-separate border-spacing-1.5">
                <thead>
                  <tr>
                    <th className="w-24" />
                    {slots.map((s, i) => (
                      <th key={i} className="pb-1 text-xs font-bold text-slate-500">
                        Slot {i + 1}
                        <span className="block font-semibold text-slate-500">{s.mulai}–{s.selesai}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HARI.map((h) => (
                    <tr key={h}>
                      <th className="pr-2 text-right text-sm font-extrabold text-slate-600">{h}</th>
                      {slots.map((_, si) => {
                        const it = itemAt(h, si);
                        return (
                          <td key={si}>
                            <button
                              onClick={() => openCell(h, si)}
                              className={cn(
                                "grid h-16 w-full place-items-center rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-95",
                                it ? "border-transparent text-white shadow-sm" : "border-dashed border-slate-200 bg-slate-50/60 text-slate-400 hover:border-sky-300 hover:text-sky-300"
                              )}
                              style={it ? { backgroundColor: it.warna } : undefined}
                              aria-label={`${h} slot ${si + 1}: ${it ? it.program : "kosong"}`}
                            >
                              {it ? (
                                <span className="px-2 text-center leading-tight">
                                  <span className="block truncate text-xs font-extrabold">{it.program}</span>
                                  <span className="block truncate text-[11px]">{it.pengajar || ""}</span>
                                  <span className="block truncate text-[10px]">{labelSiswa(db, it)}</span>
                                </span>
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: per hari */}
            <div className="md:hidden">
              <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
                {HARI.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHariMobile(h)}
                    className={cn(
                      "min-h-[44px] shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold",
                      hariMobile === h ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600"
                    )}
                    aria-pressed={hariMobile === h}
                  >
                    {h}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {slots.map((s, si) => {
                  const it = itemAt(hariMobile, si);
                  return (
                    <button
                      key={si}
                      onClick={() => openCell(hariMobile, si)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left",
                        it ? "border-transparent text-white" : "border-dashed border-slate-200 bg-slate-50/60"
                      )}
                      style={it ? { backgroundColor: it.warna } : undefined}
                    >
                      <span className={cn("shrink-0 rounded-lg px-2 py-1 text-xs font-extrabold", it ? "bg-white/25" : "bg-slate-200 text-slate-500")}>
                        {s.mulai}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-sm font-extrabold", !it && "text-slate-500")}>
                          {it ? it.program : "Kosong, ketuk untuk isi"}
                        </span>
                        {it && <span className="block truncate text-xs">{it.pengajar || ""} · s/d {s.selesai}</span>}
                        {it && <span className="block truncate text-[11px]">{labelSiswa(db, it)}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* Dialog isi sel */}
      <Dialog open={!!cell} onOpenChange={(o) => !o && setCell(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-sky-600" />
              {cell?.hari} · Slot {(cell?.slot ?? 0) + 1} ({cell ? slots[cell.slot]?.mulai : ""}–{cell ? slots[cell.slot]?.selesai : ""})
            </DialogTitle>
            <DialogDescription>Kelas {cell?.kelas}</DialogDescription>
          </DialogHeader>
          <CellForm
            key={`${cell?.hari}-${cell?.slot}-${cell?.item?.id ?? "new"}`}
            initial={cell?.item}
            programs={programs}
            students={studentsSorted}
            kelasName={cell?.kelas ?? ""}
            onSave={saveItem}
            onDelete={cell?.item ? removeItem : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog jam pelajaran */}
      {slotsOpen && <SlotsEditor onOpenChange={setSlotsOpen} />}

      {/* Dialog kelas baru */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Tambah kelas</DialogTitle>
            <DialogDescription>cth. Grup C, Kelas 3 SD, Privat Anak…</DialogDescription>
          </DialogHeader>
          <Input value={newKelas} onChange={(e) => setNewKelas(e.target.value)} placeholder="Nama kelas" onKeyDown={(e) => e.key === "Enter" && addKelas()} />
          <DialogFooter>
            <Button className="w-full bg-sky-700 hover:bg-sky-800" onClick={addKelas} disabled={!newKelas.trim()}>
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CellForm({
  initial, programs, students, kelasName, onSave, onDelete,
}: {
  initial?: JadwalItem;
  programs: string[];
  students: Siswa[];
  kelasName: string;
  onSave: (program: string, pengajar: string, warna: string, siswaIds: string[]) => void;
  onDelete?: () => void;
}) {
  const [program, setProgram] = useState(initial?.program || "");
  const [pengajar, setPengajar] = useState(initial?.pengajar || "");
  const [warna, setWarna] = useState(initial?.warna || WARNA_JADWAL[0]);
  // siswa peserta: bila item lama tak punya daftar → anggap seluruh siswa kelas ini
  const [dipilih, setDipilih] = useState<Set<string>>(
    () => new Set(initial?.siswaIds ?? students.filter((s) => s.group === kelasName).map((s) => s.id))
  );

  const toggle = (id: string) =>
    setDipilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pilihSiswaKelas = () => setDipilih(new Set(students.filter((s) => s.group === kelasName).map((s) => s.id)));
  const bersihkan = () => setDipilih(new Set());

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label>Program / kegiatan</Label>
        <Input list="program-list" value={program} onChange={(e) => setProgram(e.target.value)} placeholder="cth. Calistung Ceria" />
        <datalist id="program-list">
          {programs.map((p) => <option key={p} value={p} />)}
        </datalist>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="jd-pengajar">Pengajar</Label>
        <Input id="jd-pengajar" value={pengajar} onChange={(e) => setPengajar(e.target.value)} placeholder="cth. Bu Maya" />
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="shrink-0">
            <Users className="mr-1 inline h-3.5 w-3.5 text-sky-600" />
            Siswa yang les ({dipilih.size})
          </Label>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={pilihSiswaKelas}>
              Siswa kelas ini
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={bersihkan}>
              Bersihkan
            </Button>
          </div>
        </div>
        <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2" aria-label="Daftar siswa peserta slot">
          {students.length === 0 && <p className="p-2 text-xs text-muted-foreground">Belum ada siswa, tambahkan di menu Siswa.</p>}
          {students.map((s) => {
            const on = dipilih.has(s.id);
            const bedaKelas = s.group && s.group !== kelasName;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                aria-pressed={on}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                  on ? "bg-sky-50 text-sky-900" : "hover:bg-slate-50 text-slate-600"
                )}
              >
                <span
                  className={cn(
                    "grid h-4.5 w-4.5 shrink-0 place-items-center rounded border",
                    on ? "border-sky-700 bg-sky-700 text-white" : "border-slate-300 bg-white"
                  )}
                  style={{ width: 18, height: 18 }}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
                {bedaKelas && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{s.group}</span>}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">Kosongkan semua bila slot ini belum ada pesertanya.</p>
      </div>
      <div className="grid gap-1.5">
        <Label>Warna</Label>
        <div className="flex flex-wrap gap-2">
          {WARNA_JADWAL.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setWarna(c)}
              className={cn("h-11 w-11 rounded-full transition-transform", warna === c ? "scale-110 ring-2 ring-slate-700 ring-offset-2" : "hover:scale-105")}
              style={{ backgroundColor: c }}
              aria-label={`Warna ${c}`}
              aria-pressed={warna === c}
            />
          ))}
        </div>
      </div>
      <DialogFooter className="flex-row justify-between gap-2">
        {onDelete ? (
          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Kosongkan
          </Button>
        ) : <span />}
        <Button className="bg-sky-700 hover:bg-sky-800" onClick={() => program.trim() && onSave(program.trim(), pengajar.trim(), warna, Array.from(dipilih))} disabled={!program.trim()}>
          Simpan
        </Button>
      </DialogFooter>
    </div>
  );
}

function SlotsEditor({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const { db, mutate } = useApp();
  const [draft, setDraft] = useState<{ mulai: string; selesai: string }[]>(() =>
    db.jadwal.slots.map((s) => ({ ...s }))
  );

  const apply = () => {
    const cleaned = draft.filter((s) => s.mulai && s.selesai);
    if (!cleaned.length) return;
    mutate((d) => {
      d.jadwal.slots = cleaned.map((s) => ({
        mulai: s.mulai,
        selesai: s.selesai,
      }));
      d.jadwal.items = d.jadwal.items.filter((i) => i.slot < cleaned.length);
    });
    onOpenChange(false);
  };

  /** slot baru: lanjut 1 jam setelah slot terakhir (cth. …–15:00 → 15:00–16:00) */
  const slotBerikutnya = () => {
    const terakhir = draft[draft.length - 1];
    const mulai = terakhir?.selesai || "09:00";
    const [h, mnt] = mulai.split(":").map(Number);
    const selesai = `${String(Math.min(23, (h || 8) + 1)).padStart(2, "0")}:${String(mnt || 0).padStart(2, "0")}`;
    return { mulai, selesai };
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Atur jam pelajaran</DialogTitle>
          <DialogDescription>Slot dipakai per 1 jam (cth. 09:00–10:00) · maksimal 12 slot. Jadwal di slot yang dihapus akan dikosongkan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {draft.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-center text-xs font-bold text-slate-500">Slot {i + 1}</span>
              <Input type="time" value={s.mulai} onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, mulai: e.target.value } : x)))} />
              <span className="text-slate-500">–</span>
              <Input type="time" value={s.selesai} onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, selesai: e.target.value } : x)))} />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-slate-500 hover:text-red-500"
                onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                aria-label="Hapus slot"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {draft.length < 12 && (
            <Button variant="outline" className="w-full" onClick={() => setDraft([...draft, slotBerikutnya()])}>
              <Plus className="h-4 w-4" /> Tambah slot 1 jam
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button className="w-full bg-sky-700 hover:bg-sky-800" onClick={apply}>Terapkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
