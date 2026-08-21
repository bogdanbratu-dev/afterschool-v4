/**
 * Test scurt Method 2 pe Facebook: dovedeste ca prin extensie cautarea de grupuri intoarce
 * rezultate reale (nu "Not Found" ca la Playwright). Ruleaza 2 query-uri.
 *   node scripts/test-method2-fb.js
 */
const { createBrowser } = require('./lib/browser');

const QUERIES = ['mamici bucuresti', 'parinti copii sector 3 bucuresti'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const session = await createBrowser({ method: 2, profileId: 'crawler1' });
  const page = session.page;
  try {
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    const loggedIn = !page.url().includes('/login') && !(await page.locator('#email').isVisible().catch(() => false));
    console.log('Logat pe FB:', loggedIn, '| url:', await page.url());

    for (const q of QUERIES) {
      console.log(`\n=== Query: "${q}" ===`);
      await page.goto(`https://www.facebook.com/search/groups/?q=${encodeURIComponent(q)}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(3500);
      for (let i = 0; i < 3; i++) { await page.keyboard.press('End'); await sleep(1200); }

      const groups = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('a[href*="/groups/"]').forEach((a) => {
          const href = a.href || '';
          if (!/\/groups\/[^/]+\/?$/.test(href.split('?')[0])) return;
          const name = (a.innerText || '').trim().split('\n')[0];
          if (name && name.length > 3) out.push({ name, url: href.split('?')[0] });
        });
        const seen = new Set(); const uniq = [];
        for (const g of out) { if (!seen.has(g.url)) { seen.add(g.url); uniq.push(g); } }
        return uniq.slice(0, 15);
      });

      console.log(`Gasit ${groups.length} grupuri:`);
      groups.forEach((g) => console.log('  +', g.name, '—', g.url));
    }
  } catch (e) {
    console.error('EROARE:', e.message);
    process.exitCode = 1;
  } finally {
    await sleep(1500);
    await session.close();
  }
}
main();
