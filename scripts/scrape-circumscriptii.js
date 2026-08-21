// scrape-circumscriptii.js
// Extrage circumscriptiile scolare oficiale ISMB (maparea strada -> scoala gimnaziala).
// Sursa: https://ismb.ro/primar/circumscriptii.php (are dataset-ul inline ca `const STRAZI`/
// `const UNITATI`) + https://ismb.ro/primar/api_unitate.php?id=N (detaliu structurat per scoala).
// NU foloseste Playwright - totul e JSON inline / API JSON.
//
// Output: data/circumscriptii-raw.json (pentru REVIZUIRE manuala inainte de import in DB).
// Rulare: node scripts/scrape-circumscriptii.js
//
// Vezi memoria reference_ismb_circumscriptii_data pentru structura completa.

const fs = require('fs');
const path = require('path');

const BASE = 'https://ismb.ro/primar';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const OUT = path.join(__dirname, '..', 'data', 'circumscriptii-raw.json');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1500 * (i + 1));
    }
  }
}

function sectorToInt(s) {
  const m = /(\d)/.exec(s || '');
  return m ? parseInt(m[1], 10) : null;
}

// Extrage un array JS inline `const NAME = [ ... ];` din HTML.
function extractInlineArray(html, name) {
  const marker = 'const ' + name;
  const idx = html.indexOf(marker);
  if (idx === -1) throw new Error('Nu am gasit ' + name + ' in pagina');
  const start = html.indexOf('[', idx);
  // Gaseste `];` care inchide array-ul (array-ul e pe o singura linie in sursa).
  const end = html.indexOf('];', start);
  if (start === -1 || end === -1) throw new Error('Nu am putut delimita ' + name);
  const json = html.slice(start, end + 1);
  return JSON.parse(json);
}

async function main() {
  console.log('Descarc pagina principala...');
  const html = await fetchText(`${BASE}/circumscriptii.php`);

  const unitati = extractInlineArray(html, 'UNITATI'); // [{id, text, name, addr}]
  const strazi = extractInlineArray(html, 'STRAZI');   // [{id, text, scoala}]
  console.log(`Inline: ${unitati.length} unitati, ${strazi.length} strazi.`);

  const schools = [];
  for (let i = 0; i < unitati.length; i++) {
    const u = unitati[i];
    process.stdout.write(`\r  api_unitate ${i + 1}/${unitati.length} (id ${u.id})   `);
    let detail = null;
    try {
      const raw = await fetchText(`${BASE}/api_unitate.php?id=${u.id}`);
      detail = JSON.parse(raw);
    } catch (e) {
      console.warn(`\n  ! esec la id ${u.id}: ${e.message}`);
    }
    const sector = sectorToInt((detail && detail.sector) || u.text);
    schools.push({
      ismb_id: u.id,
      name: (detail && detail.unitate) || u.name,
      sector,
      address: (detail && detail.adresa) || u.addr || null,
      phone: (detail && detail.telefon) || null,
      website: (detail && detail.website) || null,
      forma: (detail && detail.forma) || null,
      activ: detail ? detail.activ : null,
      // strazi curate din API (adresa_circ cu intervale de numere formatate)
      strazi: (detail && Array.isArray(detail.strazi))
        ? detail.strazi.map((s) => ({ adresa: s.adresa_circ, sector: sectorToInt(s.sector_c) }))
        : [],
      plan: (detail && Array.isArray(detail.plan)) ? detail.plan : [],
      criterii: (detail && Array.isArray(detail.criterii)) ? detail.criterii : [],
    });
    await sleep(250); // politicos
  }
  console.log('');

  // Fallback: pentru scolile fara strazi din API, deriv din array-ul global STRAZI (pe nume).
  const byName = new Map(schools.map((s) => [s.name.trim().toUpperCase(), s]));
  let recovered = 0;
  for (const st of strazi) {
    const key = (st.scoala || '').trim().toUpperCase();
    const school = byName.get(key);
    if (school && school.strazi.length === 0) {
      const sec = sectorToInt((/\(SECTOR (\d)\)/.exec(st.text) || [])[1] || '');
      school.strazi.push({ adresa: st.text.replace(/\s*\(SECTOR \d\)\s*/i, '').trim(), sector: sec });
      recovered++;
    }
  }
  if (recovered) console.log(`Recuperat ${recovered} strazi din STRAZI global pt. scoli fara API.`);

  const totalStrazi = schools.reduce((n, s) => n + s.strazi.length, 0);
  const withStreets = schools.filter((s) => s.strazi.length > 0).length;
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), schools }, null, 2));

  console.log('\n=== SUMAR ===');
  console.log(`Scoli (unitati): ${schools.length}`);
  console.log(`Scoli cu cel putin o strada: ${withStreets}`);
  console.log(`Total strazi (circumscriptii): ${totalStrazi}`);
  const bySec = {};
  for (const s of schools) bySec[s.sector] = (bySec[s.sector] || 0) + 1;
  console.log('Scoli pe sector:', JSON.stringify(bySec));
  console.log('Salvat in', OUT);
}

main().catch((e) => { console.error('EROARE:', e); process.exit(1); });
