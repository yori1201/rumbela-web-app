#!/usr/bin/env python3
"""Konten laporan - Bab 8-10."""
from report_common import *  # noqa: F401,F403
from report_common import (P, bullets, heading, h2, h3, stat_row, callout, tbl, fig,
                           fig_pair, Spacer, S, ASSET)

def bab8(story):
    heading(story, 8, 'Rekomendasi Redesign Versi 2.0')
    story.append(P(
        'Arah redesign yang kami sarankan: <b>evolusi, bukan revolusi</b>. Identitas '
        'biru yang ramah anak, pola kartu, dan tujuh alur kerja yang sudah dikenal '
        'pengguna dipertahankan; yang berubah adalah fondasi teknis di baliknya dan '
        'kerapian pengalaman di perangkat seluler.'))

    h2(story, 'Prinsip Desain v2.0')
    story.extend(bullets([
        '<b>Mobile-first, satu tangan.</b> Guru memakai ponsel sambil mengajar - '
        'semua aksi inti (absensi, jurnal, ingatkan WA) harus nyaman dijangkau ibu '
        'jari, dengan target sentuh minimal 48px.',
        '<b>Navigasi bawah maksimal 5 item.</b> Beranda, Siswa, Iuran, Jurnal, dan '
        'menu "Lainnya" (berisi Absensi, Laporan, Materi). Label tidak lagi terpotong.',
        '<b>Warna status semantik.</b> Lunas = hijau, Sebagian = kuning/amber, Belum '
        'dan Terlambat = merah - dipilih dari keluarga warna yang tetap satu rumpun '
        'agar sekilas pandang langsung benar.',
        '<b>Konfirmasi untuk aksi destruktif.</b> Hapus selalu memakai dialog '
        'konfirmasi berteks jelas, tombol destruktif berwarna merah lembut.',
        '<b>Status sistem jadi satu tempat.</b> Ikon koneksi Drive di header, bukan '
        'panel panjang di sidebar; penjelasan teknis dipindah ke tooltip/bantuan.',
    ]))

    h2(story, 'Perbandingan Versi Saat Ini vs v2.0')
    tbl(story,
        ['Aspek', 'v1 (saat ini)', 'v2.0 (disarankan)'],
        [
            ['Struktur berkas', '1 HTML 607,5 KB',
             'Multi-halaman; CSS/JS terpisah, dapat di-cache'],
            ['Ukuran muat awal', '407,8 KB terkompresi',
             'Target < 150 KB; sisa dimuat saat diperlukan'],
            ['Basis data', '1 berkas JSON di Drive (menimpa utuh)',
             'Basis data baris-per-baris (SQL) + riwayat perubahan'],
            ['Pengguna', '1 admin (login Google pribadi)',
             'Multi-user berperan: admin, guru, orang tua (baca)'],
            ['Konkurensi', 'Rawan saling menimpa',
             'Aman untuk banyak pengguna bersamaan'],
            ['Seluler', 'Bottom nav 7 item, badge menutupi konten',
             'Bottom nav 5 item, tanpa elemen menghalangi, PWA'],
            ['Laporan ke orang tua', 'Salin/tempel teks WA manual',
             'Kirim terjadwal + pratinjau + arsip terkirim'],
            ['Keamanan', 'HSTS saja; token di localStorage',
             'Lima header lengkap, CSP, sesi terkelola server'],
            ['Ketersediaan', 'Harus online',
             'Dapat dipasang di layar utama + mode luring terbatas'],
            ['Biaya', 'Rp 0', 'Tetap Rp 0 - Rp 20 ribu/bulan (opsional domain)'],
        ],
        [0.22, 0.37, 0.41],
        caption='Tabel 8. Perbandingan arsitektur dan kemampuan v1 vs v2.0.', fs=8.8)

    fig(story, f'{ASSET}/diag_v2.png',
        'Gambar 8. Arsitektur v2.0 yang disarankan: aplikasi PWA untuk dua jenis '
        'pengguna, logika di server, dan basis data baris-per-baris.',
        max_h=260)

    h2(story, 'Fitur Prioritas untuk Skala Bimbel')
    story.append(P(
        'Diurutkan dari nilai bisnis tertinggi untuk operasional Rumbela:'))
    tbl(story,
        ['Fitur', 'Manfaat langsung', 'Fase'],
        [
            ['Portal orang tua (baca saja)',
             'Orang tua melihat progres, tagihan, jadwal tanpa chat manual - '
             'menghemat waktu admin paling banyak', '2'],
            ['Kirim laporan terjadwal',
             'Rekap mingguan/bulanan otomatis ke WhatsApp sesuai jadwal', '2'],
            ['Kuitansi & tagihan rapi',
             'Bukti pembayaran siap cetak/simpan - mengurangi sengketa iuran', '2'],
            ['Multi-user berperan',
             'Guru baru bisa mencatat tanpa memegang kendali penuh', '1'],
            ['Kalender & jadwal pertemuan',
             'Tabrakan jadwal terlihat sebelum terjadi', '2'],
            ['Pencarian & paginasi data',
             'Tetap ringan saat siswa melewati puluhan/ratusan', '1'],
            ['Halaman profil publik bimbel',
             'Aset pemasaran; tautan WA langsung ke admin', '2 (opsional)'],
            ['Mode gelap & aksesibilitas penuh',
             'Nyaman dipakai malam hari; pembaca layar ramah', '3'],
        ],
        [0.30, 0.58, 0.12],
        caption='Tabel 9. Fitur prioritas versi 2.0 dan fase pengerjaannya.',
        align_center_cols=[2])

    h2(story, 'Pilihan Teknologi yang Kami Sarankan')
    story.append(P(
        'Untuk menjaga biaya tetap nol di skala kecil sekaligus membuka jalan '
        'pertumbuhan: <b>Next.js</b> (kerangka React paling populer, banyak tenaga '
        'ahli di Indonesia) sebagai aplikasi PWA; <b>Supabase</b> (PostgreSQL '
        'tambahkan otentikasi dan penyimpanan berkas, paket gratis cukup untuk '
        'ratusan siswa) sebagai basis data; hosting tetap <b>Netlify/Vercel</b> '
        'paket gratis; dan <b>WhatsApp Business API</b> ketika volume pesan '
        'terjadwal sudah layak diupgrade. Semua data lama dapat diimpor dari '
        'rumbela-database.json yang sudah ada - tidak ada data yang tertinggal.'))

def bab9(story):
    heading(story, 9, 'Roadmap Implementasi Bertahap')
    story.append(P(
        'Roadmap ini dirancang agar <b>aplikasi tetap hidup setiap saat</b>: '
        'setiap fase menghasilkan perbaikan yang bisa dipakai langsung, tanpa '
        'menunggu seluruh proyek selesai. Total durasi sekitar 13 minggu dengan '
        'satu pengembang; fase dapat dirapatkan bila ada tenaga tambahan.'))

    fig(story, f'{ASSET}/chart_roadmap.png',
        'Gambar 9. Lini masa empat fase menuju Rumbela Live 2.0 (total sekitar '
        '13 minggu).',
        max_h=225)

    h2(story, 'Fase 0 - Quick Wins (1-2 minggu)')
    story.append(P(
        'Perbaikan berdampak besar tanpa menyentuh arsitektur. Sebagian dapat '
        'selesai dalam hitungan jam:'))
    tbl(story,
        ['Aktivitas', 'Hasil yang terlihat', 'Menjawab temuan'],
        [
            ['Ubah pemanggilan token login agar hanya jalan setelah klik tombol; '
             'sesi tersimpan tetap dipulihkan otomatis',
             'Popup Google tidak lagi muncul sendiri', 'UX-01 (Bab 4)'],
            ['Sembunyikan badge Netlify dan lepas skrip HUD di produksi',
             'Tidak ada lagi elemen menutupi form', 'UX-02 (Bab 4), HUD (Bab 5)'],
            ['Pasang lima header keamanan lewat _headers Netlify',
             'Nilai A pada pemindai keamanan', 'Header (Bab 6)'],
            ['Favicon berkas kecil + meta description + Open Graph dasar',
             'Tautan yang dibagikan tampil profesional', 'Metadata (Bab 7)'],
            ['Warna status iuran: hijau / amber / merah',
             'Sekilas pandang langsung akurat', 'UX-05 (Bab 4)'],
            ['Navigasi bawah 5 item + menu "Lainnya"',
             'Label seluler tidak terpotong', 'UX-03 (Bab 4)'],
        ],
        [0.44, 0.31, 0.25],
        caption='Tabel 10. Isi Fase 0 - perbaikan cepat berdampak tinggi.')

    h2(story, 'Fase 1 - Fondasi v2.0 (3-4 minggu)')
    story.extend(bullets([
        'Pecah berkas tunggal menjadi struktur proyek (HTML per tampilan, CSS, JS '
        'modular) dengan aset yang dapat di-cache - bobot muat awal turun drastis.',
        'Migrasi data ke basis data baris-per-baris (Supabase) + impor otomatis '
        'rumbela-database.json; aktifkan riwayat perubahan.',
        'Autentikasi multi-user berperan (admin/guru) dengan sesi terkelola.',
        'Rapikan komponen UI (tombol, kartu, form, modal) agar konsisten - sekaligus '
        'target sentuh 48px.',
    ]))

    h2(story, 'Fase 2 - Fitur Utama (4-6 minggu)')
    story.extend(bullets([
        'Portal orang tua (baca progres, tagihan, jadwal) - nilai bisnis tertinggi.',
        'Laporan mingguan/bulanan terjadwal ke WhatsApp + kuitansi siap cetak.',
        'PWA: dapat dipasang di layar utama, mode luring terbatas untuk absensi.',
        'Kalender jadwal, pencarian, dan paginasi seluruh daftar.',
        'Opsional: halaman profil publik bimbel sebagai aset pemasaran.',
    ]))

    h2(story, 'Fase 3 - Optimalisasi (2-3 minggu)')
    story.extend(bullets([
        'Sasaran skor Lighthouse: Performa ≥ 90, Aksesibilitas ≥ 90, '
        'Praktik baik ≥ 95.',
        'Audit aksesibilitas WCAG AA penuh: label ARIA menyeluruh, fokus keyboard, '
        'mode gelap.',
        'Dokumentasi pengelolaan & pelatihan singkat untuk guru/admin baru; '
        'kode disimpan di repositori Git sebagai aset lembaga.',
    ]))

    h2(story, 'Indikator Keberhasilan')
    tbl(story,
        ['Indikator', 'Saat ini', 'Target v2.0'],
        [
            ['Bobot muat awal (terkompresi)', '407,8 KB', '< 150 KB'],
            ['Skor performa Lighthouse (seluler)', 'sekitar 50-an (estimasi)',
             '≥ 90'],
            ['Pengguna bersamaan tanpa konflik', '1', 'tak terbatas praktis'],
            ['Langkah kirim laporan orang tua', '4-5 langkah manual',
             '1 klik / otomatis terjadwal'],
            ['Waktu buka aplikasi di 4G lemah', '3-6 detik', '< 2 detik'],
            ['Temuan keamanan terbuka', '5 header + token', '0 kritis'],
        ],
        [0.40, 0.30, 0.30],
        caption='Tabel 11. Indikator keberhasilan yang dapat diverifikasi manajemen.')

    callout(story,
            'Rekomendasi anggaran: seluruh fase dapat berjalan di paket gratis '
            '(Netlify + Supabase). Satu-satunya biaya yang layak dipertimbangkan '
            'adalah domain custom (sekitar Rp150-250 ribu per tahun, opsional) dan '
            'jasa pengembang bila dikerjakan pihak luar.')

def bab10(story):
    heading(story, 10, 'Risiko, Mitigasi, dan Penutup')
    h2(story, 'Risiko Selama Transformasi')
    tbl(story,
        ['Risiko', 'Kemungkinan', 'Dampak', 'Mitigasi'],
        [
            ['Data hilang saat migrasi basis data', 'Sedang', 'Tinggi',
             'Ekspor JSON lengkap sebelum migrasi; uji impor di salinan; jalankan '
             'paralel 2 minggu'],
            ['Gangguan operasional selama transisi', 'Sedang', 'Sedang',
             'v1 tetap hidup sampai v2.0 dinyatakan stabil; migrasi per modul'],
            ['Resistensi pengguna terhadap tampilan baru', 'Rendah', 'Sedang',
             'Pertahankan alur kerja & istilah yang sudah dikenal; pelatihan '
             'singkat; buka kanal masukan'],
            ['Ketergantungan pada satu pengembang', 'Sedang', 'Tinggi',
             'Repositori Git + dokumentasi; struktur kode standar Next.js yang '
             'umum dikuasai'],
            ['Biaya berjalan naik tak terduga', 'Rendah', 'Sedang',
             'Kunci pada paket gratis; pantau kuota bulanan; siapkan rencana '
             'fallback ke v1'],
            ['Keamanan data anak (privasi)', 'Sedang', 'Tinggi',
             'Akses berperan ketat, portal orang tua hanya baca, kebijakan '
             'penyimpanan data tertulis'],
        ],
        [0.27, 0.12, 0.10, 0.51],
        caption='Tabel 12. Register risiko transformasi v1 menuju v2.0.',
        align_center_cols=[1, 2], fs=8.6)

    h2(story, 'Penutup')
    story.append(P(
        'Rumbela Live adalah titik awal yang jujur dan menggembirakan: dalam dua '
        'hari pembangunan, bimbel ini sudah memiliki sistem operasional digital '
        'yang berfungsi penuh, tanpa biaya infrastruktur, dengan disiplin kode '
        'yang patut diapresiasi. Persoalan yang ditemukan audit bukan persoalan '
        'keteledoran, melainkan batas alami dari arsitektur satu-berkas - dan '
        'semuanya punya jalan keluar yang terukur.'))
    story.append(P(
        'Dengan mengeksekusi Fase 0 dalam dua minggu ke depan, manajemen sudah '
        'menuai perbaikan yang terlihat; dengan menuntaskan Fase 1-2, Rumbela '
        'memiliki fondasi yang sama sekali berbeda: multi-pengguna, aman dari '
        'salah timpa data, ramah seluler, dan siap menjadi pembeda layanan di '
        'mata orang tua. Kami merekomendasikan agar keputusan eksekusi Fase 0 '
        'diambil dalam waktu dekat, sementara Fase 1-3 dijadwalkan menyesuaikan '
        'kalender akademik.'))
    story.append(Spacer(1, 6))
    callout(story,
            'Bukti audit (tangkapan layar 7 tampilan desktop + 3 seluler, hasil '
            'analisis kode, dan berkas pengukuran) tersimpan sebagai lampiran kerja '
            'dan dapat diminta kapan pun untuk verifikasi ulang.',
            color=ACCENT_2)
