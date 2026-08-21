// Aplica corectiile de sector gasite de check-sector-mismatches.js: pentru fiecare rand din
// mismatches.json, seteaza sector = valoarea reala (geocodata) si recalculeaza neighborhood
// (cel mai apropiat punct din lista curata) pe baza coordonatelor existente. NU atinge lat/lng
// (acelea raman corecte - doar sectorul inregistrat era gresit). Nu sterge nimic, doar UPDATE.
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = '/var/www/afterschool-v4/data/afterschool.db';
const MISMATCHES_PATH = '/tmp/mismatches.json';
const NEIGHBORHOODS_PATH = '/var/www/afterschool-v4/data/bucharest-neighborhoods.json';

function toRad(deg) { return deg * (Math.PI / 180); }
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const neighborhoods = JSON.parse(fs.readFileSync(NEIGHBORHOODS_PATH, 'utf8'));
function nearestNeighborhood(lat, lng) {
  if (!lat || !lng) return null;
  let best = null, bestDist = Infinity;
  for (const n of neighborhoods) {
    const d = calculateDistance(lat, lng, n.lat, n.lon);
    if (d < bestDist) { bestDist = d; best = n.name; }
  }
  return best;
}

// Tabelele au sau nu coloana neighborhood - toate cele 4 vizate de audit o au.
const TABLES_WITH_NEIGHBORHOOD = new Set(['afterschools', 'clubs', 'kindergartens', 'caterers']);

function main() {
  const mismatches = JSON.parse(fs.readFileSync(MISMATCHES_PATH, 'utf8'));
  const db = new Database(DB_PATH);
  let updated = 0;
  const tx = db.transaction((rows) => {
    for (const m of rows) {
      const neighborhood = TABLES_WITH_NEIGHBORHOOD.has(m.table) ? nearestNeighborhood(m.lat, m.lng) : null;
      const sql = TABLES_WITH_NEIGHBORHOOD.has(m.table)
        ? `UPDATE ${m.table} SET sector = ?, neighborhood = ? WHERE id = ?`
        : `UPDATE ${m.table} SET sector = ? WHERE id = ?`;
      const params = TABLES_WITH_NEIGHBORHOOD.has(m.table) ? [m.real, neighborhood, m.id] : [m.real, m.id];
      db.prepare(sql).run(...params);
      updated++;
      console.log(`${m.table}#${m.id} "${m.name}": sector ${m.recorded}->${m.real}, cartier="${neighborhood}"`);
    }
  });
  tx(mismatches);
  console.log(`\nActualizate ${updated}/${mismatches.length} randuri.`);
  db.close();
}

main();
