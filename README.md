<p align="center">
  <img src="public/logo.webp" alt="Rumbela — Rumah Belajar Anak" width="180" />
</p>

<h1 align="center">Rumbela Web App v2.0</h1>
<p align="center"><b>Aplikasi admin bimbel</b> · Rumbela — Rumah Belajar Anak, Curup<br/>
Kelola siswa, iuran, absensi, jurnal, jadwal kelas, dan <b>laporan perkembangan bergambar</b> untuk orang tua.</p>

---

## ✨ Fitur v2.0

| Modul | Deskripsi |
|---|---|
| 🏠 **Beranda** | Ringkasan harian: kehadiran, iuran, tunggakan + pintasan cepat & pengingat WhatsApp |
| 👦 **Siswa** | Data lengkap siswa (program, jenjang, wali, WA, iuran) — auto-save |
| 💰 **Iuran** | Matriks 12 bulan per siswa (klik untuk ubah status) + rekap terkumpul + ingatkan via WA |
| ✅ **Absensi** | Absen harian (Hadir/Izin/Alpa), tombol *semua hadir*, rekap bulanan otomatis |
| 📓 **Jurnal** | Catatan kegiatan & progres per tanggal + kirim laporan harian via WA |
| 📊 **Laporan (baru!)** | **Laporan Perkembangan Siswa → gambar PNG siap kirim ke orang tua**, 3 template (Ceria / Klasik / Minimal), skor aspek bintang, catatan otomatis dari jurnal, unduh PNG & kirim WA |
| 🗓️ **Jadwal (baru!)** | Jadwal kelas mingguan per grup: grid hari × slot jam, warna per program, editor slot jam |
| 📚 **Materi** | Bank materi: tautan / unggah berkas ke folder Drive “Rumbela — Bank Materi” |
| ⚙️ **Pengaturan** | Profil lembaga, template laporan, whitelist email admin, ekspor/impor JSON, hapus data contoh |

### Sorotan teknis v2.0

- 🔐 **Login cukup sekali** — sesi Google (token + kedaluwarsa) tersimpan di perangkat. Membuka web lagi langsung masuk **tanpa popup apa pun**. Bila token kedaluwarsa, muncul banner *Sambung ulang* (satu klik) — **tidak pernah ada popup otomatis** (perbaikan bug v1).
- 💾 **Auto-save** — setiap perubahan tersimpan otomatis ke Google Drive (debounce 1,2 detik) dengan indikator status di header; flush otomatis saat tab ditutup.
- 🛡️ **Khusus admin** — satu akun Google pemilik; opsi *email admin* membatasi akun lain.
- 🖼️ **Logo baru** — identitas Rumbela 2026 di seluruh aplikasi + favicon/PWA icon.
- 📱 **Ramah mobile** — bottom nav 5 menu + sheet “Lainnya”, tanpa logo hosting yang menutupi form.
- 🧩 **Kompatibel data v1** — membaca & melanjutkan file `rumbela-database.json` lama tanpa migrasi manual.

## 🗄️ Penyimpanan data

Seluruh data disimpan sebagai **satu file `rumbela-database.json` di Google Drive akun admin** (scope `drive.file` — aplikasi hanya dapat melihat file yang ia buat sendiri). Tidak ada server, tidak ada database pihak ketiga.

```
rumbela-database.json
├── students[]    siswa (nama, program, wali, WA, iuran, grup, …)
├── payments{}    { siswaId: { "YYYY-MM": lunas|sebagian|belum } }
├── attendance{}  { "YYYY-MM-DD": { siswaId: H|I|A } }
├── reports{}     { "siswaId@YYYY-MM": { scores, note, sent } }
├── materials[]   bank materi
├── journal{}     { "YYYY-MM-DD": { activity, progress } }
├── jadwal        v2 → { slots[], kelas[], items[] }
└── pengaturan    v2 → profil lembaga, template laporan, email admin
```

## 🚀 Menjalankan lokal

```bash
bun install        # atau: npm install
bun run dev        # atau: npm run dev
```

Buka `http://localhost:3000` → **Mode Demo** bisa dicoba tanpa login.

## ☁️ Deploy ke Netlify (via GitHub)

1. Push repo ini ke GitHub (lihat langkah di bawah).
2. Netlify → *Add new site* → *Import an existing project* → pilih repo.
3. Netlify otomatis mendeteksi Next.js (build: `npm run build`). Deploy.
4. Buka **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID** milik Rumbela
   → tambahkan domain baru ke **Authorized JavaScript origins**:
   - `https://rumbela.netlify.app` (sudah ada)
   - `https://<nama-site>.netlify.app` (domain baru Anda)
5. Pastikan **Google Drive API** berstatus *Enabled* di project yang sama.

### Push ke GitHub

```bash
git remote add origin https://github.com/yori1201/rumbela-web-app.git
git branch -M main
git push -u origin main
```

## 🔧 Konfigurasi Google (ringkas)

- **OAuth Client ID** sudah tertanam (milik project Rumbela). Bila membuat client baru: jenis *Web application*, origin sesuai domain deploy.
- **Scope**: `https://www.googleapis.com/auth/drive.file`.
- Token akses berlaku ±1 jam; setelah itu banner *Sambung ulang* muncul di header — data terakhir tetap tampil dari cache perangkat.

## 🧱 Teknologi

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Google Identity Services + Drive API v3 · Canvas API (render laporan)

## 🗺️ Rencana lanjutan

- [ ] Mode offline penuh (service worker) & notifikasi
- [ ] Multi-pengajar dengan peran
- [ ] Ekspor laporan PDF rekap bulanan
- [ ] Pengingat iuran otomatis terjadwal

---

© 2026 Rumbela — Rumah Belajar Anak · Curup, Bengkulu
