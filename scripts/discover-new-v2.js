/**
 * discover-new-v2.js — Descoperire automata afterschool-uri si cluburi noi
 *
 * Imbunatatiri fata de v1:
 *  - 45 query-uri afterschool (pe cartiere) + 36 query-uri cluburi (4 per categorie)
 *  - Extrage tipul locatiei din Google Maps pentru filtrare mai stricta
 *  - Scrapeaza pretul de pe website-ul fiecarui listing (homepage + pagina pret/tarife)
 *  - Extrage rating + numar recenzii Google Maps
 *  - Mod --dry-run: preview fara niciun insert in DB
 *  - Deduplicare pe nume normalizat + distanta coordonate < 300m
 *  - Checkpoint: la restart, sare query-urile deja finalizate
 *
 * Rulare:
 *   node scripts/discover-new-v2.js                    — ruleaza complet
 *   node scripts/discover-new-v2.js --dry-run          — preview, fara insert
 *   node scripts/discover-new-v2.js --type afterschool — doar afterschool-uri
 *   node scripts/discover-new-v2.js --type club        — doar cluburi
 *   node scripts/discover-new-v2.js --reset            — sterge checkpoint si o ia de la capat
 */

const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'discover-v2.log');
const CHECKPOINT_PATH = path.join(__dirname, '..', 'data', 'discover-v2-checkpoint.json');
const db = new Database(DB_PATH);

// ─── CHECKPOINT ───────────────────────────────────────────────────────────────

function loadCheckpoint() {
  if (process.argv.includes('--reset')) {
    if (fs.existsSync(CHECKPOINT_PATH)) fs.unlinkSync(CHECKPOINT_PATH);
    return new Set();
  }
  try {
    const data = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));
    return new Set(data.done || []);
  } catch {
    return new Set();
  }
}

function saveCheckpoint(doneSet) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({ done: [...doneSet] }));
}

const DRY_RUN = process.argv.includes('--dry-run');
const TYPE_FILTER = process.argv.includes('--type')
  ? process.argv[process.argv.indexOf('--type') + 1]
  : null;

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalize(name) {
  return name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i')
    .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9]/g, '');
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

function isDuplicate(normName, lat, lng, existing) {
  for (const e of existing) {
    if (e.norm === normName) return true;
    // Same approximate location + similar name prefix
    if (lat && lng && e.lat && e.lng && haversineKm(lat, lng, e.lat, e.lng) < 0.3) {
      const len = Math.min(normName.length, e.norm.length, 10);
      if (len >= 6 && normName.substring(0, len) === e.norm.substring(0, len)) return true;
    }
  }
  return false;
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

// ─── QUERY-URI ────────────────────────────────────────────────────────────────

const AFTERSCHOOL_QUERIES = [
  // Pe sector
  'afterschool sector 1 Bucuresti',
  'afterschool sector 2 Bucuresti',
  'afterschool sector 3 Bucuresti',
  'afterschool sector 4 Bucuresti',
  'afterschool sector 5 Bucuresti',
  'afterschool sector 6 Bucuresti',
  // Sector 1 - cartiere
  'afterschool Aviatiei Bucuresti',
  'afterschool Baneasa Bucuresti',
  'afterschool Dorobanti Bucuresti',
  'afterschool Herastrau Bucuresti',
  'afterschool Victoriei Bucuresti',
  'afterschool Domenii Bucuresti',
  'afterschool Grivita Bucuresti',
  'afterschool Bucurestii Noi Bucuresti',
  // Sector 2 - cartiere
  'afterschool Floreasca Bucuresti',
  'afterschool Colentina Bucuresti',
  'afterschool Iancului Bucuresti',
  'afterschool Stefan cel Mare Bucuresti',
  'afterschool Tei Bucuresti',
  'afterschool Mosilor Bucuresti',
  'afterschool Vatra Luminoasa Bucuresti',
  'afterschool Pantelimon sector 2 Bucuresti',
  // Sector 3 - cartiere
  'afterschool Titan Bucuresti',
  'afterschool Dristor Bucuresti',
  'afterschool Balta Alba Bucuresti',
  'afterschool Vitan Bucuresti',
  'afterschool Dudesti Bucuresti',
  'afterschool Timpuri Noi Bucuresti',
  // Sector 4 - cartiere
  'afterschool Berceni Bucuresti',
  'afterschool Tineretului Bucuresti',
  'afterschool Aparatorii Patriei Bucuresti',
  'afterschool Brancoveanu Bucuresti',
  'afterschool Metalurgiei Bucuresti',
  // Sector 5 - cartiere
  'afterschool Rahova Bucuresti',
  'afterschool Cotroceni Bucuresti',
  'afterschool 13 Septembrie Bucuresti',
  'afterschool Plevnei Bucuresti',
  'afterschool Ferentari Bucuresti',
  // Sector 6 - cartiere
  'afterschool Militari Bucuresti',
  'afterschool Drumul Taberei Bucuresti',
  'afterschool Crangasi Bucuresti',
  'afterschool Giulesti Bucuresti',
  'afterschool Lujerului Bucuresti',
  // Sinonime si termeni generici
  'program after school copii Bucuresti',
  'centru educational dupa scoala Bucuresti',
  'scoala dupa scoala privat Bucuresti',
  'supraveghere scolara Bucuresti',
  'after school program Bucuresti',
];

const CLUB_QUERIES = [
  // Inot — 4 query-uri
  { q: 'bazin inot copii Bucuresti', cat: 'inot' },
  { q: 'scoala inot copii Bucuresti', cat: 'inot' },
  { q: 'lectii inot copii Bucuresti', cat: 'inot' },
  { q: 'club inot juniori Bucuresti', cat: 'inot' },
  // Fotbal — 4 query-uri
  { q: 'scoala fotbal copii Bucuresti', cat: 'fotbal' },
  { q: 'academie fotbal copii Bucuresti', cat: 'fotbal' },
  { q: 'club fotbal juniori Bucuresti', cat: 'fotbal' },
  { q: 'antrenamente fotbal copii Bucuresti', cat: 'fotbal' },
  // Dansuri — 4 query-uri
  { q: 'scoala dans copii Bucuresti', cat: 'dansuri' },
  { q: 'balet copii Bucuresti', cat: 'dansuri' },
  { q: 'cursuri dans copii Bucuresti', cat: 'dansuri' },
  { q: 'studio dans copii Bucuresti', cat: 'dansuri' },
  // Arte martiale — 4 query-uri
  { q: 'karate copii Bucuresti', cat: 'arte_martiale' },
  { q: 'judo copii Bucuresti', cat: 'arte_martiale' },
  { q: 'taekwondo copii Bucuresti', cat: 'arte_martiale' },
  { q: 'arte martiale copii Bucuresti', cat: 'arte_martiale' },
  // Gimnastica — 4 query-uri
  { q: 'gimnastica copii Bucuresti', cat: 'gimnastica' },
  { q: 'gimnastica ritmica copii Bucuresti', cat: 'gimnastica' },
  { q: 'acrobatii copii Bucuresti', cat: 'gimnastica' },
  { q: 'club gimnastica copii Bucuresti', cat: 'gimnastica' },
  // Limbi straine — 4 query-uri
  { q: 'cursuri engleza copii Bucuresti', cat: 'limbi_straine' },
  { q: 'centru limbi straine copii Bucuresti', cat: 'limbi_straine' },
  { q: 'cursuri franceza copii Bucuresti', cat: 'limbi_straine' },
  { q: 'scoala limbi straine copii Bucuresti', cat: 'limbi_straine' },
  // Robotica — 4 query-uri
  { q: 'robotica copii Bucuresti', cat: 'robotica' },
  { q: 'programare copii Bucuresti', cat: 'robotica' },
  { q: 'cursuri coding copii Bucuresti', cat: 'robotica' },
  { q: 'STEM copii Bucuresti', cat: 'robotica' },
  // Muzica — 4 query-uri
  { q: 'scoala muzica copii Bucuresti', cat: 'muzica' },
  { q: 'lectii pian copii Bucuresti', cat: 'muzica' },
  { q: 'cursuri chitara copii Bucuresti', cat: 'muzica' },
  { q: 'cursuri vioara copii Bucuresti', cat: 'muzica' },
  // Arte creative — 4 query-uri
  { q: 'atelier pictura copii Bucuresti', cat: 'arte_creative' },
  { q: 'cursuri desen copii Bucuresti', cat: 'arte_creative' },
  { q: 'ceramica copii Bucuresti', cat: 'arte_creative' },
  { q: 'arte plastice copii Bucuresti', cat: 'arte_creative' },
];

// ─── FILTRARE ─────────────────────────────────────────────────────────────────

// Tipuri Google Maps care confirma ca e afterschool/ingrijire copii
const AS_ACCEPT_TYPES = [
  'after school', 'afterschool', 'after-school',
  'child care', 'childcare', 'day care', 'daycare',
  'centru educational', 'centru de zi', 'educational center',
  'ingrijire copii', 'supraveghere', 'cresa', 'gradinita',
];

// Tipuri Google Maps care resping clar rezultatul
const AS_REJECT_TYPES = [
  'restaurant', 'hotel', 'bar', 'pub', 'magazin', 'farmacie',
  'spital', 'clinica', 'cabinet medical', 'birou', 'agentie imobiliare',
  'supermarket', 'cofetarie', 'patiserie', 'librarie', 'salon', 'coafor',
  'frizerie', 'fitness', 'asociatie', 'firma', 'blog', 'revista', 'ziar',
  'fast food', 'pizza', 'sushi', 'grocery', 'bank', 'banca',
];

// Cuvinte cheie in NUME care confirma ca e afterschool
const AS_NAME_KEYWORDS = [
  'afterschool', 'after school', 'after-school', 'scoala dupa', 'dupa scoala',
  'kids', 'copii', 'little', 'junior', 'smart', 'academy', 'edu', 'kiddo',
  'child', 'mini', 'progres', 'viitor', 'invatare', 'centru educational',
  'centru recreere', 'club copii', 'gradinita',
];

// Cuvinte cheie in NUME care resping clar (chiar daca cautarea e pentru afterschool)
const AS_NAME_REJECT = [
  'blog', 'facebook', 'instagram', 'agentie', 'imobiliare', 'pizza', 'restaurant',
  'hotel', 'salon', 'cabinet', 'clinica', 'farmacie', 'supermarket', 'bar ',
];

function isRelevantAfterSchool(name, placeType) {
  const nameLower = name.toLowerCase();
  const typeLower = (placeType || '').toLowerCase();

  // Respinge daca numele contine cuvinte cheie de respingere
  if (AS_NAME_REJECT.some(k => nameLower.includes(k))) return false;

  // Accepta daca tipul Google Maps confirma
  if (AS_ACCEPT_TYPES.some(t => typeLower.includes(t))) return true;

  // Respinge daca tipul Google Maps respinge clar
  if (AS_REJECT_TYPES.some(t => typeLower.includes(t))) return false;

  // Accepta daca numele are cuvinte cheie puternice
  if (AS_NAME_KEYWORDS.some(k => nameLower.includes(k))) return true;

  // Daca tipul e necunoscut, respinge (mai bine sa lipseasca decat sa fie gresit)
  return false;
}

// Pentru cluburi — mai permisiv, cautarile sunt deja specifice pe activitate
const CLUB_REJECT_TYPES = [
  'restaurant', 'hotel', 'bar', 'pub', 'magazin', 'farmacie',
  'spital', 'clinica', 'birou', 'agentie', 'salon', 'coafor',
  'blog', 'revista', 'fast food', 'pizza', 'grocery', 'banca',
];

const CLUB_NAME_REJECT = [
  'blog', 'facebook', 'agentie', 'imobiliare', 'pizza', 'restaurant',
  'hotel', 'salon', 'clinica', 'farmacie', 'supermarket',
];

function isRelevantClub(name, placeType) {
  const nameLower = name.toLowerCase();
  const typeLower = (placeType || '').toLowerCase();
  if (CLUB_NAME_REJECT.some(k => nameLower.includes(k))) return false;
  if (CLUB_REJECT_TYPES.some(t => typeLower.includes(t))) return false;
  return true;
}

// ─── SCRAPING PRET DIN WEBSITE ────────────────────────────────────────────────

async function scrapePriceFromWebsite(webPage, url) {
  if (!url) return { price_min: null, price_max: null };

  try {
    await webPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await sleep(1000);

    let allText = await webPage.evaluate(() => document.body?.innerText || '').catch(() => '');

    // Cauta o pagina de preturi/tarife
    const links = await webPage.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ href: a.href || '', text: (a.innerText || '').toLowerCase() }))
        .filter(l => l.href && !l.href.startsWith('tel:') && !l.href.startsWith('mailto:'))
    ).catch(() => []);

    const PRICE_KEYWORDS = ['pret', 'tarif', 'cost', 'taxa', 'inscrieri', 'servicii', 'oferta', 'pachete', 'abonament'];
    const priceLink = links.find(l =>
      PRICE_KEYWORDS.some(k => l.href.toLowerCase().includes(k) || l.text.includes(k))
    );

    if (priceLink) {
      try {
        await webPage.goto(priceLink.href, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await sleep(800);
        allText += ' ' + (await webPage.evaluate(() => document.body?.innerText || '').catch(() => ''));
      } catch {}
    }

    // Extrage valori pret: "1200 lei", "800 RON", "1.500 lei/luna"
    const prices = [];
    const rx = /\b(\d{3,4}(?:[.,]\d{3})?)\s*(?:lei|ron|RON)\b/gi;
    let m;
    while ((m = rx.exec(allText)) !== null) {
      const val = parseFloat(m[1].replace(/[.,]/g, ''));
      if (val >= 150 && val <= 6000) prices.push(val);
    }

    if (prices.length === 0) return { price_min: null, price_max: null };

    const unique = [...new Set(prices)].sort((a, b) => a - b);
    return {
      price_min: unique[0],
      price_max: unique.length > 1 ? unique[unique.length - 1] : null,
    };
  } catch {
    return { price_min: null, price_max: null };
  }
}

// ─── GOOGLE MAPS SCRAPING ─────────────────────────────────────────────────────

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

async function scrapeResults(mapsPage, webPage, searchQuery) {
  await mapsPage.goto(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000,
  });
  await sleep(3000);
  await dismissConsent(mapsPage);
  await sleep(1000);

  // Scroll pentru a incarca toate rezultatele
  let lastCount = 0;
  for (let s = 0; s < 8; s++) {
    const cnt = await mapsPage.locator('.Nv2PK').count();
    if (cnt === lastCount && s > 2) break;
    lastCount = cnt;
    await mapsPage.evaluate(() => {
      const feed = document.querySelector('[role="feed"]');
      if (feed) feed.scrollTop += 800;
    });
    await sleep(1200);
    const end = await mapsPage.locator('text=/You.ve reached the end|Ați ajuns la sfârșit/i')
      .isVisible().catch(() => false);
    if (end) break;
  }

  const items = await mapsPage.locator('.Nv2PK').all();
  const results = [];

  for (const item of items) {
    try {
      const nameEl = item.locator('.qBF1Pd, .fontHeadlineSmall').first();
      const name = (await nameEl.textContent({ timeout: 3000 }).catch(() => '')).trim();
      if (!name || name.length < 3) continue;

      await item.click();
      await sleep(2000);

      const url = mapsPage.url();
      const coords = extractCoordsFromUrl(url);

      // Sari locatiile din afara Bucurestiului
      if (coords && (coords.lat < 44.3 || coords.lat > 44.6 || coords.lng < 25.9 || coords.lng > 26.4)) {
        await mapsPage.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        await sleep(1000);
        continue;
      }

      // Tipul locatiei (ex: "After school", "Child care center")
      let placeType = '';
      try {
        const typeEl = mapsPage.locator('.DkEaL').first();
        if (await typeEl.isVisible({ timeout: 1500 }).catch(() => false)) {
          placeType = (await typeEl.textContent().catch(() => '')).trim();
        }
      } catch {}

      // Rating si recenzii
      let rating = null, reviewsCount = null;
      try {
        const ratingText = await mapsPage.locator('[aria-label*="stele"], [aria-label*="stars"]')
          .first().getAttribute('aria-label').catch(() => null);
        if (ratingText) {
          const rm = ratingText.match(/(\d[,.]?\d*)/);
          if (rm) rating = parseFloat(rm[1].replace(',', '.'));
        }
        const reviewsEl = mapsPage.locator('[aria-label*="recenzii"], [aria-label*="reviews"]').first();
        if (await reviewsEl.isVisible({ timeout: 1000 }).catch(() => false)) {
          const rv = await reviewsEl.getAttribute('aria-label').catch(() => '');
          const rm2 = (rv || '').match(/(\d[\d.,]*)/);
          if (rm2) reviewsCount = parseInt(rm2[1].replace(/[.,]/g, ''));
        }
      } catch {}

      // Adresa, telefon, website
      let address = '', phone = null, website = null;
      try {
        const addrEl = mapsPage.locator('button[data-item-id="address"] .fontBodyMedium, [data-item-id="address"] .fontBodyMedium').first();
        if (await addrEl.isVisible({ timeout: 2000 }).catch(() => false))
          address = (await addrEl.textContent() || '').trim();
        const phoneEl = mapsPage.locator('button[data-item-id^="phone"] .fontBodyMedium').first();
        if (await phoneEl.isVisible({ timeout: 2000 }).catch(() => false))
          phone = (await phoneEl.textContent() || '').trim().replace(/\s+/g, '');
        const webEl = mapsPage.locator('a[data-item-id="authority"]').first();
        if (await webEl.isVisible({ timeout: 2000 }).catch(() => false))
          website = await webEl.getAttribute('href');
      } catch {}

      if (!address) address = 'Bucuresti';
      const sector = extractSector(address);
      const finalCoords = coords || {
        lat: sector ? [0, 44.4630, 44.4490, 44.4180, 44.3960, 44.4100, 44.4350][sector] : 44.4268,
        lng: sector ? [0, 26.0640, 26.1150, 26.1300, 26.1050, 26.0650, 26.0200][sector] : 26.1025,
      };

      // Scrapam pretul de pe website (pe o pagina separata)
      const { price_min, price_max } = await scrapePriceFromWebsite(webPage, website);

      results.push({
        name, address, sector,
        lat: finalCoords.lat, lng: finalCoords.lng,
        phone, website, placeType,
        rating: isNaN(rating) ? null : rating,
        reviewsCount,
        price_min, price_max,
        mapsUrl: url,
      });

      await mapsPage.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await sleep(1500);
    } catch {
      await mapsPage.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await sleep(1000);
    }
  }

  return results;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`\n${'═'.repeat(65)}`);
  log(`[${new Date().toLocaleString('ro-RO')}] DISCOVERY v2`);
  if (DRY_RUN) log('   *** DRY RUN — niciun insert in DB ***');
  if (TYPE_FILTER) log(`   Filtrat pe: ${TYPE_FILTER}`);
  log('═'.repeat(65));

  const existingAS = db.prepare('SELECT name, lat, lng FROM afterschools').all()
    .map(r => ({ norm: normalize(r.name), lat: r.lat, lng: r.lng }));
  const existingClubs = db.prepare('SELECT name, lat, lng FROM clubs').all()
    .map(r => ({ norm: normalize(r.name), lat: r.lat, lng: r.lng }));

  log(`DB curent: ${existingAS.length} afterschool-uri, ${existingClubs.length} cluburi\n`);

  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 },
  });

  const mapsPage = await context.newPage();   // Google Maps
  const webPage = await context.newPage();    // Website-uri listari

  await mapsPage.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await dismissConsent(mapsPage);
  await sleep(2000);

  const insertAS = db.prepare(`
    INSERT INTO afterschools
      (name, address, sector, lat, lng, phone, email, website,
       price_min, price_max, age_min, age_max, description, activities,
       availability, maps_url, rating, reviews_count)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 6, 14, ?, 'Teme,Engleza,Arte,Sport', 'unknown', ?, ?, ?)
  `);

  const insertClub = db.prepare(`
    INSERT INTO clubs
      (name, address, sector, lat, lng, phone, email, website,
       price_min, price_max, category, availability, maps_url, rating, reviews_count)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'unknown', ?, ?, ?)
  `);

  let newAS = 0, newClubs = 0, skippedAS = 0, skippedClubs = 0;
  const done = loadCheckpoint();
  if (done.size > 0) log(`♻️  Checkpoint gasit: ${done.size} query-uri deja finalizate — se sare peste ele.\n`);

  // ─── Faza A: Afterschool-uri ────────────────────────────────────────────────
  if (!TYPE_FILTER || TYPE_FILTER === 'afterschool') {
    log(`--- Faza A: Afterschool-uri (${AFTERSCHOOL_QUERIES.length} queries) ---`);

    for (let i = 0; i < AFTERSCHOOL_QUERIES.length; i++) {
      const q = AFTERSCHOOL_QUERIES[i];
      const checkKey = `as:${q}`;

      if (done.has(checkKey)) {
        log(`[${i + 1}/${AFTERSCHOOL_QUERIES.length}] SKIP (checkpoint): "${q}"`);
        continue;
      }

      log(`\n[${i + 1}/${AFTERSCHOOL_QUERIES.length}] "${q}"`);

      try {
        const results = await scrapeResults(mapsPage, webPage, q);
        log(`  Gasit ${results.length} pe Google Maps`);

        for (const r of results) {
          const normName = normalize(r.name);

          if (isDuplicate(normName, r.lat, r.lng, existingAS)) continue;

          if (!isRelevantAfterSchool(r.name, r.placeType)) {
            log(`  ⏭  Ignorat (tip: "${r.placeType || 'necunoscut'}"): ${r.name}`);
            skippedAS++;
            continue;
          }

          const description = `After school în București${r.sector ? ', Sector ' + r.sector : ''}.`;

          if (DRY_RUN) {
            log(`  [DRY-RUN] "${r.name}" | ${r.address} | Tip: ${r.placeType || '?'} | Pret: ${r.price_min ? r.price_min + ' lei' : '?'}`);
          } else {
            try {
              insertAS.run(
                r.name, r.address, r.sector, r.lat, r.lng, r.phone, r.website,
                r.price_min, r.price_max, description, r.mapsUrl, r.rating, r.reviewsCount
              );
              existingAS.push({ norm: normName, lat: r.lat, lng: r.lng });
              newAS++;
              log(`  ✅ Adaugat: "${r.name}" | ${r.address} | Pret: ${r.price_min ? r.price_min + ' lei' : '?'}`);
            } catch (e) {
              log(`  ❌ Insert error: ${e.message.substring(0, 80)}`);
            }
          }
        }

        // Salveaza checkpoint dupa fiecare query finalizat cu succes
        if (!DRY_RUN) {
          done.add(checkKey);
          saveCheckpoint(done);
        }
      } catch (e) {
        log(`  ❌ Query error: ${e.message.substring(0, 80)}`);
        // Nu salvam checkpoint la eroare — query-ul va fi reincercat la restart
      }

      await sleep(1500);
    }
  }

  // ─── Faza B: Cluburi ────────────────────────────────────────────────────────
  if (!TYPE_FILTER || TYPE_FILTER === 'club') {
    log(`\n--- Faza B: Cluburi (${CLUB_QUERIES.length} queries) ---`);

    for (let i = 0; i < CLUB_QUERIES.length; i++) {
      const { q, cat } = CLUB_QUERIES[i];
      const checkKey = `club:${cat}:${q}`;

      if (done.has(checkKey)) {
        log(`[${i + 1}/${CLUB_QUERIES.length}] SKIP (checkpoint): [${cat}] "${q}"`);
        continue;
      }

      log(`\n[${i + 1}/${CLUB_QUERIES.length}] [${cat}] "${q}"`);

      try {
        const results = await scrapeResults(mapsPage, webPage, q);
        log(`  Gasit ${results.length} pe Google Maps`);

        for (const r of results) {
          const normName = normalize(r.name);

          if (isDuplicate(normName, r.lat, r.lng, existingClubs)) continue;

          if (!isRelevantClub(r.name, r.placeType)) {
            log(`  ⏭  Ignorat (tip: "${r.placeType || 'necunoscut'}"): ${r.name}`);
            skippedClubs++;
            continue;
          }

          if (DRY_RUN) {
            log(`  [DRY-RUN] "${r.name}" | ${r.address} | Tip: ${r.placeType || '?'} | Pret: ${r.price_min ? r.price_min + ' lei' : '?'}`);
          } else {
            try {
              insertClub.run(
                r.name, r.address, r.sector, r.lat, r.lng, r.phone, r.website,
                r.price_min, r.price_max, cat, r.mapsUrl, r.rating, r.reviewsCount
              );
              existingClubs.push({ norm: normName, lat: r.lat, lng: r.lng });
              newClubs++;
              log(`  ✅ Adaugat [${cat}]: "${r.name}" | ${r.address} | Pret: ${r.price_min ? r.price_min + ' lei' : '?'}`);
            } catch (e) {
              log(`  ❌ Insert error: ${e.message.substring(0, 80)}`);
            }
          }
        }

        // Salveaza checkpoint dupa fiecare query finalizat cu succes
        if (!DRY_RUN) {
          done.add(checkKey);
          saveCheckpoint(done);
        }
      } catch (e) {
        log(`  ❌ Query error: ${e.message.substring(0, 80)}`);
      }

      await sleep(1500);
    }
  }

  await browser.close();

  log(`\n${'═'.repeat(65)}`);
  if (DRY_RUN) {
    log('DRY RUN complet. Ruleaza fara --dry-run pentru insert real.');
  } else {
    log(`Afterschool-uri noi adaugate: ${newAS}  (ignorate ca irelevante: ${skippedAS})`);
    log(`Cluburi noi adaugate:         ${newClubs}  (ignorate ca irelevante: ${skippedClubs})`);
    log(`Total nou in DB: ${newAS + newClubs}`);
    // Sterge checkpoint-ul dupa o rulare completa
    if (fs.existsSync(CHECKPOINT_PATH)) fs.unlinkSync(CHECKPOINT_PATH);
    log('Checkpoint sters — urmatoarea rulare o ia de la capat.');
  }
  log('═'.repeat(65) + '\n');
}

main().catch(e => {
  log(`EROARE FATALA: ${e.message}`);
  process.exit(1);
});
