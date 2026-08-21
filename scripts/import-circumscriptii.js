// import-circumscriptii.js
// Importa data/circumscriptii-raw.json in tabelele circ_schools + circ_streets.
// - potriveste fiecare unitate ISMB cu tabelul `schools` (number+sector, apoi nume normalizat) ca sa
//   reutilizeze lat/lng si sa lege school_id;
// - pentru cele nepotrivite, geocodeaza adresa cu Nominatim (1 req/s), fallback centroid de sector;
// - exclude scolile speciale (deficienti) si cele fara strazi.
// Idempotent: goleste si reinsereaza. Face backup DB inainte (regula standing).
//
// Rulare: node scripts/import-circumscriptii.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const RAW = path.join(__dirname, '..', 'data', 'circumscriptii-raw.json');
const UA = 'ActivKids/1.0 (activkids.ro; contact bogdan.bratu@dontpayfull.com)';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function norm(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function classify(name) {
  const n = norm(name);
  if (/(SPECIAL|DEFICIEN|EDUCATIE INCLUZIVA|PEDAGOGIE CURATIVA|SURZI)/.test(n)) return 'special';
  if (/STRUCTUR/.test(n)) return 'structura';
  if (/COLEGIU/.test(n)) return 'colegiu';
  if (/LICEU/.test(n)) return 'liceu';
  return 'gimnaziu';
}
function getNum(name) { const m = /\bNR\.?\s*(\d+)/i.exec(name); return m ? m[1] : null; }
// nume distinctiv pentru match pe nume (fara prefix / numar / structura)
function distinctive(name) {
  return norm(name)
    .replace(/^SCOALA GIMNAZIALA (NR\.?\s*\d+)?/, '')
    .replace(/^(LICEUL|COLEGIUL)( NATIONAL| TEORETIC| TEHNOLOGIC| GRECO CATOLIC| ROMANO CATOLIC| TEOLOGIC| BILINGV| BULGAR| DE ARTE| DE MUZICA)*/, '')
    .replace(/STRUCTUR.*/, '').replace(/\bNR\.?\s*\d+/, '').trim();
}
// prefixe de tip strada de scos ca sa ramana numele de baza
const STREET_PREFIX = /^(STRADA|STR|BULEVARDUL|B DUL|BDUL|BLD|BD|CALEA|SOSEAUA|SOS|ALEEA|ALE|INTRAREA|INTR|PIATA|DRUMUL|DRM|DRUM|SPLAIUL|SPLAI|PRELUNGIREA|PREL|FUNDATURA|FDT)\b/;
function streetNorm(raw) {
  // taie partea cu numere ("NR ...", "NR: ...") si tot ce urmeaza
  let s = raw.replace(/\bNR\b[.:]?.*$/i, '').replace(/\bN\b[.:].*$/i, '');
  s = norm(s);
  s = s.replace(STREET_PREFIX, '').trim();
  return s || norm(raw);
}
function cleanWebsite(w) {
  if (!w) return null;
  let s = String(w).trim();
  s = s.replace(/^www\.(?=https?:)/i, '');      // "www.https://x" -> "https://x"
  s = s.replace(/\s+.*$/, '');                    // taie orice dupa primul spatiu (ex. telefon lipit)
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
  try { new URL(s); } catch { return null; }
  return s;
}
function cleanPhone(p) {
  if (!p) return null;
  const s = String(p).trim().split(/\s{2,}/)[0].trim();
  return s || null;
}

async function geocode(address, sector) {
  const q = `${address.replace(/\s+/g, ' ').trim()}, Bucuresti, Romania`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ro&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const arr = await res.json();
    if (Array.isArray(arr) && arr[0]) {
      const lat = parseFloat(arr[0].lat), lng = parseFloat(arr[0].lon);
      // in bbox Bucuresti/Ilfov aproximativ
      if (lat > 44.2 && lat < 44.7 && lng > 25.9 && lng < 26.35) return { lat, lng, src: 'nominatim' };
    }
  } catch { /* ignora */ }
  return null;
}

async function main() {
  if (!fs.existsSync(RAW)) { console.error('Lipseste', RAW, '- ruleaza mai intai scrape-circumscriptii.js'); process.exit(1); }
  const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));

  // backup
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const bak = DB_PATH + '.bak-circumscriptii-' + ts;
  fs.copyFileSync(DB_PATH, bak);
  console.log('Backup:', path.basename(bak));

  const db = new Database(DB_PATH);
  // asigura tabelele (scriptul nu ruleaza initializeDb din app) - trebuie sa fie in sync cu db.ts
  db.exec(`CREATE TABLE IF NOT EXISTS circ_schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ismb_id INTEGER, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'gimnaziu',
    sector INTEGER, address TEXT, phone TEXT, website TEXT, lat REAL, lng REAL, school_id INTEGER,
    plan TEXT, criterii TEXT, media_en REAL, media_en_year INTEGER, facilities TEXT, facilities_highlight TEXT,
    ssd_available INTEGER NOT NULL DEFAULT 0, ssd_info TEXT, news_url TEXT, despre TEXT,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000))`);
  db.exec(`CREATE TABLE IF NOT EXISTS circ_streets (
    id INTEGER PRIMARY KEY AUTOINCREMENT, circ_school_id INTEGER NOT NULL, sector INTEGER,
    street_raw TEXT NOT NULL, street_norm TEXT NOT NULL)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_circ_streets_norm ON circ_streets(street_norm)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_circ_streets_school ON circ_streets(circ_school_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_circ_schools_sector ON circ_schools(sector)`);
  const ours = db.prepare('SELECT id, number, name, sector, lat, lng FROM schools').all();
  // centroizi de sector din schools (fallback geocodare)
  const centroid = {};
  for (let sec = 1; sec <= 6; sec++) {
    const rows = ours.filter((o) => o.sector === sec);
    if (rows.length) centroid[sec] = { lat: rows.reduce((a, o) => a + o.lat, 0) / rows.length, lng: rows.reduce((a, o) => a + o.lng, 0) / rows.length };
  }

  const units = raw.schools.filter((u) => u.strazi.length > 0 && classify(u.name) !== 'special');
  console.log(`Import ${units.length} unitati (din ${raw.schools.length}, exclus special + fara strazi).`);

  const report = { matchedNumber: 0, matchedName: 0, geocoded: 0, centroidFallback: 0, unmatchedSchool: [] };

  db.exec('BEGIN');
  db.exec('DELETE FROM circ_streets');
  db.exec('DELETE FROM circ_schools');
  const insSchool = db.prepare(`INSERT INTO circ_schools (ismb_id, name, type, sector, address, phone, website, lat, lng, school_id, plan, criterii) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insStreet = db.prepare(`INSERT INTO circ_streets (circ_school_id, sector, street_raw, street_norm) VALUES (?,?,?,?)`);

  const toGeocode = [];
  const inserted = [];
  for (const u of units) {
    const type = classify(u.name);
    const num = getNum(u.name);
    let match = null;
    if (num && !/STRUCTUR/i.test(u.name)) match = ours.find((o) => o.number === num && o.sector === u.sector);
    if (!match) {
      const key = distinctive(u.name);
      if (key.length >= 4) match = ours.find((o) => o.sector === u.sector && (norm(o.name).includes(key) || distinctive(o.name) === key));
      if (match) report.matchedName++;
    } else report.matchedNumber++;

    let lat = match ? match.lat : null, lng = match ? match.lng : null;
    const info = db.prepare('SELECT 1').get(); void info;
    const id = insSchool.run(
      u.ismb_id, u.name, type, u.sector, u.address || null, cleanPhone(u.phone), cleanWebsite(u.website),
      lat, lng, match ? match.id : null,
      JSON.stringify(u.plan || []), JSON.stringify(u.criterii || [])
    ).lastInsertRowid;

    for (const st of u.strazi) insStreet.run(id, st.sector || u.sector, st.adresa, streetNorm(st.adresa));

    if (!match) { report.unmatchedSchool.push(`${u.sector} | ${u.name}`); toGeocode.push({ id, address: u.address, sector: u.sector }); }
    inserted.push({ id, name: u.name });
  }
  db.exec('COMMIT');
  console.log(`Inserate: ${inserted.length} scoli. Match number ${report.matchedNumber}, name ${report.matchedName}. De geocodat: ${toGeocode.length}.`);

  // geocodare pentru nepotrivite (secvential, politicos)
  const upd = db.prepare('UPDATE circ_schools SET lat = ?, lng = ? WHERE id = ?');
  for (const g of toGeocode) {
    let coord = g.address ? await geocode(g.address, g.sector) : null;
    if (coord) report.geocoded++;
    else { coord = centroid[g.sector] || { lat: 44.43, lng: 26.10 }; report.centroidFallback++; }
    upd.run(coord.lat, coord.lng, g.id);
    await sleep(1100);
  }

  const totalStreets = db.prepare('SELECT COUNT(*) c FROM circ_streets').get().c;
  const noCoord = db.prepare('SELECT COUNT(*) c FROM circ_schools WHERE lat IS NULL').get().c;
  console.log('\n=== SUMAR IMPORT ===');
  console.log('circ_schools:', db.prepare('SELECT COUNT(*) c FROM circ_schools').get().c);
  console.log('circ_streets:', totalStreets);
  console.log('geocodate Nominatim:', report.geocoded, '| centroid fallback:', report.centroidFallback, '| fara coord:', noCoord);
  console.log('scoli nepotrivite cu tabelul schools (geocodate separat):');
  report.unmatchedSchool.forEach((s) => console.log('   ', s));
  db.close();
}

main().catch((e) => { console.error('EROARE:', e); process.exit(1); });
