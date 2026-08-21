const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-professionals.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

// Fiecare query e mapat la o categorie de profesionist
const QUERIES = [
  { q: 'cabinet logopedie copii Bucuresti', cat: 'logopezi' },
  { q: 'logoped copii Bucuresti', cat: 'logopezi' },
  { q: 'cabinet psihologie copii Bucuresti', cat: 'psihologi' },
  { q: 'psiholog copii Bucuresti', cat: 'psihologi' },
  { q: 'psihoterapeut copii Bucuresti', cat: 'psihologi' },
  { q: 'kinetoterapie copii Bucuresti', cat: 'terapeuti' },
  { q: 'terapie ABA autism Bucuresti', cat: 'terapeuti' },
  { q: 'terapie ocupationala copii Bucuresti', cat: 'terapeuti' },
  { q: 'animatori petreceri copii Bucuresti', cat: 'animatori' },
  { q: 'animatori evenimente copii Bucuresti', cat: 'animatori' },
  { q: 'fotograf evenimente copii Bucuresti', cat: 'foto_video' },
  { q: 'studio foto copii familie Bucuresti', cat: 'foto_video' },
  { q: 'centru meditatii copii Bucuresti', cat: 'meditatori' },
  { q: 'centru educational meditatii Bucuresti', cat: 'meditatori' },
  { q: 'agentie bone Bucuresti', cat: 'educatori' },
  { q: 'bona copii Bucuresti', cat: 'educatori' },
];

const CAT_DESC = {
  logopezi: 'Cabinet de logopedie pentru copii in Bucuresti. Terapie pentru tulburari de vorbire si limbaj, evaluare si plan personalizat.',
  psihologi: 'Cabinet de psihologie pentru copii si adolescenti in Bucuresti. Consiliere, evaluare psihologica si sprijin emotional.',
  terapeuti: 'Servicii de terapie pentru copii in Bucuresti: kinetoterapie, terapie ocupationala si terapie comportamentala.',
  animatori: 'Animatori pentru petreceri si evenimente cu copii in Bucuresti: jocuri, ateliere si spectacole.',
  foto_video: 'Servicii foto-video pentru evenimente cu copii in Bucuresti: serbari, botezuri si sedinte de familie.',
  meditatori: 'Centru de meditatii si pregatire scolara pentru copii in Bucuresti.',
  educatori: 'Servicii de ingrijire si educatie pentru copii in Bucuresti: bone si educatoare cu experienta.',
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalize(name) {
  return name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9]/g, '');
}

function extractSector(address) {
  const m = (address || '').match(/[Ss]ector\s*([1-6])/);
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
    const rejectBtn = page.locator('button:has-text("Respinge tot"), button:has-text("Refuz tot"), button:has-text("Reject all"), button:has-text("Alle ablehnen")');
    if (await rejectBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await rejectBtn.first().click(); await sleep(2000); return;
    }
    const acceptBtn = page.locator('button:has-text("Accepta tot"), button:has-text("Accept all"), button:has-text("Alle akzeptieren"), button:has-text("Accept")');
    if (await acceptBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.first().click(); await sleep(2000);
    }
  } catch {}
}

const insert = db.prepare(`
  INSERT INTO professionals (name, category, address, sector, lat, lng, phone, email, website, description, availability, online_available, home_service, is_premium, is_featured, contacts_hidden)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unknown', 0, 0, 0, 0, 0)
`);

async function scrapeQuery(page, item, existingNormalized) {
  const { q: searchQuery, cat } = item;
  log(`\n🔍 [${cat}] Caut: "${searchQuery}"`);

  const encoded = encodeURIComponent(searchQuery);
  await page.goto(`https://www.google.com/maps/search/${encoded}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(2000);

  const resultsPanel = page.locator('[role="feed"], .Nv2PK').first();
  await resultsPanel.waitFor({ timeout: 10000 }).catch(() => {});

  let lastCount = 0;
  for (let scroll = 0; scroll < 6; scroll++) {
    const items = await page.locator('.Nv2PK').count();
    if (items === lastCount && scroll > 2) break;
    lastCount = items;
    await page.evaluate(() => { const feed = document.querySelector('[role="feed"]'); if (feed) feed.scrollTop += 800; });
    await sleep(1500);
  }

  const items = await page.locator('.Nv2PK').all();
  log(`  Gasit ${items.length} rezultate`);
  let added = 0;
  const cap = Math.min(items.length, 22);

  for (let i = 0; i < cap; i++) {
    try {
      const it = items[i];
      const nameEl = it.locator('.qBF1Pd, .fontHeadlineSmall').first();
      const name = await nameEl.textContent({ timeout: 3000 }).catch(() => '');
      if (!name || name.length < 3) continue;

      const normName = normalize(name);
      if (existingNormalized.has(normName)) continue;

      const secondaryText = await it.locator('.W4Efsd').textContent({ timeout: 3000 }).catch(() => '');

      await it.click();
      await sleep(2000);
      const url = page.url();
      const coords = extractCoordsFromUrl(url);

      let phone = null, website = null, address = '';
      try {
        const addrEl = page.locator('[data-item-id="address"] .fontBodyMedium, button[data-item-id="address"]').first();
        if (await addrEl.isVisible({ timeout: 2000 }).catch(() => false)) { address = (await addrEl.textContent() || '').trim(); }
        const phoneEl = page.locator('[data-item-id^="phone"] .fontBodyMedium, button[data-item-id^="phone"]').first();
        if (await phoneEl.isVisible({ timeout: 2000 }).catch(() => false)) { phone = (await phoneEl.textContent() || '').trim().replace(/\s+/g, ''); }
        const webEl = page.locator('a[data-item-id="authority"]').first();
        if (await webEl.isVisible({ timeout: 2000 }).catch(() => false)) { website = await webEl.getAttribute('href') || null; }
      } catch {}

      if (!address && secondaryText) { const parts = secondaryText.split('·'); address = parts[parts.length - 1]?.trim() || ''; }
      const sector = extractSector(address) || extractSector(secondaryText);

      // Valideaza coordonate in Bucuresti+Ilfov
      if (coords && (coords.lat < 44.3 || coords.lat > 44.6 || coords.lng < 25.9 || coords.lng > 26.4)) {
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        await sleep(1500);
        continue;
      }
      const finalCoords = coords || { lat: 44.4268, lng: 26.1025 };

      insert.run(name.trim(), cat, address || null, sector, finalCoords.lat, finalCoords.lng, phone, null, website, CAT_DESC[cat]);
      existingNormalized.add(normName);
      added++;
      log(`  ✅ ${name} | ${address || 'fara adresa'} | ${phone || 'fara tel'}`);

      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await sleep(1800);
    } catch (e) {
      log(`  ✗ ${String(e.message).substring(0, 60)}`);
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await sleep(1000);
    }
  }
  log(`  → ${added} noi din "${searchQuery}"`);
  return added;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'ro-RO',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  const existing = db.prepare('SELECT name FROM professionals').all();
  const existingNormalized = new Set(existing.map(e => normalize(e.name)));
  log(`📦 DB curent: ${existing.length} profesionisti\n`);

  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(2000);

  let total = 0;
  for (const item of QUERIES) {
    try { total += await scrapeQuery(page, item, existingNormalized); }
    catch (e) { log(`❌ Eroare query "${item.q}": ${String(e.message).substring(0, 80)}`); }
    await sleep(2000);
  }

  await browser.close();
  const cnt = db.prepare('SELECT COUNT(*) as c FROM professionals').get();
  log(`\n${'═'.repeat(50)}`);
  log(`✅ TOTAL NOI ADAUGATE: ${total}`);
  log(`📦 Total profesionisti in DB: ${cnt.c}`);
  log('═'.repeat(50));
}

main().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
