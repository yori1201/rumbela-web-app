/* Sanity check logika jatuh tempo & template jurnal */
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const DAYS = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

const dueDateOf = (y, m, day) => {
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(Math.max(1, day), last));
};
const fmtDayDate = (d) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const fmtDayDateShort = (d) => `${DAYS[d.getDay()].slice(0,3)}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;

// Skenario: hari ini 5 Nov 2026, jt = 5 (default)
const now = new Date(2026, 10, 5); // Nov 5, 2026
const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const jt = 5;

console.log("Hari ini:", fmtDayDate(today0));

// siswa belum lunas → jatuh tempo bulan ini
const d1 = dueDateOf(2026, 10, jt);
console.log("Belum lunas →", fmtDayDate(d1), "| inDays =", Math.round((d1 - today0) / 86400000), "(harus 0 = hari ini)");

// siswa lunas → bulan depan
let y = now.getFullYear(), m = now.getMonth();
y += m === 11 ? 1 : 0; m = (m + 1) % 12;
const d2 = dueDateOf(y, m, jt);
console.log("Lunas →", fmtDayDate(d2), "| inDays =", Math.round((d2 - today0) / 86400000));

// jt = 31 di Februari → klem ke 28
console.log("jt 31 Feb 2027 →", fmtDayDate(dueDateOf(2027, 1, 31)), "(harus 28 Feb)");

// jt = 31 di bulan 30 hari
console.log("jt 31 Apr 2027 →", fmtDayDate(dueDateOf(2027, 3, 31)), "(harus 30 Apr)");

// uji keterlambatan: today 20 Nov, jt 5
const late = Math.round((new Date(2026, 10, 20) - dueDateOf(2026, 10, 5)) / 86400000);
console.log("Terlambat hari (20 Nov vs jt 5):", late, "(harus 15)");

// uji fillTemplate
const DEFAULT_TEMPLATE_WA = `Assalamu'alaikum Bapak/Ibu {orangtua},\n\nBerikut laporan harian ananda *{nama}* ({program}) — *{hari}, {tanggal}* di {lembaga}:\n\n• Kehadiran: {kehadiran}\n• Kegiatan: {kegiatan}\n• Catatan progres: {progres}\n{rekap}\nTerima kasih atas dukungannya di rumah 🙏`;
const fillTemplate = (tpl, vars) => {
  let out = tpl || "";
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(v ?? "");
  return out.split("\n").map((l) => l.replace(/[ \t]+$/, "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
};
const vars = { nama: "Aisyah", orangtua: "Ibu Ratna", program: "Calistung Ceria", hari: "Kamis", tanggal: "5 November 2026", kehadiran: "Hadir 👍", kegiatan: "Latihan suku kata", progres: "Makin lancar", rekap: "", lembaga: "Rumbela" };
console.log("\n--- Template tanpa rekap ---\n" + fillTemplate(DEFAULT_TEMPLATE_WA, vars));
console.log("\n--- Template dengan rekap ---\n" + fillTemplate(DEFAULT_TEMPLATE_WA, { ...vars, rekap: "Rekap kehadiran bulan ini: 92%." }));
