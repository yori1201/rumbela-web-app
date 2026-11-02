"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AppProvider, useApp } from "@/lib/store";
import { AppShell, NAV, type ViewId } from "@/components/app-shell";
import { AuthGate, BlockedScreen } from "@/components/auth-gate";
import { BerandaView } from "@/components/views/beranda";
import { SiswaView } from "@/components/views/siswa";
import { IuranView } from "@/components/views/iuran";
import { AbsensiView } from "@/components/views/absensi";
import { JurnalView } from "@/components/views/jurnal";
import { LaporanView } from "@/components/views/laporan";
import { JadwalView } from "@/components/views/jadwal";
import { MateriView } from "@/components/views/materi";
import { PengaturanView } from "@/components/views/pengaturan";

const VALID: ViewId[] = NAV.map((n) => n.id);

function Inner() {
  const { authMode, bootDone, blocked } = useApp();
  const [view, setViewState] = useState<ViewId>("beranda");

  // sinkron dengan hash URL agar refresh/back tetap di menu yang sama
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace("#", "") as ViewId;
      if (VALID.includes(h)) setViewState(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const setView = (v: ViewId) => {
    setViewState(v);
    window.history.replaceState(null, "", `#${v}`);
    window.scrollTo({ top: 0 });
  };

  if (!bootDone) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fdf8f3]">
        <div className="animate-pulse text-center">
          <Image src="/logo.webp" alt="Rumbela" width={96} height={96} className="mx-auto" priority />
          <p className="mt-2 text-sm font-bold text-orange-500">Memuat Rumbela…</p>
        </div>
      </div>
    );
  }
  if (blocked) return <BlockedScreen />;
  if (!authMode) return <AuthGate />;

  return (
    <AppShell view={view} setView={setView}>
      {view === "beranda" && <BerandaView setView={setView} />}
      {view === "siswa" && <SiswaView />}
      {view === "iuran" && <IuranView />}
      {view === "absensi" && <AbsensiView />}
      {view === "jurnal" && <JurnalView />}
      {view === "laporan" && <LaporanView />}
      {view === "jadwal" && <JadwalView />}
      {view === "materi" && <MateriView />}
      {view === "pengaturan" && <PengaturanView />}
    </AppShell>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  );
}
