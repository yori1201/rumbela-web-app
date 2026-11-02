"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileUp, Link2, Trash2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { PROGRAMS, uid } from "@/lib/constants";
import { uploadMaterialFile, driveViewUrl } from "@/lib/gdrive";
import { EmptyState, SectionCard } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { readSession } from "@/lib/gdrive";

const TYPE_BADGE: Record<string, string> = {
  Dokumen: "bg-orange-100 text-orange-700",
  Video: "bg-rose-100 text-rose-700",
  Tautan: "bg-sky-100 text-sky-700",
};

export function MateriView() {
  const { db, mutate, authMode } = useApp();
  const [fProgram, setFProgram] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; program: string; type: string; url: string; desc: string; fileId?: string }>({ title: "", program: PROGRAMS[0], type: "Dokumen", url: "", desc: "" });
  const [uploading, setUploading] = useState(false);

  const programs = useMemo(() => Array.from(new Set([...PROGRAMS, ...db.materials.map((m) => m.program)])), [db.materials, db.students]);
  const filtered = db.materials.filter((m) => fProgram === "all" || m.program === fProgram);

  const save = () => {
    if (!form.title.trim() || (!form.url.trim() && !form.fileId)) {
      toast({ title: "Judul dan tautan/berkas wajib ada.", variant: "destructive" });
      return;
    }
    mutate((d) => {
      d.materials.push({ ...form, id: uid() });
    });
    setOpen(false);
    setForm({ title: "", program: PROGRAMS[0], type: "Dokumen", url: "", desc: "" });
    toast({ title: "Materi ditambahkan." });
  };

  const uploadFile = async (file: File) => {
    const sess = readSession();
    if (!sess?.token) {
      toast({ title: "Unggah berkas hanya saat login Google.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const up = await uploadMaterialFile(sess.token, file);
      if (up) {
        setForm((f) => ({ ...f, url: driveViewUrl(up.id), fileId: up.id, title: f.title || up.name }));
        toast({ title: "Berkas terunggah ke folder Bank Materi di Drive." });
      }
    } catch {
      toast({ title: "Gagal mengunggah berkas.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const remove = (id: string) => {
    mutate((d) => {
      d.materials = d.materials.filter((m) => m.id !== id);
    });
    toast({ title: "Materi dihapus dari katalog." });
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Bank Materi (${filtered.length})`}
        desc="Kumpulan tautan & berkas belajar — bisa dibagikan ke orang tua"
        action={
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => setOpen(true)}>
            <Link2 className="h-4 w-4" /> Tambah materi
          </Button>
        }
      >
        <Select value={fProgram} onValueChange={setFProgram}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Semua program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua program</SelectItem>
            {programs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </SectionCard>

      {filtered.length === 0 ? (
        <EmptyState title="Belum ada materi">
          Tambahkan tautan video, dokumen Drive, atau unggah berkas langsung (saat login Google).
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <article key={m.id} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TYPE_BADGE[m.type] || "bg-slate-100 text-slate-600"}`}>
                  {m.type}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500" onClick={() => remove(m.id)} aria-label="Hapus materi">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="mt-1.5 font-extrabold leading-snug text-slate-800">{m.title}</h3>
              {m.desc && <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{m.desc}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{m.program}</span>
                <a href={m.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline">
                  Buka <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Materi</DialogTitle>
            <DialogDescription>Simpan tautan, atau unggah berkas ke folder “Rumbela — Bank Materi” di Drive.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="fm-title">Judul *</Label>
              <Input id="fm-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="cth. Latihan Membaca Suku Kata" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Program</Label>
                <Select value={form.program} onValueChange={(v) => setForm({ ...form, program: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Jenis</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Dokumen", "Video", "Tautan"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fm-url">Tautan</Label>
              <Input id="fm-url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
            </div>
            <div className="grid gap-1.5">
              <Label>atau unggah berkas {authMode === "gdrive" ? "" : "(login Google dulu)"}</Label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-500 hover:border-orange-300 hover:text-orange-600">
                <FileUp className="h-4 w-4" />
                {uploading ? "Mengunggah…" : "Pilih berkas dari perangkat"}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading || authMode !== "gdrive"}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fm-desc">Deskripsi singkat</Label>
              <Textarea id="fm-desc" rows={2} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={save} disabled={uploading}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
