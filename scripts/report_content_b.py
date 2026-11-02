#!/usr/bin/env python3
"""Konten laporan - Bab 5-7."""
from report_common import *  # noqa: F401,F403
from report_common import (P, bullets, heading, h2, h3, stat_row, callout, tbl, fig,
                           fig_pair, Spacer, S, ASSET)

def bab5(story):
    heading(story, 5, 'Temuan Audit: Performa dan Kecepatan')
    story.append(P(
        'Karena aplikasi berupa satu berkas statis di CDN Netlify, tidak ada biaya '
        'komputasi server - ini keunggulan biaya yang patut dipertahankan. '
        'Masalahnya bukan di server, melainkan pada <b>bobot dan cara penyajian '
        'berkas</b> yang memaksa peramban bekerja jauh lebih keras dari seharusnya.'))

    tbl(story,
        ['Metrik', 'Hasil ukur', 'Tolok ukur / keterangan'],
        [
            ['Ukuran HTML (mentah)', '607,5 KB (622.069 bita)',
             'Halaman seluler yang baik < 150 KB terkompresi'],
            ['Ukuran terkompresi (gzip)', '407,8 KB',
             '2,7 kali ambang batas "baik"'],
            ['Waktu respons server (TTFB)', 'sekitar 1,08 detik dari jaringan uji',
             'Dipengaruhi lokasi; CDN Netlify seharusnya < 0,3 detik dari Indonesia'],
            ['Waktu unduh HTML saja', 'sekitar 1,49 detik',
             'Belum termasuk font dan login Google'],
            ['Proporsi <head>', '29% dokumen (181 KB)',
             'Termasuk 64 KB JavaScript yang memblokir render pertama'],
            ['Frekuensi simpan otomatis', 'setiap 1 detik',
             'Menyusun ulang seluruh JSON + hash setiap detik selama halaman terbuka'],
            ['Berkas gambar', '0 (nol) gambar eksternal',
             'Positif: seluruh UI berbasis teks dan CSS'],
        ],
        [0.28, 0.32, 0.40],
        caption='Tabel 5. Metrik performa terukur (2 November 2026).')

    fig(story, f'{ASSET}/chart_bobot.png',
        'Gambar 7. Bobot dokumen HTML Rumbela Live dibandingkan tolok ukur '
        'praktik baik untuk halaman seluler.',
        max_h=225)

    h2(story, 'Mengapa Ini Penting bagi Bimbel')
    story.append(P(
        'Guru mencatat absensi dan jurnal <i>di kelas</i>, sering kali dengan sinyal '
        '4G yang pas-pasan. Pada koneksi 1 Mbps, berkas 407,8 KB membutuhkan lebih '
        'dari 3 detik hanya untuk unduhan - belum lagi eksekusi 86 KB JavaScript dan '
        'pemuatan font web yang memblokir render. Pengalaman "berat" semacam ini '
        'adalah penyebab nomor satu pengguna enggan memakai sistem digital dan '
        'kembali ke buku tulis.'))
    story.append(P(
        'Selain bobot, terdapat dua pola kode yang membebani perangkat: '
        '<b>(1) polling setiap detik</b> - aplikasi menyusun ulang seluruh data '
        'menjadi teks JSON lalu menghitung hash-nya tiap detik untuk mendeteksi '
        'perubahan; seiring data absensi dan jurnal harian menumpuk, pekerjaan ini '
        'tumbuh linear dan menguras baterai ponsel; <b>(2) JavaScript 64 KB di '
        '<head></b> yang memblokir tampilan pertama karena skrip inline tidak '
        'bisa dijadwalkan (defer).'))
    story.extend(bullets([
        'Skrip HUD Netlify (perangkat bantu deploy) ikut termuat di produksi dan '
        'menambah satu permintaan jaringan.',
        'Favicon berupa JPEG base64 sekitar 13 KB menempel di kepala dokumen - '
        'seharusnya berkas kecil terpisah yang dapat di-cache.',
        'Tidak ada manifest.json / service worker, sehingga aplikasi tidak dapat '
        'dipasang di layar utama atau dipakai luring.',
    ]))
    callout(story,
            'Kabar baiknya: karena seluruh UI berbasis teks dan CSS tanpa gambar, '
            'sekali bobot diturunkan (multi-berkas + cache), aplikasi ini berpotensi '
            'mencapai kecepatan kelas atas tanpa biaya tambahan apa pun.')

def bab6(story):
    heading(story, 6, 'Temuan Audit: Keamanan dan Arsitektur Data')
    story.append(P(
        'Keamanan dasar transport sudah benar: HTTPS diwajibkan (pengalihan 301), '
        'HSTS aktif setahun penuh dengan preload, dan tidak ditemukan kunci API '
        'rahasia yang bocor di kode. Pilihan scope <i>drive.file</i> juga tepat - '
        'aplikasi hanya boleh menyentuh berkas yang dibuatnya sendiri. Namun '
        'lapisan-lapisan perlindungan standar industri belum terpasang, dan model '
        'data satu-berkas menyimpan risiko bisnis terbesar dalam seluruh audit ini.'))

    h2(story, 'Header Keamanan HTTP')
    tbl(story,
        ['Header', 'Status', 'Fungsi'],
        [
            ['Strict-Transport-Security (HSTS)', 'Ada',
             'Memaksa HTTPS - sudah benar'],
            ['Content-Security-Policy (CSP)', 'Tidak ada',
             'Membatasi sumber skrip - pertahanan utama anti-XSS'],
            ['X-Content-Type-Options', 'Tidak ada',
             'Mencegah peramban salah menafsirkan jenis berkas'],
            ['X-Frame-Options / frame-ancestors', 'Tidak ada',
             'Mencegah halaman disematkan situs lain (clickjacking)'],
            ['Referrer-Policy', 'Tidak ada',
             'Menahan bocornya URL dan data rujukan'],
            ['Permissions-Policy', 'Tidak ada',
             'Membatasi akses kamera/mikrofon/lokasi yang tidak perlu'],
        ],
        [0.34, 0.13, 0.53],
        caption='Tabel 6. Status header keamanan - lima header dapat dipasang lewat '
                'satu berkas konfigurasi Netlify.',
        align_center_cols=[1])

    h2(story, 'Temuan Alur Login')
    story.append(P(
        'Saat pengujian dengan peramban bersih (tanpa riwayat), membuka aplikasi '
        '<b>langsung memunculkan jendela login Google</b> tanpa klik apa pun. '
        'Penyebabnya di kode: pada saat halaman selesai dimuat, aplikasi memanggil '
        '<i>requestAccessToken({prompt: ""})</i>. Komentar pengembangnya mengira '
        'panggilan ini "diam-diam", padahal string kosong bukan mode senyap - mode '
        'itu tidak tersedia untuk aliran token implisit. Akibatnya setiap pengunjung '
        'baru (misalnya orang tua yang diberi tautan, atau calon kolaborator) '
        'disambut popup yang biasanya justru diblokir pemblokir popup, meninggalkan '
        'kesan "aplikasi error". Token akses juga disimpan di localStorage - bisa '
        'dicuri bila ada celah skrip silang situs; tanpa CSP, proteksi semacam ini '
        'belum berlapis.'))
    story.append(P(
        'Catatan positif: data contoh yang tampil untuk umum hanyalah dua siswa '
        'palsu berlabel "Contoh" - <b>tidak ada data pribadi siswa sungguhan yang '
        'terbuka</b> pada halaman publik, karena data asli hanya turun setelah '
        'login akun Google pengelola.'))

    h2(story, 'Risiko Terbesar: Satu Berkas JSON Tanpa Kontrol Konkurensi')
    story.append(P(
        'Seluruh isi aplikasi - siswa, iuran, absensi, jurnal, laporan, materi - '
        'hidup dalam <b>satu berkas rumbela-database.json</b>. Setiap kali ada '
        'perubahan sekecil apa pun (satu kehadiran dicatat), aplikasi menyusun ulang '
        'seluruh isi lalu mengunggah ulang berkas utuhnya. Model "penimpa terakhir '
        'menang" (last-write-wins) ini berarti:'))
    story.extend(bullets([
        'Dua pengguna yang membuka aplikasi bersamaan dapat <b>saling menimpa</b> '
        'perubahan tanpa peringatan - yang tersimpan belakangan menghapus jejak '
        'yang lebih dulu.',
        'Tidak ada riwayat perubahan (audit trail): bila angka iuran atau nilai '
        'progres berubah, tidak ada cara menelusuri kapan dan oleh siapa.',
        'Berkas yang terus membesar (absensi harian x jumlah siswa x bulan) membuat '
        'setiap penyimpanan makin lambat dan makin rentan gagal di tengah jalan.',
        'Ketika kelak ada rekan guru kedua atau admin, risiko ini berubah dari '
        'teoretis menjadi nyata - inilah alasan utama migrasi ke basis data '
        'baris-per-baris di Fase 1.',
    ]))
    callout(story,
            'Mitigasi cepat tanpa migrasi: biasakan ekspor JSON mingguan (fitur sudah '
            'ada), nyalakan riwayat versi Google Drive untuk berkas database, dan '
            'batasi penggunaan pada satu perangkat aktif hingga v2.0 selesai.',
            color=WARN)

def bab7(story):
    heading(story, 7, 'Temuan Audit: SEO, Aksesibilitas, dan Kesiapan Perangkat')
    story.append(P(
        'Sebagai aplikasi kerja internal, Rumbela Live memang tidak membutuhkan '
        'peringkat mesin pencari. Namun karena alamatnya mudah dibagikan (untuk '
        'promosi, atau suatu saat portal orang tua), fondasi metadata yang benar '
        'tetap bernilai - dan saat ini nyaris seluruhnya kosong.'))

    h2(story, 'Checklist Metadata dan Perangkat')
    tbl(story,
        ['Item', 'Status', 'Keterangan'],
        [
            ['Judul halaman', 'Ada', '"Rumbela - Web App Admin" - sebaiknya diganti '
             'frasa bernuansa merek, bukan "Admin"'],
            ['Bahasa dokumen (lang)', 'Ada', 'id - sudah benar'],
            ['Meta description', 'Tidak ada', 'Tampilan tautan di WhatsApp/media sosial '
             'menjadi kosong'],
            ['Open Graph / kartu sosial', 'Tidak ada', 'Tautan yang dibagikan tampil polos '
             'tanpa judul dan gambar'],
            ['robots.txt', 'Tidak ada (404)', 'Standar untuk mengatur perayap'],
            ['sitemap.xml', 'Tidak ada (404)', 'Tidak kritis untuk aplikasi internal'],
            ['Favicon', 'Base64 JPEG 13 KB', 'Sebaiknya berkas PNG/ICO kecil terpisah'],
            ['Halaman 404', 'Bawaan Netlify (Inggris)', 'Di luar kendali merek'],
            ['PWA (manifest + service worker)', 'Tidak ada',
             'Belum bisa dipasang di layar utama / luring'],
        ],
        [0.30, 0.20, 0.50],
        caption='Tabel 7. Status metadata, SEO teknis, dan kesiapan perangkat.')

    h2(story, 'Aksesibilitas')
    story.append(P(
        'Fondasi aksesibilitas cukup baik untuk aplikasi buatan manual: kontras '
        'warna memenuhi WCAG AA, 30 dari 34 kolom input memiliki label, kedua gambar '
        'memiliki teks alternatif, dan modal memakai atribut dialog yang benar. '
        'Yang belum: atribut ARIA hanya dipakai di 10 titik (nav, modal, toast) - '
        'tombol ikon dan status simpan belum berlabel bagi pembaca layar; fokus '
        'keyboard belum dikelola saat modal terbuka; dan ukuran target sentuh di '
        'beberapa tombol sekunder (Ubah/Hapus) mendekati batas bawah 44px pada '
        'seluler. Mode gelap belum tersedia (color-scheme dipatok terang).'))

    h2(story, 'Peluang: Dari Aplikasi Internal ke Pintu Masuk Merek')
    story.append(P(
        'Satu halaman publik sederhana (profil bimbel, program, tarif, testimonial, '
        'tombol WhatsApp) yang terpisah dari aplikasi admin akan menjadikan '
        'rumbela.netlify.app aset pemasaran - semua metadata di atas langsung '
        'punya fungsi nyata. Kami masukkan sebagai opsi Fase 2 pada roadmap.'))
