"use client";

import { useRef, useState } from "react";
import { Database as DbIcon, Download, Info, LogOut, RefreshCcw, RotateCcw, Trash2, Upload } from "lucide-react";
import { useApp } from "@/lib/store";
import { normalizeDB, type TemplateLaporan } from "@/lib/types";
import { DEFAULT_KWITANSI_LABELS, downloadJSON } from "@/lib/constants";
import { SectionCard } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TEMPLATES: { id: TemplateLaporan; name: string; colors: string[] }[] = [
  { id: "ceria", name: "Ceria", colors: ["#f97316", "#22c55e", "#facc15"] },
  { id: "klasik", name: "Klasik", colors: ["#1e3a5f", "#d4a72c", "#e2e8f0"] },
  { id: "minimal", name: "Minimal", colors: ["#111827", "#f97316", "#e5e7eb"] },
];

export function PengaturanView() {
  const { db, mutate, replaceDB, authMode, email, sync, reloadFromDrive, saveNow, logout } = useApp();
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const p = db.pengaturan;

  const setProfil = (patch: Partial<typeof p>) => mutate((d) => Object.assign(d.pengaturan, patch));
  const setLaporan = (patch: Partial<typeof p.laporan>) => mutate((d) => Object.assign(d.pengaturan.laporan, patch));

  /* ---------- template kwitansi ---------- */
  const kw = p.kwitansi ?? { ...DEFAULT_KWITANSI_LABELS };
  const setKwitansi = (patch: Partial<typeof kw>) =>
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
    toast({ title: "Template kwitansi dikembalikan ke bawaan." });
  };
  const importJSON = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      if (!Array.isArray(raw.students) || !Array.isArray(raw.materials)) {
        throw new Error("format");
      }
      replaceDB(normalizeDB(raw));
      toast({ title: "Data berhasil diimpor & akan tersimpan otomatis." });
    } catch {
      toast({ title: "Berkas tidak valid — butuh JSON rumbela-database.", variant: "destructive" });
    }
  };

  const clearSamples = () => {
    mutate((d) => {
      const sampleIds = new Set(d.students.filter((s) => s.sample).map((s) => s.id));
      d.students = d.students.filter((s) => !s.sample);
      sampleIds.forEach((id) => {
        delete d.payments[id];
        delete d.payDates[id];
        delete d.payAmounts[id];
        Object.keys(d.reports).forEach((k) => k.startsWith(id + "@") && delete d.reports[k]);
        Object.keys(d.attendance).forEach((t) => delete d.attendance[t][id]);
        Object.values(d.journal).forEach((e) => e.siswa && delete e.siswa[id]);
      });
      d.materials = d.materials.filter((m) => !m.sample);
    });
    setConfirmClear(false);
    toast({ title: "Semua data contoh dihapus." });
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Profil lembaga" desc="Tampil di header, laporan gambar, dan pesan WhatsApp">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="st-nama">Nama lembaga</Label>
            <Input id="st-nama" defaultValue={p.namaLembaga} onBlur={(e) => e.target.value !== p.namaLembaga && setProfil({ namaLembaga: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="st-tag">Tagline</Label>
            <Input id="st-tag" defaultValue={p.tagline} onBlur={(e) => e.target.value !== p.tagline && setProfil({ tagline: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="st-alamat">Alamat</Label>
            <Input id="st-alamat" defaultValue={p.alamat} onBlur={(e) => e.target.value !== p.alamat && setProfil({ alamat: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="st-telp">Telepon / WA lembaga</Label>
            <Input id="st-telp" defaultValue={p.telepon} onBlur={(e) => e.target.value !== p.telepon && setProfil({ telepon: e.target.value })} placeholder="08xx…" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Template laporan" desc="Template & tanda tangan default untuk Laporan Perkembangan">
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setLaporan({ template: t.id })}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition-all",
                p.laporan.template === t.id ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-sky-200"
              )}
              aria-pressed={p.laporan.template === t.id}
            >
              <div className="flex gap-1">
                {t.colors.map((c) => <span key={c} className="h-4 w-4 rounded-full" style={{ backgroundColor: c }} />)}
              </div>
              <p className="mt-2 text-sm font-extrabold text-slate-700">{t.name}</p>
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="st-pesan">Pesan penutup untuk orang tua</Label>
            <Textarea id="st-pesan" rows={2} defaultValue={p.laporan.pesanPenutup} onBlur={(e) => e.target.value !== p.laporan.pesanPenutup && setLaporan({ pesanPenutup: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="st-ttd">Nama penanda tangan</Label>
              <Input id="st-ttd" defaultValue={p.laporan.ttdNama} onBlur={(e) => e.target.value !== p.laporan.ttdNama && setLaporan({ ttdNama: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-jab">Jabatan</Label>
              <Input id="st-jab" defaultValue={p.laporan.ttdJabatan} onBlur={(e) => e.target.value !== p.laporan.ttdJabatan && setLaporan({ ttdJabatan: e.target.value })} />
            </div>
          </div>
        </div>
      </SectionCard>


      <SectionCard title="Teks kwitansi" desc="Teks yang tampil di gambar kwitansi. Desain tidak berubah, hanya teksnya">
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="st-kw-judul">Judul kanvas</Label>
              <Input id="st-kw-judul" key={kw.judul} defaultValue={kw.judul} onBlur={(e) => e.target.value.trim() !== kw.judul && e.target.value.trim() !== "" && setKwitansi({ judul: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-kw-sub">Subjudul kanvas</Label>
              <Input id="st-kw-sub" key={kw.subjudul} defaultValue={kw.subjudul} onBlur={(e) => e.target.value.trim() !== kw.subjudul && e.target.value.trim() !== "" && setKwitansi({ subjudul: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-kw-dari">Label “Telah diterima dari”</Label>
              <Input id="st-kw-dari" key={kw.labelDari} defaultValue={kw.labelDari} onBlur={(e) => e.target.value.trim() !== kw.labelDari && e.target.value.trim() !== "" && setKwitansi({ labelDari: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-kw-untuk">Label “Untuk pembayaran”</Label>
              <Input id="st-kw-untuk" key={kw.labelUntuk} defaultValue={kw.labelUntuk} onBlur={(e) => e.target.value.trim() !== kw.labelUntuk && e.target.value.trim() !== "" && setKwitansi({ labelUntuk: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-kw-ucap">Ucapan terima kasih (footer)</Label>
              <Input id="st-kw-ucap" key={kw.ucapan} defaultValue={kw.ucapan} onBlur={(e) => e.target.value.trim() !== kw.ucapan && e.target.value.trim() !== "" && setKwitansi({ ucapan: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-kw-cat">Catatan kaki (footer)</Label>
              <Input id="st-kw-cat" key={kw.catatan} defaultValue={kw.catatan} onBlur={(e) => e.target.value.trim() !== kw.catatan && e.target.value.trim() !== "" && setKwitansi({ catatan: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-kw-hormat">Salam penutup (footer)</Label>
              <Input id="st-kw-hormat" key={kw.hormatKami} defaultValue={kw.hormatKami} onBlur={(e) => e.target.value.trim() !== kw.hormatKami && e.target.value.trim() !== "" && setKwitansi({ hormatKami: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-kw-no">Awalan nomor</Label>
              <Input id="st-kw-no" key={kw.labelNo} defaultValue={kw.labelNo} onBlur={(e) => e.target.value.trim() !== kw.labelNo && e.target.value.trim() !== "" && setKwitansi({ labelNo: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-kw-kota">Kota dan tanggal</Label>
              <Input id="st-kw-kota" key={kw.labelKota} defaultValue={kw.labelKota} onBlur={(e) => e.target.value.trim() !== kw.labelKota && e.target.value.trim() !== "" && setKwitansi({ labelKota: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-kw-terbilang">Label terbilang</Label>
              <Input id="st-kw-terbilang" key={kw.labelTerbilang} defaultValue={kw.labelTerbilang} onBlur={(e) => e.target.value.trim() !== kw.labelTerbilang && e.target.value.trim() !== "" && setKwitansi({ labelTerbilang: e.target.value })} />
            </div>
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={resetKwitansi}>
              <RotateCcw className="h-4 w-4" /> Kembalikan bawaan
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Akses admin" desc="Bila diisi, hanya email ini yang bisa masuk (khusus admin, tanpa akses orang tua)">
        <div className="grid gap-1.5 sm:max-w-sm">
          <Label htmlFor="st-admin">Email admin</Label>
          <Input
            id="st-admin"
            type="email"
            defaultValue={p.emailAdmin}
            placeholder="mis. rumbela@gmail.com"
            onBlur={(e) => e.target.value.trim() !== p.emailAdmin && setProfil({ emailAdmin: e.target.value.trim() })}
          />
          <p className="text-xs text-muted-foreground">Saat ini masuk sebagai: <b>{authMode === "demo" ? "Mode Demo" : email || "—"}</b></p>
        </div>
      </SectionCard>

      <SectionCard title="Data & cadangan" desc={`Tersimpan otomatis di Google Drive${sync.lastSavedAt ? " · terakhir " + new Date(sync.lastSavedAt).toLocaleTimeString("id-ID") : ""}`}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => downloadJSON(db, "rumbela-database.json")}>
            <Download className="h-4 w-4" /> Ekspor JSON (cadangan)
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Impor JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importJSON(f);
              e.target.value = "";
            }}
          />
          {authMode === "gdrive" && (
            <Button variant="outline" onClick={() => void reloadFromDrive()}>
              <RefreshCcw className="h-4 w-4" /> Muat ulang dari Drive
            </Button>
          )}
          {authMode === "gdrive" && (
            <Button variant="outline" onClick={() => void saveNow()}>
              <DbIcon className="h-4 w-4" /> Simpan sekarang
            </Button>
          )}
          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setConfirmClear(true)}>
            <Trash2 className="h-4 w-4" /> Hapus data contoh
          </Button>
        </div>
      </SectionCard>

      {authMode === "demo" && (
        <SectionCard title="Mode Demo" desc="Data demo hanya tersimpan di perangkat ini, tidak dikirim ke mana pun">
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4" /> Keluar dari Mode Demo
          </Button>
        </SectionCard>
      )}

      <SectionCard title="Tentang" desc="Rumbela v2.0">
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            Database: satu file <b>rumbela-database.json</b> di Google Drive pribadi (scope drive.file — aplikasi hanya dapat melihat file buatannya sendiri).
          </p>
          <p>Auto-save aktif dengan jeda 1,2 detik setiap perubahan; flush otomatis saat tab ditutup.</p>
          <p className="text-xs">© {new Date().getFullYear()} Rumbela — Rumah Belajar Anak, Curup.</p>
        </div>
      </SectionCard>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus semua data contoh?</AlertDialogTitle>
            <AlertDialogDescription>
              Siswa &amp; materi bertanda “contoh” akan dihapus beserta catatannya. Data asli Anda tidak tersentuh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={clearSamples}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
