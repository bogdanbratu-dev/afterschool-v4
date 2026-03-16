const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'afterschool.db'));
const THRESHOLD_M = 400;
const START_ID = 82; // validate all afterschools added after initial seed

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, d2r = Math.PI / 180;
  const dlat = (lat2 - lat1) * d2r, dlng = (lng2 - lng1) * d2r;
  const a = Math.sin(dlat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dlng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function geocode(address) {
  const encoded = encodeURIComponent(address + ', București, România');
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=ro`;
  const res = await fetch(url, { headers: { 'User-Agent': 'AfterSchoolBucuresti/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const rows = db.prepare(
    `SELECT id, name, address, lat, lng FROM afterschools WHERE id >= ? AND address IS NOT NULL AND address != 'Bucuresti' ORDER BY id`
  ).all(START_ID);

  console.log(`Validez ${rows.length} afterschool-uri noi (id >= ${START_ID})...\n`);

  const problems = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[${i+1}/${rows.length}] ${row.name.substring(0, 40)}... `);

    const geo = await geocode(row.address);
    await sleep(1100);

    if (!geo) {
      console.log('❓ adresa negasita');
      continue;
    }

    // Validate coords are in Bucharest
    if (geo.lat < 44.3 || geo.lat > 44.6 || geo.lng < 25.9 || geo.lng > 26.4) {
      console.log('⚠️  geocodat in afara Bucurestiului, skip');
      continue;
    }

    const dist = Math.round(haversine(row.lat, row.lng, geo.lat, geo.lng));

    if (dist > THRESHOLD_M) {
      console.log(`⚠️  DIFERENTA ${dist}m`);
      console.log(`   DB:  ${row.lat}, ${row.lng}`);
      console.log(`   GEO: ${geo.lat}, ${geo.lng}`);
      problems.push({ ...row, dist, geoLat: geo.lat, geoLng: geo.lng });
    } else {
      console.log(`✅ ok (${dist}m)`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Probleme gasite: ${problems.length}`);

  if (problems.length === 0) {
    console.log('Toate coordonatele par corecte!');
    return;
  }

  problems.sort((a, b) => b.dist - a.dist);
  problems.forEach((p, i) => {
    console.log(`\n${i+1}. ${p.name}`);
    console.log(`   Adresa: ${p.address}`);
    console.log(`   Diferenta: ${p.dist}m`);
    console.log(`   DB: ${p.lat}, ${p.lng}  →  GEO: ${p.geoLat}, ${p.geoLng}`);
  });

  console.log('\nActualizez automat coordonatele...');
  const update = db.prepare('UPDATE afterschools SET lat = ?, lng = ? WHERE id = ?');
  for (const p of problems) {
    update.run(p.geoLat, p.geoLng, p.id);
    console.log(`✅ Actualizat: ${p.name}`);
  }
  console.log(`\n✅ ${problems.length} coordonate corectate.`);
}

main().catch(console.error);
