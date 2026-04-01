const Database = require('better-sqlite3');
const path = require('path');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) { console.error('GOOGLE_PLACES_API_KEY not set'); process.exit(1); }

const db = new Database(path.join(__dirname, '../data/afterschool.db'));

['afterschools', 'clubs'].forEach(table => {
  try { db.prepare(`ALTER TABLE ${table} ADD COLUMN editorial_summary TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE ${table} ADD COLUMN photo_urls TEXT`).run(); } catch {}
});

async function getPhotoUrl(photoName) {
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=900&skipHttpRedirect=true&key=${API_KEY}`
    );
    const data = await res.json();
    return data.photoUri || null;
  } catch {
    return null;
  }
}

async function enrichEntry(table, id, placeId, name) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'editorialSummary,photos',
    },
  });
  const data = await res.json();

  if (data.error) {
    console.log(`  ✗ [${id}] ${name} — ${data.error.message}`);
    return;
  }

  const summary = data.editorialSummary?.text || null;

  const photoUrls = [];
  const photos = data.photos || [];
  // Take up to 10 candidates, prefer landscape, stop at 3
  for (const photo of photos.slice(0, 10)) {
    if (photoUrls.length >= 3) break;
    const w = photo.widthPx || 0;
    const h = photo.heightPx || 0;
    // Only landscape photos (wider than tall) — filters out logos, portraits
    if (w > h) {
      const url = await getPhotoUrl(photo.name);
      if (url) photoUrls.push(url);
      await new Promise(r => setTimeout(r, 200));
    }
  }

  db.prepare(`UPDATE ${table} SET editorial_summary = ?, photo_urls = ? WHERE id = ?`)
    .run(summary, photoUrls.length > 0 ? JSON.stringify(photoUrls) : null, id);

  const parts = [];
  if (summary) parts.push('📝 descriere');
  if (photoUrls.length > 0) parts.push(`📷 ${photoUrls.length} poze`);
  console.log(`  ✓ [${id}] ${name}${parts.length ? ' — ' + parts.join(', ') : ''}`);
}

async function main() {
  for (const [table, label] of [['afterschools', 'After school-uri'], ['clubs', 'Activitati']]) {
    const entries = db.prepare(
      `SELECT id, name, place_id FROM ${table} WHERE place_id IS NOT NULL AND place_id != 'NOT_FOUND' AND editorial_summary IS NULL AND photo_urls IS NULL`
    ).all();

    console.log(`\n${label}: ${entries.length} de enrichuit`);
    let ok = 0;

    for (const entry of entries) {
      await enrichEntry(table, entry.id, entry.place_id, entry.name);
      ok++;
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`${label}: ${ok} procesate`);
  }

  console.log('\nGata!');
  db.close();
}

main().catch(console.error);
