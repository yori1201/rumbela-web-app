# Referensi Format & Layout Generator Soal — Rumbela v2.1

Dokumen teknis ini memetakan secara menyeluruh struktur data, jenis soal, bank
generator, layout A4 (tema Klasik & Ceria), kop/footer, serta alur cetak yang
dipakai modul **Generator Soal & Worksheet**. Bertujuan sebagai acuan tunggal
untuk penambahan generator baru, penyesuaian layout, maupun audit konsistensi.

> Sumber kebenaran: `src/lib/types.ts`, `src/lib/generatorSoal.ts`,
> `src/lib/renderWorksheet.ts`, `src/components/views/soal.tsx`,
> `src/app/globals.css`.

---

## 1. Arsitektur Singkat

```
Form (soal.tsx)
  ├── mode "otomatis" → generateQuestions() → WorksheetQ[]
  └── mode "manual"   → editor tulis-sendiri → WorksheetQ[]
        │
        ▼
   Objek Worksheet (state)
        │
        ├── Pratinjau layar  → <SheetHTML> / <SheetCeria>   (HTML, 794×1123px)
        ├── Cetak PDF        → window.print() + CSS @media print (#print-area)
        ├── Unduh PNG        → renderWorksheetCanvas() → <canvas> → blob
        └── Arsip Google Drive → mutate(db.worksheets.unshift)
```

Dua jalur render yang HARUS konsisten:

| Jalur       | File                  | Lebar canvas | Catatan                                  |
| ----------- | --------------------- | ------------ | ---------------------------------------- |
| Layar & PDF | `soal.tsx` (JSX)      | 794 px       | Dipakai untuk pratinjau & `window.print` |
| PNG/arsip   | `renderWorksheet.ts`  | 1000 px      | Canvas murni, untuk unduh PNG            |

Keduanya mengikuti spesifikasi layout yang sama (kop, judul, identitas, soal,
footer) — hanya berbeda medium. Setiap perubahan layout harus disinkronkan di
kedua file.

---

## 2. Model Data

### 2.1 Tipe inti (`src/lib/types.ts`)

```ts
export type SoalKind = "pg" | "isian" | "uraian";

export interface WorksheetQ {
  id: string;
  text: string;            // badan soal
  kind: SoalKind;          // pg | isian | uraian
  options?: string[];      // hanya untuk kind="pg" → 4 opsi (a–d)
  answer: string;          // kunci jawaban
}

export interface Worksheet {
  id: string;
  createdAt: string;       // YYYY-MM-DD
  mapel: string;           // label mapel, mis. "Matematika"
  jenjang: string;         // "SD" | "SMP" | "SMA"
  kelas: string;           // "1".."12" atau ""
  topik: string;           // judul worksheet
  petunjuk: string;        // kotak petunjuk (opsional, "" = disembunyikan)
  questions: WorksheetQ[]; // soal-soal (yang kosong otomatis difilter)
  kunci: boolean;          // cetak lembar kunci jawaban?
}
```

### 2.2 Tipe generator otomatis (`src/lib/generatorSoal.ts`)

```ts
export interface GenSoal { q: string; a: string; }   // output satu soal

export interface TopikDef {
  id: string;                              // mis. "sd-tambah-20"
  label: string;                           // mis. "Penjumlahan (sampai 20)"
  gen: (lv: number, R: () => number) => GenSoal;   // lv = kesulitan 1|2|3
}

export type GenMapel = "matematika" | "calistung" | "english" | "coding";

export interface GenMapelDef {
  id: GenMapel;
  label: string;            // "Matematika" | "Calistung Ceria" | ...
  rentang: string;          // mis. "SD · SMP · SMA"
  jenjang: string[];        // jenjang yang tersedia
}

export type Kesulitan = 1 | 2 | 3;   // 1=mudah, 2=sedang, 3=sulit
```

### 2.3 Helper aritmetika (internal generator)

| Nama  | Fungsi                                                       |
| ----- | ------------------------------------------------------------ |
| `ri`  | bilangan bulat acak `a..b` inklusif                          |
| `pick`| pilih elemen acak dari array                                |
| `S`   | skala kesulitan: `S(lv, base, inc) = base × (1 + (lv−1)×inc)` |
| `GCD` / `LCM` | FPB / KPK                                          |
| `simp` | sederhanakan pecahan `p/q` → `"3/4"` atau `"5"`            |
| `idn` | desimal gaya Indonesia (`3.5` → `"3,5"`)                    |

---

## 3. Tiga Jenis Soal — Schema & Aturan Render

Konstanta huruf opsi: `LETTERS = ["a","b","c","d"]` (di `soal.tsx`) dan
`HURUF = ["a","b","c","d"]` (di `renderWorksheet.ts`).

### 3.1 PG — Pilihan Ganda

| Atribut       | Nilai                                              |
| ------------- | -------------------------------------------------- |
| `kind`        | `"pg"`                                             |
| `options`     | Wajib, **maks 4 opsi** (a–d). Lebih dari 4 dipotong. |
| `answer`      | Salah satu huruf `"a".."d"` (kecil).               |
| Tampil di soal | Opsi dalam grid **2 kolom** bila muat; sebaliknya 1 kolom. Setiap opsi: lingkaran berhuruf + teks. |
| Tampil di kunci | `answer.toUpperCase()` → mis. `"B"`             |
| Tinggi ruang jawaban | 44 px (canvas) / grid 2-kolom (HTML)        |

### 3.2 Isian — Isian Singkat

| Atribut       | Nilai                                              |
| ------------- | -------------------------------------------------- |
| `kind`        | `"isian"`                                          |
| `options`     | tidak dipakai                                      |
| `answer`      | teks singkat                                       |
| Tampil di soal | **Satu garis titik-titik** di bawah soal. Bila muat, kotak jawaban rounded bisa sebaris dengan teks terakhir (canvas). |
| Tampil di kunci | `answer` apa adanya                           |
| Tinggi ruang jawaban | 58 px (canvas) / 1 garis (HTML)             |

### 3.3 Uraian — Jawaban Panjang

| Atribut       | Nilai                                              |
| ------------- | -------------------------------------------------- |
| `kind`        | `"uraian"`                                         |
| `options`     | tidak dipakai                                      |
| `answer`      | teks panjang (kunci)                               |
| Tampil di soal | **Tiga garis titik-titik** untuk menjawab        |
| Tampil di kunci | `answer` (dibungkus baris bila panjang)       |
| Tinggi ruang jawaban | 118 px (canvas) / 3 garis (HTML)            |

> Aturan filter: soal dengan `text` kosong **otomatis dibuang** sebelum render
> maupun arsip (lihat `qs.filter` di `soal.tsx`).

---

## 4. Empat Bank Generator Otomatis

Pemetaan terpusat pada satu tabel:

```ts
export const TOPIK_GENERATOR: Record<GenMapel, Record<string, Record<string, TopikDef[]>>> = {
  matematika: TOPIK_MATEMATIKA,
  calistung:  TOPIK_CALISTUNG,
  english:    TOPIK_ENGLISH,
  coding:     TOPIK_CODING,
};
```

Struktur: `TOPIK_GENERATOR[mapel][jenjang][kelas] → TopikDef[]`.

### 4.1 `GEN_MAPEL` — peta ringkas

| id           | label                 | rentang          | jenjang         |
| ------------ | --------------------- | ---------------- | --------------- |
| `matematika` | Matematika            | SD · SMP · SMA   | SD, SMP, SMA    |
| `calistung`  | Calistung Ceria       | SD kelas 1–3     | SD              |
| `english`    | Bahasa Inggris Dasar  | SD kelas 1–6     | SD              |
| `coding`     | Worksheet Coding      | SD 4–6 · SMP     | SD, SMP         |

### 4.2 Matematika — `TOPIK_MATEMATIKA` (30+ topik)

| Jenjang | Kelas | Topik (id)                                                            |
| ------- | ----- | --------------------------------------------------------------------- |
| SD      | 1     | tambah-20, kurang-20, campur-20                                       |
| SD      | 2     | tambah-100, kurang-100, kali-dasar                                    |
| SD      | 3     | kali-bag, tambah-1000, kurang-1000                                    |
| SD      | 4     | operasi-campur, kali-2digit, bagi-sisa                                |
| SD      | 5     | pecahan-senilai, desimal-tambah, kpk-fpb-mudah, operasi-campur        |
| SD      | 6     | persen, kpk-fpb, desimal-kali, cacah-campur                           |
| SMP     | 7     | bil-bulat, pecahan-7, aljabar-sederhana, plsv                         |
| SMP     | 8     | spldv, pythagoras, plsv-kurung, bil-bulat                             |
| SMP     | 9     | eksponen-9, akar-9, pk-faktor, pola-barisan                           |
| SMA     | 10    | eks-log, pk-10, barisan-arit                                          |
| SMA     | 11    | fungsi-kuadrat, geometri-11, polinom-11                               |
| SMA     | 12    | turunan-12, integral-12, limit-12                                     |

### 4.3 Calistung Ceria — `TOPIK_CALISTUNG` (SD 1–3)

Baca/tulis/hitung dasar dengan gaya anak. Topik per kelas:

| Kelas | Topik                                                                |
| ----- | -------------------------------------------------------------------- |
| 1     | lingkari-huruf, suku-kata-2, kata-hilang, hitung-bintang, tambah-gambar |
| 2     | lanjut-hitung, operasi-100-ceria, bentuk-benda, lawan-kata, suku-kata-2 |
| 3     | kali-ceria, baca-jam, uang-ceria, persamaan-kata, kata-hilang         |

### 4.4 Bahasa Inggris Dasar — `TOPIK_ENGLISH` (SD 1–6)

Bank kosakata `VOK` 8 kelompok (warna, sapaan, hewan, buah, keluarga, tubuh,
kelas, kerja) + topik terstruktur:

| Kelas | Topik                                                |
| ----- | ---------------------------------------------------- |
| 1     | abjad, angka-dasar (1–10), warna, sapaan             |
| 2     | hewan, buah, angka-dasar, sapaan                     |
| 3     | keluarga, tubuh, hewan, buah                         |
| 4     | tubuh, kelas, hari-inggris, keluarga                 |
| 5     | kerja, kelas, hari-inggris, puluhan (20–100)         |
| 6     | kerja, puluhan, tobe (is/am/are), hari-inggris       |

Arah terjemahan bergantung kesulitan: `lv=1` ID→EN, `lv=3` EN→ID, `lv=2` campur.

### 4.5 Worksheet Coding — `TOPIK_CODING` (SD 4–6, SMP 7–9)

Berpikir komputasional tanpa sintaks bahasa:

| Jenjang | Kelas | Topik                                                     |
| ------- | ----- | --------------------------------------------------------- |
| SD      | 4     | urutan-robot, pola-ulang, logika-if, langkah-loop         |
| SD      | 5     | pola-ulang, logika-if, biner-dasar, var-sederhana         |
| SD      | 6     | biner-dasar, var-sederhana, langkah-loop, pola-ulang      |
| SMP     | 7     | var-berantai, loop-akumulasi, boolean-cek                 |
| SMP     | 8     | var-berantai, loop-akumulasi, modulo, boolean-cek         |
| SMP     | 9     | modulo, loop-akumulasi, debug-output, var-berantai        |

### 4.6 Algoritma `generateQuestions`

```ts
generateQuestions(mapel, topikId, jenjang, kelas, n, kesulitan): GenSoal[]
```

1. Cari `TopikDef` di `TOPIK_GENERATOR[mapel][jenjang][kelas]` berdasarkan `topikId`.
2. Bila tidak ditemukan → return `[]`.
3. Loop hingga terkumpul `n` soal **unik** (key = `q`, dedup via `Set`).
4. Guard anti-infinite-loop: maks `n × 40` percobaan.
5. Output: `GenSoal[]` dengan `{ q, a }` masing-masing.

> Catatan: generator otomatis **selalu menghasilkan `kind` isian** (teks `q` +
> jawaban `a`). Mode PG/uraian hanya muncul di mode manual.

---

## 5. Layout A4 — Konstanta Umum

### 5.1 Canvas PNG (`renderWorksheet.ts`)

| Konstanta | Nilai      | Keterangan                         |
| --------- | ---------- | ---------------------------------- |
| `W`       | 1000 px    | lebar canvas (rasio A4 √2 ≈ 1.414) |
| `PAD`     | 70 px      | padding kiri/kanan konten          |
| `OR`      | `#0369a1`  | sky-700 — warna utama (judul, nomor) |
| `SKY`     | `#0284c7`  | sky-600 — aksen                    |
| `INK`     | `#1e293b`  | slate-800 — teks soal              |
| `BODY`    | `#64748b`  | slate-500 — teks meta              |
| `MUT`     | `#94a3b8`  | slate-400 — teks redup/kop         |
| `LINE`    | `#94a3b8`  | garis titik-titik                  |
| Logo      | `/logo.webp` (1000×919, rasio 0.92) | dimuat via `loadLogo()` |
| Font      | `Nunito` (harus `await document.fonts.ready` sebelum render) | |

Tinggi `H` **dinamis**, minimum `1414 px` (rasio A4), maksimum `30000 px`,
dihitung dari estimasi konten (`estimasiCeria` / akumulasi `spaceH`).

### 5.2 HTML pratinjau (`soal.tsx`)

| Kelas Tailwind                       | Ekuivalen                  |
| ------------------------------------ | -------------------------- |
| `w-[794px]`                          | lebar sheet (A4 @ 96dpi)   |
| `min-h-[1123px]` (`style.minHeight`) | tinggi minimal A4          |
| `p-12`                               | padding 48 px              |
| `ring-1 ring-slate-200`              | border tipis               |

---

## 6. Layout A4 — Tema Klasik (default)

Dipakai untuk semua mapel KECUALI yang masuk `isCeria()` (lihat §7).

### 6.1 Selektor tema

```ts
function isCeria(ws): boolean {
  if (CERIA_MAPEL.includes(ws.mapel)) return true;   // Calistung/English/Coding
  return ws.mapel === "Matematika" && ws.jenjang === "SD"
      && Number(ws.kelas) >= 1 && Number(ws.kelas) <= 3;
}
```

`CERIA_MAPEL = ["Calistung Ceria", "Bahasa Inggris Dasar", "Worksheet Coding"]`.

> **Implikasi:** mapel `Matematika` SD kelas 1–3 otomatis pakai tema Ceria.
> Mapel lain (Bahasa Indonesia, IPA, dll.) selalu Klasik.

### 6.2 Urutan blok — Lembar Soal (Klasik)

```
┌──────────────────────────────────────────────┐
│ [LOGO /logo.webp]              [tanggal]      │  ← kop (PAD,46)..(W-PAD,74)
│                                               │
│ WORKSHEET · <MAPEL>                           │  ← kicker (font 800 17px, MUT)
│ <Topik>                                       │  ← judul (font 800 31px, OR)
│ <jenjang> · Kelas <x> · <n> soal   [sapaan]   │  ← meta + "Selamat mengerjakan!"
│                                               │
│ Nama : ................   Kelas : ...........  │  ← identitas (garis titik)
│                                               │
│ [petunjuk dalam kotak sky-50, opsional]       │
│                                               │
│ 1. <teks soal>                                │
│    a. ...   b. ...   (PG grid 2-kolom)        │
│    ___garis titik___ (isian/uraian)           │
│ 2. ...                                        │
│ ...                                           │
│                                               │
│              Rumbela <tahun>                  │  ← footer (H-70, tengah)
└──────────────────────────────────────────────┘
```

- **Nomor soal:** font `800 22px Nunito`, warna `OR`, di `x = PAD`.
- **Teks soal:** font `600 22px Nunito`, warna `INK`, indent `PAD + 42`.
- **Wrap teks:** `wrapLines(ctx, text, W - PAD*2 - 60)`.
- **Opsi PG:** grid 2-kolom bila setiap opsi muat `< (W-PAD*2)/2 − 60`; tiap opsi
  didahului lingkaran `r=8` berhuruf `a..d`.
- **Garis jawaban isian:** 1 garis titik (`dotted`, dash `[3,7]`, lebar 1.6).
- **Garis jawaban uraian:** 3 garis titik, spasi 34 px.

### 6.3 Urutan blok — Lembar Kunci Jawaban (sama untuk semua mapel)

```
┌──────────────────────────────────────────────┐
│ [LOGO]                          [tanggal]     │  ← kop
│ KUNCI JAWABAN · <MAPEL>                       │  ← kicker
│ <Topik>                                       │  ← judul (font 800 31px, OR)
│ KUNCI JAWABAN                                 │  ← font 800 24px, #16a34a (hijau)
│                                               │
│ 1. <ans>          2. <ans>                    │  ← grid 2-kolom
│ 3. <ans>          4. <ans>                    │     nomor font 800 22px OR
│ ...                                           │     jawaban font 700 22px INK
│                                               │
│              Rumbela <tahun>                  │  ← footer (H-70)
└──────────────────────────────────────────────┘
```

- Tinggi minimum: `max(1414, 620 + ceil(n/2)*74 + 150)`.
- PG → tampil huruf besar (`answer.toUpperCase()`).
- Jawaban panjang di-wrap per kolom (`colW = (W-PAD*2)/2`).

---

## 7. Layout A4 — Tema Ceria (anak SD)

Dipakai otomatis bila `isCeria(ws) === true`. Hanya berlaku untuk **lembar soal**
(lembar kunci tetap memakai layout §6.3).

### 7.1 Palet & elemen dekoratif

| Elemen        | Nilai                                                        |
| ------------- | ------------------------------------------------------------ |
| Langit        | `#dcf0fd` (seluruh background)                               |
| Awan          | 3 lingkaran putih semi-transparan, ditempatkan statis       |
| Judul pelangi | tiap karakter diwarnai siklis `PELANGI = [orange, hijau, biru, pink, kuning, ungu]` |
| Pil "Materi"  | kotak kuning `#fde047`, teks cokelat `#92400e`, rounded penuh |
| Info bar      | kotak putih 92% opacity, border `#7dd3fc`                   |
| Kotak soal    | siklis 5 warna pastel (hijau/pink/ungu/kuning/biru)         |
| Badge nomor   | lingkaran padat warna badge, angka putih                    |
| Footer        | 2 bukit hijau (`#86efac`, `#4ade80`) + bintang + pita biru "Belajar di Rumbela, Yuk!" |

### 7.2 Urutan blok — Lembar Soal (Ceria)

```
┌────────────────────────────────────────────────────┐
│ [awan]                                              │
│ ┌─────────┐  WORKSHEET RUMBELA                      │
│ │  LOGO   │  <Topik (huruf pelangi, 2 baris max)>   │
│ │ 166×153 │  <jenjang> · Kelas <x> · <n> soal       │
│ └─────────┘                                         │
│ [Materi: <mapel>]  ← pil kuning rounded             │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Nama : .........     Tanggal : ...............  │ │ ← info bar
│ └─────────────────────────────────────────────────┘ │
│ [petunjuk dalam kotak kuning pastel, opsional]      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ (1) <teks soal>                                 │ │ ← kotak pastel
│ │     a. ...   b. ...                             │ │   + badge bulat
│ │     [kotak jawaban rounded] / garis titik       │ │   berwarna
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ (2) ...                                         │ │
│ └─────────────────────────────────────────────────┘ │
│ [bukit hijau + bintang]                             │
│      ╭─ Belajar di Rumbela, Yuk! ─╮  ← pita biru    │
└────────────────────────────────────────────────────┘
```

### 7.3 Geometri kunci (canvas)

| Elemen             | Posisi / ukuran                                   |
| ------------------ | ------------------------------------------------- |
| Kartu logo         | `rr(PAD, 40, 200, 186, 20)`; logo `166×153` di `(PAD+17, 56)` |
| Judul mulai        | `tx = PAD + 226`                                  |
| Pil Materi         | `rr(PAD, 234, mw+48, 38, 19)`                     |
| Info bar           | `rr(PAD, 292, W-PAD*2, 56, 14)`                   |
| `Nama :`           | `(PAD+24, 328)`, garis `(PAD+104)..(470, 330)`    |
| `Tanggal :`        | `(520, 328)`, garis `(632)..(W-PAD-24, 330)`      |
| Lebar teks soal    | `textMaxW = (W-PAD-24) - (PAD+64)`                |
| Kotak jawaban isian| `170 × 46 px`, rounded 10, border `#38bdf8`       |
| Opsi PG            | grid 2-kolom bila setiap opsi `< textMaxW/2 − 50` |
| Badge nomor        | lingkaran `r=16` di `(PAD+36, y+kotakH/2)`        |
| Footer             | mulai `H-150`; pita `54 px` tinggi, rounded penuh |

---

## 8. Kop (Header) & Footer — Spesifikasi

### 8.1 Kop / Header

- **Logo:** `/logo.webp` (logo penuh Rumbela, bukan logo round).
  - Canvas: `235 × 216 px` (rasio 0.92) di `(PAD, 46)`.
  - HTML: `width={225} height={207}` (rasio sama).
- **Tanggal:** kanan atas, format `"2 November 2026"` (`id-ID`), warna `MUT`
  (canvas font `500 17px Nunito` / HTML `text-[11px]`).
- **Di tema Ceria:** logo dibungkus kartu putih rounded 20 px `200×186`, tanggal
  tidak ditampilkan (info bar sudah ada kolom Tanggal).

### 8.2 Footer

- **Tema Klasik & Kunci:** teks tengah bawah `"Rumbela <tahun>"`,
  warna `MUT`, font `500 18px Nunito`, di `y = H − 70` (canvas) /
  `bottom-7` (HTML).
- **Tema Ceria:** blok dekoratif di `H − 150`:
  - Bukit hijau: elips `#86efac` (kiri) + `#4ade80` (kanan).
  - 4 bintang kuning (`#fbbf24` / `#fde047`).
  - Pita biru `#0284c7` rounded penuh bertuliskan **"Belajar di Rumbela, Yuk!"**
    (font `800 26px Nunito`, putih), dengan 1 bintang di tiap ujung.

---

## 9. Alur Cetak (Print Flow)

### 9.1 Pemanggilan

```ts
const cetak = () => { if (!sheet) return; window.print(); };
```

Tombol "Cetak" memanggil `window.print()`; sisanya diatur CSS.

### 9.2 CSS `@media print` (`src/app/globals.css`)

```css
@media print {
  @page { size: A4 portrait; margin: 10mm; }
  body * { visibility: hidden !important; }
  #print-area, #print-area * { visibility: visible !important; }
  #print-area {
    position: absolute !important;
    left: 0 !important; top: 0 !important;
  }
  .sheet-scroll { overflow: visible !important; background: none !important; padding: 0 !important; }
  #print-area .sheet {
    width: 100% !important; max-width: none !important;
    min-height: auto !important;
    box-shadow: none !important; outline: none !important;
    page-break-after: always;
  }
  #print-area .sheet:last-child { page-break-after: auto; break-after: auto; }
  #print-area .print\:space-y-0 > * + * { margin-top: 0 !important; }
}
```

### 9.3 Struktur DOM cetak

```tsx
<div id="print-area">
  <div className="sheet-scroll">
    <div className="space-y-6 print:space-y-0">
      {isCeria(sheet) ? <SheetCeria ws={sheet} /> : <SheetHTML ws={sheet} jenis="soal" />}
      {sheet.kunci && <SheetHTML ws={sheet} jenis="kunci" />}
    </div>
  </div>
</div>
```

- Setiap `.sheet` → satu halaman A4 (page-break-after).
- Lembar kunci hanya dirender bila `sheet.kunci === true`.
- Pada mode cetak: shadow, ring, scroll dinonaktifkan; lebar 100%.

### 9.4 Unduh PNG (alternatif cetak)

```ts
const canvas = await renderWorksheetCanvas(sheet, peng, jenis); // "soal" | "kunci"
const blob = canvasToBlob(canvas);
// download: rumbela-<slug(topik)>-<jenis>.png
```

`renderWorksheetCanvas` memilih layout: `kunci` → lembar kunci; `soal` + `isCeria`
→ `gambarCeriaSoal`; `soal` + non-ceria → layout Klasik. Semua render via
`<canvas>` murni (tidak butuh DOM).

---

## 10. Peta File Penting

| File                              | Peran                                               |
| --------------------------------- | --------------------------------------------------- |
| `src/lib/types.ts`                | Definisi `Worksheet`, `WorksheetQ`, `SoalKind`, `Pengaturan`, `Database` |
| `src/lib/generatorSoal.ts`        | 4 bank generator (`TOPIK_*`), `GEN_MAPEL`, `generateQuestions`, `kelasTersedia`, `topikLabel`, `KELAS_BY_JENJANG`, `MAPEL_LIST` |
| `src/lib/renderWorksheet.ts`      | `renderWorksheetCanvas` (PNG), `isCeria`, `slugify`; berisi layout Klasik + Ceria + Kunci dalam canvas |
| `src/components/views/soal.tsx`   | View: form otomatis/manual, `SheetHTML`, `SheetCeria`, `#print-area`, `cetak`, `unduhPng`, `simpan`, arsip |
| `src/app/globals.css`             | `@media print` + `.sheet-scroll` (responsive)       |

---

## 11. Catatan untuk Penambahan Generator Baru

Bila ingin menambah mapel generator baru (mis. "Bahasa Indonesia Otomatis"):

1. **Tipe:** tambah id ke `GenMapel` di `generatorSoal.ts`.
2. **Daftar:** tambah entri ke `GEN_MAPEL` (label, rentang, jenjang).
3. **Topik:** buat `const TOPIK_INDONESIA: Record<string, Record<string, TopikDef[]>>`
   dengan pola `{ SD: { "1": [...], ... }, SMP: {...} }`. Tiap `TopikDef` wajib
   punya `id`, `label`, dan `gen(lv, R) => GenSoal`.
4. **Daftarkan:** tambah `indonesia: TOPIK_INDONESIA` ke `TOPIK_GENERATOR`.
5. **Tema:** bila mapel ini khusus anak SD kelas rendah, tambahkan labelnya ke
   `CERIA_MAPEL` di `renderWorksheet.ts` agar otomatis pakai tema Ceria.
6. **Tidak perlu** mengubah `soal.tsx` — UI membaca `GEN_MAPEL` & `TOPIK_GENERATOR`
   secara dinamis (dropdown mapel, jenjang, kelas, topik semua terisi otomatis).
7. **Validasi:** `tsc --noEmit` + `next build` sebelum commit.

---

## 12. Ringkasan Konvensi

- **3 jenis soal** (`pg` / `isian` / `uraian`) — satu `WorksheetQ` per soal,
  kunci di `answer`.
- **4 bank generator** — `matematika`, `calistung`, `english`, `coding`; masing-
  masing dipetakan per jenjang → kelas → `TopikDef[]`.
- **2 tema layout** — Klasik (default) & Ceria (anak SD / mapel ceria). Lembar
  kunci **selalu** Klasik.
- **2 jalur render** — HTML (layar + PDF via `window.print`) & Canvas (PNG unduh).
  Layout harus disinkronkan.
- **Kop** = logo penuh `/logo.webp` + tanggal; **footer** = `"Rumbela <tahun>"`
  (Klasik) atau pita "Belajar di Rumbela, Yuk!" (Ceria).
- **Cetak** = `window.print()` + `@media print` yang mengisolasi `#print-area`.
- **Filter soal kosong** otomatis sebelum render & arsip.
