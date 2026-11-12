"use client";

import { useMemo, useState } from "react";
import { MoreVertical, Pencil, Phone, Search, Trash2, UserPlus } from "lucide-react";
import { useApp } from "@/lib/store";
import { uid, LEVELS, PROGRAMS, rp, waLink } from "@/lib/constants";
import type { Siswa } from "@/lib/types";
import { EmptyState, SectionCard } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

/** Iuran terkunci Rumbela (12 Nov 2026): grup Rp150.000/bulan, privat Rp250.000/bulan. */
export const FEE_GRUP = 150000;
export const FEE_PRIVAT = 250000;
export const feeForProgram = (program: string): number =>
  program === "Privat" ? FEE_PRIVAT : FEE_GRUP;

export function SiswaView() {
  const { db, mutate } = useApp();
  const [q, setQ] = useState("");
  const [fProgram, setFProgram] = useState("all");
  const [editing, setEditing] = useState<Siswa | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Siswa | null>(null);
  const [form, setForm] = useState<{ name: string; level: string; grade: string; program: string; parent: string; wa: string; start: string; group: string; fee: number; meet: number }>({ name: "", level: "SD", grade: "", program: PROGRAMS[0], parent: "", wa: "", start: "", group: "", fee: FEE_GRUP, meet: 12 });

  const groups = useMemo(() => Array.from(new Set(db.students.map((s) => s.group).filter(Boolean))), [db.students]);
  const programs = useMemo(() => Array.from(new Set([...PROGRAMS, ...db.students.map((s) => s.program)])), [db.students]);

  const filtered = db.students.filter(
    (s) =>
      (!q || s.name.toLowerCase().includes(q.toLowerCase()) || s.parent.toLowerCase().includes(q.toLowerCase())) &&
      (fProgram === "all" || s.program === fProgram)
  );

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", level: "SD", grade: "", program: PROGRAMS[0], parent: "", wa: "", start: new Date().toISOString().slice(0, 10), group: groups[0] || "Grup A", fee: feeForProgram(PROGRAMS[0]), meet: 12 });
    setOpen(true);
  };

  const openEdit = (s: Siswa) => {
    setEditing(s);
    setForm({ name: s.name, level: s.level, grade: s.grade, program: s.program, parent: s.parent, wa: s.wa, start: s.start, group: s.group, fee: s.fee, meet: s.meet });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim() || !form.parent.trim() || !form.wa.trim()) {
      toast({ title: "Nama anak, orang tua, dan nomor WA wajib diisi.", variant: "destructive" });
      return;
    }
    mutate((d) => {
      if (editing) {
        const t = d.students.find((x) => x.id === editing.id);
        if (t) Object.assign(t, form);
      } else {
        d.students.push({ ...form, id: uid() });
      }
      if (form.group && !d.jadwal.kelas.includes(form.group)) d.jadwal.kelas.push(form.group);
    });
    setOpen(false);
    toast({ title: editing ? "Data siswa diperbarui." : "Siswa ditambahkan." });
  };

  const doDelete = (s: Siswa) => {
    mutate((d) => {
      d.students = d.students.filter((x) => x.id !== s.id);
      delete d.payments[s.id];
      delete d.payDates[s.id];
      delete d.payAmounts[s.id];
      delete d.reports[`${s.id}@`];
      Object.keys(d.reports).forEach((k) => k.startsWith(s.id + "@") && delete d.reports[k]);
      Object.keys(d.attendance).forEach((t) => delete d.attendance[t][s.id]);
      Object.values(d.journal).forEach((e) => e.siswa && delete e.siswa[s.id]);
    });
    setDel(null);
    toast({ title: "Siswa dihapus beserta catatannya." });
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Daftar siswa (${filtered.length})`}
        desc="Semua data tersimpan otomatis"
        action={
          <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={openNew}>
            <UserPlus className="h-4 w-4" /> Tambah siswa
          </Button>
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama anak / orang tua…" className="pl-9" />
          </div>
          <Select value={fProgram} onValueChange={setFProgram}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Semua program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua program</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {filtered.length === 0 ? (
        <EmptyState title="Belum ada siswa">
          Tekan <b>Tambah siswa</b> untuk memulai — nama, orang tua, nomor WA, program, dan iuran bulanan.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <article key={s.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-extrabold text-slate-800">{s.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800">{s.program}</span>
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                      {s.level}{s.grade ? ` · kls ${s.grade}` : ""}
                    </span>
                    {s.group && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{s.group}</span>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Menu siswa">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" /> Ubah
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDel(s)}>
                      <Trash2 className="h-4 w-4" /> Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted-foreground">Orang tua</dt>
                  <dd className="truncate font-semibold text-slate-700">{s.parent}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted-foreground">Iuran</dt>
                  <dd className="font-semibold text-slate-700">{rp(s.fee)}/bulan · {s.meet}x pertemuan</dd>
                </div>
              </dl>
              <a
                href={waLink(s.wa, `Assalamu'alaikum Bapak/Ibu ${s.parent}, kami dari *${db.pengaturan.namaLembaga}*.`)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
              >
                <Phone className="h-3.5 w-3.5" /> Hubungi via WhatsApp
              </a>
            </article>
          ))}
        </div>
      )}

      {/* Form siswa */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Siswa" : "Tambah Siswa"}</DialogTitle>
            <DialogDescription>Data tersimpan otomatis ke Google Drive setelah disimpan.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="fs-name">Nama anak *</Label>
              <Input id="fs-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth. Aisyah Ramadhani" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Jenjang</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fs-grade">Kelas di sekolah</Label>
                <Input id="fs-grade" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="cth. 2" inputMode="numeric" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Program</Label>
              <Select value={form.program} onValueChange={(v) => setForm({ ...form, program: v, fee: feeForProgram(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {programs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="fs-parent">Orang tua / wali *</Label>
                <Input id="fs-parent" value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })} placeholder="cth. Ibu Ratna" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fs-wa">Nomor WA *</Label>
                <Input id="fs-wa" value={form.wa} onChange={(e) => setForm({ ...form, wa: e.target.value })} placeholder="08xx…" inputMode="tel" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="fs-start">Tanggal masuk</Label>
                <Input id="fs-start" type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fs-group">Kelas / grup</Label>
                <Input id="fs-group" list="group-suggestions" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} placeholder="cth. Grup A" />
                <datalist id="group-suggestions">
                  {groups.map((g) => <option key={g} value={g} />)}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="fs-fee">Iuran / bulan (Rp)</Label>
                <Input id="fs-fee" type="number" min={0} step={10000} value={form.fee} onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fs-meet">Pertemuan / bulan</Label>
                <Input id="fs-meet" type="number" min={1} max={31} value={form.meet} onChange={(e) => setForm({ ...form, meet: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={save}>
              {editing ? "Simpan perubahan" : "Tambah siswa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus siswa?</AlertDialogTitle>
            <AlertDialogDescription>
              Data “{del?.name}” beserta catatan iuran, absensi, dan laporannya akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => del && doDelete(del)}>
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
