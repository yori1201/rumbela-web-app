"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Home, Users, Wallet, CalendarCheck2, NotebookPen, ClipboardList,
  CalendarDays, BookOpen, FileQuestion, Settings, MoreHorizontal, CheckCircle2,
  Loader2, CloudAlert, RotateCcw, LogOut, Save, ChevronDown, PlayCircle,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { LucideIcon } from "lucide-react";

export type ViewId =
  | "beranda" | "siswa" | "iuran" | "absensi" | "jurnal"
  | "laporan" | "jadwal" | "materi" | "soal" | "pengaturan";

export const NAV: { id: ViewId; label: string; icon: LucideIcon; desc: string }[] = [
  { id: "beranda", label: "Beranda", icon: Home, desc: "Ringkasan hari ini" },
  { id: "siswa", label: "Siswa", icon: Users, desc: "Data & profil siswa" },
  { id: "iuran", label: "Iuran", icon: Wallet, desc: "Pembayaran bulanan" },
  { id: "absensi", label: "Absensi", icon: CalendarCheck2, desc: "Kehadiran harian" },
  { id: "jurnal", label: "Jurnal", icon: NotebookPen, desc: "Catatan kegiatan" },
  { id: "laporan", label: "Laporan", icon: ClipboardList, desc: "Laporan gambar utk orang tua" },
  { id: "jadwal", label: "Jadwal", icon: CalendarDays, desc: "Jadwal kelas mingguan" },
  { id: "materi", label: "Materi", icon: BookOpen, desc: "Bank materi belajar" },
  { id: "soal", label: "Generator Soal", icon: FileQuestion, desc: "Worksheet & kunci jawaban" },
  { id: "pengaturan", label: "Pengaturan", icon: Settings, desc: "Profil, data, demo" },
];

const BOTTOM_MAIN: ViewId[] = ["beranda", "siswa", "absensi", "iuran"];

function SyncChip() {
  const { sync, authMode, saveNow, reconnect, connecting } = useApp();
  const [busy, setBusy] = useState(false);
  if (authMode === "demo") {
    return (
      <Badge variant="outline" className="gap-1.5 border-violet-300 bg-violet-50 text-violet-700">
        <PlayCircle className="h-3.5 w-3.5" /> Mode Demo
      </Badge>
    );
  }
  const onRetry = async () => {
    setBusy(true);
    try {
      if (sync.status === "renew") await reconnect();
      else await saveNow();
    } finally {
      setBusy(false);
    }
  };
  if (sync.status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
        <span className="hidden sm:inline">Menyimpan…</span>
      </span>
    );
  }
  if (sync.status === "renew") {
    return (
      <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" onClick={onRetry} disabled={busy || connecting}>
        <RotateCcw className="h-3.5 w-3.5" /> Sambung ulang
      </Button>
    );
  }
  if (sync.status === "error") {
    return (
      <Button size="sm" variant="outline" className="gap-1.5 border-red-300 bg-red-50 text-red-700 hover:bg-red-100" onClick={onRetry} disabled={busy}>
        <CloudAlert className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Gagal — coba lagi</span>
      </Button>
    );
  }
  if (sync.status === "saved") {
    const t = sync.lastSavedAt
      ? new Date(sync.lastSavedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      : "";
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        <span className="hidden md:inline">{t ? `Tersimpan ${t}` : "Tersimpan"}</span>
        <span className="md:hidden">✓</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-slate-300" />
      <span className="hidden sm:inline">Siap</span>
    </span>
  );
}

function AccountMenu() {
  const { email, authMode, logout, saveNow } = useApp();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
            {(authMode === "demo" ? "D" : email?.[0] || "A").toUpperCase()}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          {authMode === "demo" ? "Mode Demo" : email || "Admin"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {authMode === "gdrive" && (
          <DropdownMenuItem onClick={() => void saveNow()}>
            <Save className="h-4 w-4" /> Simpan sekarang
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={logout} variant="destructive">
          <LogOut className="h-4 w-4" /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ view, setView, children }: { view: ViewId; setView: (v: ViewId) => void; children: React.ReactNode }) {
  const { db, sync, authMode, reconnect } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = NAV.find((n) => n.id === view);
  const restNav = NAV.filter((n) => !BOTTOM_MAIN.includes(n.id));

  return (
    <div className="min-h-screen bg-[#fdf8f3]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-orange-100/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Image src="/logo-round.webp" alt="Logo Rumbela" width={40} height={40} className="rounded-full" priority />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-extrabold text-orange-600">{db.pengaturan.namaLembaga}</p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{db.pengaturan.tagline}</p>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <SyncChip />
            <AccountMenu />
          </div>
        </div>
      </header>

      {authMode === "cache" && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 text-sm text-amber-900">
            <CloudAlert className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{sync.message || "Sesi Google berakhir."}</span>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => void reconnect()}>
              Sambung ulang
            </Button>
          </div>
        </div>
      )}
      {sync.loadError && (
        <div className="border-b border-red-200 bg-red-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 text-sm text-red-800">
            <CloudAlert className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{sync.loadError}</span>
            <Button size="sm" variant="outline" className="border-red-300" onClick={() => window.location.reload()}>
              Coba muat lagi
            </Button>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl">
        {/* Sidebar desktop */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r border-orange-100/60 py-4 lg:flex">
          <nav className="flex-1 space-y-1 px-3" aria-label="Navigasi utama">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  view === n.id
                    ? "bg-orange-100 text-orange-700"
                    : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                }`}
                aria-current={view === n.id ? "page" : undefined}
              >
                <n.icon className="h-[18px] w-[18px]" />
                {n.label}
              </button>
            ))}
          </nav>
          <p className="px-5 text-xs text-muted-foreground">Rumbela v2.0 · data di Google Drive pribadi</p>
        </aside>

        {/* Konten */}
        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10">
          <div className="mb-5">
            <h1 className="text-2xl font-extrabold text-slate-800">{active?.label}</h1>
            <p className="text-sm text-muted-foreground">{active?.desc}</p>
          </div>
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Navigasi bawah"
      >
        <div className="grid grid-cols-5">
          {BOTTOM_MAIN.map((id) => {
            const n = NAV.find((x) => x.id === id)!;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                  view === id ? "text-orange-600" : "text-slate-500"
                }`}
                aria-current={view === id ? "page" : undefined}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </button>
            );
          })}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                  restNav.some((n) => n.id === view) ? "text-orange-600" : "text-slate-500"
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
                Lainnya
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Menu lainnya</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-2 px-4 pb-8">
                {restNav.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setView(n.id);
                      setSheetOpen(false);
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold ${
                      view === n.id ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <n.icon className="h-5 w-5" />
                    {n.label}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
