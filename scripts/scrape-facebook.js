const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EMAIL = 'bideacarmen7@gmail.com';
const PASSWORD = 'bidea239';

const searches = [
  'afterschool bucuresti sector 1',
  'afterschool bucuresti sector 2',
  'afterschool bucuresti sector 3',
  'afterschool bucuresti sector 4',
  'afterschool bucuresti sector 5',
  'afterschool bucuresti sector 6',
  'after school bucuresti',
  'afterschool copii bucuresti',
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
  console.log('  Butoane:', buttons.join(' | '));

  const keywords = ['fără', 'fara', 'decline', 'without', 'continua', 'continue', 'refuz', 'reject', 'accept', 'allow', 'ok'];
  for (const text of buttons) {
    const lower = text.toLowerCase();
    if (keywords.some(k => lower.includes(k))) {
      try {
        await page.getByRole('button', { name: text }).first().click({ timeout: 3000 });
        console.log(`  → Apasat: "${text}"`);
        await sleep(2000);
        return true;
      } catch {}
    }
  }
  return false;
}

async function loginFacebook(page) {
  console.log('🔐 Navighez la Facebook...');
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);

  // Handle consent pages
  for (let i = 0; i < 4; i++) {
    const url = page.url();
    console.log(`  URL [${i}]: ${url}`);
    const hasEmail = await page.locator('#email').isVisible().catch(() => false);
    if (hasEmail) break;
    await dismissConsent(page);
    await sleep(2000);
    if (!page.url().includes('facebook.com/login') && !page.url().includes('facebook.com/?')) {
      await page.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000);
    }
  }

  await page.screenshot({ path: path.join(__dirname, 'fb-before-login.png') });

  // Fill login form
  const hasEmail = await page.locator('#email').isVisible().catch(() => false);
  if (hasEmail) {
    console.log('  → Desktop login...');
    await page.fill('#email', EMAIL);
    await page.fill('#pass', PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      page.click('[name="login"]'),
    ]);
    await sleep(5000);
  } else {
    // Try mobile
    console.log('  → Mobile login...');
    await page.goto('https://m.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    await dismissConsent(page);
    await sleep(2000);
    await page.screenshot({ path: path.join(__dirname, 'fb-mobile.png') });

    const emailField = page.locator('input[name="email"], input[type="email"], #m_login_email').first();
    const emailVisible = await emailField.isVisible().catch(() => false);
    if (emailVisible) {
      await emailField.fill(EMAIL);
      await page.locator('input[name="pass"], input[type="password"]').first().fill(PASSWORD);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        page.keyboard.press('Enter'),
      ]);
      await sleep(5000);
    }
  }

  await page.screenshot({ path: path.join(__dirname, 'fb-after-login.png') });
  const finalUrl = page.url();
  console.log(`  URL final: ${finalUrl}`);

  if (finalUrl.includes('/login') || finalUrl.includes('/checkpoint') || finalUrl.includes('consent')) {
    console.log('⚠️  Astept verificare manuala in browser (30 secunde)...');
    await sleep(30000);
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

  console.log('\n🔍 Incep cautarile pe Facebook...');
  const results = [];
  const seen = new Set();

  for (const query of searches) {
    console.log(`\n🔍 Caut: "${query}"`);
    const encodedQuery = encodeURIComponent(query);

    // Search Pages
    try {
      await page.goto(`https://www.facebook.com/search/pages/?q=${encodedQuery}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(4000);

      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('End');
        await sleep(2000);
      }

      const pageResults = await page.evaluate(() => {
        const items = [];
        const anchors = document.querySelectorAll('a[href]');
        anchors.forEach(a => {
          const href = a.href || '';
          const text = (a.innerText || a.textContent || '').trim();
          if (!href || !text || text.length < 3) return;
          if (href.includes('/search/') || href.includes('/login') || href.includes('javascript')) return;
          // Find parent block
          let el = a.parentElement;
          let context = '';
          for (let i = 0; i < 6; i++) {
            if (!el) break;
            context = el.innerText || '';
            if (context.length > 50) break;
            el = el.parentElement;
          }
          items.push({ name: text.split('\n')[0].trim(), url: href, context: context.substring(0, 400) });
        });
        return items.slice(0, 30);
      });

      for (const r of pageResults) {
        if (!seen.has(r.url) && r.name.length > 3) {
          const combined = (r.name + ' ' + r.context).toLowerCase();
          if (combined.includes('after') || combined.includes('school') || combined.includes('kids') ||
              combined.includes('copii') || combined.includes('educat') || combined.includes('gradi')) {
            seen.add(r.url);
            results.push({ ...r, query, platform: 'fb_pages' });
            console.log(`  ✓ ${r.name}`);
          }
        }
      }
    } catch (e) {
      console.log(`  ✗ Eroare pagini: ${e.message.substring(0, 80)}`);
    }

    // Search Groups
    try {
      await page.goto(`https://www.facebook.com/search/groups/?q=${encodedQuery}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(3000);

      const groupResults = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="/groups/"]'))
          .map(a => ({ name: (a.innerText || '').trim().split('\n')[0], url: a.href }))
          .filter(r => r.name.length > 3)
          .slice(0, 10);
      });

      for (const r of groupResults) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          results.push({ ...r, query, platform: 'fb_groups' });
          console.log(`  📌 Grup: ${r.name}`);
        }
      }
    } catch (e) {
      console.log(`  ✗ Eroare grupuri: ${e.message.substring(0, 80)}`);
    }
  }

  // Visit each page for details
  const pagesToVisit = results.filter(r => r.platform === 'fb_pages').slice(0, 40);
  console.log(`\n📋 Extrag detalii pentru ${pagesToVisit.length} pagini...`);

  const detailed = [];
  for (const r of pagesToVisit) {
    try {
      console.log(`  → ${r.name}`);
      const aboutUrl = r.url.replace(/\?.*/, '') + '/about';
      await page.goto(aboutUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(3000);

      const info = await page.evaluate(() => {
        const text = document.body.innerText;
        const phoneMatch = text.match(/(\+?4?07\d{8}|\+?40[\s-]?7\d{2}[\s-]?\d{3}[\s-]?\d{3})/);
        const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
        const websiteMatches = (text.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:ro|com|eu|org)(?:\/\S*)?/g) || [])
          .filter(w => !w.includes('facebook') && !w.includes('fb.com') && !w.includes('instagram'));
        const addrPatterns = [
          /(?:Str\.|Bd\.|Calea|Sos\.|Aleea|Splaiuri|Intrarea)\s+[\w\s.-]+nr\.\s*\d+[A-Za-z]?/i,
          /(?:Strada|Bulevardul|Calea|Soseaua)\s+[\w\s.-]+\d+/i,
        ];
        let address = null;
        for (const p of addrPatterns) {
          const m = text.match(p);
          if (m) { address = m[0]; break; }
        }
        const sectorMatch = text.match(/[Ss]ector\s*[1-6]/);
        const priceMatch = text.match(/(\d{3,4})\s*(?:lei|ron)/i);
        return {
          phone: phoneMatch ? phoneMatch[0] : null,
          email: emailMatch ? emailMatch[0] : null,
          website: websiteMatches[0] || null,
          address,
          sector: sectorMatch ? parseInt(sectorMatch[0].replace(/\D/g, '')) : null,
          price: priceMatch ? parseInt(priceMatch[1]) : null,
          snippet: text.substring(0, 500),
        };
      });

      detailed.push({ name: r.name, fbUrl: r.url, ...info });
      if (info.phone || info.address || info.email) {
        console.log(`     ✓ phone:${info.phone} addr:${info.address ? 'DA' : 'NU'}`);
      }
    } catch (e) {
      console.log(`  ✗ ${r.name}: ${e.message.substring(0, 60)}`);
    }
  }

  const outPath = path.join(__dirname, 'facebook-afterschools.json');
  fs.writeFileSync(outPath, JSON.stringify(detailed, null, 2), 'utf8');

  console.log(`\n✅ ${detailed.length} after school-uri gasite si salvate in:\n   ${outPath}`);
  console.log('\n📊 Sumar:');
  detailed.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
    if (r.address) console.log(`   📍 ${r.address}${r.sector ? ` (S${r.sector})` : ''}`);
    if (r.phone) console.log(`   📞 ${r.phone}`);
    if (r.email) console.log(`   📧 ${r.email}`);
    if (r.website) console.log(`   🌐 ${r.website}`);
    if (r.price) console.log(`   💰 ~${r.price} lei`);
  });

  await browser.close();
}

main().catch(console.error);
