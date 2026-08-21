/**
 * scrape-fb-groups.js — descopera grupuri FB de parinti/copii pentru outreach (tabela fb_groups).
 *
 * Method 1 (Playwright):   node scripts/scrape-fb-groups.js
 * Method 2 (extensia):     node scripts/scrape-fb-groups.js --method=2
 *
 * Method 2 conduce Chrome-ul tau real (unde extensia "Browser Tool" e incarcata si esti deja
 * logat pe Facebook) prin input TRUSTED — Facebook nu mai blocheaza cautarea ca la Playwright.
 * In Method 2 login-ul e sarit (folosim sesiunea ta), doar daca nu esti logat incearca cu creds.
 */

const fs = require('fs');
const path = require('path');
const { createBrowser, resolveMethod } = require('./lib/browser');

const METHOD = resolveMethod();

const EMAIL = 'bideacarmen7@gmail.com';
const PASSWORD = 'bidea239';

const sectors = [1, 2, 3, 4, 5, 6];
const neighborhoods = [
  'Militari', 'Berceni', 'Pipera', 'Titan', 'Drumul Taberei', 'Rahova', 'Colentina',
  'Vitan', 'Baneasa', 'Aviatiei', 'Floreasca', 'Dorobanti', 'Herastrau', 'Crangasi',
  'Giulesti', 'Ferentari', 'Balta Alba', 'Pantelimon', 'Voluntari', 'Otopeni',
  'Tineretului', 'Obor', 'Iancului', 'Vitan-Barzesti', 'Rahova-Uranus', 'Cotroceni',
  'Grozavesti', 'Domenii', 'Aviatorilor', 'Chitila', 'Popesti-Leordeni', 'Bragadiru',
];

const baseTerms = [
  'copii bucuresti', 'parinti bucuresti', 'mamici bucuresti', 'mame bucuresti',
  'familii bucuresti', 'bebelusi bucuresti', 'gravide bucuresti', 'nou nascuti bucuresti',
  'parinti si copii bucuresti', 'mamici si copii bucuresti', 'activitati copii bucuresti',
  'gradinita parinti bucuresti', 'scoala parinti bucuresti',
];

const searches = [
  ...baseTerms,
  ...sectors.map(s => `parinti copii sector ${s} bucuresti`),
  ...sectors.map(s => `mamici sector ${s} bucuresti`),
  ...neighborhoods.map(n => `parinti copii ${n} bucuresti`),
  ...neighborhoods.map(n => `mamici ${n} bucuresti`),
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function dismissConsent(page) {
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter(el => el.offsetParent !== null)
      .map(el => el.innerText.trim())
      .filter(t => t.length > 0 && t.length < 80);
  });
  const keywords = ['fără', 'fara', 'decline', 'without', 'continua', 'continue', 'refuz', 'reject', 'accept', 'allow', 'ok'];
  for (const text of buttons) {
    const lower = text.toLowerCase();
    if (keywords.some(k => lower.includes(k))) {
      try {
        await page.getByRole('button', { name: text }).first().click({ timeout: 3000 });
        console.log(`  -> Apasat: "${text}"`);
        await sleep(2000);
        return true;
      } catch {}
    }
  }
  return false;
}

async function loginFacebook(page) {
  console.log('Navighez la Facebook...');
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);

  for (let i = 0; i < 4; i++) {
    const hasEmail = await page.locator('#email').isVisible().catch(() => false);
    if (hasEmail) break;
    await dismissConsent(page);
    await sleep(2000);
    if (!page.url().includes('facebook.com/login') && !page.url().includes('facebook.com/?')) {
      await page.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000);
    }
  }

  const hasEmail = await page.locator('#email').isVisible().catch(() => false);
  if (hasEmail) {
    console.log('  -> Login...');
    await page.fill('#email', EMAIL);
    await page.fill('#pass', PASSWORD);
    // Secvential (broker-ul serializeaza comenzile; fara Promise.all)
    await page.click('[name="login"]');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleep(5000);
  }

  const finalUrl = page.url();
  console.log(`  URL final: ${finalUrl}`);

  if (finalUrl.includes('/login') || finalUrl.includes('/checkpoint') || finalUrl.includes('consent')) {
    console.log('Astept verificare manuala in browser (60 secunde)...');
    await sleep(60000);
  } else {
    console.log('Login reusit!');
  }
}

async function main() {
  console.log(`\n=== scrape-fb-groups (Method ${METHOD}${METHOD === 2 ? ' — extensie, input trusted' : ' — Playwright'}) ===`);

  const session = await createBrowser({
    method: METHOD,
    // Method 1: sesiune FB persistenta, vizibila
    persistentDir: path.join(__dirname, 'fb-profile'),
    headless: false,
    slowMo: 50,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    // Method 2:
    profileId: 'crawler1',
  });
  const page = session.page;

  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  const alreadyLoggedIn = !page.url().includes('/login') && !(await page.locator('#email').isVisible().catch(() => false));
  if (alreadyLoggedIn) {
    console.log('Deja logat (sesiune existenta), sar peste login.');
  } else {
    await loginFacebook(page);
  }

  console.log(`\nIncep cautarile pe Facebook (${searches.length} query-uri)...`);
  const seen = new Set();
  const results = [];

  for (const [idx, query] of searches.entries()) {
    console.log(`\n[${idx + 1}/${searches.length}] Caut grupuri: "${query}"`);
    const encodedQuery = encodeURIComponent(query);

    try {
      await page.goto(`https://www.facebook.com/search/groups/?q=${encodedQuery}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(3000);
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('End');
        await sleep(1200);
      }

      const groupResults = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('a[href*="/groups/"]').forEach(a => {
          const href = a.href || '';
          if (!/\/groups\/[^/]+\/?$/.test(href.split('?')[0])) return;
          let el = a;
          let memberText = '';
          for (let i = 0; i < 5; i++) {
            if (!el) break;
            memberText = el.innerText || '';
            if (memberText.length > 20) break;
            el = el.parentElement;
          }
          const name = (a.innerText || '').trim().split('\n')[0];
          if (name && name.length > 3) out.push({ name, url: href.split('?')[0], memberText: memberText.substring(0, 300) });
        });
        return out.slice(0, 20);
      });

      for (const r of groupResults) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          results.push({ ...r, query });
          console.log(`  + ${r.name}`);
        }
      }
    } catch (e) {
      console.log(`  eroare: ${e.message.substring(0, 100)}`);
    }

    // checkpoint save every 10 queries
    if ((idx + 1) % 10 === 0) {
      fs.writeFileSync(path.join(__dirname, 'fb-groups-raw.json'), JSON.stringify(results, null, 2), 'utf8');
      console.log(`  [checkpoint] salvate ${results.length} grupuri unice pana acum`);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'fb-groups-raw.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n=== FINAL: ${results.length} grupuri unice gasite ===`);
  await session.close();
}

main().catch(e => { console.error(e); process.exit(1); });
