const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-google-maps.log');
const db = new Database(DB_PATH);

// Log to both console and file
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

const SEARCH_QUERIES = [
  'afterschool sector 1 Bucuresti',
  'afterschool sector 2 Bucuresti',
  'afterschool sector 3 Bucuresti',
  'afterschool sector 4 Bucuresti',
  'afterschool sector 5 Bucuresti',
  'afterschool sector 6 Bucuresti',
  'after school sector 1 Bucuresti',
  'after school sector 2 Bucuresti',
  'after school sector 3 Bucuresti',
  'after school sector 4 Bucuresti',
  'after school sector 5 Bucuresti',
  'after school sector 6 Bucuresti',
  'program afterschool Bucuresti',
  'afterschool copii Bucuresti',
  'afterschool Drumul Taberei Bucuresti',
  'afterschool Militari Bucuresti',
  'afterschool Floreasca Bucuresti',
  'afterschool Titan Bucuresti',
  'afterschool Colentina Bucuresti',
  'afterschool Berceni Bucuresti',
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalize(name) {
  return name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9]/g, '');
}

function extractSector(address) {
  const m = address.match(/[Ss]ector\s*([1-6])/);
  return m ? parseInt(m[1]) : null;
}

function extractCoordsFromUrl(url) {
  // Match /@lat,lng,zoom pattern
  const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  // Match !3d lat !4d lng pattern
  const m2 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m2) return { lat: parseFloat(m2[1]), lng: parseFloat(m2[2]) };
  return null;
}

async function dismissConsent(page) {
  try {
    // Try to click "Reject all" or "Accept all" on Google consent
    const rejectBtn = page.locator('button:has-text("Reject all"), button:has-text("Respinge tot"), button:has-text("Refuz tot")');
    if (await rejectBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await rejectBtn.first().click();
      await sleep(2000);
      return;
    }
    const acceptBtn = page.locator('button:has-text("Accept all"), button:has-text("Accept"), button:has-text("Accepta")');
    if (await acceptBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.first().click();
      await sleep(2000);
    }
  } catch {}
}

async function scrapeQuery(page, searchQuery, existingNormalized, allResults) {
  log(`\n🔍 Caut: "${searchQuery}"`);

  const encoded = encodeURIComponent(searchQuery);
  await page.goto(`https://www.google.com/maps/search/${encoded}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await sleep(3000);

  // Dismiss consent if needed
  await dismissConsent(page);
  await sleep(2000);

  // Wait for results panel
  const resultsPanel = page.locator('[role="feed"], .Nv2PK, [data-value="Nearby"]').first();
  await resultsPanel.waitFor({ timeout: 10000 }).catch(() => {});

  // Scroll the results panel to load more results
  let lastCount = 0;
  for (let scroll = 0; scroll < 10; scroll++) {
    // Count current results
    const items = await page.locator('.Nv2PK, [role="article"]').count();
    if (items === lastCount && scroll > 2) break;
    lastCount = items;

    // Scroll results feed
    await page.evaluate(() => {
      const feed = document.querySelector('[role="feed"]');
      if (feed) feed.scrollTop += 600;
    });
    await sleep(1500);

    // Check if "end of results" message appeared
    const endMsg = await page.locator('text="You\'ve reached the end", text="Ați ajuns la sfârșit"').isVisible().catch(() => false);
    if (endMsg) break;
  }

  // Get all result items
  const items = await page.locator('.Nv2PK').all();
  log(`  Gasit ${items.length} rezultate`);

  let newFromQuery = 0;

  for (let i = 0; i < items.length; i++) {
    try {
      const item = items[i];

      // Get name
      const nameEl = item.locator('.qBF1Pd, .fontHeadlineSmall').first();
      const name = await nameEl.textContent({ timeout: 3000 }).catch(() => '');
      if (!name || name.length < 3) continue;

      // Skip if it's a school, not an afterschool
      const nameLower = name.toLowerCase();
      if (nameLower.includes('scoala') && !nameLower.includes('after')) continue;
      if (nameLower.includes('gradinita') && !nameLower.includes('after')) {
        // Only skip if it clearly doesn't offer afterschool
        const hasAfterKeyword = ['after', 'program', 'afterschool'].some(k => nameLower.includes(k));
        if (!hasAfterKeyword) continue;
      }

      // Check duplicate
      const normName = normalize(name);
      if (existingNormalized.has(normName)) continue;
      // Fuzzy check - first 12 chars
      const prefix12 = normName.substring(0, 12);
      if ([...existingNormalized].some(e => e.startsWith(prefix12) || prefix12.startsWith(e.substring(0, 12)))) {
        if (prefix12.length >= 8) continue;
      }

      // Get address and rating text
      const secondaryText = await item.locator('.W4Efsd').textContent({ timeout: 3000 }).catch(() => '');

      // Click the item to get coordinates from URL
      await item.click();
      await sleep(2000);

      const url = page.url();
      const coords = extractCoordsFromUrl(url);

      // Get details from the opened panel
      let phone = null;
      let website = null;
      let address = '';

      try {
        // Address
        const addrEl = page.locator('[data-item-id="address"] .fontBodyMedium, button[data-item-id="address"]').first();
        if (await addrEl.isVisible({ timeout: 2000 }).catch(() => false)) {
          address = await addrEl.textContent() || '';
          address = address.trim();
        }

        // Phone
        const phoneEl = page.locator('[data-item-id^="phone"] .fontBodyMedium, button[data-item-id^="phone"]').first();
        if (await phoneEl.isVisible({ timeout: 2000 }).catch(() => false)) {
          phone = await phoneEl.textContent() || '';
          phone = phone.trim().replace(/\s+/g, '');
        }

        // Website
        const webEl = page.locator('a[data-item-id="authority"]').first();
        if (await webEl.isVisible({ timeout: 2000 }).catch(() => false)) {
          website = await webEl.getAttribute('href') || null;
        }
      } catch {}

      // Use secondary text as address fallback
      if (!address && secondaryText) {
        const parts = secondaryText.split('·');
        address = parts[parts.length - 1]?.trim() || secondaryText.trim();
      }

      if (!address) address = 'Bucuresti';

      const sector = extractSector(address) || extractSector(secondaryText);

      // Validate coords are in Bucharest area
      if (coords && (coords.lat < 44.3 || coords.lat > 44.6 || coords.lng < 25.9 || coords.lng > 26.4)) {
        log(`  ⚠️  Coordonate in afara Bucurestiului: ${name} (${coords.lat}, ${coords.lng})`);
        continue;
      }

      const finalCoords = coords || {
        lat: sector ? [0, 44.4630, 44.4490, 44.4180, 44.3960, 44.4100, 44.4350][sector] : 44.4268,
        lng: sector ? [0, 26.0640, 26.1150, 26.1300, 26.1050, 26.0650, 26.0200][sector] : 26.1025,
      };

      allResults.push({
        name: name.trim(),
        address,
        sector,
        lat: finalCoords.lat,
        lng: finalCoords.lng,
        phone,
        website,
      });

      existingNormalized.add(normName);
      newFromQuery++;
      log(`  ✅ Nou: ${name} | ${address} | ${coords ? `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}` : 'fara coords'}`);

      // Go back to search results
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await sleep(2000);

    } catch (e) {
      log(`  ✗ Eroare item: ${e.message.substring(0, 60)}`);
      // Try to go back if something went wrong
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await sleep(1000);
    }
  }

  log(`  → ${newFromQuery} noi din aceasta cautare`);
  return newFromQuery;
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  // Load existing afterschools for dedup
  const existing = db.prepare('SELECT name FROM afterschools').all();
  const existingNormalized = new Set(existing.map(e => normalize(e.name)));
  log(`📦 DB curent: ${existing.length} afterschool-uri\n`);

  const allResults = [];

  // First navigate to Google Maps to handle consent
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await dismissConsent(page);
  await sleep(2000);

  // Process each search query
  for (const query of SEARCH_QUERIES) {
    try {
      await scrapeQuery(page, query, existingNormalized, allResults);
    } catch (e) {
      log(`❌ Eroare la cautarea "${query}": ${e.message.substring(0, 80)}`);
    }
    await sleep(2000);
  }

  await browser.close();

  log(`\n${'═'.repeat(60)}`);
  log(`TOTAL NOI GASITE: ${allResults.length}`);
  log('═'.repeat(60));

  if (allResults.length === 0) {
    log('Nu s-au gasit afterschool-uri noi.');
    return;
  }

  // Insert into DB
  const insert = db.prepare(`
    INSERT INTO afterschools (name, address, sector, lat, lng, phone, email, website, price_min, price_max, pickup_time, end_time, age_min, age_max, description, activities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let added = 0;
  for (const r of allResults) {
    try {
      insert.run(
        r.name, r.address, r.sector,
        r.lat, r.lng,
        r.phone, null, r.website,
        null, null, null, null,
        6, 14,
        `After school in Bucuresti${r.sector ? ', Sector ' + r.sector : ''}.`,
        'Teme,Engleza,Arte,Sport'
      );
      added++;
    } catch (e) {
      log(`⚠️  Nu s-a putut insera ${r.name}: ${e.message}`);
    }
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM afterschools').get();
  log(`\n✅ Adaugate: ${added}`);
  log(`📦 Total in DB: ${total.count}`);
}

main().catch(console.error);
