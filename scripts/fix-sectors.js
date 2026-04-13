/**
 * fix-sectors.js
 * Detecteaza si seteaza sectorul pentru afterschool-urile fara sector
 * din adresa (text "Sector X") sau cod postal (01-06 = sectoarele 1-6).
 *
 * Rulare: node scripts/fix-sectors.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const db = new Database(DB_PATH);

const rows = db.prepare('SELECT id, name, address, sector FROM afterschools').all();
const update = db.prepare('UPDATE afterschools SET sector = ? WHERE id = ?');

let updated = 0;
let skipped = 0;

for (const row of rows) {
  const text = (row.address || '') + ' ' + (row.name || '');

  let found = null;

  // 1. Cauta 'Sector X' sau 'sector X' in adresa sau nume
  const sectorMatch = text.match(/[Ss]ector(?:ul)?\s*([1-6])/);
  if (sectorMatch) found = parseInt(sectorMatch[1]);

  // 2. Daca nu, extrage codul postal si mapeaza la sector
  if (!found) {
    const postalMatch = text.match(/\b(0[1-6])\d{4}\b/);
    if (postalMatch) {
      const map = { '01': 1, '02': 2, '03': 3, '04': 4, '05': 5, '06': 6 };
      found = map[postalMatch[1]] || null;
    }
  }

  if (found && found !== row.sector) {
    update.run(found, row.id);
    updated++;
    console.log(`✅ [${row.id}] ${row.name} → Sector ${found}`);
  } else if (!found) {
    skipped++;
  }
}

console.log(`\n📊 Rezultate:`);
console.log(`   ✅ Actualizate: ${updated}`);
console.log(`   ⏭  Nesolutionate (Ilfov/lipsa date): ${skipped}`);

const bySector = db.prepare('SELECT sector, COUNT(*) as cnt FROM afterschools GROUP BY sector ORDER BY sector').all();
console.log('\nDistributie finala:');
bySector.forEach(r => console.log(`   Sector ${r.sector || 'NULL'}: ${r.cnt}`));
const total = db.prepare('SELECT COUNT(*) as cnt FROM afterschools').get();
console.log(`   TOTAL: ${total.cnt}`);
