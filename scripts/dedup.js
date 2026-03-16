const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'afterschool.db'));

function normalize(name) {
  return name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// Score an entry by how complete it is (more non-null fields = better)
function completeness(row) {
  return ['phone', 'email', 'website', 'price_min', 'price_max', 'pickup_time', 'end_time', 'address', 'activities', 'description']
    .filter(f => row[f] && row[f] !== 'Bucuresti').length;
}

const all = db.prepare('SELECT * FROM afterschools ORDER BY id').all();
console.log('Total inainte:', all.length);

// Build normalized name map
const seen = new Map(); // normName -> best row
const toDelete = [];

for (const row of all) {
  const norm = normalize(row.name);
  // Also try a shorter key (first 12 chars of normalized name, ignoring common words)
  const stripped = norm
    .replace(/\b(after ?school|afterschool|gradinita|centru educational|centru|educational|program|club|clubul|kids|kid)\b/g, '')
    .replace(/\s+/g, ' ').trim();
  const key12 = stripped.substring(0, 14);

  let matched = false;

  // Exact normalized match
  if (seen.has(norm)) {
    matched = true;
    const existing = seen.get(norm);
    if (completeness(row) > completeness(existing)) {
      toDelete.push(existing.id);
      seen.set(norm, row);
      console.log(`DUP exact: keep #${row.id} "${row.name}", delete #${existing.id} "${existing.name}"`);
    } else {
      toDelete.push(row.id);
      console.log(`DUP exact: keep #${existing.id} "${existing.name}", delete #${row.id} "${row.name}"`);
    }
  }

  if (!matched) {
    // Check prefix similarity against all existing entries
    // But skip if names contain location indicators (Campus A/B, Sector X, different street numbers)
    const hasLocationSuffix = /\b(campus [ab]|sector \d|[0-9]+)\b/.test(norm);

    if (!hasLocationSuffix) {
      for (const [existNorm, existRow] of seen.entries()) {
        const existStripped = existNorm
          .replace(/\b(after ?school|afterschool|gradinita|centru educational|centru|educational|program|club|clubul|kids|kid)\b/g, '')
          .replace(/\s+/g, ' ').trim();
        const existKey12 = existStripped.substring(0, 14);

        if (key12.length >= 6 && existKey12.length >= 6 && key12 === existKey12 && key12 !== '') {
          // Check if names are really similar (not just short common prefixes)
          const shorterNorm = norm.length < existNorm.length ? norm : existNorm;
          const longerNorm = norm.length >= existNorm.length ? norm : existNorm;
          if (longerNorm.includes(shorterNorm.substring(0, Math.min(shorterNorm.length, 16)))) {
            matched = true;
            if (completeness(row) > completeness(existRow)) {
              toDelete.push(existRow.id);
              seen.delete(existNorm);
              seen.set(norm, row);
              console.log(`DUP similar: keep #${row.id} "${row.name}", delete #${existRow.id} "${existRow.name}"`);
            } else {
              toDelete.push(row.id);
              console.log(`DUP similar: keep #${existRow.id} "${existRow.name}", delete #${row.id} "${row.name}"`);
            }
            break;
          }
        }
      }
    }
  }

  if (!matched) {
    seen.set(norm, row);
  }
}

console.log('\n--- SUMAR ---');
console.log('Duplicate gasite:', toDelete.length);

if (toDelete.length === 0) {
  console.log('Nu sunt duplicate de sters.');
  process.exit(0);
}

// Delete duplicates
const del = db.prepare('DELETE FROM afterschools WHERE id = ?');
for (const id of toDelete) {
  del.run(id);
}

const remaining = db.prepare('SELECT COUNT(*) as c FROM afterschools').get();
console.log('Total dupa curatare:', remaining.c);
console.log('Sterse:', toDelete.length, 'inregistrari duplicate');
