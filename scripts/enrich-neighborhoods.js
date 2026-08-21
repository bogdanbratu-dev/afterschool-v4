/**
 * enrich-neighborhoods.js — completeaza coloana `neighborhood` (cartier) pe cele 5 tabele
 * (afterschools, clubs, kindergartens, professionals, caterers) alegand cel mai apropiat
 * cartier numit din OpenStreetMap (data/bucharest-neighborhoods.json - 241 puncte, cartiere
 * Bucuresti, colectate din Overpass API: nwr[place~"quarter|suburb|neighbourhood"]).
 *
 * Cartierele nu sunt unitati administrative oficiale cu poligoane exacte, deci "cel mai
 * apropiat punct numit" (haversine) e la fel de corect ca orice metoda bazata pe poligon,
 * dat fiind ca insesi granitele reale sunt informale/culturale.
 *
 * Ruleaza DIRECT pe DB de productie (path hardcodat, ca scrape-emails.js) - necesita backup
 * facut manual inainte (vezi CLAUDE.md): cp data/afterschool.db data/afterschool.db.bak-...
 *
 * Rulare: node scripts/enrich-neighborhoods.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = '/var/www/afterschool-v4/data/afterschool.db';
const NEIGHBORHOODS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'bucharest-neighborhoods.json'), 'utf8')
);
const DRY_RUN = process.argv.includes('--dry-run');

const TABLES = ['afterschools', 'clubs', 'kindergartens', 'professionals', 'caterers'];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestNeighborhood(lat, lng) {
  let best = null, bestDist = Infinity;
  for (const n of NEIGHBORHOODS) {
    const d = haversine(lat, lng, n.lat, n.lon);
    if (d < bestDist) { bestDist = d; best = n.name; }
  }
  return best;
}

function main() {
  const db = new Database(DB_PATH);
  console.log(`[enrich-neighborhoods] ${NEIGHBORHOODS.length} cartiere de referinta. dry-run=${DRY_RUN}\n`);

  for (const table of TABLES) {
    const rows = db.prepare(
      // lat=0/lng=0 sunt coordonate placeholder (nu geodate reale, vezi tabela professionals) -
      // altfel "cel mai apropiat cartier" de (0,0) da un match fals pentru orice rand netratat.
      `SELECT id, lat, lng FROM ${table} WHERE neighborhood IS NULL AND lat IS NOT NULL AND lng IS NOT NULL AND lat != 0 AND lng != 0`
    ).all();

    if (!rows.length) { console.log(`${table}: nimic de facut.`); continue; }

    const upd = db.prepare(`UPDATE ${table} SET neighborhood = ? WHERE id = ?`);
    const tx = db.transaction((rows) => {
      let n = 0;
      for (const r of rows) {
        const nb = nearestNeighborhood(r.lat, r.lng);
        if (nb && !DRY_RUN) { upd.run(nb, r.id); }
        if (nb) n++;
      }
      return n;
    });

    const updated = tx(rows);
    console.log(`${table}: ${updated}/${rows.length} completate${DRY_RUN ? ' (dry-run, nescris)' : ''}`);
  }

  db.close();
}

main();
