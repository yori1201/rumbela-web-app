import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Rumbela — Aplikasi Admin Bimbel | Rumah Belajar Anak",
  description:
    "Aplikasi admin Rumbela (Curup): kelola siswa, iuran, absensi, jurnal, jadwal kelas, dan laporan perkembangan bergambar untuk orang tua — tersimpan otomatis di Google Drive.",
  keywords: ["Rumbela", "bimbel", "Rumah Belajar Anak", "Curup", "aplikasi bimbel"],
  authors: [{ name: "Rumbela" }],
  applicationName: "Rumbela",
  openGraph: {
    title: "Rumbela — Aplikasi Admin Bimbel",
    description: "Kelola siswa, iuran, absensi, jurnal, jadwal, dan laporan bergambar untuk orang tua.",
    siteName: "Rumbela",
    type: "website",
    locale: "id_ID",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${nunito.variable} antialiased bg-background text-foreground font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
