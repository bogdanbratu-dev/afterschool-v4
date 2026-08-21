/**
 * import-local-to-prod.js — sincronizeaza aditiv datele adunate local (backfill adrese,
 * discovery Method-2 gradinite, enrichment email) in DB-ul de PRODUCTIE, fara sa stearga
 * sau sa suprascrie nimic. Ruleaza DOAR pe VPS, impotriva /var/www/afterschool-v4/data/afterschool.db.
 *
 * Strategie:
 *  - Randuri noi (id-ul local nu exista in productie): INSERT integral (cu acelasi id).
 *  - Randuri existente: UPDATE doar pe campurile de "enrichment" (adresa/contact/loc), si
 *    doar cand campul in productie e gol/NULL si local are o valoare (fill-blanks-only) —
 *    nu se atinge niciodata is_premium/contacts_hidden/owner_user_id/leads_enabled/
 *    premium_expires_at/banner_url/is_featured/availability/last_checked (stare live/business).
 *  - maps_url poluat (contine 'activkids.ro' sau 'picker-init') e ignorat/sanitizat, nu se
 *    importa niciodata.
 *
 * Rulare: node import-local-to-prod.js --dry-run   (raport, fara scriere)
 *         node import-local-to-prod.js --apply     (scrie efectiv, intr-o tranzactie)
 */
const path = require('path');
const fs = require('fs');
const Database = require('/var/www/afterschool-v4/node_modules/better-sqlite3');

const DB_PATH = '/var/www/afterschool-v4/data/afterschool.db';
const IMPORT_DIR = '/tmp/afterschool-import';
const APPLY = process.argv.includes('--apply');

const db = new Database(DB_PATH);

// campuri pe care le putem completa la randuri EXISTENTE, doar daca in productie sunt goale
const FILLABLE = {
  afterschools: ['address', 'sector', 'lat', 'lng', 'phone', 'email', 'website', 'maps_url', 'place_id', 'rating', 'reviews_count', 'photo_urls', 'reviews_url', 'neighborhood', 'editorial_summary'],
  clubs: ['address', 'sector', 'lat', 'lng', 'phone', 'email', 'website', 'maps_url', 'place_id', 'rating', 'reviews_count', 'photo_urls', 'reviews_url', 'neighborhood', 'editorial_summary'],
  kindergartens: ['address', 'sector', 'lat', 'lng', 'phone', 'email', 'website', 'maps_url', 'place_id', 'rating', 'reviews_count', 'photo_urls', 'reviews_url', 'neighborhood', 'facebook_url', 'editorial_summary'],
};

function isPolluted(url) {
  if (!url) return false;
  return url.includes('activkids.ro') || url.includes('picker-init');
}

function isEmpty(v) {
  return v === null || v === undefined || v === '';
}

function processTable(table) {
  const localRows = JSON.parse(fs.readFileSync(path.join(IMPORT_DIR, `export-${table}.json`), 'utf8'));
  const prodIds = new Set(db.prepare(`SELECT id FROM ${table}`).all().map(r => r.id));
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);

  const toInsert = [];
  const toUpdate = []; // { id, fields: {col: val} }

  for (const row of localRows) {
    if (isPolluted(row.maps_url)) row.maps_url = null;

    if (!prodIds.has(row.id)) {
      toInsert.push(row);
      continue;
    }

    const prodRow = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(row.id);
    const fields = {};
    for (const col of FILLABLE[table]) {
      if (isEmpty(prodRow[col]) && !isEmpty(row[col])) {
        fields[col] = row[col];
      }
    }
    if (Object.keys(fields).length > 0) {
      toUpdate.push({ id: row.id, fields });
    }
  }

  console.log(`\n=== ${table} ===`);
  console.log(`INSERT: ${toInsert.length} randuri noi`);
  console.log(`UPDATE: ${toUpdate.length} randuri cu campuri completate`);
  if (toInsert.length) console.log('  sample insert ids:', toInsert.slice(0, 5).map(r => r.id));
  if (toUpdate.length) {
    const fieldCounts = {};
    for (const u of toUpdate) for (const f of Object.keys(u.fields)) fieldCounts[f] = (fieldCounts[f] || 0) + 1;
    console.log('  campuri completate:', fieldCounts);
  }

  if (APPLY) {
    const insertCols = cols.filter(c => c !== 'id' || true); // include id explicit
    const insertStmt = db.prepare(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(c => '@' + c).join(',')})`
    );
    const tx = db.transaction(() => {
      for (const row of toInsert) {
        const params = {};
        for (const c of cols) params[c] = row[c] === undefined ? null : row[c];
        insertStmt.run(params);
      }
      for (const u of toUpdate) {
        const setSql = Object.keys(u.fields).map(f => `${f} = @${f}`).join(', ');
        db.prepare(`UPDATE ${table} SET ${setSql} WHERE id = @id`).run({ ...u.fields, id: u.id });
      }
    });
    tx();
    console.log(`  APLICAT: ${toInsert.length} inserate, ${toUpdate.length} actualizate.`);
  }

  return { inserted: toInsert.length, updated: toUpdate.length };
}

const summary = {};
for (const t of ['afterschools', 'clubs', 'kindergartens']) {
  summary[t] = processTable(t);
}

console.log(`\n${APPLY ? 'APLICAT' : 'DRY RUN'} — sumar:`, summary);
db.close();
