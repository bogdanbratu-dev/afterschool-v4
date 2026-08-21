'use strict';
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-catering.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  process.stdout.write(line + '\n');
  logStream.write(line + '\n');
}

// Cautari specifice: catering pentru copii / scoli / afterschool-uri in Bucuresti si Ilfov
const SEARCH_QUERIES = [
  'catering afterschool Bucuresti',
  'catering copii scoli Bucuresti',
  'catering scolar Bucuresti',
  'livrare pranz copii Bucuresti',
  'catering gradinite scoli Bucuresti',
  'firma catering copii sector 1 Bucuresti',
  'firma catering copii sector 2 Bucuresti',
  'firma catering copii sector 3 Bucuresti',
  'firma catering copii sector 4 Bucuresti',
  'firma catering copii sector 5 Bucuresti',
  'firma catering copii sector 6 Bucuresti',
  'catering mese calde copii Bucuresti',
  'catering pranz scoala Bucuresti',
  'catering institutional copii Ilfov',
  'catering scolar Ilfov',
  'livrare mancare copii Ilfov',
  'catering firma copii Voluntari',
  'catering firma copii Pipera',
  'catering firma copii Otopeni',
  'catering pentru afterschool Ilfov',
  'food service copii scoli Bucuresti',
  'catering meniu zilnic copii Bucuresti',
  'catering event copii Bucuresti',
  'catering petrecere copii Bucuresti',
  'catering party copii Bucuresti',
  'catering aniversare copii Bucuresti',
];

// Cuvinte-cheie in NUME care sugereaza firma e relevanta pentru catering pentru copii/scoli
const RELEVANT_NAME_KEYWORDS = [
  'catering', 'kitchen', 'food', 'foods', 'chef', 'bucatarie', 'bucatar',
  'livrare', 'pranz', 'masa', 'mese', 'mancare', 'meniu', 'gatit', 'gourmet',
  'kids', 'copii', 'baby', 'junior', 'scolar', 'school', 'fresh', 'healthy',
  'nutritie', 'bio', 'organic', 'culinar', 'restaurant', 'traiteur', 'eventi',
];

// Cuvinte-cheie care EXCLUD firma (complet nerelevante)
const SKIP_NAME_KEYWORDS = [
  'afterschool', 'after school', 'gradinita', 'scoala generala',
  'cabinet medical', 'stomatolog', 'dentist', 'farmacie', 'salon',
  'contabilitate', 'avocatura', 'firma constructii', 'imobiliara',
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

function guessCoverageFromSector(sector, address) {
  const addr = (address || '').toLowerCase();
  const ilfovCities = ['voluntari', 'pipera', 'otopeni', 'bragadiru', 'pantelimon', 'popesti', 'magurele', 'jilava', 'buftea', 'chitila', 'dragomiresti'];
  for (const city of ilfovCities) {
    if (addr.includes(city)) return `Ilfov, ${city.charAt(0).toUpperCase() + city.slice(1)}`;
  }
  if (sector) return `Sector ${sector}`;
  return 'Bucuresti';
}

async function dismissConsent(page) {
  try {
    for (const text of ['Reject all', 'Respinge tot', 'Refuz tot', 'Accept all', 'Accepta tot']) {
      const btn = page.locator(`button:has-text("${text}")`).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await sleep(2000);
        return;
      }
    }
  } catch {}
}

function isRelevant(name, query) {
  const nameLower = name.toLowerCase();
  const queryLower = query.toLowerCase();
  // Exclude clears
  for (const kw of SKIP_NAME_KEYWORDS) {
    if (nameLower.includes(kw)) return false;
  }
  // If query is very specific (catering*), accept most results
  if (queryLower.includes('catering') || queryLower.includes('livrare') || queryLower.includes('food service')) return true;
  // Otherwise check name has a relevant keyword
  for (const kw of RELEVANT_NAME_KEYWORDS) {
    if (nameLower.includes(kw)) return true;
  }
  return false;
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
  for (let scroll = 0; scroll < 8; scroll++) {
    const items = await page.locator('.Nv2PK').count();
    if (items === lastCount && scroll > 2) break;
    lastCount = items;
    await page.evaluate(() => {
      const feed = document.querySelector('[role="feed"]');
      if (feed) feed.scrollTop += 800;
    });
    await sleep(1200);
    const endMsg = await page.locator('text=/You.ve reached the end|Ați ajuns la sfârșit/i').isVisible().catch(() => false);
    if (endMsg) break;
  }

  const items = await page.locator('.Nv2PK').all();
  log(`  Gasit ${items.length} rezultate`);

  let newCount = 0;

  for (let i = 0; i < items.length; i++) {
    try {
      const item = items[i];
      const nameEl = item.locator('.qBF1Pd, .fontHeadlineSmall').first();
      const name = (await nameEl.textContent({ timeout: 3000 }).catch(() => '')).trim();
      if (!name || name.length < 3) continue;
      if (!isRelevant(name, query)) { continue; }

      const normName = normalize(name);
      if (existingNorm.has(normName)) continue;
      // prefix dedup (12 chars)
      const prefix = normName.substring(0, 12);
      if (prefix.length >= 8 && [...existingNorm].some(e => e.startsWith(prefix))) continue;

      await item.click();
      await sleep(2000);

      const url = page.url();
      const coords = extractCoordsFromUrl(url);

      // Filter out-of-area (Bucuresti ~44.3-44.6 lat, 25.9-26.4 lng; Ilfov extends a bit further)
      if (coords && (coords.lat < 44.2 || coords.lat > 44.7 || coords.lng < 25.8 || coords.lng > 26.5)) {
        log(`  ⏭ ${name} — in afara ariei (${coords.lat},${coords.lng})`);
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
      const coverage = guessCoverageFromSector(sector, address);

      const finalCoords = coords || {
        lat: sector ? [0, 44.4630, 44.4490, 44.4180, 44.3960, 44.4100, 44.4350][sector] : 44.4268,
        lng: sector ? [0, 26.0640, 26.1150, 26.1300, 26.1050, 26.0650, 26.0200][sector] : 26.1025,
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
  return newCount;
}

async function main() {
  const existing = db.prepare('SELECT name FROM caterers').all();
  const existingNorm = new Set(existing.map(e => normalize(e.name)));
  log(`📦 DB caterers curent: ${existing.length}`);
  log(`🔎 Total cautari: ${SEARCH_QUERIES.length}\n`);

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
    try {
      await scrapeQuery(page, SEARCH_QUERIES[i], existingNorm, allResults);
    } catch (e) {
      log(`❌ Eroare: ${e.message.substring(0, 100)}`);
    }
    await sleep(2000);
  }

  await browser.close();

  log(`\n${'═'.repeat(60)}`);
  log(`TOTAL NOI GASITE: ${allResults.length}`);
  log('═'.repeat(60));

  if (allResults.length === 0) {
    log('Nicio firma de catering noua gasita.');
    return;
  }

  // Show all found
  log('\nFIRME GASITE:');
  allResults.forEach((r, i) => log(`  ${i+1}. ${r.name} | ${r.address} | ${r.phone || 'fara tel'} | ${r.website || 'fara site'}`));

  const insert = db.prepare(`
    INSERT INTO caterers (name, address, sector, lat, lng, coverage_area, phone, website, description, availability, is_premium, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unknown', 0, 0)
  `);

  let added = 0;
  for (const r of allResults) {
    try {
      const desc = `Firma de catering din ${r.address}. Serveste zona: ${r.coverage_area}.`;
      insert.run(r.name, r.address, r.sector || null, r.lat, r.lng, r.coverage_area, r.phone || null, r.website || null, desc);
      added++;
    } catch (e) {
      log(`  Skip (duplicat DB): ${r.name} — ${e.message.substring(0,50)}`);
    }
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM caterers').get();
  log(`\n✅ Adaugate in DB: ${added}`);
  log(`📦 Total caterers in DB: ${total.count}`);
  log(`\n📄 Log complet: ${LOG_PATH}`);
}

main().catch(e => { log('FATAL:', e.message); process.exit(1); });
