const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');

const EMAIL = 'bideacarmen7@gmail.com';
const PASSWORD = 'bidea239';

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const db = new Database(DB_PATH);

const targets = [
  { id: 16, name: 'Happy Kids After School', query: 'Happy Kids After School bucuresti' },
  { id: 17, name: 'Scoala Dupa Scoala', query: 'Scoala Dupa Scoala bucuresti afterschool' },
  { id: 18, name: 'KidsClub After School', query: 'KidsClub After School bucuresti' },
  { id: 19, name: 'Creative Kids Academy', query: 'Creative Kids Academy afterschool bucuresti' },
  { id: 20, name: 'Little Stars After School', query: 'Little Stars After School bucuresti' },
  { id: 21, name: 'Education Hub', query: 'Education Hub afterschool bucuresti' },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function dismissConsent(page) {
  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter(el => el.offsetParent !== null)
      .map(el => el.innerText.trim())
      .filter(t => t.length > 0 && t.length < 80)
  );
  const keywords = ['fără', 'fara', 'decline', 'without', 'continua', 'continue', 'refuz', 'accept', 'allow'];
  for (const text of buttons) {
    if (keywords.some(k => text.toLowerCase().includes(k))) {
      try {
        await page.getByRole('button', { name: text }).first().click({ timeout: 3000 });
        await sleep(2000);
        return true;
      } catch {}
    }
  }
  return false;
}

async function loginFacebook(page) {
  console.log('🔐 Login Facebook...');
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);

  for (let i = 0; i < 3; i++) {
    const hasEmail = await page.locator('#email').isVisible().catch(() => false);
    if (hasEmail) break;
    await dismissConsent(page);
    await sleep(2000);
    if (!page.url().includes('/login')) {
      await page.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000);
    }
  }

  const hasEmail = await page.locator('#email').isVisible().catch(() => false);
  if (hasEmail) {
    await page.fill('#email', EMAIL);
    await page.fill('#pass', PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      page.click('[name="login"]'),
    ]);
    await sleep(5000);
  } else {
    await page.goto('https://m.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    await dismissConsent(page);
    await sleep(2000);
    const emailField = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill(EMAIL);
      await page.locator('input[name="pass"], input[type="password"]').first().fill(PASSWORD);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        page.keyboard.press('Enter'),
      ]);
      await sleep(5000);
    }
  }

  const url = page.url();
  if (url.includes('/login') || url.includes('/checkpoint') || url.includes('consent')) {
    console.log('⚠️  Astept verificare manuala (20s)...');
    await sleep(20000);
  } else {
    console.log('✅ Login reusit!');
  }
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await loginFacebook(page);

  const update = db.prepare('UPDATE afterschools SET website = ? WHERE id = ?');

  for (const target of targets) {
    console.log(`\n🔍 Caut: "${target.name}"`);
    const encoded = encodeURIComponent(target.query);
    await page.goto(`https://www.facebook.com/search/pages/?q=${encoded}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(4000);

    const results = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.href || '';
        const text = (a.innerText || '').trim().split('\n')[0];
        if (!href || !text || text.length < 3) return;
        if (href.includes('/search/') || href.includes('/login') || href.includes('javascript')) return;
        if (href.includes('facebook.com/') && !href.includes('facebook.com/search')) {
          items.push({ name: text, url: href });
        }
      });
      return items.filter(i => i.name.length > 3).slice(0, 5);
    });

    console.log(`  Rezultate gasite: ${results.length}`);
    results.forEach(r => console.log(`  - ${r.name}: ${r.url}`));

    if (results.length > 0) {
      // Use the first result
      const best = results[0];
      update.run(best.url, target.id);
      console.log(`  ✅ Setat: ${best.url}`);
    } else {
      console.log(`  ❌ Niciun rezultat gasit`);
    }
  }

  // Print final state
  console.log('\n📊 Stare finala:');
  const rows = db.prepare('SELECT id, name, website FROM afterschools WHERE id IN (16,17,18,19,20,21)').all();
  rows.forEach(r => console.log(`  ${r.name}: ${r.website || 'fara website'}`));

  await browser.close();
}

main().catch(console.error);
