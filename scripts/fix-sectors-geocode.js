// Repara sectorul lipsa (NULL) prin reverse-geocoding Nominatim (address.city_district = "Sector N").
// Ruleaza pe toate cele 5 tabele. Respecta rate-limit-ul Nominatim (max 1 req/sec).
// Randurile care raman fara sector dupa geocodare sunt in Ilfov (nu au sector) - ramase NULL, corect.
const Database = require('better-sqlite3');

const DB_PATH = '/var/www/afterschool-v4/data/afterschool.db';
const TABLES = ['afterschools', 'clubs', 'kindergartens', 'professionals', 'caterers'];
const UA = 'activkids.ro-sector-fix/1.0 (contact: bogdan.bratu@dontpayfull.com)';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function extractSector(data) {
  // Nominatim pune "Sector N" fie sub city_district, fie sub district, dupa caz -
  // cautam tiparul in toate valorile de adresa in loc sa ne bazam pe o singura cheie fixa.
  const addr = data?.address || {};
  for (const v of Object.values(addr)) {
    if (typeof v !== 'string') continue;
    const m = v.match(/Sector\s*([1-6])\b/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

async function main() {
  const db = new Database(DB_PATH);
  let totalUpdated = 0, totalSkipped = 0, totalErrors = 0;

  for (const table of TABLES) {
    const rows = db.prepare(
      `SELECT id, lat, lng FROM ${table} WHERE sector IS NULL AND lat IS NOT NULL AND lng IS NOT NULL`
    ).all();
    if (!rows.length) { console.log(`${table}: nimic de facut.`); continue; }

    const upd = db.prepare(`UPDATE ${table} SET sector = ? WHERE id = ?`);
    let updated = 0, skipped = 0, errors = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const data = await reverseGeocode(r.lat, r.lng);
        const sector = extractSector(data);
        if (sector) { upd.run(sector, r.id); updated++; } else { skipped++; }
      } catch (e) {
        errors++;
        console.log(`  ! eroare id=${r.id}: ${e.message}`);
      }
      if ((i + 1) % 50 === 0) console.log(`  ${table}: ${i + 1}/${rows.length} procesate...`);
      await sleep(1100);
    }
    console.log(`${table}: ${updated} actualizate, ${skipped} fara sector (probabil Ilfov), ${errors} erori.`);
    totalUpdated += updated; totalSkipped += skipped; totalErrors += errors;
  }

  console.log(`\nTOTAL: ${totalUpdated} actualizate, ${totalSkipped} fara sector, ${totalErrors} erori.`);
  db.close();
}

main();
