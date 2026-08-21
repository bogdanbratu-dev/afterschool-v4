// Recalculeaza `neighborhood` pe TOATE randurile cu lat/lng reale (nu doar NULL, ca
// enrich-neighborhoods.js original) -- fixeaza cartierele ramase inghetate pe coordonate
// vechi, incorecte, dupa curatarea geodata (2026-07-21, bug semnalat de user pe Gradinita
// Castel: "Centrul Vechi" desi adresa reala e langa Iancului/Titan).
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = '/var/www/afterschool-v4/data/afterschool.db';
const NEIGHBORHOODS = JSON.parse(
  fs.readFileSync('/var/www/afterschool-v4/data/bucharest-neighborhoods.json', 'utf8')
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
  console.log(`[recompute-neighborhoods] ${NEIGHBORHOODS.length} cartiere de referinta. dry-run=${DRY_RUN}\n`);

  for (const table of TABLES) {
    const rows = db.prepare(
      `SELECT id, name, lat, lng, neighborhood FROM ${table} WHERE lat IS NOT NULL AND lng IS NOT NULL AND lat != 0 AND lng != 0`
    ).all();

    const upd = db.prepare(`UPDATE ${table} SET neighborhood = ? WHERE id = ?`);
    let changed = 0, filled = 0;
    const tx = db.transaction((rows) => {
      for (const r of rows) {
        const nb = nearestNeighborhood(r.lat, r.lng);
        if (!nb) continue;
        if (r.neighborhood === null) { filled++; if (!DRY_RUN) upd.run(nb, r.id); }
        else if (r.neighborhood !== nb) {
          changed++;
          console.log(`${table}#${r.id} "${r.name}": "${r.neighborhood}" -> "${nb}"`);
          if (!DRY_RUN) upd.run(nb, r.id);
        }
      }
    });
    tx(rows);
    console.log(`${table}: ${rows.length} verificate, ${filled} completate (erau NULL), ${changed} corectate (diferite)${DRY_RUN ? ' [dry-run]' : ''}\n`);
  }

  db.close();
}

main();
