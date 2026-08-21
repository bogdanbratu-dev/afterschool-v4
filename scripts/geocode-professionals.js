// Completeaza lat/lng=0 (placeholder pt. "fara geodata") la profesionisti, folosind adresa
// existenta prin geocodare Nominatim (gratuit, fara API key, acelasi pattern ca validate-coords.js
// si fix-sectors-geocode.js). Randurile fara adresa dar cu sector primesc centroidul aproximativ
// al sectorului (fallback documentat in CLAUDE.md pt. campuri lat/lng NOT NULL). Randurile fara
// adresa si fara sector raman neatinse (nu exista nicio geodata de la care sa pornim).
const Database = require('better-sqlite3');

const DB_PATH = '/var/www/afterschool-v4/data/afterschool.db';
const UA = 'activkids.ro-geocode-professionals/1.0 (contact: bogdan.bratu@dontpayfull.com)';

// Centroide aproximative Bucuresti pe sector, pt. randuri fara adresa dar cu sector cunoscut.
const SECTOR_CENTROID = {
  1: { lat: 44.4796, lng: 26.0765 },
  2: { lat: 44.4368, lng: 26.1225 },
  3: { lat: 44.4268, lng: 26.1608 },
  4: { lat: 44.3801, lng: 26.1225 },
  5: { lat: 44.4034, lng: 26.0623 },
  6: { lat: 44.4378, lng: 26.0298 },
};

// Bounding box Bucuresti + Ilfov (cu marja), pt. respins rezultate de geocodare gresite (ex.
// Nominatim gaseste un omonim in alt judet) - vezi regula geografica din CLAUDE.md.
const BBOX = { latMin: 44.25, latMax: 44.65, lngMin: 25.85, lngMax: 26.35 };

function inScope(lat, lng) {
  return lat >= BBOX.latMin && lat <= BBOX.latMax && lng >= BBOX.lngMin && lng <= BBOX.lngMax;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function geocode(address) {
  const encoded = encodeURIComponent(address + ', București, România');
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=ro`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
}

async function main() {
  const db = new Database(DB_PATH);

  const withAddress = db.prepare(
    `SELECT id, name, address, sector FROM professionals WHERE (lat = 0 OR lng = 0) AND address IS NOT NULL AND address != ''`
  ).all();
  const sectorOnly = db.prepare(
    `SELECT id, name, sector FROM professionals WHERE (lat = 0 OR lng = 0) AND (address IS NULL OR address = '') AND sector IS NOT NULL`
  ).all();

  console.log(`De geocodat prin adresa: ${withAddress.length}`);
  console.log(`Fallback pe centroid sector: ${sectorOnly.length}`);

  const upd = db.prepare('UPDATE professionals SET lat = ?, lng = ? WHERE id = ?');

  let geocoded = 0, notFound = 0, outOfScope = 0;
  for (let i = 0; i < withAddress.length; i++) {
    const r = withAddress[i];
    process.stdout.write(`[${i + 1}/${withAddress.length}] ${r.name.substring(0, 45).padEnd(45)} `);
    let result;
    try {
      result = await geocode(r.address);
    } catch (e) {
      result = null;
      console.log(`eroare: ${e.message}`);
    }
    await sleep(1100);

    if (!result) {
      console.log('negasit');
      notFound++;
      continue;
    }
    if (!inScope(result.lat, result.lng)) {
      console.log(`in afara Bucuresti/Ilfov (lat=${result.lat}, lng=${result.lng}) - ignorat`);
      outOfScope++;
      continue;
    }
    upd.run(result.lat, result.lng, r.id);
    console.log(`ok lat=${result.lat.toFixed(4)} lng=${result.lng.toFixed(4)}`);
    geocoded++;
  }

  let centroided = 0;
  for (const r of sectorOnly) {
    const c = SECTOR_CENTROID[r.sector];
    if (!c) continue;
    upd.run(c.lat, c.lng, r.id);
    centroided++;
  }

  console.log(`\nTOTAL: ${geocoded} geocodate prin adresa, ${centroided} pe centroid sector, ${notFound} negasite, ${outOfScope} in afara scope-ului.`);
  db.close();
}

main();
