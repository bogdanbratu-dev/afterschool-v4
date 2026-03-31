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

async function findPlace(name, address) {
  const query = encodeURIComponent(`${name} ${address} Bucuresti`);
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,name,rating,user_ratings_total&locationbias=circle:30000@44.4268,26.1025&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.candidates?.length) return null;
  const p = data.candidates[0];
  return {
    place_id: p.place_id,
    rating: p.rating || null,
    reviews_count: p.user_ratings_total || null,
    maps_url: p.place_id ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}` : null,
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function enrichTable(table, label) {
  const rows = db.prepare(`SELECT id, name, address FROM ${table} WHERE place_id IS NULL ORDER BY id`).all();
  console.log(`\n${label}: ${rows.length} de enrichuit`);

  const update = db.prepare(`UPDATE ${table} SET place_id=?, rating=?, reviews_count=?, maps_url=? WHERE id=?`);

  let ok = 0, fail = 0;
  for (const row of rows) {
    try {
      const place = await findPlace(row.name, row.address);
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
  await enrichTable('afterschools', 'After school-uri');
  await enrichTable('clubs', 'Activitati');
  db.close();
  console.log('\nGata!');
})();
