// Audit + corectie coordonate pentru afterschools/clubs/kindergartens: geocodeaza adresa text
// stocata prin Nominatim si o compara cu lat/lng stocat. Bug-ul sursa: enrichment-ul a atribuit
// uneori acelasi punct generic (centrul unei cautari pe categorie) la mai multe afaceri diferite,
// in loc de pozitia reala a fiecareia (confirmat manual la BSC Berceni si prin clustere de
// coordonate identice intre afaceri diferite).
// Praguri de siguranta: actualizeaza automat DOAR daca noul punct e in Bucuresti/Ilfov si distanta
// fata de vechiul punct e semnificativa; altfel loghează pentru revizuire manuala (adresa ambigua/
// geocodare esuata/in afara zonei) in loc sa scrie o valoare nesigura.
const Database = require('better-sqlite3');

const DB_PATH = '/var/www/afterschool-v4/data/afterschool.db';
const TABLES = ['afterschools', 'clubs', 'kindergartens'];
const UA = 'activkids.ro-coord-audit/1.0 (contact: bogdan.bratu@dontpayfull.com)';
const DIST_THRESHOLD_KM = 1.0;
// bounding box generos Bucuresti + Ilfov
const BBOX = { latMin: 44.25, latMax: 44.65, lngMin: 25.80, lngMax: 26.40 };
const DRY_RUN = process.argv.includes('--dry-run');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

async function forwardGeocode(address) {
  const q = /bucure|ilfov/i.test(address) ? address : `${address}, București, România`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1&countrycodes=ro`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data[0] || null;
}

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
  const updated = [];
  const flagged = [];
  const unchanged = { count: 0 };

  for (const table of TABLES) {
    const rows = db.prepare(
      `SELECT id, name, address, lat, lng, sector FROM ${table} WHERE address IS NOT NULL AND LENGTH(TRIM(address)) >= 8`
    ).all();
    console.log(`\n=== ${table}: ${rows.length} randuri de procesat ===`);

    const updSql = db.prepare(`UPDATE ${table} SET lat = ?, lng = ?, sector = COALESCE(?, sector) WHERE id = ?`);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const geo = await forwardGeocode(r.address);
        if (!geo) {
          flagged.push({ table, id: r.id, name: r.name, address: r.address, reason: 'geocodare esuata (niciun rezultat)', stored: [r.lat, r.lng] });
        } else {
          const newLat = parseFloat(geo.lat), newLng = parseFloat(geo.lon);
          const inBbox = newLat >= BBOX.latMin && newLat <= BBOX.latMax && newLng >= BBOX.lngMin && newLng <= BBOX.lngMax;
          const dist = (r.lat != null && r.lng != null) ? haversineKm(r.lat, r.lng, newLat, newLng) : Infinity;

          if (!inBbox) {
            flagged.push({ table, id: r.id, name: r.name, address: r.address, reason: 'rezultat geocodare in afara Bucuresti/Ilfov', stored: [r.lat, r.lng], geocoded: [newLat, newLng], display_name: geo.display_name });
          } else if (dist >= DIST_THRESHOLD_KM) {
            await sleep(1100);
            let sector = null;
            try {
              const rev = await reverseGeocode(newLat, newLng);
              sector = extractSector(rev);
            } catch (e) { /* pastram sectorul vechi daca reverse esueaza */ }

            const entry = { table, id: r.id, name: r.name, address: r.address, dist_km: Math.round(dist * 100) / 100, stored: [r.lat, r.lng], corrected: [newLat, newLng], old_sector: r.sector, new_sector: sector, display_name: geo.display_name };
            updated.push(entry);
            if (!DRY_RUN) updSql.run(newLat, newLng, sector, r.id);
          } else {
            unchanged.count++;
          }
        }
      } catch (e) {
        flagged.push({ table, id: r.id, name: r.name, address: r.address, reason: `eroare: ${e.message}`, stored: [r.lat, r.lng] });
      }
      if ((i + 1) % 50 === 0) console.log(`  ${table}: ${i + 1}/${rows.length} (updated=${updated.length}, flagged=${flagged.length}, unchanged=${unchanged.count})`);
      await sleep(1100);
    }
  }

  require('fs').writeFileSync('/tmp/geo-audit-updated.json', JSON.stringify(updated, null, 2));
  require('fs').writeFileSync('/tmp/geo-audit-flagged.json', JSON.stringify(flagged, null, 2));

  console.log(`\n=== TOTAL ===`);
  console.log('actualizate automat:', updated.length, DRY_RUN ? '(DRY RUN, nescrise)' : '(scrise in DB)');
  console.log('marcate pt revizuire manuala:', flagged.length);
  console.log('neschimbate (deja corecte):', unchanged.count);
  db.close();
}

main();
