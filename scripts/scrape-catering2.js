'use strict';
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-catering2.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  process.stdout.write(line + '\n');
  logStream.write(line + '\n');
}

// Query-uri SPECIFICE pe catering institutional pentru scoli/gradinite/afterschool-uri
const SEARCH_QUERIES = [
  // Catering scolar direct
  'catering scolar zilnic Bucuresti',
  'catering scolar abonament Bucuresti',
  'livrare mese calde scoli Bucuresti',
  'livrare pranz scoli Bucuresti',
  'catering gradinite scoli Ilfov',
  'catering mese zilnice scoli Bucuresti',
  'meniu zilnic copii livrare Bucuresti',
  'catering institutional scoli Bucuresti',
  'catering institutional gradinite Bucuresti',
  'abonament pranz copii Bucuresti',
  'abonament mese zilnice copii Bucuresti',
  'livrare mancare gradinita Bucuresti',
  'livrare mancare afterschool Bucuresti',
  'catering afterschool zilnic Bucuresti',
  // Ilfov specific
  'catering scolar Voluntari Ilfov',
  'catering scolar Pipera Ilfov',
  'catering gradinita Ilfov',
  'livrare mese copii Ilfov',
  // Alte formulari
  'firma catering mese calde copii Bucuresti',
  'catering cantina copii Bucuresti',
  'preparare si livrare mancare copii Bucuresti',
  'mancare sanatoasa copii livrare Bucuresti',
  'catering bio copii Bucuresti',
  'mancare copii abonament livrare Bucuresti',
  'food delivery copii scoli Bucuresti',
];

// Cuvinte cheie in NUME sau DESCRIERE care confirma firma e catering institutional
const STRONG_MATCH = [
  'catering', 'livrare', 'meniu', 'mese', 'pranz', 'mancare', 'gatit',
  'food', 'kitchen', 'bucatarie', 'traiteur', 'delivery', 'masa',
  'nutritie', 'bio', 'healthy', 'sanatoasa', 'fresh', 'chef',
  'abonament', 'zilnic', 'institutional',
];

// Exclude neconditional
const SKIP_KEYWORDS = [
  'afterschool', 'after school', 'gradinita', 'scoala generala', 'scoala gimnaziala',
  'school', 'liceul', 'colegiul', 'grupe', 'educatie',
  'loc de joaca', 'petreceri', 'animatori', 'party', 'events', 'event',
  'salon', 'cabinet', 'clinica', 'farmacie', 'stomatolog',
  'nunta', 'botez', 'cununie', 'ballroom',
  'imobiliare', 'constructii', 'contabilitate',
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalize(name) {
  return name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9]/g, '');
}

function extractSector(text) {
  const m = (text || '').match(/[Ss]ector\s*([1-6])/);
  return m ? parseInt(m[1]) : null;
}

function extractCoordsFromUrl(url) {
  const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  const m2 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m2) return { lat: parseFloat(m2[1]), lng: parseFloat(m2[2]) };
  return null;
}

function guessCoverage(sector, address) {
  const addr = (address || '').toLowerCase();
  const ilfovCities = ['voluntari', 'pipera', 'otopeni', 'bragadiru', 'pantelimon', 'popesti', 'magurele', 'jilava', 'buftea', 'chitila', 'dragomiresti', 'tunari', 'dobroesti'];
  for (const city of ilfovCities) {
    if (addr.includes(city)) return `Ilfov, Sector ${sector || 'Ilfov'}`;
  }
  if (sector) return `Sector ${sector}`;
  return 'Bucuresti';
}

function isRelevant(name) {
  const nl = name.toLowerCase();
  for (const kw of SKIP_KEYWORDS) if (nl.includes(kw)) return false;
  for (const kw of STRONG_MATCH) if (nl.includes(kw)) return true;
  return false; // strict: daca nu are cuvant cheie pozitiv, skip
}

async function dismissConsent(page) {
  try {
    for (const text of ['Reject all', 'Respinge tot', 'Refuz tot', 'Accept all', 'Accepta tot']) {
      const btn = page.locator(`button:has-text("${text}")`).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) { await btn.click(); await sleep(2000); return; }
    }
  } catch {}
}

async function scrapeQuery(page, query, existingNorm, allResults) {
  log(`\n🔍 "${query}"`);
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000,
  });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(1000);

  let lastCount = 0;
  for (let scroll = 0; scroll < 10; scroll++) {
    const items = await page.locator('.Nv2PK').count();
    if (items === lastCount && scroll > 3) break;
    lastCount = items;
    await page.evaluate(() => { const f = document.querySelector('[role="feed"]'); if (f) f.scrollTop += 800; });
    await sleep(1200);
    if (await page.locator('text=/You.ve reached the end|Ați ajuns la sfârșit/i').isVisible().catch(() => false)) break;
  }

  const items = await page.locator('.Nv2PK').all();
  log(`  Gasit ${items.length} rezultate`);
  let newCount = 0;

  for (let i = 0; i < items.length; i++) {
    try {
      const nameEl = items[i].locator('.qBF1Pd, .fontHeadlineSmall').first();
      const name = (await nameEl.textContent({ timeout: 3000 }).catch(() => '')).trim();
      if (!name || name.length < 3) continue;

      const normName = normalize(name);
      if (existingNorm.has(normName)) { continue; }
      const prefix = normName.substring(0, 12);
      if (prefix.length >= 8 && [...existingNorm].some(e => e.startsWith(prefix))) { continue; }

      // Filtru strict: trebuie sa aiba cuvant cheie de catering in nume
      if (!isRelevant(name)) {
        log(`  ↷ skip (irelevant): ${name}`);
        continue;
      }

      await items[i].click();
      await sleep(2000);

      const url = page.url();
      const coords = extractCoordsFromUrl(url);

      // Bucuresti + Ilfov (mai larg)
      if (coords && (coords.lat < 44.2 || coords.lat > 44.75 || coords.lng < 25.75 || coords.lng > 26.55)) {
        log(`  ⏭ out-of-area: ${name}`);
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        await sleep(1000);
        continue;
      }

      let address = '', phone = null, website = null;
      try {
        const addrEl = page.locator('button[data-item-id="address"] .fontBodyMedium, [data-item-id="address"] .fontBodyMedium').first();
        if (await addrEl.isVisible({ timeout: 2000 }).catch(() => false)) address = (await addrEl.textContent() || '').trim();
        const phoneEl = page.locator('button[data-item-id^="phone"] .fontBodyMedium').first();
        if (await phoneEl.isVisible({ timeout: 2000 }).catch(() => false)) phone = (await phoneEl.textContent() || '').trim().replace(/\s+/g, '');
        const webEl = page.locator('a[data-item-id="authority"]').first();
        if (await webEl.isVisible({ timeout: 2000 }).catch(() => false)) website = await webEl.getAttribute('href');
      } catch {}

      if (!address) address = 'Bucuresti';
      const sector = extractSector(address);
      const coverage = guessCoverage(sector, address);
      const finalCoords = coords || {
        lat: sector ? [0, 44.463, 44.449, 44.418, 44.396, 44.410, 44.435][sector] : 44.427,
        lng: sector ? [0, 26.064, 26.115, 26.130, 26.105, 26.065, 26.020][sector] : 26.103,
      };

      allResults.push({ name, address, sector, lat: finalCoords.lat, lng: finalCoords.lng, phone, website, coverage_area: coverage });
      existingNorm.add(normName);
      newCount++;
      log(`  ✅ ${name} | ${address} | ${coverage}`);

      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await sleep(1500);
    } catch (e) {
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await sleep(1000);
    }
  }
  log(`  → ${newCount} noi`);
}

async function main() {
  const existing = db.prepare('SELECT name FROM caterers').all();
  const existingNorm = new Set(existing.map(e => normalize(e.name)));
  log(`📦 DB caterers curent: ${existing.length}`);
  log(`🔎 Cautari planificate: ${SEARCH_QUERIES.length}\n`);

  const allResults = [];

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 },
    locale: 'ro-RO',
  });
  const page = await context.newPage();

  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(2000);

  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    log(`\n[${i+1}/${SEARCH_QUERIES.length}]`);
    try { await scrapeQuery(page, SEARCH_QUERIES[i], existingNorm, allResults); }
    catch (e) { log(`❌ Eroare: ${e.message.substring(0, 100)}`); }
    await sleep(2000);
  }

  await browser.close();

  log(`\n${'═'.repeat(60)}`);
  log(`TOTAL NOI GASITE: ${allResults.length}`);
  log('═'.repeat(60));
  allResults.forEach((r, i) => log(`  ${i+1}. ${r.name} | ${r.address} | ${r.phone || '-'} | ${r.website || '-'}`));

  const insert = db.prepare(`
    INSERT INTO caterers (name, address, sector, lat, lng, coverage_area, phone, website, description, availability, is_premium, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unknown', 0, 0)
  `);

  let added = 0;
  for (const r of allResults) {
    try {
      insert.run(r.name, r.address, r.sector || null, r.lat, r.lng, r.coverage_area,
        r.phone || null, r.website || null,
        `Firma de catering din ${r.address}. Zona deservita: ${r.coverage_area}.`);
      added++;
    } catch (e) { log(`  Skip duplicat: ${r.name}`); }
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM caterers').get();
  log(`\n✅ Adaugate: ${added}`);
  log(`📦 Total caterers in DB: ${total.count}`);
}

main().catch(e => { log('FATAL:', e.message); process.exit(1); });
