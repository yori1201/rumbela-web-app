#!/usr/bin/env python3
"""Konten laporan - Bab 1-4."""
from report_common import *  # noqa: F401,F403
from report_common import (P, bullets, heading, h2, h3, stat_row, callout, tbl, fig,
                           fig_pair, Spacer, S, ASSET)

def bab1(story):
    heading(story, 1, 'Ringkasan Eksekutif')
    story.append(P(
        'Laporan ini menyajikan hasil audit dan analisa menyeluruh terhadap '
        '<b>Rumbela Live</b> (https://rumbela.netlify.app), aplikasi web resmi milik '
        'Rumbela - Rumah Belajar Anak, Curup, yang dibangun pada 22-23 Oktober 2026 '
        'dan telah diuji serta dideploy secara permanen di Netlify. Aplikasi ini '
        'menangani operasional inti bimbel: data siswa, iuran, absensi, jurnal harian, '
        'laporan progres untuk orang tua, serta bank materi pembelajaran. Audit '
        'dilakukan pada 2 November 2026 dari sisi pengguna (peramban) dan sisi '
        'teknis (kode sumber, header HTTP, arsitektur data), dengan fokus pada '
        'kesiapan aplikasi menuju <b>redesign versi 2.0</b>.', 'lead'))
    story.append(Spacer(1, 4))

    stat_row(story, [
        ('607,5 KB', 'bobot satu berkas HTML (2,7x ambang batas "baik")'),
        ('7', 'tampilan modul aktif dalam satu halaman'),
        ('5,8 / 10', 'skor rata-rata kualitas keseluruhan'),
        ('Rp 0', 'biaya infrastruktur berjalan saat ini'),
    ])

    story.append(P(
        'Secara umum, Rumbela Live adalah karya yang solid untuk kategori aplikasi '
        'statis buatan satu orang: fungsional, rapi, konsisten, dan sudah memakai '
        'pola desain dashboard modern. Namun audit menemukan sejumlah persoalan '
        'struktural yang akan semakin terasa seiring pertumbuhan jumlah siswa dan '
        'jumlah pengguna - terutama bobot halaman yang besar, arsitektur data '
        'satu-berkas yang rawan saling menimpa, dan beberapa masalah pengalaman '
        'pengguna di perangkat seluler.'))

    fig(story, f'{ASSET}/chart_skor.png',
        'Gambar 1. Skor audit per kategori (penilaian auditor, skala 1-10). '
        'Rata-rata keseluruhan 5,8 - fondasi baik, eksekusi perlu dipercanggih.',
        max_h=250)

    h2(story, 'Lima Temuan Kunci')
    story.extend(bullets([
        '<b>Bobot halaman sangat besar.</b> Seluruh aplikasi dikemas dalam satu berkas '
        'HTML 607,5 KB (407,8 KB setelah kompresi). Bandingkan: tolok ukur industri untuk '
        'halaman seluler yang baik adalah di bawah 150 KB. Pada jaringan 3G/4G lemah, '
        'pengguna menunggu hitungan detik hanya untuk membuka halaman.',
        '<b>Popup login Google muncul sendiri.</b> Saat halaman dibuka di peramban baru, '
        'aplikasi otomatis memunculkan jendela login Google tanpa diminta - hasil '
        'pemanggilan token dengan parameter <i>prompt</i> kosong yang keliru dikira '
        'bersifat senyap. Ini terjadi pada pengujian kami dan mengganggu kesan pertama.',
        '<b>Database satu berkas JSON tanpa kontrol konkurensi.</b> Seluruh data '
        '(siswa, iuran, absensi, jurnal, laporan) disimpan sebagai satu berkas '
        'rumbela-database.json di Google Drive. Jika dua orang mengedit bersamaan, '
        'perubahan yang tersimpan belakangan menimpa yang lebih dulu - berisiko '
        'kehilangan data transaksi.',
        '<b>Elemen pihak ketiga menghalangi konten di ponsel.</b> Badge "Powered by '
        'Netlify" (ciri paket gratis) melayang menutupi sebagian kolom iuran pada form '
        'tambah siswa versi seluler, dan navigasi bawah berisi 7 menu membuat labelnya '
        'terpotong pada layar 390px.',
        '<b>Fondasi keamanan dasar sudah baik, tetapi belum lengkap.</b> HTTPS + HSTS '
        'aktif dan pemakaian scope akses Drive terbatas sudah benar; namun lima header '
        'keamanan standar belum dipasang dan token akses disimpan di localStorage '
        'peramban.',
    ]))

    h2(story, 'Arah Rekomendasi Utama')
    story.append(P(
        'Redesign versi 2.0 sebaiknya <b>tidak membuang apa yang sudah ada</b>, '
        'melainkan memperkuatnya: memecah berkas tunggal menjadi aset terpisah yang '
        'dapat di-cache, memindahkan data ke basis data baris-per-baris (misalnya '
        'Supabase/Firebase yang tetap gratis di skala kecil), menambah portal orang '
        'tua, dan merapikan pengalaman seluler. Seluruh perjalanan ini kami susun '
        'menjadi roadmap empat fase berdurasi total sekitar 13 minggu (Bab 9), '
        'dimulai dari quick wins yang bisa dikerjakan dalam 1-2 minggu tanpa '
        'mengubah arsitektur.'))

def bab2(story):
    heading(story, 2, 'Metodologi dan Ruang Lingkup Audit')
    story.append(P(
        'Audit dilaksanakan pada <b>2 November 2026</b> secara independen terhadap '
        'versi produksi yang sedang berjalan. Pendekatan yang digunakan adalah '
        'black-box dari sisi pengguna ditambah pemeriksaan kode sumber yang '
        'terbuka (halaman statis), sehingga temuan dapat diverifikasi siapa pun '
        'yang membuka alamat aplikasi.'))

    h2(story, 'Cara Pengujian')
    tbl(story,
        ['Aspek', 'Metode', 'Alat'],
        [
            ['Antarmuka & pengalaman pengguna',
             'Kunjungan semua 7 tampilan pada desktop 1366px dan seluler 390px, '
             'termasuk membuka form tambah siswa; tangkapan layar dinilai dengan '
             'model visi (VLM) memakai rubrik estetika dan kegunaan',
             'Peramban headless + analisis visual'],
            ['Performa & kecepatan',
             'Pengukuran ukuran berkas, waktu respons (TTFB), proporsi kepala '
             'dokumen, kompresi gzip, dan pola pemuatan skrip',
             'Pengukur HTTP + pemeriksaan kode'],
            ['Keamanan',
             'Pemeriksaan header respons, perilaku login Google pada peramban '
             'bersih, cara penyimpanan token, serta higienitas kode (fungsi '
             'pelolos XSS, tanpa eval)',
             'Inspeksi header + reproduksi langsung'],
            ['Arsitektur data',
             'Penelusuran alur baca/tulis ke Google Drive pada kode sumber: cara '
             'simpan, frekuensi, dan penanganan bentrok',
             'Statis analisis 86 fungsi JavaScript'],
            ['SEO & aksesibilitas',
             'Pemeriksaan meta tag, robots.txt, sitemap, atribut ARIA, label form, '
             'kontras warna, dan dukungan PWA',
             'Checklist standar + inspeksi DOM'],
        ],
        [0.20, 0.55, 0.25],
        caption='Tabel 1. Metode audit per aspek.')

    h2(story, 'Ruang Lingkup dan Batasan')
    story.extend(bullets([
        '<b>Yang diaudit:</b> seluruh tampilan publik aplikasi (Beranda, Siswa, Iuran, '
        'Absensi, Jurnal, Laporan, Materi), kode sumber HTML/CSS/JavaScript, header '
        'keamanan server, serta alur integrasi Google Drive dan WhatsApp.',
        '<b>Yang tidak diaudit:</b> isi sesungguhnya dari berkas database di Google '
        'Drive (data pribadi siswa tidak dibuka dan tidak direkam dalam laporan ini), '
        'akun Netlify, serta proses deploy. Audit juga tidak melakukan perubahan apa '
        'pun terhadap data produksi.',
        '<b>Batasan:</b> pengukuran waktu dimuat dipengaruhi lokasi jaringan penguji; '
        'angka waktu pada Bab 5 dibaca sebagai indikatif, bukan hasil lab resmi. '
        'Penilaian skor 1-10 merupakan sintesis auditor atas seluruh temuan '
        'terverifikasi.',
    ]))
    callout(story,
            'Prinsip audit ini: setiap temuan dibuktikan dengan bukti yang dapat '
            'direproduksi - tangkapan layar, potongan kode, atau header respons - '
            'sehingga manajemen dapat memprioritaskan tindakan tanpa perlu memercayai '
            'pendapat subjektif.')

def bab3(story):
    heading(story, 3, 'Profil Aplikasi dan Arsitektur Saat Ini')
    story.append(P(
        'Rumbela Live adalah aplikasi manajemen bimbel untuk <b>Rumah Belajar Anak '
        '(Rumbela)</b> di Curup yang melayani anak TK hingga SMP dengan lima program: '
        'Calistung Ceria, Matematika, Pendampingan Belajar & PR, Bahasa Inggris '
        'Dasar, dan Privat. Tarif bulanan bawaan: Rp200.000 (TK/SD), Rp220.000 (SMP), '
        'Rp250.000 (Privat) untuk 12 pertemuan. Seluruh komunikasi ke orang tua '
        'dilayani nomor WhatsApp resmi 0896-7394-1203.'))

    h2(story, 'Tujuh Tampilan, Satu Berkas')
    story.append(P(
        'Aplikasi menyediakan tujuh tampilan (enam modul inti ditambah jurnal harian) '
        'yang semuanya hidup dalam <b>satu berkas index.html</b> - pola umum disebut '
        'aplikasi satu halaman (single-page application) buatan manual, tanpa framework.'))
    tbl(story,
        ['Tampilan', 'Fungsi utama', 'Fitur khas'],
        [
            ['Beranda', 'Ringkasan operasional harian',
             '4 kartu statistik, daftar "perlu ditindaklanjuti", tombol ingatkan via WA'],
            ['Siswa', 'Data induk siswa',
             'Pencarian + filter program, kartu siswa, tombol chat WA orang tua'],
            ['Iuran', 'Status pembayaran bulanan',
             'Matriks 12 bulan per siswa, status lunas/sebagian/belum, ingatkan WA'],
            ['Absensi', 'Kehadiran per pertemuan',
             'Pilih tanggal, tombol Hadir/Izin/Alpa, rekap bulanan otomatis'],
            ['Jurnal', 'Laporan harian pengajar',
             'Aktivitas & progres harian, teks rekap siap kirim, rekap mingguan'],
            ['Laporan', 'Laporan progres bulanan',
             'Penilaian 4 aspek berbintang, pratinjau pesan WA ke orang tua'],
            ['Materi', 'Bank materi pembelajaran',
             'Unggah berkas ke folder Google Drive, pencarian, buka/cetak'],
        ],
        [0.14, 0.30, 0.56],
        caption='Tabel 2. Peta tujuh tampilan Rumbela Live.')

    h2(story, 'Karakteristik Teknis')
    tbl(story,
        ['Komponen', 'Kondisi saat ini', 'Catatan'],
        [
            ['Berkas aplikasi', '1 berkas HTML, 607,5 KB, 2.020 baris',
             'CSS (12,4 KB) dan JS (85,9 KB) seluruhnya inline'],
            ['Bahasa & framework', 'JavaScript murni (vanilla), 86 fungsi',
             'Tanpa React/Vue/jQuery - semua hasil tulis tangan'],
            ['Hosting', 'Netlify paket gratis (free tier)',
             'Badge "Powered by Netlify" tampil di produksi'],
            ['Database', 'rumbela-database.json di Google Drive',
             'Baca/tulis seluruh isi sekaligus via Drive API'],
            ['Autentikasi', 'Google Identity Services, scope drive.file',
             'Token disimpan di localStorage peramban'],
            ['Penyimpanan materi', 'Folder "Rumbela - Bank Materi" di Drive',
             'Unggah multipart langsung dari peramban'],
            ['Tipografi', 'Google Fonts Plus Jakarta Sans',
             'Dengan preconnect (sudah benar), namun memblokir render'],
            ['Simpan otomatis', 'Polling tiap 1 detik + pemicu input/klik',
             'Menyusun ulang seluruh JSON lalu mengunggah utuh'],
        ],
        [0.22, 0.37, 0.41],
        caption='Tabel 3. Spesifikasi teknis versi saat ini.')

    fig(story, f'{ASSET}/diag_saat_ini.png',
        'Gambar 2. Arsitektur Rumbela Live saat ini: satu peramban memuat satu berkas '
        'statis, lalu membaca/menulis satu berkas JSON utuh di Google Drive.',
        max_h=235)

    h2(story, 'Yang Sudah Baik dan Layak Dipertahankan')
    story.append(P(
        'Pesan penting bagi manajemen: fondasi produk ini <b>tidak buruk</b>, dan '
        'redesign 2.0 seharusnya memperkuat - bukan mengganti - hal-hal berikut:'))
    story.extend(bullets([
        '<b>Higienitas kode tinggi.</b> Fungsi pelolos (esc) dipakai konsisten di 40 '
        'tempat untuk mencegah serangan sisipan skrip (XSS); tidak ada eval; modal '
        'memiliki atribut ARIA (role, aria-modal, aria-labelledby).',
        '<b>Desain responsif disiplin.</b> Dua breakpoint (760px dan 900px), navigasi '
        'bawah dengan pengaman area aman iPhone (safe-area-inset), serta penghormatan '
        'preferensi gerak minimal (prefers-reduced-motion).',
        '<b>Data contoh yang elegan.</b> Pengunjung baru disambut dua siswa contoh '
        '(berlabel jelas) sehingga semua fitur bisa langsung dicoba tanpa risiko - '
        'pola onboarding yang patut dipertahankan di v2.0.',
        '<b>Simpan otomatis dengan indikator status.</b> Pengguna tidak perlu menekan '
        'tombol simpan; status koneksi Drive ditampilkan jelas di sidebar.',
        '<b>Cadangan data manual.</b> Ekspor/impor JSON tersedia sebagai jaring '
        'pengaman bila terjadi masalah.',
        '<b>Integrasi WhatsApp tanpa biaya.</b> Tautan wa.me memanfaatkan aplikasi WA '
        'pengguna - cerdik dan gratis untuk skala saat ini.',
    ]))

def bab4(story):
    heading(story, 4, 'Temuan Audit: Antarmuka dan Pengalaman Pengguna')
    story.append(P(
        'Penilaian antarmuka dilakukan pada tujuh tampilan di dua ukuran layar. '
        'Kesimpulan umum: <b>di desktop, tampilan tergolong rapi dan profesional '
        '(skor visual 7,5-8,5)</b>; di layar seluler kualitas turun tajam (skor '
        'kegunaan 5,5-6,5) karena sejumlah elemen menabrak batas layar dan target '
        'sentuh menjadi sempit.'))

    fig(story, f'{ASSET}/chart_prioritas.png',
        'Gambar 3. Sebaran 32 temuan audit menurut kategori dan prioritas. '
        'P1 = kritis segera, P2 = penting, P3 = penyempurnaan.',
        max_h=235)

    h2(story, 'Tampilan Desktop')
    fig(story, f'{ASSET}/shot_beranda_desktop.png',
        'Gambar 4. Beranda versi desktop: sidebar 7 menu, 4 kartu statistik, daftar '
        'tindak lanjut, panel Google Drive - komposisi dashboard yang benar dan sehat.',
        max_h=290)
    story.append(P(
        'Beranda menyajikan hierarki yang benar: judul, tanggal berjalan, empat kartu '
        'statistik (total siswa, iuran lunas, kehadiran, materi), lalu daftar "perlu '
        'ditindaklanjuti" lengkap dengan tombol aksi "Ingatkan via WA". Warna biru '
        'korporat konsisten di 13 varian yang satu keluarga, dan kontras teks '
        'memenuhi WCAG AA. Panel "Database Google Drive" dan "Cadangan data" menempel '
        'di sidebar - tepat sebagai status sistem, meski penjelasannya panjang dan '
        'sebaiknya diringkas.'))
    fig(story, f'{ASSET}/shot_siswa_desktop.png',
        'Gambar 5. Daftar Siswa versi desktop: kartu siswa dengan pencarian, filter '
        'program, dan aksi Ubah / Chat WA / Hapus.',
        max_h=290)
    story.append(P(
        'Modul Siswa memakai kartu per siswa (bukan tabel) - pilihan tepat untuk '
        'data yang kaya namun jumlahnya sedang. Tombol "Chat WA" berwarna biru solid '
        'menonjol sebagai aksi utama. Kelemahan yang tercatat: tombol "Login Google" '
        'muncul dua lokasi (sidebar dan kartu Drive) yang membingungkan ketika keduanya '
        'tampil bersamaan, dan pesan status "Belum login" terkesan seperti peringatan '
        'error padahal informatif.'))

    h2(story, 'Tampilan Seluler')
    fig_pair(story,
             f'{ASSET}/shot_beranda_mobile.png',
             'Gambar 6a. Beranda 390px: kartu statistik menyusut 2 kolom.',
             f'{ASSET}/shot_form_mobile.png',
             'Gambar 6b. Form tambah siswa: badge Netlify menutupi kolom iuran.',
             max_h=430)
    story.append(P(
        'Di layar 390px, beranda masih terbaca baik: kartu statistik otomatis menjadi '
        'dua kolom dan navigasi bawah tetap mengapung. Namun tiga masalah serius '
        'muncul: <b>(1)</b> navigasi bawah memuat 7 menu sehingga labelnya saling '
        'bertabrakan dan terpotong - pedoman industri maksimal 5 item; <b>(2)</b> badge '
        'hitam "Powered by Netlify" melayang tepat di atas kolom "Iuran / bulan" pada '
        'form tambah siswa, menghalangi ketukan; <b>(3)</b> kartu konten yang berada '
        'di dasar layar tertutup navigasi mengapung tanpa ruang aman yang cukup.'))

    h2(story, 'Daftar Temuan UI/UX Berprioritas')
    tbl(story,
        ['ID', 'Pri', 'Temuan', 'Lokasi', 'Dampak bagi pengguna'],
        [
            ['UX-01', 'P1', 'Popup login Google muncul otomatis saat halaman dibuka '
             '(pemanggilan token dengan prompt kosong yang tidak senyap)',
             'Seluruh aplikasi', 'Kesan pertama terganggu; pengunjung baru dikirim ke '
             'halaman login Google tanpa diminta'],
            ['UX-02', 'P1', 'Badge "Powered by Netlify" menutupi kolom iuran pada form '
             'siswa versi seluler', 'Form Siswa (mobile)', 'Kolom sulit/di luar jangkauan '
             'ketukan; terlihat tidak profesional'],
            ['UX-03', 'P2', 'Navigasi bawah memuat 7 menu; label terpotong di 390px',
             'Semua tampilan (mobile)', 'Salah ketuk; navigasi utama tidak nyaman'],
            ['UX-04', 'P2', 'Halaman Jurnal sangat padat (6 kelompok input dalam satu '
             'gulungan panjang)', 'Jurnal', 'Beban kognitif tinggi saat mencatat harian'],
            ['UX-05', 'P2', 'Status "Sebagian" (garis tepi) sulit dibedakan dari "Belum" '
             '(abu-abu) sekilas', 'Iuran', 'Keputusan penagihan bisa keliru'],
            ['UX-06', 'P2', 'Tombol "Ubah/Hapus/Chat WA" ikut tampil pada form dan '
             'target sentuh rapat', 'Form (mobile)', 'Risiko salah sentuh aksi destruktif'],
            ['UX-07', 'P3', 'Daftar siswa tanpa paginasi untuk jumlah besar',
             'Siswa, Materi', 'Gulungan sangat panjang saat data bertambah'],
            ['UX-08', 'P3', 'Penyelarasan tidak konsisten (judul sektor, tinggi kontrol '
             'pencarian) dan teks penjelasan yang panjang', 'Beranda, Materi',
             'Kesan kurang rapi bagi pemirsa teliti'],
        ],
        [0.085, 0.06, 0.345, 0.16, 0.35],
        caption='Tabel 4. Temuan antarmuka menurut prioritas (P1 paling mendesak).',
        align_center_cols=[0, 1], fs=8.6)

    callout(story,
            'Dua temuan P1 (UX-01 dan UX-02) dapat diperbaiki dalam hitungan jam oleh '
            'pengembang dan langsung meningkatkan kesan pertama aplikasi - lihat Fase 0 '
            'pada roadmap Bab 9.')
