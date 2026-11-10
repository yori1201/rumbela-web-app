# HANDOVER — Rumbela Web App

**Dokumen serah terima pengembangan aplikasi**
Tanggal: 10 November 2026 · Versi aplikasi: **v2.3.0** · Status: **Live & stabil**

---

## 1. Informasi Umum

| Item | Keterangan |
|---|---|
| Produk | **Rumbela** — Aplikasi admin bimbel (lembaga les) di Curup, Bengkulu |
| Tagline | Rumah Belajar Anak |
| URL produksi | https://rumbela-web-app.vercel.app |
| Repositori | https://github.com/yori1201/rumbela-web-app (branch `main`) |
| Pemilik | Yori (yori1201) |
| Hosting | Vercel — **auto-deploy setiap push ke `main`** (± 30 detik) |
| Penyimpanan data | Google Drive pengguna (satu file JSON) — *tanpa database server* |
| Bahasa antarmuka | Indonesia |

> **Konsep inti:** aplikasi berjalan 100% di sisi klien (client-side). Semua data lembaga tersimpan sebagai **satu file `rumbela-database.json` di Google Drive pribadi pemilik**, bukan di server. Server hanya menyajikan file statis hasil build Next.js.

---

## 2. Tech Stack

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix primitives) |
| Ikon | lucide-react |
| State global | React Context (`src/lib/store.tsx`) + `structuredClone` untuk mutasi |
| Penyimpanan | Google Drive API v3 (scope `drive.file`) via Google Identity Services |
| Fallback lokal | `localStorage` (mode demo & cache offline) |
| Deploy | Vercel (auto dari GitHub) |

Catatan: `package.json` memuat banyak dependensi bawaan template (Prisma, next-auth, recharts, dst.) yang **tidak dipakai** oleh fitur aktif. Jangan dihapus sembarangan — cukup diketahui bahwa Prisma/DB server tidak terpakai.

---

## 3. Struktur Kode

```
rumbela-web-app/            ← ROOT repo (penting: src/ langsung di root, BUKAN di subfolder)
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx             # Halaman tunggal (SPA) — semua view di-render di sini
│   │   ├── layout.tsx           # Metadata, font, AppProvider
│   │   ├── globals.css          # Tema warna (palet biru–hijau) + aturan print
│   │   ├── api/route.ts
│   │   └── manifest.ts          # PWA manifest
│   ├── components/
│   │   ├── app-shell.tsx        # Kerangka UI: sidebar/nav 10 menu, header, status sync
│   │   ├── auth-gate.tsx        # Layar login Google / Mode Demo
│   │   ├── views/               # ★ SATU FILE PER FITUR (10 modul)
│   │   │   ├── beranda.tsx      # Dashboard ringkasan
│   │   │   ├── siswa.tsx        # CRUD siswa
│   │   │   ├── iuran.tsx        # Pembayaran bulanan + jatuh tempo + tgl bayar
│   │   │   ├── absensi.tsx      # Kehadiran harian H/I/A
│   │   │   ├── jurnal.tsx       # Catatan harian + template laporan WA
│   │   │   ├── laporan.tsx      # Laporan perkembangan utk orang tua
│   │   │   ├── jadwal.tsx       # Jadwal kelas mingguan
│   │   │   ├── materi.tsx       # Bank materi (Drive/YouTube/dll.)
│   │   │   ├── soal.tsx         # Generator Soal / worksheet
│   │   │   ├── pengaturan.tsx   # Profil lembaga, impor/ekspor, admin
│   │   │   └── shared.tsx       # StatCard, SectionCard, EmptyState, StarInput
│   │   └── ui/                  # shadcn/ui (jangan diedit manual bila tak perlu)
│   ├── lib/                     # ★ LOGIKA INTI
│   │   ├── types.ts             # Skema Database + normalizeDB() (kompatibilitas v1/v2)
│   │   ├── store.tsx            # State global, auto-save (debounce 1,2 dtk), sesi Google
│   │   ├── gdrive.ts            # API Google Drive (find/create/update/download)
│   │   ├── constants.ts         # Konstanta, helper tanggal, template WA default
│   │   ├── laporan.ts           # Kalkulasi statistik (kehadiran, iuran, jurnal)
│   │   ├── generatorSoal.ts     # Bank soal: Matematika, Calistung, English, Coding
│   │   ├── renderWorksheet.ts   # Render worksheet → HTML A4 (2 tema) & PNG
│   │   ├── renderLaporan.ts     # Render laporan → gambar (3 template)
│   │   ├── worksheetTheme.ts    # Tema warna worksheet
│   │   ├── demo.ts              # Data contoh Mode Demo
│   │   └── db.ts
│   └── hooks/                   # use-toast, use-mobile
└── next.config.ts               # ignoreBuildErrors: true (hati-hati, lihat §9)
```

**Pola yang dipakai di semua view:** ambil `db` + `mutate()` dari `useApp()`, lalu `mutate((draft) => { ... })` untuk mengubah data — auto-save ke Drive berjalan otomatis setelahnya. Tidak ada fetch/REST untuk data lembaga.

---

## 4. Arsitektur Data & Sinkronisasi

### 4.1 Alur penyimpanan

```
User mengubah data
  → mutate() meng-clone db & memperbarui state React
  → debounce 1,2 detik → tulis ke Google Drive (update file JSON)
  → bila tab disembunyikan/ditutup → flush segera
```

### 4.2 Mode autentikasi

| Mode | Kapan aktif | Simpan ke |
|---|---|---|
| `gdrive` | Login Google berhasil | File `rumbela-database.json` di Drive (auto-create bila belum ada) |
| `demo` | Klik "Coba Mode Demo" | `localStorage["rumbela-v2-demo"]` (per perangkat) |
| `cache` | Sesi Google kedaluwarsa, ada cache | Hanya baca; banner "Sambung ulang" muncul |

- OAuth client ID tertanam di `store.tsx` (aman dipublikasikan — client-side).
- **Pembatasan admin:** bila `pengaturan.emailAdmin` diisi, hanya email tersebut yang bisa masuk (cek di `loginGoogle`/`reconnect`).
- Token kedaluwarsa → **tidak ada popup otomatis** (perbaikan bug v1); pengguna klik "Sambung ulang".

### 4.3 Skema database (`src/lib/types.ts`)

```ts
interface Database {
  students: Siswa[];                        // profil siswa (nama, program, wali, WA, iuran/bulan, grup)
  payments: Record<sid, Record<"YYYY-MM", PayStatus>>;   // lunas | sebagian | belum
  payDates:  Record<sid, Record<"YYYY-MM", "YYYY-MM-DD">>; // ★ BARU: tanggal pembayaran
  attendance: Record<"YYYY-MM-DD", Record<sid, "H"|"I"|"A">>;
  reports: Record<"sid@YYYY-MM", ReportRec>;              // skor 4 aspek + catatan
  materials: Materi[];                      // bank materi
  journal: Record<"YYYY-MM-DD", { activity, progress }>;  // catatan harian
  jadwal: { slots: SlotJam[]; kelas: string[]; items: JadwalItem[] };
  pengaturan: Pengaturan;                   // profil lembaga + konfigurasi (di bawah)
  worksheets: Worksheet[];                  // arsip generator soal
}
```

`Pengaturan` berisi: profil lembaga, `emailAdmin`, **`iuran.jatuhTempo`** (tanggal jatuh tempo tiap bulan, default 5), **`jurnal.templateWa`** (template laporan WA), dan `laporan` (template, pesan penutup, tanda tangan).

> `normalizeDB()` di `types.ts` adalah **gerbang kompatibilitas**: semua data lama/v1/impor dilewatkan ke sini sehingga field baru selalu punya default aman. Data lama tanpa `payDates` tetap jalan.

---

## 5. Fitur per Modul (status saat handover)

### 5.1 Beranda
Dashboard: sapaan + tanggal, statistik (siswa aktif, hadir hari ini, iuran, perlu perhatian), daftar iuran belum lunas **lengkap info jatuh tempo & countdown/terlambat**, tombol ingatkan WA, ringkas jurnal hari ini, pintasan. Palet biru–hijau (commit `0605836`).

### 5.2 Siswa
CRUD lengkap (dialog form): nama, jenjang, kelas, program (5 pilihan + custom), orang tua, WA, tanggal mulai, grup, iuran/bulan (default per jenjang: SD 200rb/SMP 220rb/SMA 240rb), target pertemuan. Pencarian + filter program. Hapus siswa otomatis membersihkan payments, **payDates**, reports, attendance.

### 5.3 Iuran ★ (dua revisi terakhir)
- **Tabel kalender 12 bulan × siswa** (navigasi tahun), status per bulan.
- Ketuk sel bulan → **dialog** berisi:
  - Status: Belum / Sebagian / Lunas
  - **Input "Tanggal pembayaran"** — otomatis terisi hari ini saat status diubah ke Lunas/Sebagian, bisa dikoreksi manual; kembali ke Belum = tanggal terhapus.
- **Jatuh tempo** dapat diatur (default tanggal 5 tiap bulan) di kartu Rekap.
- Banner "Pembayaran iuran berikutnya" — **hari, tanggal, bulan** (mis. "Kamis, 5 November 2026") + status: X hari lagi / hari ini / terlambat X hari.
- Kolom "Jatuh tempo" per siswa: sudah lunas → tampilkan jatuh tempo bulan depan + "dibayar 3 Nov"; belum lunas → countdown atau keterlambatan (merah).
- Titik indikator pada sel yang punya tanggal bayar + tooltip.
- Teks ingatkan WA menyertakan batas pembayaran lengkap & tanggal diterima.
- Commit terkait: `f80ac16` (jatuh tempo) dan `3bba216` (tanggal pembayaran).

### 5.4 Absensi
Kehadiran harian per siswa (H/I/A, ketuk untuk cycling) pada tanggal terpilih, rekap bulanan % hadir.

### 5.5 Jurnal ★ (revisi terakhir)
- Catatan harian: tanggal bebas, dua kolom (Kegiatan, Progres) — auto-save saat pindah kolom.
- **Template teks laporan WA yang bisa diedit**:
  - Teks bawaan tersedia (salam → kehadiran → kegiatan → progres → rekap → penutup).
  - Placeholder `{nama}`, `{orangtua}`, `{program}`, `{hari}`, `{tanggal}`, `{kehadiran}`, `{kegiatan}`, `{progres}`, `{rekap}`, `{lembaga}` — ketuk chip untuk menyisip di posisi kursor.
  - Pratinjau langsung + tombol "Bawaan" (reset).
  - Tersimpan di `pengaturan.jurnal.templateWa`, dipakai oleh tombol Salin / Kirim WA.
- Catatan jurnal otomatis menjadi bahan saran catatan di Laporan Perkembangan.

### 5.6 Laporan
Laporan perkembangan per siswa per bulan: skor 4 aspek (bintang), catatan (saran otomatis dari jurnal), status terkirim. Render jadi **gambar** (3 template: Ceria/Klasik/Minimal) untuk dikirim via WA.

### 5.7 Jadwal
Jadwal mingguan: slot jam (default 08–17, bisa diubah), kelas/grup, item jadwal berwarna per program + pengajar.

### 5.8 Materi
Bank materi: judul, program, tipe (Dokumen/Video/dll.), URL, deskripsi. Tautan ke Drive/YouTube.

### 5.9 Generator Soal
- 4 bank generator: **Matematika** (operasi hitung, pecahan, dst.), **Calistung Ceria**, **Bahasa Inggris Dasar**, **Worksheet Coding** — per jenjang & kelas.
- 5 tipe soal: PG, isian, uraian, menjodohkan, susun kata.
- Output worksheet A4 dengan 2 tema (Klasik/Ceria), seksi A/B/C, kunci jawaban opsional.
- **Mode Edit** (commit `651682c`): hasil worksheet bisa diedit (ubah soal/opsi/kunci, tambah/hapus soal) sebelum cetak.
- Cetak (print area khusus), unduh PNG, arsipkan ke database.
- Dokumen referensi format: `download/referensi-generator-soal.md`.

### 5.10 Pengaturan
Profil lembaga (nama, tagline, alamat, telepon), template laporan + tanda tangan, email admin, ekspor/impor JSON (cadangan penuh), muat ulang dari Drive, simpan manual, hapus data contoh, keluar mode demo.

---

## 6. Menjalankan & Mengembangkan

### 6.1 Prasyarat
- Node.js ≥ 20, npm
- Akun GitHub dengan akses tulis ke `yori1201/rumbela-web-app`

### 6.2 Perintah

```bash
npm install            # sekali
npm run dev            # dev server di http://localhost:3000
npx tsc --noEmit       # cek tipe (abaikan error examples/websocket — pra-ada)
npx next build         # build produksi (verifikasi sebelum push)
npx next start -p 3100 # jalankan hasil build utk QA lokal
```

### 6.3 Alur rilis (workflow yang terbukti)

1. Edit file di `src/` (hanya area yang berubah).
2. `npx tsc --noEmit` → pastikan bersih (kecuali error `examples/websocket` yang memang ada).
3. `npx next build` → harus lulus.
4. QA lokal dengan `next start` + browser (Mode Demo).
5. Commit — **stage file secara eksplisit** (`git add src/... file tertentu`), jangan `git add -A` (folder `.next/` ikut tercommit di repo ini, lihat §9).
6. Push ke `main` → Vercel otomatis deploy ± 30 detik.
7. QA di https://rumbela-web-app.vercel.app (Mode Demo cukup untuk verifikasi UI).

### 6.4 QA cepat fitur iuran/jurnal
- Iuran: buka menu Iuran → ubah "jatuh tempo tiap tanggal" → pastikan banner & kolom berubah; ketuk sel bulan → dialog status + tanggal; ubah status Lunas → cek tanggal otomatis; koreksi tanggal; kembali ke Belum → tanggal hilang.
- Jurnal: Ubah template → sisip chip `{...}` → cek pratinjau → reset "Bawaan" → Kirim WA menampilkan teks sesuai template.

---

## 7. Keamanan & Akses

| Item | Status | Tindakan |
|---|---|---|
| GitHub PAT (fine-grained, milik pemilik) | ⚠️ **Sudah terpakai beberapa kali untuk push** | **WAJIB DICABUT**: GitHub → Settings → Developer settings → Personal access tokens → hapus/revoke. Buat baru per sesi kebutuhan. |
| Token Google (sesi pengguna) | Tersimpan hanya di perangkat, di-revoke saat logout | Aman |
| Data lembaga | Di Drive pribadi pemilik, scope `drive.file` (app hanya lihat file buatannya) | Aman |
| Email admin | Opsional di Pengaturan | Disarankan diisi agar hanya pemilik yang bisa masuk |
| `.env` | Sudah di `.gitignore` (commit `c7eb9cc`) | Jangan commit kredensial apa pun |

> **Jangan pernah menuliskan PAT/token dalam bentuk apa pun ke dokumen, commit, atau chat bila tidak perlu.** Setelah push dengan PAT, segera hapus dari remote URL (`git remote set-url origin https://github.com/yori1201/rumbela-web-app`).

---

## 8. Backup & Pemulihan Data

- **Otomatis:** setiap perubahan tersimpan ke Drive (file `rumbela-database.json`).
- **Manual:** Pengaturan → "Ekspor JSON (cadangan)" — unduh salinan penuh.
- **Pemulihan:** Pengaturan → "Impor JSON" (validasi: harus punya array `students` & `materials`; data dilewatkan `normalizeDB()`).
- **Cache offline:** `localStorage["rumbela-v2-cache"]` menyimpan salinan terakhir — dipakai bila sesi Google habis.
- Disarankan **ekspor rutin** (mis. tiap akhir bulan) dan simpan file JSON di tempat aman.

---

## 9. Catatan Teknis & Utang Teknis

1. **Folder `.next/` ikut tercommit di repo** (terlihat dari warning GitHub tentang file SST > 50 MB saat push). *Rekomendasi:* tambahkan `.next/` ke `.gitignore` dan bersihkan dari riwayat (`git rm -r --cached .next`) di waktu senggang — akan memperkecil ukuran repo signifikan.
2. `next.config.ts` memakai `typescript.ignoreBuildErrors: true` → build tidak menjaga tipe. Selalu jalankan `tsc --noEmit` manual sebelum push.
3. Error `tsc` pra-ada di `examples/websocket` — tidak memengaruhi aplikasi, aman diabaikan.
4. Banyak dependensi template tidak terpakai (Prisma, next-auth, dll.) — bisa dirapikan bila ingin mengecilkan bundle, tapi uji build dulu.
5. Ada proses build otomatis (turbopack dev di port 3000) yang berjalan di lingkungan pengembangan sebelumnya — bila menjumpai port terpakai, matikan proses `next-server` lama.
6. Aplikasi client-rendered → verifikasi perubahan UI harus lewat browser (grep HTML produksi tidak menemukan class karena ada di JS bundle).

---

## 10. Riwayat Rilis (commit penting)

| Commit | Isi |
|---|---|
| `c7eb9cc` | gitignore untuk `.env*` lokal |
| `549524e` | v2.2 — 4 bank generator soal + tema biru-hijau |
| `8e8d3ce` | v2.3 — template worksheet warna-warni, seksi A/B/C, soal menjodohkan & susun kata |
| `0605836` | Palet dashboard biru–hijau konsisten (beranda, shell, kartu) |
| `651682c` | Generator Soal: opsi edit hasil worksheet |
| `f80ac16` | Iuran: detail waktu jatuh tempo (hari/tanggal/bulan) + Jurnal: template teks WA bisa diedit |
| `3bba216` | Iuran: input tanggal pembayaran per bulan (dialog status + tanggal) |

---

## 11. Backlog / Rencana Lanjutan

- **Deploy mandiri (self-hosting)** — permintaan pemilik: "push ke server saya sendiri". Belum dieksekusi. Jalur yang disarankan:
  1. Tambah `output: "standalone"` di `next.config.ts`, build, salin `.next/standalone` + `.next/static` + `public` ke server.
  2. Jalankan `node server.js` (PORT bisa di env) di belakang Nginx reverse proxy + SSL.
  3. Opsional: Dockerfile atau PM2 (`pm2 start server.js`) untuk auto-restart.
  4. Perlu info server pemilik (VPS/cPanel, versi Node, domain) sebelum eksekusi.
- Ide pengembangan (belum diminta): rekap iuran tahunan (total per bulan), pengingat otomatis, ekspor iuran ke spreadsheet, multi-pengajar dengan hak akses.

---

## 12. Aset & Dokumen Terkait

| Aset | Lokasi |
|---|---|
| Dokumen ini | `HANDOVER-rumbela-web-app.md` |
| Referensi format Generator Soal | `referensi-generator-soal.md` |
| Skema data & normalisasi | `src/lib/types.ts` |
| Konstanta & helper tanggal/template | `src/lib/constants.ts` |

---

*Dokumen ini disusun sebagai serah terima pengembangan. Seluruh fitur pada §5 sudah diverifikasi di lingkungan produksi (Mode Demo) pada 10 November 2026.*
