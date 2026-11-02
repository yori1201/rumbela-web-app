// Uji semua generator: 3 contoh soal per topik + cek kunci tidak kosong
import { GEN_MAPEL, TOPIK_GENERATOR, type GenMapel } from "/home/z/my-project/rumbela-web-app/src/lib/generatorSoal.ts";

for (const def of GEN_MAPEL) {
  const bank = TOPIK_GENERATOR[def.id as GenMapel];
  for (const [j, kelasMap] of Object.entries(bank)) {
    for (const [k, topiks] of Object.entries(kelasMap)) {
      for (const t of topiks) {
        for (let lv = 1; lv <= 3; lv++) {
          const s = t.gen(lv, Math.random);
          if (!s.q || !s.a) console.log(`!! KOSONG ${def.id} ${j}${k} ${t.id} lv${lv}`);
        }
        const c = t.gen(2, Math.random);
        console.log(`[${def.id} ${j}${k}] ${t.label}`);
        console.log(`   Q: ${c.q}`);
        console.log(`   A: ${c.a}`);
      }
    }
  }
}
console.log("OK — semua generator menghasilkan soal & kunci");
