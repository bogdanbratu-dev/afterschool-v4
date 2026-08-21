'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) { console.error('GOOGLE_PLACES_API_KEY not set'); process.exit(1); }

const db = new Database(path.join(__dirname, '../data/afterschool.db'));

// Ensure place_id column exists
const cols = db.pragma('table_info(caterers)').map(c => c.name);
if (!cols.includes('place_id')) db.prepare('ALTER TABLE caterers ADD COLUMN place_id TEXT').run();

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function findPlace(name, address) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri',
    },
    body: JSON.stringify({
      textQuery: `${name} ${address} Bucuresti`,
      locationBias: {
        circle: { center: { latitude: 44.4268, longitude: 26.1025 }, radius: 35000.0 },
      },
      maxResultCount: 1,
    }),
  });
  const data = await res.json();
  if (!data.places || !data.places[0]) return null;
  const p = data.places[0];
  return {
    place_id: p.id,
    rating: p.rating || null,
    reviews_count: p.userRatingCount || null,
    maps_url: p.googleMapsUri || null,
  };
}

async function getPhotoUrl(photoName) {
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=900&skipHttpRedirect=true&key=${API_KEY}`
    );
    const data = await res.json();
    return data.photoUri || null;
  } catch { return null; }
}

async function enrichWithPhotos(placeId, name) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'editorialSummary,photos',
    },
  });
  const data = await res.json();
  if (data.error) return { summary: null, photoUrls: [] };

  const summary = data.editorialSummary?.text || null;
  const photoUrls = [];
  for (const photo of (data.photos || []).slice(0, 12)) {
    if (photoUrls.length >= 5) break;
    const w = photo.widthPx || 0;
    const h = photo.heightPx || 0;
    if (w > h) {
      const url = await getPhotoUrl(photo.name);
      if (url) photoUrls.push(url);
      await sleep(200);
    }
  }
  return { summary, photoUrls };
}

async function main() {
  const caterers = db.prepare(
    'SELECT id, name, address FROM caterers ORDER BY id'
  ).all();

  console.log(`Enriching ${caterers.length} caterers...\n`);

  const updateFull = db.prepare(
    'UPDATE caterers SET place_id=?, rating=?, reviews_count=?, maps_url=?, editorial_summary=?, photo_urls=? WHERE id=?'
  );
  const updateNoPlace = db.prepare(
    "UPDATE caterers SET place_id='NOT_FOUND' WHERE id=?"
  );

  let ok = 0, noPlace = 0, noPhotos = 0;

  for (const c of caterers) {
    process.stdout.write(`[${c.id}] ${c.name} ... `);
    try {
      const place = await findPlace(c.name, c.address);
      if (!place) {
        updateNoPlace.run(c.id);
        console.log('⚠ place not found');
        noPlace++;
        await sleep(300);
        continue;
      }

      const { summary, photoUrls } = await enrichWithPhotos(place.place_id, c.name);

      updateFull.run(
        place.place_id, place.rating, place.reviews_count, place.maps_url,
        summary,
        photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
        c.id
      );

      const parts = [];
      if (place.rating) parts.push(`⭐${place.rating}`);
      if (summary) parts.push('📝');
      if (photoUrls.length > 0) parts.push(`📷${photoUrls.length}`);
      else noPhotos++;
      console.log(parts.join(' ') || '✓ (no extras)');
      ok++;
    } catch (e) {
      console.log(`❌ ${e.message.substring(0, 60)}`);
    }
    await sleep(350);
  }

  console.log(`\n✅ Enriched: ${ok} | No place: ${noPlace} | No photos: ${noPhotos}`);
  console.log(`📦 Done.`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
