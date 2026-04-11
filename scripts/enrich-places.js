/**
 * Enriches afterschools and clubs with Google Places rating + review count.
 * Run locally: node scripts/enrich-places.js
 * Run on server: node scripts/enrich-places.js
 *
 * Uses Find Place from Text API (~$0.017/request).
 */

const Database = require('better-sqlite3');
const path = require('path');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('Set GOOGLE_PLACES_API_KEY env var before running.');
  process.exit(1);
}

const db = new Database(path.join(__dirname, '../data/afterschool.db'));

// Reset NOT_FOUND entries so they get retried
db.prepare(`UPDATE afterschools SET place_id = NULL, rating = NULL, reviews_count = NULL, maps_url = NULL WHERE place_id = 'NOT_FOUND'`).run();
db.prepare(`UPDATE clubs SET place_id = NULL, rating = NULL, reviews_count = NULL, maps_url = NULL WHERE place_id = 'NOT_FOUND'`).run();

// Add columns if missing
function addColumnIfMissing(table, column, type) {
  const cols = db.pragma(`table_info(${table})`).map(c => c.name);
  if (!cols.includes(column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`Added ${table}.${column}`);
  }
}

addColumnIfMissing('afterschools', 'place_id', 'TEXT');
addColumnIfMissing('afterschools', 'rating', 'REAL');
addColumnIfMissing('afterschools', 'reviews_count', 'INTEGER');
addColumnIfMissing('afterschools', 'maps_url', 'TEXT');

addColumnIfMissing('clubs', 'place_id', 'TEXT');
addColumnIfMissing('clubs', 'rating', 'REAL');
addColumnIfMissing('clubs', 'reviews_count', 'INTEGER');
addColumnIfMissing('clubs', 'maps_url', 'TEXT');

async function findPlace(name, address, debug = false) {
  const url = `https://places.googleapis.com/v1/places:searchText`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount',
    },
    body: JSON.stringify({
      textQuery: `${name} ${address} Bucuresti`,
      locationBias: {
        circle: {
          center: { latitude: 44.4268, longitude: 26.1025 },
          radius: 30000.0,
        },
      },
      maxResultCount: 1,
    }),
  });
  const data = await res.json();
  if (debug) console.log('API response:', JSON.stringify(data, null, 2));
  if (!data.places?.length) return null;
  const p = data.places[0];
  return {
    place_id: p.id,
    rating: p.rating || null,
    reviews_count: p.userRatingCount || null,
    maps_url: p.id ? `https://www.google.com/maps/place/?q=place_id:${p.id}` : null,
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function enrichTable(table, label) {
  const rows = db.prepare(`SELECT id, name, address FROM ${table} WHERE place_id IS NULL ORDER BY id`).all();
  console.log(`\n${label}: ${rows.length} de enrichuit`);

  const update = db.prepare(`UPDATE ${table} SET place_id=?, rating=?, reviews_count=?, maps_url=? WHERE id=?`);

  let ok = 0, fail = 0;
  for (const row of rows) {
    const isFirst = ok + fail === 0;
    try {
      const place = await findPlace(row.name, row.address, isFirst);
      if (place) {
        update.run(place.place_id, place.rating, place.reviews_count, place.maps_url, row.id);
        console.log(`  ✓ [${row.id}] ${row.name} → ⭐${place.rating} (${place.reviews_count} recenzii)`);
        ok++;
      } else {
        console.log(`  ✗ [${row.id}] ${row.name} — negasit`);
        update.run('NOT_FOUND', null, null, null, row.id);
        fail++;
      }
    } catch (e) {
      console.log(`  ! [${row.id}] ${row.name} — eroare: ${e.message}`);
      fail++;
    }
    await sleep(200); // max 5 req/s
  }
  console.log(`${label}: ${ok} ok, ${fail} failed`);
}

(async () => {
  // Test API inainte de a incepe
  console.log('Testez API key...');
  const testRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName',
    },
    body: JSON.stringify({ textQuery: 'Young Academics Bucuresti', maxResultCount: 1 }),
  });
  const testData = await testRes.json();
  if (testData.error) {
    console.log('Eroare API:', testData.error.message);
    console.log('API nu functioneaza. Verifica ca Places API (New) e activata in Google Cloud.');
    db.close();
    return;
  }
  console.log('API ok!\n');

  await enrichTable('afterschools', 'After school-uri');
  await enrichTable('clubs', 'Activitati');
  db.close();
  console.log('\nGata!');
})();
