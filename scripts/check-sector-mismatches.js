// Verifica randurile cu sector deja completat impotriva sectorului real derivat din lat/lng
// (reverse-geocoding Nominatim), ca sa gasim cazuri gen "3 Continente" (sector inregistrat gresit
// fata de coordonate). NU scrie nimic - doar logheaza discrepantele pentru revizuire manuala.
const Database = require('better-sqlite3');

const DB_PATH = '/var/www/afterschool-v4/data/afterschool.db';
const TABLES = ['afterschools', 'clubs', 'kindergartens', 'caterers'];
const UA = 'activkids.ro-sector-audit/1.0 (contact: bogdan.bratu@dontpayfull.com)';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function extractSector(data) {
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
  const mismatches = [];
  let totalChecked = 0, totalMismatch = 0, totalNoResult = 0, totalErrors = 0;

  for (const table of TABLES) {
    const rows = db.prepare(
      `SELECT id, name, sector, lat, lng FROM ${table} WHERE sector IS NOT NULL AND lat IS NOT NULL AND lng IS NOT NULL AND lat != 0 AND lng != 0`
    ).all();
    if (!rows.length) { console.log(`${table}: nimic de verificat.`); continue; }
    console.log(`${table}: ${rows.length} randuri de verificat...`);

    let checked = 0, mismatch = 0, noResult = 0, errors = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const data = await reverseGeocode(r.lat, r.lng);
        const realSector = extractSector(data);
        checked++;
        if (realSector === null) {
          noResult++; // probabil Ilfov real, sau punct ambiguu - nu il tratam ca eroare
        } else if (realSector !== r.sector) {
          mismatch++;
          const m = { table, id: r.id, name: r.name, recorded: r.sector, real: realSector, lat: r.lat, lng: r.lng };
          mismatches.push(m);
          console.log(`  MISMATCH: ${table}#${r.id} "${r.name}" inregistrat=S${r.sector} real=S${realSector}`);
        }
      } catch (e) {
        errors++;
        console.log(`  ! eroare id=${r.id}: ${e.message}`);
      }
      if ((i + 1) % 50 === 0) console.log(`  ${table}: ${i + 1}/${rows.length} procesate...`);
      await sleep(1100);
    }
    console.log(`${table}: ${checked} verificate, ${mismatch} discrepante, ${noResult} fara rezultat, ${errors} erori.`);
    totalChecked += checked; totalMismatch += mismatch; totalNoResult += noResult; totalErrors += errors;
  }

  console.log(`\nTOTAL: ${totalChecked} verificate, ${totalMismatch} discrepante, ${totalNoResult} fara rezultat sector, ${totalErrors} erori.`);
  console.log('\n=== LISTA COMPLETA DISCREPANTE (JSON) ===');
  console.log(JSON.stringify(mismatches, null, 2));
  db.close();
}

main();
