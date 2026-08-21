// Import colaboratori din JSON-urile produse de crawler (rulat pe VPS)
// Folosire: node scripts/import-collaborators.js [fisier.json | director]
// Default: importa toate data/collaborators-*.json
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, '..', 'data', 'afterschool.db'));
const DATA_DIR = path.join(__dirname, '..', 'data');

const TERAPIE = new Set(['logopedie', 'psihologie', 'terapie']);

function normalize(n) { return (n || '').toLowerCase().replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't').replace(/[^a-z0-9]/g, ''); }

const arg = process.argv[2];
let files = [];
if (arg && fs.existsSync(arg) && fs.statSync(arg).isFile()) {
  files = [arg];
} else {
  const dir = (arg && fs.existsSync(arg)) ? arg : DATA_DIR;
  files = fs.readdirSync(dir).filter(f => /^collaborators-.*\.json$/.test(f)).map(f => path.join(dir, f));
}

if (files.length === 0) { console.error('Niciun fisier collaborators-*.json gasit.'); process.exit(1); }

function domainOf(url) { try { return new URL(url).hostname.replace('www.', '').toLowerCase(); } catch (e) { return null; } }

// Dedup pe NUME fata de professionals + tabelele pe care Bogdan le are deja (afterschools, kindergartens, clubs, caterers, tutors)
const seen = new Set();
for (const t of ['professionals', 'afterschools', 'kindergartens', 'clubs', 'caterers', 'tutors']) {
  try { db.prepare(`SELECT name FROM ${t}`).all().forEach(r => seen.add(normalize(r.name))); } catch (e) {}
}

// Dedup pe DOMENIU website fata de afterschools/kindergartens/clubs (ca sa nu re-adaug o afacere pe care o are)
const knownDomains = new Set();
for (const t of ['afterschools', 'kindergartens', 'clubs', 'professionals']) {
  try { db.prepare(`SELECT website FROM ${t} WHERE website IS NOT NULL AND website != ''`).all().forEach(r => { const d = domainOf(r.website); if (d) knownDomains.add(d); }); } catch (e) {}
}
console.log(`Dedup: ${seen.size} nume cunoscute, ${knownDomains.size} domenii cunoscute.`);

const insert = db.prepare(`INSERT INTO professionals
  (name, category, kind, address, sector, lat, lng, coverage_area, phone, email, website, facebook_url, description, availability, online_available, home_service, is_premium, is_featured, contacts_hidden)
  VALUES (@name, @category, @kind, @address, @sector, 0, 0, @coverage_area, @phone, @email, @website, @facebook_url, @description, 'unknown', 0, 0, 0, 0, 0)`);

let total = 0, skipped = 0;
const perCat = {};

const tx = db.transaction((records) => {
  for (const r of records) {
    const nn = normalize(r.name);
    if (!nn || nn.length < 3) { skipped++; continue; }
    if (seen.has(nn)) { skipped++; continue; }
    const dom = domainOf(r.website);
    if (dom && knownDomains.has(dom)) { skipped++; continue; }  // afacere pe care o are deja
    const kind = TERAPIE.has(r.category) ? 'institutie' : 'independent';
    insert.run({
      name: r.name,
      category: r.category,
      kind,
      address: r.address || null,
      sector: (r.sector != null && r.sector >= 1 && r.sector <= 6) ? r.sector : null,
      coverage_area: r.coverage_area || null,
      phone: r.phone || null,
      email: r.email || null,
      website: r.website || null,
      facebook_url: r.facebook_url || null,
      description: (r.description || '').substring(0, 400) || null,
    });
    seen.add(nn);
    total++;
    perCat[r.category] = (perCat[r.category] || 0) + 1;
  }
});

for (const file of files) {
  let records;
  try { records = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch (e) { console.error('skip (parse):', file, e.message); continue; }
  if (!Array.isArray(records)) continue;
  const before = total;
  tx(records);
  console.log(`  ${path.basename(file)}: +${total - before} (din ${records.length})`);
}

console.log(`\n✅ Import gata: ${total} noi, ${skipped} sarite (duplicat/invalid).`);
console.log('Pe categorie:', JSON.stringify(perCat));
const grand = db.prepare('SELECT COUNT(*) as c FROM professionals').get();
console.log('Total professionals in DB:', grand.c);
