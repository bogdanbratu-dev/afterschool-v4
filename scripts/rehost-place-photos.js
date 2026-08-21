// Downloads real image bytes for listings whose photo_urls still point at ephemeral
// Google Places "place-photos" CDN links (those URLs expire within days, confirmed via
// 403s on both old and recently-enriched rows), and rewrites photo_urls to the
// self-hosted /photos/<table>/<id>/photoN.jpg convention already used by afterschools/337,
// caterers/2, schools/336.
//
// Usage:
//   node scripts/rehost-place-photos.js --table=kindergartens --id=192   (single row, pilot)
//   node scripts/rehost-place-photos.js --table=kindergartens           (whole table)
//   node scripts/rehost-place-photos.js                                  (all 4 affected tables)

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) { console.error('GOOGLE_PLACES_API_KEY not set'); process.exit(1); }

const db = new Database(path.join(__dirname, '../data/afterschool.db'));
const PUBLIC_DIR = path.join(__dirname, '../public/photos');

const argTable = (process.argv.find(a => a.startsWith('--table=')) || '').split('=')[1] || null;
const argId = (process.argv.find(a => a.startsWith('--id=')) || '').split('=')[1] || null;

const TABLES = argTable ? [argTable] : ['afterschools', 'clubs', 'kindergartens', 'caterers'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPlacePhotos(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: { 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': 'photos' },
  });
  const data = await res.json();
  if (data.error) return { error: data.error.message };
  return { photos: data.photos || [] };
}

async function downloadPhoto(photoName, destPath) {
  // No skipHttpRedirect => this 302s straight to the jpeg bytes, fetch() follows it.
  const res = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&key=${API_KEY}`);
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) return false; // guard against tiny error/placeholder bodies
  fs.writeFileSync(destPath, buf);
  return true;
}

async function rehostRow(table, id, placeId, name) {
  const { photos, error } = await fetchPlacePhotos(placeId);
  if (error) { console.log(`  x [${table}/${id}] ${name} - ${error}`); return; }

  const landscape = (photos || []).filter(p => (p.widthPx || 0) > (p.heightPx || 0)).slice(0, 8);
  if (landscape.length === 0) { console.log(`  - [${table}/${id}] ${name} - nicio poza landscape`); return; }

  const dir = path.join(PUBLIC_DIR, table, String(id));
  fs.mkdirSync(dir, { recursive: true });

  const localUrls = [];
  let n = 1;
  for (const photo of landscape) {
    if (localUrls.length >= 3) break;
    const dest = path.join(dir, `photo${n}.jpg`);
    const ok = await downloadPhoto(photo.name, dest);
    if (ok) { localUrls.push(`/photos/${table}/${id}/photo${n}.jpg`); n++; }
    await sleep(200);
  }

  if (localUrls.length === 0) { console.log(`  x [${table}/${id}] ${name} - descarcare esuata`); return; }

  db.prepare(`UPDATE ${table} SET photo_urls = ? WHERE id = ?`).run(JSON.stringify(localUrls), id);
  console.log(`  v [${table}/${id}] ${name} - ${localUrls.length} poze descarcate`);
}

async function main() {
  for (const table of TABLES) {
    const rows = db.prepare(
      `SELECT id, name, place_id FROM ${table} WHERE photo_urls LIKE '%place-photos%' AND place_id IS NOT NULL AND place_id != 'NOT_FOUND'` +
      (argId ? ` AND id = ${Number(argId)}` : '') + ` ORDER BY id`
    ).all();
    console.log(`\n${table}: ${rows.length} de rehostuit`);
    for (const row of rows) {
      await rehostRow(table, row.id, row.place_id, row.name);
      await sleep(300);
    }
  }
  db.close();
  console.log('\nGata!');
}

main().catch(console.error);
