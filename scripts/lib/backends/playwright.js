/**
 * PlaywrightBackend (Method 1) — metoda actuala. Un `page` Playwright real satisface deja
 * interfata adaptorului (goto/goBack/url/title/evaluate/fill/type/click/keyboard/getByRole/
 * locator/waitForNavigation/waitForSelector/screenshot), deci il returnam direct.
 *
 * Suporta doua moduri de pornire:
 *  - persistentDir  → chromium.launchPersistentContext (ex. sesiune FB in scripts/fb-profile)
 *  - fara           → chromium.launch + newContext (ex. Google Maps)
 */

async function create(opts = {}) {
  const { chromium } = require('playwright');
  const contextOpts = {
    userAgent: opts.userAgent,
    viewport: opts.viewport || { width: 1280, height: 800 },
  };

  let browser = null;
  let context;
  if (opts.persistentDir) {
    context = await chromium.launchPersistentContext(opts.persistentDir, {
      headless: opts.headless !== false ? false : opts.headless, // FB ruleaza vizibil
      slowMo: opts.slowMo || 0,
      ...contextOpts,
    });
  } else {
    browser = await chromium.launch({ headless: opts.headless !== false, slowMo: opts.slowMo || 0 });
    context = await browser.newContext(contextOpts);
  }

  const page = context.pages()[0] || await context.newPage();

  return {
    method: 1,
    page,
    context,
    browser,
    async newPage() { return context.newPage(); },
    async close() {
      try {
        if (browser) await browser.close();
        else await context.close();
      } catch { /* deja inchis */ }
    },
  };
}

module.exports = { PlaywrightBackend: { create } };
