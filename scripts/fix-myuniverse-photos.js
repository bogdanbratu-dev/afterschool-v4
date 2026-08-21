const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const db = new Database('/var/www/afterschool-v4/data/afterschool.db');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ locale: 'ro-RO', viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('https://myuniverse.ro/galerie-foto/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Scroll to trigger lazy loading
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(2000);

  // Get ALL img attributes including data-src, data-lazy, srcset
  const imgs = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('img, [data-src], [data-lazy-src]').forEach(el => {
      const src = el.src || el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || 
                  el.getAttribute('data-lazy') || el.getAttribute('data-original') || '';
      const srcset = el.srcset || el.getAttribute('data-srcset') || '';
      if (src) results.push(src);
      if (srcset) {
        srcset.split(',').forEach(s => {
          const url = s.trim().split(' ')[0];
          if (url) results.push(url);
        });
      }
    });
    // Also check CSS backgrounds
    document.querySelectorAll('[style*="background"]').forEach(el => {
      const m = el.style.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (m) results.push(m[1]);
    });
    return [...new Set(results)];
  });

  console.log('All imgs found:', imgs.length);
  const good = imgs
    .filter(s => s && s.match(/\.(jpg|jpeg|png|webp)/i) && s.includes('myuniverse.ro'))
    .filter(s => !s.match(/logo|icon|favicon|arrow|button|vector|meteor|star_bg|earth\.png|elementor\/thumbs.*\.(png)/i));
  
  console.log('Good photos:', good.length);
  good.forEach(u => console.log(' ', u));

  if (good.length > 0) {
    const best = [...new Set(good)].slice(0, 4);
    db.prepare('UPDATE afterschools SET photo_urls=? WHERE id=193').run(JSON.stringify(best));
    console.log('\nSaved:', JSON.stringify(best));
  } else {
    console.log('No good photos found');
    // Take a screenshot to debug
    await page.screenshot({ path: '/tmp/myuniverse-gallery.png' });
    console.log('Screenshot saved to /tmp/myuniverse-gallery.png');
  }

  await browser.close();
})();