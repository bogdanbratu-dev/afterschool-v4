const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-clubs-2.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

// Cartiere neacoperite in primul script
const CARTIERE = [
  // Sector 1
  'Dorobanti', 'Primaverii', 'Domenii', 'Pajura', 'Grivita', 'Bucurestii Noi', 'Turda',
  // Sector 2
  'Obor', 'Pantelimon', 'Iancului', 'Stefan cel Mare', 'Tei', 'Vatra Luminoasa', 'Mosilor', 'Calea Mosilor', 'Fundeni', 'Baicului',
  // Sector 3
  'Dristor', 'Balta Alba', 'Campia Libertatii', 'Dudesti', 'Vitan', 'Timpuri Noi', 'Nicolae Grigorescu', 'Pallady', 'Baba Novac', 'Calea Calarasilor',
  // Sector 4
  'Aparatorii Patriei', 'Brancoveanu', 'Metalurgiei', 'Olteniței', 'Progresul', 'Vacaresti', 'Olteniiei',
  // Sector 5
  'Ferentari', '13 Septembrie', 'Plevnei', 'Calea Rahovei', 'Sebastian',
  // Sector 6
  'Crangasi', 'Giulesti', 'Lujerului', 'Gorjului', 'Politehnica', 'Lacul Morii', 'Virtutii', 'Razoare',
];

const CATEGORII = [
  { cat: 'inot',         terms: ['bazin inot copii', 'lectii inot copii', 'scoala inot'] },
  { cat: 'fotbal',       terms: ['scoala fotbal copii', 'club fotbal copii'] },
  { cat: 'dansuri',      terms: ['scoala dans copii', 'cursuri balet copii'] },
  { cat: 'arte_martiale',terms: ['karate copii', 'arte martiale copii'] },
  { cat: 'gimnastica',   terms: ['gimnastica copii', 'scoala gimnastica'] },
  { cat: 'limbi_straine',terms: ['cursuri engleza copii', 'scoala limbi straine copii'] },
  { cat: 'robotica',     terms: ['robotica copii', 'programare copii'] },
  { cat: 'muzica',       terms: ['scoala muzica copii', 'lectii pian chitara copii'] },
  { cat: 'arte_creative',terms: ['atelier pictura copii', 'cursuri desen copii'] },
];

// Generare automata: fiecare cartier x fiecare categorie x primul termen
const SEARCH_QUERIES = [];
for (const cartier of CARTIERE) {
  for (const { cat, terms } of CATEGORII) {
    SEARCH_QUERIES.push({ q: `${terms[0]} ${cartier} Bucuresti`, cat });
  }
}

// Plus termeni generici per cartier (prinde tot ce a scapat)
for (const cartier of CARTIERE) {
  SEARCH_QUERIES.push({ q: `activitati copii ${cartier} Bucuresti`, cat: null });
  SEARCH_QUERIES.push({ q: `club sport copii ${cartier} Bucuresti`, cat: null });
}

log(`Total query-uri generate: ${SEARCH_QUERIES.length}`);

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
  fotbal: ['fotbal', 'soccer', 'football', 'sport', 'academie'],
  dansuri: ['dans', 'dance', 'balet', 'ballet', 'hip hop', 'studio'],
  arte_martiale: ['karate', 'taekwondo', 'judo', 'kung fu', 'arte martiale', 'kickboxing', 'aikido', 'wushu'],
  gimnastica: ['gimnastica', 'gimnastic', 'acrobat', 'trampolin'],
  limbi_straine: ['engleza', 'english', 'germana', 'franceza', 'limbi', 'british', 'language'],
  robotica: ['robot', 'programare', 'coding', 'lego', 'stem', 'informatica'],
  muzica: ['muzica', 'music', 'pian', 'piano', 'chitara', 'vioara', 'voce', 'instrumen'],
  arte_creative: ['pictura', 'desen', 'arta', 'arte', 'ceramica', 'sculptura', 'creativ'],
};

function detectCategory(name) {
  const n = name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't');
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => n.includes(k))) return cat;
  }
  return null;
}

function isRelevantVenue(name) {
  const n = name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't');
  const allKeywords = Object.values(CATEGORY_KEYWORDS).flat();
  const genericVenue = ['club', 'centru', 'academia', 'scoala', 'studio', 'sport', 'copii', 'kids', 'junior', 'atelier', 'cursuri'];
  return allKeywords.some(k => n.includes(k)) || genericVenue.some(k => n.includes(k));
}

async function scrapeQuery(page, item, existingNormalized, allResults) {
  const { q: searchQuery, cat: suggestedCat } = item;
  log(`\n🔍 [${suggestedCat || 'auto'}] "${searchQuery}"`);

  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000,
  });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(1000);

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
      if (existingNormalized.has(normName)) continue;
      const prefix = normName.substring(0, 14);
      if (prefix.length >= 8 && [...existingNormalized].some(e => e.startsWith(prefix) || prefix.startsWith(e.substring(0, 14)))) continue;

      if (!isRelevantVenue(name)) {
        log(`  ⏩ Skip (irelevant): ${name}`);
        continue;
      }

      await item.click();
      await sleep(2000);

      const url = page.url();
      const coords = extractCoordsFromUrl(url);

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

      // Determina categoria: din query sau auto-detectat din nume
      const category = suggestedCat || detectCategory(name);
      if (!category) {
        log(`  ⏩ Skip (categorie necunoscuta): ${name}`);
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        await sleep(1000);
        continue;
      }

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

  log(`  -> ${newCount} noi`);
  return newCount;
}

async function main() {
  const existing = db.prepare('SELECT name FROM clubs').all();
  const existingNormalized = new Set(existing.map(e => normalize(e.name)));
  log(`DB curent: ${existing.length} cluburi`);
  log(`Total cautari planificate: ${SEARCH_QUERIES.length}`);
  log(`Cartiere acoperite: ${CARTIERE.length}`);
  log(`Categorii: ${CATEGORII.length}\n`);

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
      log(`Eroare: ${e.message.substring(0, 100)}`);
    }
    await sleep(1500);
  }

  await browser.close();

  log(`\n${'='.repeat(60)}`);
  log(`TOTAL NOI GASITE: ${allResults.length}`);

  const byCategory = {};
  for (const r of allResults) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  }
  log('\nRezumat pe categorii:');
  for (const [cat, cnt] of Object.entries(byCategory)) {
    log(`  ${cat}: ${cnt}`);
  }
  log('='.repeat(60));

  if (allResults.length === 0) {
    log('Niciun club nou gasit.');
    return;
  }

  const insert = db.prepare(`
    INSERT INTO clubs (name, address, sector, lat, lng, phone, email, website, price_min, price_max, schedule, age_min, age_max, description, category, availability)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let added = 0;
  for (const r of allResults) {
    try {
      insert.run(r.name, r.address, r.sector, r.lat, r.lng, r.phone, null, r.website,
        null, null, null, 5, 16, null, r.category, 'unknown');
      added++;
    } catch (e) {
      log(`Insert error: ${e.message}`);
    }
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM clubs').get();
  log(`\nAdaugate: ${added}`);
  log(`Total cluburi in DB: ${total.count}`);
}

main().catch(console.error);
