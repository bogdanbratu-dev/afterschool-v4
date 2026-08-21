// import-media-en.js
// Faza 2 circumscriptii: populeaza circ_schools.media_en / media_en_year (media generala la
// Evaluarea Nationala clasa a VIII-a), din sursa OFICIALA Ministerul Educatiei
// (static.evaluare.edu.ro, portalul oficial de rezultate EN, NU stiri/clasamente terte precum
// BacPlus/Edupedu folosite intr-o versiune anterioara a acestui script cu doar 16/174 scoli).
//
// Sursa 1: static.evaluare.edu.ro/2026/rezultate/B/data/candidate.json - rezultatele oficiale
// per candidat pentru Bucuresti (index anonimizat, dar nume+cod scoala reale + camp "mev" =
// media finala la Evaluarea Nationala). ~15600 candidati, 233 coduri de scoala distincte.
// Candidatii absenti/eliminati au mev = -2 (sentinel oficial, exclus din calcul).
//
// Sursa 2 (punte): acelasi Excel oficial ISMB folosit si de import-ssd.js (director complet de
// unitati de invatamant Bucuresti cu COD SIIIR), pentru ca formatul candidate.json foloseste
// exact acelasi COD SIIIR ca si coloana A din Excel (confirmat manual, ex. Colegiul German
// "Goethe" = 4061101385 in ambele surse). Se potriveste fiecare rand circ_schools cu randul lui
// din Excel (sector + nume, acelasi algoritm ca in import-ssd.js, NICIODATA pe id - vezi
// feedback_professionals_id_sync), se ia COD SIIIR de acolo, apoi se agrega candidate.json dupa
// acel cod (media aritmetica a "mev" pe toti candidatii scolii).
//
// Structurile arondate ("STRUCTURA ARONDATA LA ...") nu au candidati proprii in sursa oficiala -
// EN VIII se sustine la scoala mama, ale carei rezultate sunt raportate sub codul ei propriu, nu
// al structurii. Nu e un gol de acoperire, e asteptat (vezi si ssd_info care mosteneste acelasi
// tipar). La fel, liceele tehnologice fara clasa a VIII-a (doar liceu) nu au candidati EN.
//
// Rulare: node scripts/import-media-en.js

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

const SSD_XLSX_URL = 'http://ismb.edu.ro/documente/clasa0/2026/Unitati_scoala_dupa_scoala_semiinternat_2026_2027.xlsx';
const CANDIDATE_JSON_URL = 'https://static.evaluare.edu.ro/2026/rezultate/B/data/candidate.json';
const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const SSD_XLSX_PATH = path.join(__dirname, '..', 'data', 'circ-ssd-semiinternat-2026-2027.xlsx');
const CANDIDATE_JSON_PATH = path.join(__dirname, '..', 'data', 'evaluare-en-2026-bucuresti.json');
const UA = 'ActivKids/1.0 (activkids.ro; contact bogdan.bratu@dontpayfull.com)';
const AN = 2026;

function norm(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function distinctive(name) {
  return norm(name)
    .replace(/^SCOALA GIMNAZIALA (NR\.?\s*\d+)?/, '')
    .replace(/^(LICEUL|COLEGIUL)( NATIONAL| TEORETIC| TEHNOLOGIC| GRECO CATOLIC| ROMANO CATOLIC| TEOLOGIC| BILINGV| BULGAR| DE ARTE| DE MUZICA)*/, '')
    .replace(/STRUCTUR.*/, '').replace(/\bNR\.?\s*\d+/, '').trim();
}
function getNum(name) { const m = /\bNR\.?\s*(\d+)\b/i.exec(name); return m ? m[1] : null; }
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}
function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}
// acelasi algoritm de potrivire (4 nivele) ca in import-ssd.js
function matchSchool(pool, name) {
  const n = norm(name);
  let m = pool.find((c) => norm(c.name) === n);
  if (m) return { school: m, via: 'exact' };

  const num = getNum(name);
  if (num) {
    const candidates = pool.filter((c) => getNum(c.name) === num);
    if (candidates.length === 1) return { school: candidates[0], via: 'num' };
  }

  const key = distinctive(name);
  if (key.length >= 4) {
    m = pool.find((c) => {
      const ck = distinctive(c.name);
      if (norm(c.name).includes(key)) return true;
      if (ck.length >= 4 && (key.includes(ck) || ck === key)) return true;
      return false;
    });
    if (m) return { school: m, via: 'key' };
  }

  if (key.length >= 3) {
    let best = null, bestScore = 0;
    for (const c of pool) {
      const ck = distinctive(c.name);
      if (ck.length < 3) continue;
      const s = similarity(key, ck);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (best && bestScore >= 0.75) return { school: best, via: 'fuzzy' };
  }

  return null;
}

async function downloadFile(url, destPath) {
  // static.evaluare.edu.ro nu e mereu accesibil de pe VPS (timeout de conexiune observat de pe
  // Hetzner); daca fisierul a fost deja adus manual (scp de pe local), il refolosim.
  if (fs.existsSync(destPath)) {
    console.log('Deja prezent, nu redescarc:', destPath);
    return;
  }
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Descarcare esuata (${url}): HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  console.log('Descarcat:', destPath, `(${buf.length} bytes)`);
}

function parseSsdRows() {
  const wb = XLSX.readFile(SSD_XLSX_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const data = rows.slice(6).filter((r) => r[2]);
  let lastSector = null;
  return data.map((r) => {
    const secMatch = String(r[1]).trim().match(/(\d)/);
    const sector = secMatch ? parseInt(secMatch[1], 10) : lastSector;
    if (secMatch) lastSector = sector;
    return { codSiiir: String(r[0]).trim(), sector, name: String(r[2]).trim() };
  });
}

async function main() {
  await downloadFile(SSD_XLSX_URL, SSD_XLSX_PATH);
  await downloadFile(CANDIDATE_JSON_URL, CANDIDATE_JSON_PATH);

  const ssdRows = parseSsdRows();
  console.log('Randuri Excel ISMB (director unitati):', ssdRows.length);

  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const bak = DB_PATH + '.bak-media-en-oficial-' + ts;
  fs.copyFileSync(DB_PATH, bak);
  console.log('Backup:', path.basename(bak));

  const db = new Database(DB_PATH);
  const circ = db.prepare('SELECT id, name, sector FROM circ_schools').all();
  const bySector = {};
  for (const r of ssdRows) { (bySector[r.sector] = bySector[r.sector] || []).push(r); }

  // punte circ_schools.id -> COD SIIIR
  const circToCode = {};
  const noBridge = [];
  for (const c of circ) {
    const pool = bySector[c.sector] || [];
    const res = matchSchool(pool, c.name);
    if (res) circToCode[c.id] = res.school.codSiiir;
    else noBridge.push(`${c.id} | sector ${c.sector} | ${c.name}`);
  }

  // agregare candidate.json pe COD SIIIR (schoolCode), exclude sentinel mev=-2 (absent/eliminat)
  const candidates = JSON.parse(fs.readFileSync(CANDIDATE_JSON_PATH, 'utf8'));
  const bySchoolCode = {};
  for (const cand of candidates) {
    if (typeof cand.mev !== 'number' || cand.mev < 0) continue;
    (bySchoolCode[cand.schoolCode] = bySchoolCode[cand.schoolCode] || []).push(cand.mev);
  }

  const upd = db.prepare('UPDATE circ_schools SET media_en = ?, media_en_year = ?, updated_at = strftime(\'%s\',\'now\') * 1000 WHERE id = ?');

  let updated = 0;
  const noCandidates = [];
  db.exec('BEGIN');
  for (const c of circ) {
    const code = circToCode[c.id];
    if (!code) continue;
    const vals = bySchoolCode[code];
    if (!vals || vals.length === 0) { noCandidates.push(`${c.id} | sector ${c.sector} | ${c.name}`); continue; }
    const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    upd.run(avg, AN, c.id);
    updated++;
  }
  db.exec('COMMIT');

  console.log('\n=== SUMAR IMPORT media_en (sursa oficiala evaluare.edu.ro) ===');
  console.log(`Actualizate: ${updated} / ${circ.length}`);
  console.log(`Fara punte la Excel ISMB (revizuire manuala): ${noBridge.length}`);
  noBridge.forEach((x) => console.log('   ', x));
  console.log(`Cu punte dar fara candidati EN in sursa (structuri arondate / fara cls. 8): ${noCandidates.length}`);
  noCandidates.forEach((x) => console.log('   ', x));
  db.close();
}

main().catch((e) => { console.error('EROARE:', e); process.exit(1); });
