/**
 * find-facebook-urls.js
 *
 * Cauta pe Google "nume listing" site:facebook.com pentru fiecare afterschool/club
 * si salveaza URL-ul gasit in coloana facebook_url.
 *
 * Rulare: node scripts/find-facebook-urls.js
 * Optional: node scripts/find-facebook-urls.js --overwrite   (suprascrie ce exista deja)
 * Optional: node scripts/find-facebook-urls.js --type afterschool
 * Optional: node scripts/find-facebook-urls.js --type club
 */

const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const db = new Database(DB_PATH);

// Asigura existenta coloanei facebook_url
try { db.exec('ALTER TABLE afterschools ADD COLUMN facebook_url TEXT'); } catch {}
try { db.exec('ALTER TABLE clubs ADD COLUMN facebook_url TEXT'); } catch {}

const OVERWRITE = process.argv.includes('--overwrite');
const TYPE_FILTER = process.argv.includes('--type')
  ? process.argv[process.argv.indexOf('--type') + 1]
  : null; // 'afterschool' | 'club' | null (ambele)

const DELAY_MS = 3500; // intre cautari, sa nu fie blocat de Google

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let googleConsentDone = false;

async function acceptGoogleConsent(page) {
  if (googleConsentDone) return;
  try {
    // Apasa orice buton proeminent de pe pagina de consent Google
    await page.waitForSelector('button', { timeout: 5000 });
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const text = (await btn.innerText().catch(() => '')).toLowerCase();
      if (text.includes('accept') || text.includes('agree') || text.includes('consent') || text.includes('tot')) {
        await btn.click();
        await sleep(1500);
        googleConsentDone = true;
        return;
      }
    }
    // Fallback: apasa primul buton vizibil daca nu am gasit dupa text
    const firstBtn = page.locator('button').first();
    if (await firstBtn.isVisible().catch(() => false)) {
      await firstBtn.click();
      await sleep(1500);
      googleConsentDone = true;
    }
  } catch {}
}

async function searchFacebook(page, name) {
  const query = `${name} bucuresti facebook`;
  const encoded = encodeURIComponent(query);
  const url = `https://www.google.com/search?q=${encoded}&num=5&hl=ro`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1000);

    // Accepta consent Google (o singura data per sesiune)
    if (page.url().includes('consent.google') || page.url().includes('consent')) {
      await acceptGoogleConsent(page);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(1000);
    }

    // Extrage primul link facebook.com din rezultate
    const fbUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      for (const a of links) {
        const href = a.href || '';
        // Vrem pagini de FB, nu profile personale sau grupuri
        if (
          href.includes('facebook.com/') &&
          !href.includes('/groups/') &&
          !href.includes('/events/') &&
          !href.includes('/posts/') &&
          !href.includes('/photos/') &&
          !href.includes('/videos/') &&
          !href.includes('/share') &&
          !href.includes('l.facebook.com') &&
          !href.includes('google.com') &&
          !href.includes('accounts.google') &&
          href.match(/facebook\.com\/[\w.-]+/)
        ) {
          // Curata query string
          return href.split('?')[0].replace(/\/$/, '');
        }
      }
      return null;
    });

    return fbUrl;
  } catch (e) {
    console.log(`    ✗ Eroare search: ${e.message.substring(0, 60)}`);
    return null;
  }
}

async function main() {
  // Citeste listingurile
  const tables = [];
  if (!TYPE_FILTER || TYPE_FILTER === 'afterschool') {
    const rows = db.prepare(
      OVERWRITE
        ? 'SELECT id, name, address FROM afterschools ORDER BY name'
        : `SELECT id, name, address FROM afterschools WHERE facebook_url IS NULL OR facebook_url = '' ORDER BY name`
    ).all();
    rows.forEach(r => tables.push({ ...r, table: 'afterschools', type: 'afterschool' }));
  }
  if (!TYPE_FILTER || TYPE_FILTER === 'club') {
    const rows = db.prepare(
      OVERWRITE
        ? 'SELECT id, name, address FROM clubs ORDER BY name'
        : `SELECT id, name, address FROM clubs WHERE facebook_url IS NULL OR facebook_url = '' ORDER BY name`
    ).all();
    rows.forEach(r => tables.push({ ...r, table: 'clubs', type: 'club' }));
  }

  console.log(`\n📋 Total listari de cautat: ${tables.length}`);
  if (OVERWRITE) console.log('   (mod --overwrite: suprascrie tot)');
  if (TYPE_FILTER) console.log(`   (filtrat pe: ${TYPE_FILTER})`);
  console.log('');

  if (tables.length === 0) {
    console.log('✅ Toate listingurile au deja facebook_url. Adauga --overwrite pentru a recauta.');
    return;
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ro-RO',
  });
  const page = await context.newPage();

  const updates = {
    afterschools: db.prepare('UPDATE afterschools SET facebook_url = ? WHERE id = ?'),
    clubs: db.prepare('UPDATE clubs SET facebook_url = ? WHERE id = ?'),
  };

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < tables.length; i++) {
    const item = tables[i];
    const progress = `[${i + 1}/${tables.length}]`;
    console.log(`${progress} ${item.type === 'afterschool' ? '🏫' : '⚽'} ${item.name}`);

    const fbUrl = await searchFacebook(page, item.name);

    if (fbUrl) {
      updates[item.table].run(fbUrl, item.id);
      console.log(`    ✅ ${fbUrl}`);
      found++;
    } else {
      console.log(`    ❌ Negasit`);
      notFound++;
    }

    if (i < tables.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  await browser.close();

  console.log(`\n📊 Rezultate finale:`);
  console.log(`   ✅ Gasite si salvate: ${found}`);
  console.log(`   ❌ Negasite:          ${notFound}`);
  console.log(`\nVerifica rezultatele in admin si corecteaza manual ce e gresit.`);
}

main().catch(console.error);
