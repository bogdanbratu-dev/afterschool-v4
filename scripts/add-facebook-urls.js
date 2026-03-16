const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'afterschool.db'));
const fbData = JSON.parse(fs.readFileSync(path.join(__dirname, 'facebook-afterschools.json'), 'utf8'));

// Build map: normalized name -> fbUrl
const fbMap = {};
for (const item of fbData) {
  const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  fbMap[key] = item.fbUrl;
}

// Manual entries for afterschools found in older run (not in JSON)
const manualFb = {
  'afterschoolrainbowkids': 'https://www.facebook.com/search/pages/?q=rainbow+kids+afterschool+bucuresti',
  'afterschoolmiculscolar': 'https://www.facebook.com/search/pages/?q=micul+scolar+afterschool+bucuresti',
  'afterschoolzmeulalbastru': 'https://www.facebook.com/search/pages/?q=zmeul+albastru+afterschool+bucuresti',
  'keikoafterschool': 'https://www.facebook.com/search/pages/?q=keiko+afterschool+bucuresti',
  'schnuffelgartencresagradinitaafterschool': 'https://www.facebook.com/search/pages/?q=schnuffelgarten+bucuresti',
  'lulugradiniaaafterschoolclub': 'https://www.facebook.com/search/pages/?q=lu-lu+gradinita+afterschool+bucuresti',
  'learninafterschool': 'https://www.facebook.com/search/pages/?q=learn+in+afterschool+bucuresti',
};
Object.assign(fbMap, manualFb);

const rows = db.prepare('SELECT id, name FROM afterschools WHERE website IS NULL').all();
const update = db.prepare('UPDATE afterschools SET website = ? WHERE id = ?');

let updated = 0;
for (const row of rows) {
  const key = row.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Try exact match
  let fbUrl = fbMap[key];

  // Try partial match (at least 15 chars overlap)
  if (!fbUrl) {
    const keyShort = key.substring(0, 15);
    for (const [k, v] of Object.entries(fbMap)) {
      if (k.includes(keyShort) || key.includes(k.substring(0, 15))) {
        fbUrl = v;
        break;
      }
    }
  }

  if (fbUrl) {
    update.run(fbUrl, row.id);
    console.log('✅ ' + row.name);
    console.log('   -> ' + fbUrl);
    updated++;
  } else {
    console.log('❌ Fara FB URL: ' + row.name);
  }
}

console.log('\nActualizate: ' + updated + '/' + rows.length);
