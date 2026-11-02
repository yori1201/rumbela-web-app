"use client";

import Image from "next/image";
import { Loader2, PlayCircle, ShieldAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function AuthGate() {
  const { loginGoogle, loginDemo, connecting, sync } = useApp();
  // Domain yang sudah terdaftar di Authorized JavaScript origins Google Cloud.
  // Tambahkan domain custom di sini DAN di Google Cloud Console → Credentials.
  const KNOWN_HOSTS =
    /rumbela\.netlify\.app$|\.vercel\.app$|^localhost$|^127\.0\.0\.1$/i;
  const nonProd =
    typeof window !== "undefined" && !KNOWN_HOSTS.test(window.location.hostname);

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-sky-50 via-[#f0f9f4] to-emerald-50 px-4">
      <div className="w-full max-w-sm text-center">
        <Image
          src="/logo.webp"
          alt="Rumbela — Rumah Belajar Anak"
          width={210}
          height={193}
          className="mx-auto h-auto w-[210px] drop-shadow-sm"
          priority
        />
        <p className="mt-1 text-sm font-bold tracking-wide text-sky-600">
          Rumah Belajar Anak · Curup
        </p>
        <p className="mt-4 text-sm leading-relaxed text-slate-500">
          Aplikasi admin bimbel. Login dengan akun Google pemilik Rumbela — seluruh data
          tersimpan otomatis sebagai satu file di Google Drive Anda.
        </p>

        <div className="mt-6 space-y-2.5">
          <Button
            size="lg"
            className="w-full gap-2 rounded-xl bg-sky-600 text-base font-bold hover:bg-sky-700"
            onClick={() => void loginGoogle()}
            disabled={connecting}
          >
            {connecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
            {connecting ? "Menghubungkan…" : "Masuk dengan Google"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full gap-2 rounded-xl border-slate-300 text-base font-semibold"
            onClick={loginDemo}
          >
            <PlayCircle className="h-5 w-5 text-violet-500" />
            Coba Mode Demo
          </Button>
        </div>

        {(sync.message || sync.loadError) && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-left text-xs leading-relaxed text-red-700">
            {sync.loadError || sync.message}
          </p>
        )}

        {nonProd && (
          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            Catatan: login Google hanya aktif di domain yang terdaftar di Google
            Cloud (mis. rumbela.netlify.app atau alamat Vercel Anda). Untuk
            melihat-lihat aplikasi ini, gunakan <b>Mode Demo</b>.
          </p>
        )}

        <ul className="mt-6 space-y-1.5 text-xs text-slate-400">
          <li>✓ Login cukup sekali — sesi tersimpan di perangkat</li>
          <li>✓ Auto-save setiap perubahan ke Google Drive</li>
          <li>✓ Laporan perkembangan siswa siap kirim ke orang tua</li>
        </ul>
      </div>
    </div>
  );
}

export function BlockedScreen() {
  const { logout } = useApp();
  return (
    <div className="grid min-h-screen place-items-center bg-[#fdf8f3] px-4">
      <div className="max-w-sm rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-3 text-xl font-extrabold text-slate-800">Akses ditolak</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Akun Google yang Anda pakai bukan admin yang terdaftar di pengaturan Rumbela.
          Masuk dengan akun admin, atau hubungi pengelola.
        </p>
        <Button className="mt-4 w-full rounded-xl" onClick={logout}>
          Kembali
        </Button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" opacity=".9" />
      <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" opacity=".7" />
      <path fill="#fff" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" opacity=".5" />
      <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" opacity=".8" />
    </svg>
  );
}
