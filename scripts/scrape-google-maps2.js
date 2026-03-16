const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-google-maps2.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

// 60 de cautari acoperind toate cartierele importante din Bucuresti
const SEARCH_QUERIES = [
  // Sector 1 - cartiere
  'afterschool Aviatiei Bucuresti',
  'afterschool Baneasa Bucuresti',
  'afterschool Dorobanti Bucuresti',
  'afterschool Herastrau Bucuresti',
  'afterschool Primaverii Bucuresti',
  'afterschool Victoriei Bucuresti',
  'afterschool Domenii Bucuresti',
  'afterschool Pajura Bucuresti',
  'afterschool Grivita Bucuresti',
  'afterschool Bucurestii Noi Bucuresti',
  // Sector 2 - cartiere
  'afterschool Floreasca Bucuresti',
  'afterschool Colentina Bucuresti',
  'afterschool Pantelimon sector 2 Bucuresti',
  'afterschool Iancului Bucuresti',
  'afterschool Stefan cel Mare Bucuresti',
  'afterschool Tei Bucuresti',
  'afterschool Vatra Luminoasa Bucuresti',
  'afterschool Mosilor Bucuresti',
  // Sector 3 - cartiere
  'afterschool Titan Bucuresti',
  'afterschool Dristor Bucuresti',
  'afterschool Balta Alba Bucuresti',
  'afterschool Campia Libertatii Bucuresti',
  'afterschool Dudesti Bucuresti',
  'afterschool Vitan Bucuresti',
  'afterschool Timpuri Noi Bucuresti',
  'afterschool Unirii sector 3 Bucuresti',
  // Sector 4 - cartiere
  'afterschool Berceni Bucuresti',
  'afterschool Olteniiei Bucuresti',
  'afterschool Metalurgiei Bucuresti',
  'afterschool Tineretului Bucuresti',
  'afterschool Aparatorii Patriei Bucuresti',
  'afterschool Brancoveanu Bucuresti',
  // Sector 5 - cartiere
  'afterschool Rahova Bucuresti',
  'afterschool Ferentari Bucuresti',
  'afterschool Cotroceni Bucuresti',
  'afterschool Plevnei Bucuresti',
  'afterschool 13 Septembrie Bucuresti',
  'afterschool Progresul Bucuresti',
  // Sector 6 - cartiere
  'afterschool Militari Bucuresti',
  'afterschool Drumul Taberei Bucuresti',
  'afterschool Crangasi Bucuresti',
  'afterschool Giulesti Bucuresti',
  'afterschool Lujerului Bucuresti',
  'afterschool Plaza Romania Bucuresti',
  'afterschool Gorjului Bucuresti',
  'afterschool Politehnica Bucuresti',
  // Termeni generici suplimentari
  'program after school Bucuresti',
  'centru educatonal copii Bucuresti',
  'activitati extrascolare Bucuresti',
  'scoala dupa scoala Bucuresti',
  'afterschool privat Bucuresti',
  'kiddie afterschool Bucuresti',
  'after school program copii Bucuresti',
  'club copii afterschool Bucuresti',
  'gradinita afterschool Bucuresti',
  'centru after school Bucuresti',
  'supraveghere scolara Bucuresti',
  'teme scoala dupa program Bucuresti',
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

async function scrapeQuery(page, searchQuery, existingNormalized, allResults) {
  log(`\n🔍 "${searchQuery}"`);

  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000,
  });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(1000);

  // Scroll results to load more
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

      const normName = normalize(name);

      // Skip non-afterschool results
      const nameLower = name.toLowerCase();
      const isAfterSchool = ['after', 'after school', 'afterschool', 'edu', 'kids', 'copii', 'scoala', 'smart', 'club', 'centru'].some(k => nameLower.includes(k));
      // Accept if it has afterschool-related keywords OR if the query was very specific
      if (!isAfterSchool && !searchQuery.toLowerCase().includes('afterschool')) continue;

      // Dedup check - exact
      if (existingNormalized.has(normName)) continue;
      // Dedup check - prefix (12 chars)
      const prefix = normName.substring(0, 12);
      if (prefix.length >= 8 && [...existingNormalized].some(e => e.startsWith(prefix) || prefix.startsWith(e.substring(0, 12)))) continue;

      await item.click();
      await sleep(2000);

      const url = page.url();
      const coords = extractCoordsFromUrl(url);

      if (coords && (coords.lat < 44.3 || coords.lat > 44.6 || coords.lng < 25.9 || coords.lng > 26.4)) {
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
      const finalCoords = coords || {
        lat: sector ? [0,44.4630,44.4490,44.4180,44.3960,44.4100,44.4350][sector] : 44.4268,
        lng: sector ? [0,26.0640,26.1150,26.1300,26.1050,26.0650,26.0200][sector] : 26.1025,
      };

      allResults.push({ name, address, sector, lat: finalCoords.lat, lng: finalCoords.lng, phone, website });
      existingNormalized.add(normName);
      newCount++;
      log(`  ✅ ${name} | ${address}`);

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
  // Load existing
  const existing = db.prepare('SELECT name FROM afterschools').all();
  const existingNormalized = new Set(existing.map(e => normalize(e.name)));
  log(`📦 DB curent: ${existing.length} afterschool-uri`);
  log(`🔎 Total cautari planificate: ${SEARCH_QUERIES.length}\n`);

  const allResults = [];

  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  // Initial Google Maps load + consent
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(2000);

  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    log(`\n[${i+1}/${SEARCH_QUERIES.length}]`);
    try {
      await scrapeQuery(page, SEARCH_QUERIES[i], existingNormalized, allResults);
    } catch (e) {
      log(`❌ Eroare: ${e.message.substring(0, 80)}`);
    }
    await sleep(1500);
  }

  await browser.close();

  log(`\n${'═'.repeat(60)}`);
  log(`TOTAL NOI GASITE: ${allResults.length}`);
  log('═'.repeat(60));

  if (allResults.length === 0) {
    log('Niciun afterschool nou gasit.');
    return;
  }

  const insert = db.prepare(`
    INSERT INTO afterschools (name, address, sector, lat, lng, phone, email, website, price_min, price_max, pickup_time, end_time, age_min, age_max, description, activities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let added = 0;
  for (const r of allResults) {
    try {
      insert.run(r.name, r.address, r.sector, r.lat, r.lng, r.phone, null, r.website,
        null, null, null, null, 6, 14,
        `After school in Bucuresti${r.sector ? ', Sector ' + r.sector : ''}.`,
        'Teme,Engleza,Arte,Sport');
      added++;
    } catch {}
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM afterschools').get();
  log(`\n✅ Adaugate: ${added}`);
  log(`📦 Total in DB: ${total.count}`);
}

main().catch(console.error);
