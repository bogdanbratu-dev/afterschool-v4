const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-clubs.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

// Cautari per categorie x cartier
const SEARCH_QUERIES = [
  // INOT
  { q: 'bazin inot copii Aviatiei Bucuresti', cat: 'inot' },
  { q: 'bazin inot copii Floreasca Bucuresti', cat: 'inot' },
  { q: 'bazin inot copii Herastrau Bucuresti', cat: 'inot' },
  { q: 'bazin inot copii Dorobanti Bucuresti', cat: 'inot' },
  { q: 'bazin inot copii Drumul Taberei Bucuresti', cat: 'inot' },
  { q: 'bazin inot copii Militari Bucuresti', cat: 'inot' },
  { q: 'bazin inot copii Titan Bucuresti', cat: 'inot' },
  { q: 'bazin inot copii Berceni Bucuresti', cat: 'inot' },
  { q: 'bazin inot copii Colentina Bucuresti', cat: 'inot' },
  { q: 'bazin inot copii Cotroceni Bucuresti', cat: 'inot' },
  { q: 'bazin inot copii Tineretului Bucuresti', cat: 'inot' },
  { q: 'bazin inot copii Rahova Bucuresti', cat: 'inot' },
  { q: 'scoala inot copii Bucuresti', cat: 'inot' },
  { q: 'club inot copii Bucuresti', cat: 'inot' },
  { q: 'aqua park lectii inot Bucuresti', cat: 'inot' },
  { q: 'lectii inot copii sector 1 Bucuresti', cat: 'inot' },
  { q: 'lectii inot copii sector 2 Bucuresti', cat: 'inot' },
  { q: 'lectii inot copii sector 3 Bucuresti', cat: 'inot' },
  { q: 'lectii inot copii sector 4 Bucuresti', cat: 'inot' },
  { q: 'lectii inot copii sector 5 Bucuresti', cat: 'inot' },
  { q: 'lectii inot copii sector 6 Bucuresti', cat: 'inot' },

  // FOTBAL
  { q: 'scoala fotbal copii Aviatiei Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii Floreasca Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii Drumul Taberei Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii Militari Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii Titan Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii Berceni Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii Colentina Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii Pantelimon Bucuresti', cat: 'fotbal' },
  { q: 'club fotbal juniori Bucuresti', cat: 'fotbal' },
  { q: 'academie fotbal copii Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii sector 1 Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii sector 2 Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii sector 3 Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii sector 4 Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii sector 5 Bucuresti', cat: 'fotbal' },
  { q: 'scoala fotbal copii sector 6 Bucuresti', cat: 'fotbal' },
  { q: 'fotbal copii Baneasa Bucuresti', cat: 'fotbal' },
  { q: 'fotbal copii Herastrau Bucuresti', cat: 'fotbal' },

  // DANSURI
  { q: 'scoala dans copii Aviatiei Bucuresti', cat: 'dansuri' },
  { q: 'scoala dans copii Floreasca Bucuresti', cat: 'dansuri' },
  { q: 'scoala dans copii Drumul Taberei Bucuresti', cat: 'dansuri' },
  { q: 'scoala dans copii Militari Bucuresti', cat: 'dansuri' },
  { q: 'scoala dans copii Titan Bucuresti', cat: 'dansuri' },
  { q: 'scoala dans copii Colentina Bucuresti', cat: 'dansuri' },
  { q: 'studio dans copii Bucuresti', cat: 'dansuri' },
  { q: 'balet copii Bucuresti', cat: 'dansuri' },
  { q: 'dans modern copii Bucuresti', cat: 'dansuri' },
  { q: 'hip hop dans copii Bucuresti', cat: 'dansuri' },
  { q: 'dans sportiv copii Bucuresti', cat: 'dansuri' },
  { q: 'scoala dans copii sector 1 Bucuresti', cat: 'dansuri' },
  { q: 'scoala dans copii sector 2 Bucuresti', cat: 'dansuri' },
  { q: 'scoala dans copii sector 3 Bucuresti', cat: 'dansuri' },
  { q: 'scoala dans copii sector 4 Bucuresti', cat: 'dansuri' },
  { q: 'scoala dans copii sector 5 Bucuresti', cat: 'dansuri' },
  { q: 'scoala dans copii sector 6 Bucuresti', cat: 'dansuri' },

  // ARTE MARTIALE
  { q: 'karate copii Aviatiei Bucuresti', cat: 'arte_martiale' },
  { q: 'karate copii Floreasca Bucuresti', cat: 'arte_martiale' },
  { q: 'karate copii Drumul Taberei Bucuresti', cat: 'arte_martiale' },
  { q: 'karate copii Militari Bucuresti', cat: 'arte_martiale' },
  { q: 'karate copii Titan Bucuresti', cat: 'arte_martiale' },
  { q: 'karate copii Berceni Bucuresti', cat: 'arte_martiale' },
  { q: 'taekwondo copii Bucuresti', cat: 'arte_martiale' },
  { q: 'judo copii Bucuresti', cat: 'arte_martiale' },
  { q: 'arte martiale copii Bucuresti', cat: 'arte_martiale' },
  { q: 'kung fu copii Bucuresti', cat: 'arte_martiale' },
  { q: 'karate club copii sector 1 Bucuresti', cat: 'arte_martiale' },
  { q: 'karate club copii sector 2 Bucuresti', cat: 'arte_martiale' },
  { q: 'karate club copii sector 3 Bucuresti', cat: 'arte_martiale' },
  { q: 'karate club copii sector 4 Bucuresti', cat: 'arte_martiale' },
  { q: 'karate club copii sector 5 Bucuresti', cat: 'arte_martiale' },
  { q: 'karate club copii sector 6 Bucuresti', cat: 'arte_martiale' },

  // GIMNASTICA
  { q: 'scoala gimnastica copii Aviatiei Bucuresti', cat: 'gimnastica' },
  { q: 'scoala gimnastica copii Drumul Taberei Bucuresti', cat: 'gimnastica' },
  { q: 'scoala gimnastica copii Militari Bucuresti', cat: 'gimnastica' },
  { q: 'scoala gimnastica copii Floreasca Bucuresti', cat: 'gimnastica' },
  { q: 'gimnastica ritmica copii Bucuresti', cat: 'gimnastica' },
  { q: 'gimnastica artistica copii Bucuresti', cat: 'gimnastica' },
  { q: 'acrobatie copii Bucuresti', cat: 'gimnastica' },
  { q: 'scoala gimnastica copii sector 1 Bucuresti', cat: 'gimnastica' },
  { q: 'scoala gimnastica copii sector 2 Bucuresti', cat: 'gimnastica' },
  { q: 'scoala gimnastica copii sector 3 Bucuresti', cat: 'gimnastica' },
  { q: 'scoala gimnastica copii sector 4 Bucuresti', cat: 'gimnastica' },
  { q: 'scoala gimnastica copii sector 5 Bucuresti', cat: 'gimnastica' },
  { q: 'scoala gimnastica copii sector 6 Bucuresti', cat: 'gimnastica' },

  // LIMBI STRAINE
  { q: 'cursuri engleza copii Aviatiei Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri engleza copii Floreasca Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri engleza copii Drumul Taberei Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri engleza copii Militari Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri engleza copii Titan Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri engleza copii Colentina Bucuresti', cat: 'limbi_straine' },
  { q: 'scoala engleza copii Bucuresti', cat: 'limbi_straine' },
  { q: 'centru limbi straine copii Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri germana copii Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri franceza copii Bucuresti', cat: 'limbi_straine' },
  { q: 'British Council copii Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri engleza copii sector 1 Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri engleza copii sector 2 Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri engleza copii sector 3 Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri engleza copii sector 4 Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri engleza copii sector 5 Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri engleza copii sector 6 Bucuresti', cat: 'limbi_straine' },

  // ROBOTICA / PROGRAMARE
  { q: 'robotica copii Aviatiei Bucuresti', cat: 'robotica' },
  { q: 'robotica copii Floreasca Bucuresti', cat: 'robotica' },
  { q: 'robotica copii Drumul Taberei Bucuresti', cat: 'robotica' },
  { q: 'robotica copii Militari Bucuresti', cat: 'robotica' },
  { q: 'robotica copii Titan Bucuresti', cat: 'robotica' },
  { q: 'programare copii Bucuresti', cat: 'robotica' },
  { q: 'coding copii Bucuresti', cat: 'robotica' },
  { q: 'robotica lego copii Bucuresti', cat: 'robotica' },
  { q: 'scoala programare copii Bucuresti', cat: 'robotica' },
  { q: 'robotica copii sector 1 Bucuresti', cat: 'robotica' },
  { q: 'robotica copii sector 2 Bucuresti', cat: 'robotica' },
  { q: 'robotica copii sector 3 Bucuresti', cat: 'robotica' },
  { q: 'robotica copii sector 4 Bucuresti', cat: 'robotica' },
  { q: 'robotica copii sector 5 Bucuresti', cat: 'robotica' },
  { q: 'robotica copii sector 6 Bucuresti', cat: 'robotica' },

  // MUZICA
  { q: 'scoala muzica copii Aviatiei Bucuresti', cat: 'muzica' },
  { q: 'scoala muzica copii Floreasca Bucuresti', cat: 'muzica' },
  { q: 'scoala muzica copii Drumul Taberei Bucuresti', cat: 'muzica' },
  { q: 'scoala muzica copii Militari Bucuresti', cat: 'muzica' },
  { q: 'scoala muzica copii Titan Bucuresti', cat: 'muzica' },
  { q: 'lectii pian copii Bucuresti', cat: 'muzica' },
  { q: 'lectii chitara copii Bucuresti', cat: 'muzica' },
  { q: 'lectii vioara copii Bucuresti', cat: 'muzica' },
  { q: 'scoala muzica copii sector 1 Bucuresti', cat: 'muzica' },
  { q: 'scoala muzica copii sector 2 Bucuresti', cat: 'muzica' },
  { q: 'scoala muzica copii sector 3 Bucuresti', cat: 'muzica' },
  { q: 'scoala muzica copii sector 4 Bucuresti', cat: 'muzica' },
  { q: 'scoala muzica copii sector 5 Bucuresti', cat: 'muzica' },
  { q: 'scoala muzica copii sector 6 Bucuresti', cat: 'muzica' },
  { q: 'conservator particular copii Bucuresti', cat: 'muzica' },

  // ARTE CREATIVE
  { q: 'atelier pictura copii Aviatiei Bucuresti', cat: 'arte_creative' },
  { q: 'atelier pictura copii Floreasca Bucuresti', cat: 'arte_creative' },
  { q: 'atelier pictura copii Drumul Taberei Bucuresti', cat: 'arte_creative' },
  { q: 'atelier pictura copii Militari Bucuresti', cat: 'arte_creative' },
  { q: 'atelier pictura copii Titan Bucuresti', cat: 'arte_creative' },
  { q: 'pictura copii Colentina Bucuresti', cat: 'arte_creative' },
  { q: 'atelier arta copii Bucuresti', cat: 'arte_creative' },
  { q: 'cursuri desen copii Bucuresti', cat: 'arte_creative' },
  { q: 'ceramica copii Bucuresti', cat: 'arte_creative' },
  { q: 'sculptura copii Bucuresti', cat: 'arte_creative' },
  { q: 'arte creative copii sector 1 Bucuresti', cat: 'arte_creative' },
  { q: 'arte creative copii sector 2 Bucuresti', cat: 'arte_creative' },
  { q: 'arte creative copii sector 3 Bucuresti', cat: 'arte_creative' },
  { q: 'arte creative copii sector 4 Bucuresti', cat: 'arte_creative' },
  { q: 'arte creative copii sector 5 Bucuresti', cat: 'arte_creative' },
  { q: 'arte creative copii sector 6 Bucuresti', cat: 'arte_creative' },
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

const CATEGORY_KEYWORDS = {
  inot: ['inot', 'aqua', 'bazin', 'swim', 'piscina', 'natatie'],
  fotbal: ['fotbal', 'soccer', 'football', 'sport', 'academie', 'club sportiv'],
  dansuri: ['dans', 'dance', 'balet', 'ballet', 'hip hop', 'studio', 'coregrafie'],
  arte_martiale: ['karate', 'taekwondo', 'judo', 'kung fu', 'arte martiale', 'kickboxing', 'sambo', 'aikido', 'wushu'],
  gimnastica: ['gimnastica', 'gimnastic', 'acrobat', 'trampolin'],
  limbi_straine: ['engleza', 'english', 'germana', 'franceza', 'limbi', 'british', 'language', 'lingua'],
  robotica: ['robot', 'programare', 'coding', 'lego', 'stem', 'informatica', 'scratch'],
  muzica: ['muzica', 'music', 'pian', 'piano', 'chitara', 'vioara', 'voce', 'chitara', 'instrumen', 'conservator'],
  arte_creative: ['pictura', 'desen', 'arta', 'arte', 'ceramica', 'sculptura', 'creativ', 'craft'],
};

function isRelevantForCategory(name, category) {
  const nameLower = name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't');
  // Accept if name contains relevant keyword OR if it's a general club/school/centru/academia
  const keywords = CATEGORY_KEYWORDS[category] || [];
  const isMatch = keywords.some(k => nameLower.includes(k));
  const isGenericVenue = ['club', 'centru', 'academia', 'scoala', 'studio', 'sport', 'copii', 'kids', 'junior'].some(k => nameLower.includes(k));
  return isMatch || isGenericVenue;
}

async function scrapeQuery(page, item, existingNormalized, allResults) {
  const { q: searchQuery, cat: category } = item;
  log(`\n🔍 [${category}] "${searchQuery}"`);

  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000,
  });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(1000);

  // Scroll to load more results
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
  log(`  Gasit ${items.length} rezultate`);

  let newCount = 0;

  for (let i = 0; i < items.length; i++) {
    try {
      const item = items[i];
      const nameEl = item.locator('.qBF1Pd, .fontHeadlineSmall').first();
      const name = (await nameEl.textContent({ timeout: 3000 }).catch(() => '')).trim();
      if (!name || name.length < 3) continue;

      const normName = normalize(name);

      // Skip if already found
      if (existingNormalized.has(normName)) continue;
      const prefix = normName.substring(0, 14);
      if (prefix.length >= 8 && [...existingNormalized].some(e => e.startsWith(prefix) || prefix.startsWith(e.substring(0, 14)))) continue;

      // Relevance filter
      if (!isRelevantForCategory(name, category)) {
        log(`  ⏩ Skip (irelevant): ${name}`);
        continue;
      }

      await item.click();
      await sleep(2000);

      const url = page.url();
      const coords = extractCoordsFromUrl(url);

      // Skip if outside Bucharest bounds
      if (coords && (coords.lat < 44.3 || coords.lat > 44.6 || coords.lng < 25.9 || coords.lng > 26.4)) {
        log(`  ⏩ Skip (in afara Bucurestiului): ${name}`);
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

      allResults.push({ name, address, sector, lat: finalCoords.lat, lng: finalCoords.lng, phone, website, category });
      existingNormalized.add(normName);
      newCount++;
      log(`  ✅ [${category}] ${name} | ${address}`);

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
  const existing = db.prepare('SELECT name FROM clubs').all();
  const existingNormalized = new Set(existing.map(e => normalize(e.name)));
  log(`📦 DB curent: ${existing.length} cluburi`);
  log(`🔎 Total cautari planificate: ${SEARCH_QUERIES.length}\n`);

  const allResults = [];

  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(2000);

  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    log(`\n[${i + 1}/${SEARCH_QUERIES.length}]`);
    try {
      await scrapeQuery(page, SEARCH_QUERIES[i], existingNormalized, allResults);
    } catch (e) {
      log(`❌ Eroare: ${e.message.substring(0, 100)}`);
    }
    await sleep(1500);
  }

  await browser.close();

  log(`\n${'═'.repeat(60)}`);
  log(`TOTAL NOI GASITE: ${allResults.length}`);
  log('═'.repeat(60));

  if (allResults.length === 0) {
    log('Niciun club nou gasit.');
    return;
  }

  // Group by category for summary
  const byCategory = {};
  for (const r of allResults) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  }
  log('\nRezumat pe categorii:');
  for (const [cat, cnt] of Object.entries(byCategory)) {
    log(`  ${cat}: ${cnt}`);
  }

  const insert = db.prepare(`
    INSERT INTO clubs (name, address, sector, lat, lng, phone, email, website, price_min, price_max, schedule, age_min, age_max, description, category, availability)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let added = 0;
  for (const r of allResults) {
    try {
      insert.run(
        r.name, r.address, r.sector, r.lat, r.lng,
        r.phone, null, r.website,
        null, null, null,
        5, 16,
        null,
        r.category,
        'unknown'
      );
      added++;
    } catch (e) {
      log(`❌ Insert error: ${e.message}`);
    }
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM clubs').get();
  log(`\n✅ Adaugate: ${added}`);
  log(`📦 Total cluburi in DB: ${total.count}`);
}

main().catch(console.error);
