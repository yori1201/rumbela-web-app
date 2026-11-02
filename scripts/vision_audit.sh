#!/bin/bash
# Analisis visual screenshot Rumbela via z-ai vision CLI
cd /home/z/my-project/audit/shots
OUT=/home/z/my-project/audit/vision
mkdir -p $OUT

PROMPT_UMUM='Anda adalah auditor UI/UX profesional. Analisis screenshot halaman web aplikasi manajemen bimbel "Rumbela" ini secara detail dalam Bahasa Indonesia: 1) Jelaskan layout dan komponen yang terlihat (header, navigasi, kartu, tabel, tombol, warna dominan). 2) Nilai hierarki visual dan keterbacaan. 3) Sebutkan masalah UX/visual yang Anda lihat (jarak, kontras, kepadatan, penyelarasan, elemen terpotong, inkonsistensi). 4) Sebutkan kelebihan desainnya. 5) Beri skor estetika & kegunaan 1-10 dengan alasan singkat. Jawab terstruktur dan faktual.'

for img in 01-beranda-desktop 02-siswa-desktop 03-iuran-desktop 04-absensi-desktop 05-jurnal-desktop 06-laporan-desktop 07-materi-desktop; do
  echo "=== $img ==="
  z-ai vision -p "$PROMPT_UMUM" -i "./${img}.png" -o "$OUT/${img}.json" 2>&1 | tail -1
done

echo "=== 08-beranda-mobile ==="
z-ai vision -p "$PROMPT_UMUM Viewport ini adalah mobile 390px. Perhatikan apakah navigasi bawah (bottom nav) muncul, elemen menyempit, teks terpotong, atau scroll horizontal." -i "./08-beranda-mobile.png" -o "$OUT/08-beranda-mobile.json" 2>&1 | tail -1

echo "=== 09-siswa-mobile ==="
z-ai vision -p "$PROMPT_UMUM Viewport mobile 390px. Perhatikan bagaimana daftar/tabel siswa tampil di layar sempit." -i "./09-siswa-mobile.png" -o "$OUT/09-siswa-mobile.json" 2>&1 | tail -1

echo "=== 10-form-siswa-mobile ==="
z-ai vision -p "$PROMPT_UMUM Ini form tambah siswa di mobile 390px. Evaluasi: jumlah field, label, ukuran target sentuh, kenyamanan pengisian, tombol simpan." -i "./10-form-siswa-mobile.png" -o "$OUT/10-form-siswa-mobile.json" 2>&1 | tail -1

echo "SELESAI"
