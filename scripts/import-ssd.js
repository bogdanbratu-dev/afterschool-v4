// import-ssd.js
// Faza 2 circumscriptii: populeaza circ_schools.ssd_available / ssd_info din sursa oficiala ISMB
// (Excel "Unitati in care exista posibilitatea organizarii programului Scoala dupa scoala sau in
// care functioneaza semiinternat", an scolar 2026-2027). Descarca fisierul, potriveste fiecare rand
// cu circ_schools pe sector + nume normalizat (NICIODATA pe id, vezi feedback_professionals_id_sync),
// backup DB inainte de scriere (regula standing).
//
// Rulare: node scripts/import-ssd.js

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

const XLSX_URL = 'http://ismb.edu.ro/documente/clasa0/2026/Unitati_scoala_dupa_scoala_semiinternat_2026_2027.xlsx';
const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const XLSX_PATH = path.join(__dirname, '..', 'data', 'circ-ssd-semiinternat-2026-2027.xlsx');
const UA = 'ActivKids/1.0 (activkids.ro; contact bogdan.bratu@dontpayfull.com)';
const AN_SCOLAR = '2026-2027';

function norm(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
// acelasi algoritm ca in import-circumscriptii.js (nume distinctiv, fara prefix/numar/structura)
function distinctive(name) {
  return norm(name)
    .replace(/^SCOALA GIMNAZIALA (NR\.?\s*\d+)?/, '')
    .replace(/^(LICEUL|COLEGIUL)( NATIONAL| TEORETIC| TEHNOLOGIC| GRECO CATOLIC| ROMANO CATOLIC| TEOLOGIC| BILINGV| BULGAR| DE ARTE| DE MUZICA)*/, '')
    .replace(/STRUCTUR.*/, '').replace(/\bNR\.?\s*\d+/, '').trim();
}
function getNum(name) { const m = /\bNR\.?\s*(\d+)\b/i.exec(name); return m ? m[1] : null; }
function isSpecial(name) {
  return /(SPECIAL|DEFICIEN|EDUCATIE INCLUZIVA|PEDAGOGIE CURATIVA|SURZI)/.test(norm(name));
}
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

// gaseste randul din circ_schools corespunzator unitatii din Excel, in acelasi sector:
// 1) nume normalizat identic, 2) numarul unitatii ("NR X") unic in sector, 3) nume distinctiv
// (fara prefix/structura) continut reciproc, 4) similaritate fuzzy pe numele distinctiv (prag inalt,
// ca sa nu confunde licee/colegii diferite care impart cuvinte generice "LICEUL TEORETIC ...").
function matchSchool(circSameSector, excelName) {
  const n = norm(excelName);
  let m = circSameSector.find((c) => norm(c.name) === n);
  if (m) return { school: m, via: 'exact' };

  const num = getNum(excelName);
  if (num) {
    const candidates = circSameSector.filter((c) => getNum(c.name) === num);
    if (candidates.length === 1) return { school: candidates[0], via: 'num' };
  }

  const key = distinctive(excelName);
  if (key.length >= 4) {
    m = circSameSector.find((c) => {
      const ck = distinctive(c.name);
      if (norm(c.name).includes(key)) return true;
      if (ck.length >= 4 && (key.includes(ck) || ck === key)) return true;
      return false;
    });
    if (m) return { school: m, via: 'key' };
  }

  if (key.length >= 3) {
    let best = null, bestScore = 0;
    for (const c of circSameSector) {
      const ck = distinctive(c.name);
      if (ck.length < 3) continue;
      const s = similarity(key, ck);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (best && bestScore >= 0.75) return { school: best, via: 'fuzzy' };
  }

  return null;
}

async function downloadXlsx() {
  const res = await fetch(XLSX_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Descarcare esuata: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(XLSX_PATH, buf);
  console.log('Descarcat:', XLSX_PATH, `(${buf.length} bytes)`);
}

function parseRows() {
  const wb = XLSX.readFile(XLSX_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  // header pe randul index 5 (0-based); datele incep imediat dupa
  const data = rows.slice(6).filter((r) => r[2]);
  let lastSector = null;
  return data.map((r) => {
    const secMatch = String(r[1]).trim().match(/(\d)/);
    const sector = secMatch ? parseInt(secMatch[1], 10) : lastSector; // randurile "structura" mostenesc sectorul din randul-parinte (celula unita in Excel)
    if (secMatch) lastSector = sector;
    return {
      sector,
      name: String(r[2]).trim(),
      ssdDa: String(r[6] || '').trim().toUpperCase() === 'DA',
      siDa: String(r[7] || '').trim().toUpperCase() === 'DA',
    };
  });
}

function buildInfo(row) {
  if (row.ssdDa && row.siDa) {
    return `Unitatea oferă atât programul „Școală după școală”, cât și semiinternat (an școlar ${AN_SCOLAR}). Pentru procedura de înscriere, eligibilitate și orarul disponibil, contactați secretariatul școlii.`;
  }
  if (row.ssdDa) {
    return `În această unitate există posibilitatea organizării programului „Școală după școală” (an școlar ${AN_SCOLAR}). Pentru procedura de înscriere, eligibilitate și orarul disponibil, contactați secretariatul școlii.`;
  }
  return `În această unitate funcționează semiinternat (an școlar ${AN_SCOLAR}). Pentru procedura de înscriere, eligibilitate și orarul disponibil, contactați secretariatul școlii.`;
}

async function main() {
  await downloadXlsx();
  const rows = parseRows();
  console.log(`Randuri Excel: ${rows.length}`);

  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const bak = DB_PATH + '.bak-ssd-' + ts;
  fs.copyFileSync(DB_PATH, bak);
  console.log('Backup:', path.basename(bak));

  const db = new Database(DB_PATH);
  const circ = db.prepare('SELECT id, name, sector FROM circ_schools').all();
  const bySector = {};
  for (const c of circ) { (bySector[c.sector] = bySector[c.sector] || []).push(c); }

  const upd = db.prepare('UPDATE circ_schools SET ssd_available = 1, ssd_info = ?, updated_at = strftime(\'%s\',\'now\') * 1000 WHERE id = ?');

  let updated = 0, skippedSpecial = 0, skippedNu = 0;
  const unmatched = [];
  const matchedIds = new Set();

  db.exec('BEGIN');
  for (const row of rows) {
    if (isSpecial(row.name)) { skippedSpecial++; continue; }
    if (!row.ssdDa && !row.siDa) { skippedNu++; continue; }
    const sameSector = bySector[row.sector] || [];
    const result = matchSchool(sameSector, row.name);
    if (!result) { unmatched.push(`sector ${row.sector} | ${row.name}`); continue; }
    upd.run(buildInfo(row), result.school.id);
    matchedIds.add(result.school.id);
    updated++;
  }
  db.exec('COMMIT');

  console.log('\n=== SUMAR IMPORT SSD ===');
  console.log('Actualizate (ssd_available=1):', updated, `(scoli distincte: ${matchedIds.size})`);
  console.log('Sarite (Speciale, excluse din circ_schools):', skippedSpecial);
  console.log('Sarite (NU la ambele campuri, nimic de scris):', skippedNu);
  console.log('Nepotrivite (revizuire manuala):', unmatched.length);
  unmatched.forEach((u) => console.log('   ', u));
  db.close();
}

main().catch((e) => { console.error('EROARE:', e); process.exit(1); });
