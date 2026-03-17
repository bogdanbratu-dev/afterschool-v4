/**
 * discover-new.js — Descoperire automata afterschool-uri si cluburi noi pe Google Maps
 *
 * Rulat de scrape-all.js o data pe luna (sau manual).
 * Foloseste ~24 query-uri reprezentative (6 afterschool + 18 cluburi).
 * Deduplica contra DB-ului existent inainte de insert.
 */

const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-all.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' }); // append
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

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

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

// ─── QUERY-URI REPREZENTATIVE ────────────────────────────────────────────────

const AFTERSCHOOL_QUERIES = [
  'afterschool sector 1 Bucuresti',
  'afterschool sector 2 Bucuresti',
  'afterschool sector 3 Bucuresti',
  'afterschool sector 4 Bucuresti',
  'afterschool sector 5 Bucuresti',
  'afterschool sector 6 Bucuresti',
];

const CLUB_QUERIES = [
  // 2 queries per category = 18 total
  { q: 'bazin inot copii Bucuresti', cat: 'inot' },
  { q: 'scoala inot copii Bucuresti', cat: 'inot' },
  { q: 'scoala fotbal copii Bucuresti', cat: 'fotbal' },
  { q: 'academie fotbal copii Bucuresti', cat: 'fotbal' },
  { q: 'scoala dans copii Bucuresti', cat: 'dansuri' },
  { q: 'balet copii Bucuresti', cat: 'dansuri' },
  { q: 'karate copii Bucuresti', cat: 'arte_martiale' },
  { q: 'arte martiale copii Bucuresti', cat: 'arte_martiale' },
  { q: 'gimnastica copii Bucuresti', cat: 'gimnastica' },
  { q: 'gimnastica ritmica copii Bucuresti', cat: 'gimnastica' },
  { q: 'cursuri engleza copii Bucuresti', cat: 'limbi_straine' },
  { q: 'centru limbi straine copii Bucuresti', cat: 'limbi_straine' },
  { q: 'robotica copii Bucuresti', cat: 'robotica' },
  { q: 'programare copii Bucuresti', cat: 'robotica' },
  { q: 'scoala muzica copii Bucuresti', cat: 'muzica' },
  { q: 'lectii pian copii Bucuresti', cat: 'muzica' },
  { q: 'atelier pictura copii Bucuresti', cat: 'arte_creative' },
  { q: 'cursuri desen copii Bucuresti', cat: 'arte_creative' },
];

// ─── DEDUPLICARE ─────────────────────────────────────────────────────────────

function isDuplicate(normName, lat, lng, existingEntries) {
  for (const entry of existingEntries) {
    // 1. Exact normalized name match
    if (entry.norm === normName) return true;

    // 2. Prefix match (14 chars) + location proximity (<500m)
    const prefix = normName.substring(0, 14);
    const existPrefix = entry.norm.substring(0, 14);
    if (prefix.length >= 8 && existPrefix.length >= 8 &&
      (prefix === existPrefix || normName.startsWith(existPrefix) || entry.norm.startsWith(prefix))) {
      if (lat && lng && entry.lat && entry.lng) {
        const dist = haversineKm(lat, lng, entry.lat, entry.lng);
        if (dist < 0.5) return true;
      }
    }
  }
  return false;
}

// ─── SCRAPE GOOGLE MAPS ─────────────────────────────────────────────────────

async function scrapeResults(page, searchQuery) {
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000,
  });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(1000);

  // Scroll to load results
  let lastCount = 0;
  for (let scroll = 0; scroll < 6; scroll++) {
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
  const results = [];

  for (const item of items) {
    try {
      const nameEl = item.locator('.qBF1Pd, .fontHeadlineSmall').first();
      const name = (await nameEl.textContent({ timeout: 3000 }).catch(() => '')).trim();
      if (!name || name.length < 3) continue;

      await item.click();
      await sleep(2000);

      const url = page.url();
      const coords = extractCoordsFromUrl(url);

      // Skip if outside Bucharest bounds
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
        lat: sector ? [0, 44.4630, 44.4490, 44.4180, 44.3960, 44.4100, 44.4350][sector] : 44.4268,
        lng: sector ? [0, 26.0640, 26.1150, 26.1300, 26.1050, 26.0650, 26.0200][sector] : 26.1025,
      };

      results.push({ name, address, sector, lat: finalCoords.lat, lng: finalCoords.lng, phone, website });

      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await sleep(1500);
    } catch {
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await sleep(1000);
    }
  }

  return results;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  log(`\n${'═'.repeat(65)}`);
  log(`[${new Date().toLocaleString('ro-RO')}] DISCOVERY — Cautare afterschool-uri si cluburi noi`);
  log('═'.repeat(65));

  // Load all existing entries for dedup
  const existingAS = db.prepare('SELECT name, lat, lng FROM afterschools').all()
    .map(r => ({ norm: normalize(r.name), lat: r.lat, lng: r.lng }));
  const existingClubs = db.prepare('SELECT name, lat, lng FROM clubs').all()
    .map(r => ({ norm: normalize(r.name), lat: r.lat, lng: r.lng }));

  log(`DB curent: ${existingAS.length} afterschool-uri, ${existingClubs.length} cluburi`);

  const browser = await chromium.launch({ headless: true, slowMo: 40 });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(2000);

  let newAfterSchools = 0, newClubs = 0;

  // ─── Faza A: Afterschool-uri noi ────────────────────────────────────────
  log(`\n--- Faza A: Afterschool-uri (${AFTERSCHOOL_QUERIES.length} queries) ---`);

  const insertAS = db.prepare(`
    INSERT INTO afterschools (name, address, sector, lat, lng, phone, email, website, availability)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'unknown')
  `);

  for (let i = 0; i < AFTERSCHOOL_QUERIES.length; i++) {
    const query = AFTERSCHOOL_QUERIES[i];
    log(`\n[${i + 1}/${AFTERSCHOOL_QUERIES.length}] "${query}"`);
    try {
      const results = await scrapeResults(page, query);
      log(`  Gasit ${results.length} rezultate`);

      for (const r of results) {
        const normName = normalize(r.name);
        if (isDuplicate(normName, r.lat, r.lng, existingAS)) continue;

        // Check name relevance for afterschool
        const nameLower = r.name.toLowerCase();
        const isRelevant = ['after', 'school', 'afterschool', 'after-school', 'scoala', 'educati', 'copii', 'kids', 'centru'].some(k => nameLower.includes(k));
        if (!isRelevant) continue;

        try {
          insertAS.run(r.name, r.address, r.sector, r.lat, r.lng, r.phone, r.website);
          existingAS.push({ norm: normName, lat: r.lat, lng: r.lng });
          newAfterSchools++;
          log(`  [DISCOVERY] Adaugat afterschool: "${r.name}" la ${r.address}`);
        } catch (e) {
          log(`  ❌ Insert error: ${e.message.substring(0, 60)}`);
        }
      }
    } catch (e) {
      log(`  ❌ Eroare query: ${e.message.substring(0, 80)}`);
    }
    await sleep(1500);
  }

  // ─── Faza B: Cluburi noi ────────────────────────────────────────────────
  log(`\n--- Faza B: Cluburi (${CLUB_QUERIES.length} queries) ---`);

  const insertClub = db.prepare(`
    INSERT INTO clubs (name, address, sector, lat, lng, phone, email, website, category, availability)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 'unknown')
  `);

  for (let i = 0; i < CLUB_QUERIES.length; i++) {
    const { q: query, cat: category } = CLUB_QUERIES[i];
    log(`\n[${i + 1}/${CLUB_QUERIES.length}] [${category}] "${query}"`);
    try {
      const results = await scrapeResults(page, query);
      log(`  Gasit ${results.length} rezultate`);

      for (const r of results) {
        const normName = normalize(r.name);
        if (isDuplicate(normName, r.lat, r.lng, existingClubs)) continue;

        try {
          insertClub.run(r.name, r.address, r.sector, r.lat, r.lng, r.phone, r.website, category);
          existingClubs.push({ norm: normName, lat: r.lat, lng: r.lng });
          newClubs++;
          log(`  [DISCOVERY] Adaugat club [${category}]: "${r.name}" la ${r.address}`);
        } catch (e) {
          log(`  ❌ Insert error: ${e.message.substring(0, 60)}`);
        }
      }
    } catch (e) {
      log(`  ❌ Eroare query: ${e.message.substring(0, 80)}`);
    }
    await sleep(1500);
  }

  await browser.close();

  // ─── Rezumat ────────────────────────────────────────────────────────────
  log(`\n${'─'.repeat(65)}`);
  log(`[DISCOVERY] Afterschool-uri noi: ${newAfterSchools}`);
  log(`[DISCOVERY] Cluburi noi:         ${newClubs}`);
  log(`[DISCOVERY] Total noi:           ${newAfterSchools + newClubs}`);
  log('═'.repeat(65) + '\n');

  // Save timestamp
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_discovery', ?)").run(Date.now().toString());

  return { newAfterSchools, newClubs };
}

module.exports = main;

// Allow direct execution
if (require.main === module) {
  main().catch(e => {
    log(`EROARE FATALA DISCOVERY: ${e.message}`);
    process.exit(1);
  });
}
