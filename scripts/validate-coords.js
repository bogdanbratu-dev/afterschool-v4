const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const db = new Database(DB_PATH);

const THRESHOLD_M = 500; // raportam daca diferenta > 500m

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const d2r = Math.PI / 180;
  const dlat = (lat2 - lat1) * d2r;
  const dlng = (lng2 - lng1) * d2r;
  const a = Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dlng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocode(address) {
  const encoded = encodeURIComponent(address + ', București, România');
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=ro`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AfterSchoolBucuresti/1.0 (contact@afterschool.ro)' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function validateTable(tableName, label) {
  const rows = db.prepare(`SELECT id, name, address, lat, lng FROM ${tableName} WHERE address IS NOT NULL AND address != 'Bucuresti'`).all();
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`${label} — ${rows.length} intrari de verificat`);
  console.log('═'.repeat(60));

  const problems = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.name.substring(0, 40)}... `);

    const geo = await geocode(row.address);
    await sleep(1100); // respectam rate limit Nominatim (1 req/sec)

    if (!geo) {
      console.log('❓ adresa negasita');
      continue;
    }

    const dist = haversine(row.lat, row.lng, geo.lat, geo.lng);
    const distM = Math.round(dist);

    if (distM > THRESHOLD_M) {
      console.log(`⚠️  DIFERENTA ${distM}m`);
      console.log(`   DB:  lat=${row.lat}, lng=${row.lng}`);
      console.log(`   GEO: lat=${geo.lat}, lng=${geo.lng}`);
      console.log(`   Adresa gasita: ${geo.display.substring(0, 80)}`);
      problems.push({ ...row, table: tableName, distM, geoLat: geo.lat, geoLng: geo.lng, geoDisplay: geo.display });
    } else {
      console.log(`✅ ok (${distM}m diferenta)`);
    }
  }

  return problems;
}

async function main() {
  console.log('🔍 Validare coordonate fata de adrese reale (Nominatim/OpenStreetMap)');
  console.log(`   Prag de raportare: >${THRESHOLD_M}m diferenta\n`);

  const schoolProblems = await validateTable('schools', '🏫 SCOLI');
  const asProblems = await validateTable('afterschools', '🏠 AFTERSCHOOL-URI');

  const allProblems = [...schoolProblems, ...asProblems];

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`SUMAR: ${allProblems.length} intrari cu coordonate probabil gresite`);
  console.log('═'.repeat(60));

  if (allProblems.length === 0) {
    console.log('✅ Toate coordonatele par corecte!');
    return;
  }

  allProblems.sort((a, b) => b.distM - a.distM);
  allProblems.forEach((p, i) => {
    console.log(`\n${i + 1}. [${p.table}] ${p.name}`);
    console.log(`   Adresa: ${p.address}`);
    console.log(`   Diferenta: ${p.distM}m`);
    console.log(`   Coordonate DB:  ${p.lat}, ${p.lng}`);
    console.log(`   Coordonate GEO: ${p.geoLat}, ${p.geoLng}`);
  });

  // Optional: auto-update coordinates for large discrepancies
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('\nVrei sa actualizezi automat coordonatele gresite? (da/nu): ', (answer) => {
    if (answer.toLowerCase() === 'da' || answer.toLowerCase() === 'd') {
      for (const p of allProblems) {
        db.prepare(`UPDATE ${p.table} SET lat = ?, lng = ? WHERE id = ?`).run(p.geoLat, p.geoLng, p.id);
        console.log(`✅ Actualizat: ${p.name}`);
      }
      console.log('\n✅ Toate coordonatele au fost actualizate!');
    } else {
      console.log('Nu s-a modificat nimic.');
    }
    rl.close();
  });
}

main().catch(console.error);
