import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rumbela — Rumah Belajar Anak",
    short_name: "Rumbela",
    description: "Aplikasi admin bimbel: siswa, iuran, absensi, jurnal, jadwal & laporan siswa.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf8f3",
    theme_color: "#f97316",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo.webp", sizes: "1000x919", type: "image/webp", purpose: "any" },
    ],
  };
}
