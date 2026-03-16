const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');

const EMAIL = 'bideacarmen7@gmail.com';
const PASSWORD = 'bidea239';

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const db = new Database(DB_PATH);

const FB_URLS = [
  'https://www.facebook.com/GroupOne',
  'https://www.facebook.com/profile.php?id=100090005028682',
  'https://www.facebook.com/gradinitapiticiinostri',
  'https://www.facebook.com/alphakids.clubdezipentrucopii',
  'https://www.facebook.com/profile.php?id=100084922882571',
  'https://www.facebook.com/afterroboticsschool',
  'https://www.facebook.com/AfterSchoolDrumulTaberei',
  'https://www.facebook.com/profile.php?id=100063010611089',
  'https://www.facebook.com/KeikoAfterschool',
  'https://www.facebook.com/RodiAAfterSchool',
  'https://www.facebook.com/afterschoolwings',
  'https://www.facebook.com/profile.php?id=100083108923743',
  'https://www.facebook.com/afterschoolsector1',
  'https://www.facebook.com/KiddoClubhouse',
  'https://www.facebook.com/profile.php?id=100085459522139',
  'https://www.facebook.com/profile.php?id=100079856382774',
  'https://www.facebook.com/profile.php?id=100082337876201',
  'https://www.facebook.com/afterschoolrainbow',
  'https://www.facebook.com/profile.php?id=100057342554980',
  'https://www.facebook.com/profile.php?id=100066819350608',
  'https://www.facebook.com/profile.php?id=100063547301559',
  'https://www.facebook.com/afterschoolirissmart',
  'https://www.facebook.com/GradinitaHappyTime',
  'https://www.facebook.com/DallesGO',
  'https://www.facebook.com/profile.php?id=100069623481835',
  'https://www.facebook.com/profile.php?id=100066750746447',
  'https://www.facebook.com/profile.php?id=100054410113683',
  'https://www.facebook.com/profile.php?id=100079565282694',
  'https://www.facebook.com/Mirangelay',
  'https://www.facebook.com/kreativekidsschool',
  'https://www.facebook.com/MATEMATICA.maths4u',
  'https://www.facebook.com/CasutaPrieteniei',
  'https://www.facebook.com/afterschoolFDES',
  'https://www.facebook.com/AbcKidsOzana',
  'https://www.facebook.com/newtonafterschool',
  'https://www.facebook.com/afterschoolnona',
  'https://www.facebook.com/profile.php?id=100077901887356',
  'https://www.facebook.com/profile.php?id=100083125497389',
  'https://www.facebook.com/profile.php?id=100063938504429',
  'https://www.facebook.com/afterschoolstelutele',
  'https://www.facebook.com/CEITREIMUSCHETARI',
  'https://www.facebook.com/HiCarlaAfterclass',
  'https://www.facebook.com/continuingeducationcraiova',
  'https://www.facebook.com/AfterSchoolGeorgi',
  'https://www.facebook.com/YAafterschool',
  'https://www.facebook.com/dupascoala',
  'https://www.facebook.com/matiasafterschool',
  'https://www.facebook.com/profile.php?id=100036214847675',
  'https://www.facebook.com/AfterSummerSchool',
  'https://www.facebook.com/educatiepozitivabucuresti',
  'https://www.facebook.com/profile.php?id=100057459670467',
  'https://www.facebook.com/profile.php?id=100064101942881',
  'https://www.facebook.com/afterhora',
  'https://www.facebook.com/AfterSchoolIQEST',
  'https://www.facebook.com/CreativInfinit',
  'https://www.facebook.com/lauraafterschool',
  'https://www.facebook.com/profile.php?id=100063508664700',
  'https://www.facebook.com/profile.php?id=100072097823588',
  'https://www.facebook.com/profile.php?id=100064158690169',
  'https://www.facebook.com/gradinitacastelulzanelor',
  'https://www.facebook.com/Ursuletul.OfficialPage',
  'https://www.facebook.com/saridaclub',
  'https://www.facebook.com/profile.php?id=100067112035120',
  'https://www.facebook.com/ameafterschool.ro',
  'https://www.facebook.com/SweetBabiesBucuresti',
  'https://www.facebook.com/AllynaAfterSchool',
  'https://www.facebook.com/zmeulalbastru',
  'https://www.facebook.com/ForeverAfterschool',
  'https://www.facebook.com/profile.php?id=100046331055638',
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
        return;
      } catch {}
    }
  }
}

async function loginFacebook(page) {
  console.log('🔐 Login Facebook...');
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);

  for (let i = 0; i < 3; i++) {
    if (await page.locator('#email').isVisible().catch(() => false)) break;
    await dismissConsent(page);
    await sleep(2000);
    if (!page.url().includes('/login')) {
      await page.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000);
    }
  }

  if (await page.locator('#email').isVisible().catch(() => false)) {
    await page.fill('#email', EMAIL);
    await page.fill('#pass', PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      page.click('[name="login"]'),
    ]);
  } else {
    await page.goto('https://m.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    await dismissConsent(page);
    await sleep(2000);
    const ef = page.locator('input[name="email"], input[type="email"]').first();
    if (await ef.isVisible().catch(() => false)) {
      await ef.fill(EMAIL);
      await page.locator('input[name="pass"], input[type="password"]').first().fill(PASSWORD);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        page.keyboard.press('Enter'),
      ]);
    }
  }
  await sleep(5000);
  const url = page.url();
  if (url.includes('/login') || url.includes('/checkpoint') || url.includes('consent')) {
    console.log('⚠️  Astept verificare manuala (20s)...');
    await sleep(20000);
  } else {
    console.log('✅ Login reusit!\n');
  }
}

function extractInfo(text) {
  const phoneMatch = text.match(/(\+?4?07\d{8}|\+?40[\s-]?7\d{2}[\s-]?\d{3}[\s-]?\d{3})/);
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  const websiteMatches = (text.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:ro|com|eu|org|net)(?:\/\S*)?/g) || [])
    .filter(w => !w.includes('facebook') && !w.includes('fb.com') && !w.includes('instagram') && !w.includes('shopilo'));
  const addrMatch = text.match(/(?:Str\.|Bd\.|Calea|Sos\.|Aleea|Splaiuri|Intrarea|Strada|Bulevardul|Soseaua|Piata)\s+[\w\s.-]+(?:nr\.|nr)\s*\d+[A-Za-z]?/i);
  const sectorMatch = text.match(/[Ss]ector(?:ul)?\s*([1-6])/);
  const priceMatch = text.match(/(\d{3,4})\s*(?:lei|ron)/i);

  // Try to extract city/zone info
  const bucharestZones = ['sector 1','sector 2','sector 3','sector 4','sector 5','sector 6',
    'aviatiei','herastrau','domenii','floreasca','baneasa','titan','iancului','colentina',
    'pantelimon','dristor','militari','drumul taberei','crangasi','rahova','ferentari',
    'berceni','timpuri noi','tineretului','unirii','victoriei','dorobanti'];
  let zone = null;
  const lowerText = text.toLowerCase();
  for (const z of bucharestZones) {
    if (lowerText.includes(z)) { zone = z; break; }
  }

  return {
    phone: phoneMatch ? phoneMatch[0].replace(/\s/g, '') : null,
    email: emailMatch ? emailMatch[0] : null,
    website: websiteMatches[0] || null,
    address: addrMatch ? addrMatch[0] : null,
    sector: sectorMatch ? parseInt(sectorMatch[1]) : null,
    price: priceMatch ? parseInt(priceMatch[1]) : null,
    zone,
  };
}

function normalize(name) {
  return name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9]/g, '');
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  await loginFacebook(page);

  // Get existing entries
  const existing = db.prepare('SELECT id, name, website FROM afterschools').all();
  const existingNames = existing.map(e => normalize(e.name));
  const existingWebsites = existing.map(e => e.website).filter(Boolean);

  const insert = db.prepare(`
    INSERT INTO afterschools (name, address, sector, lat, lng, phone, email, website, price_min, price_max, pickup_time, end_time, age_min, age_max, description, activities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateWebsite = db.prepare('UPDATE afterschools SET website = ? WHERE id = ?');

  let added = 0;
  let skipped = 0;
  let updatedWebsite = 0;

  for (let i = 0; i < FB_URLS.length; i++) {
    const fbUrl = FB_URLS[i];
    console.log(`[${i + 1}/${FB_URLS.length}] ${fbUrl}`);

    try {
      const aboutUrl = fbUrl.includes('profile.php')
        ? fbUrl + '&sk=about'
        : fbUrl.replace(/\/$/, '') + '/about';

      await page.goto(aboutUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(3000);

      const data = await page.evaluate(() => {
        const body = document.body.innerText;
        if (body.includes('nu este disponibil') || body.includes('not available')) {
          return { unavailable: true };
        }

        // Get page title/name
        const titleEl = document.querySelector('h1, [data-testid="page-title"]');
        const name = titleEl ? titleEl.innerText.trim() : document.title.replace(' | Facebook', '').trim();

        return { name, text: body.substring(0, 2000), unavailable: false };
      });

      if (data.unavailable) {
        console.log('  ⚠️  Pagina privata/stearsa - skip\n');
        skipped++;
        continue;
      }

      const name = data.name || '';
      if (!name || name.length < 3) {
        console.log('  ⚠️  Nume negasit - skip\n');
        skipped++;
        continue;
      }

      console.log(`  Nume: ${name}`);
      const info = extractInfo(data.text || '');
      console.log(`  Adresa: ${info.address || '-'} | Sector: ${info.sector || '-'} | Phone: ${info.phone || '-'}`);

      const normalizedName = normalize(name);

      // Check if already exists by name
      const nameExists = existingNames.some(e =>
        e === normalizedName ||
        (e.length > 8 && normalizedName.includes(e.substring(0, 10))) ||
        (normalizedName.length > 8 && e.includes(normalizedName.substring(0, 10)))
      );

      // Check if already exists by FB URL as website
      const urlExists = existingWebsites.some(w => w && w.includes(fbUrl.split('/').pop()));

      if (nameExists || urlExists) {
        // Check if we need to update website to FB URL
        const match = existing.find(e => normalize(e.name) === normalizedName || (e.website && e.website.includes(fbUrl.split('/').pop())));
        if (match && !match.website) {
          updateWebsite.run(fbUrl, match.id);
          console.log(`  🔗 Actualizat website FB pentru: ${match.name}\n`);
          updatedWebsite++;
        } else {
          console.log('  ⏭️  Exista deja - skip\n');
          skipped++;
        }
        continue;
      }

      // Determine lat/lng based on sector/zone
      const coords = {
        1: { lat: 44.4630, lng: 26.0640 },
        2: { lat: 44.4490, lng: 26.1150 },
        3: { lat: 44.4180, lng: 26.1300 },
        4: { lat: 44.3960, lng: 26.1050 },
        5: { lat: 44.4100, lng: 26.0650 },
        6: { lat: 44.4350, lng: 26.0200 },
      };
      const c = coords[info.sector] || { lat: 44.4268, lng: 26.1025 };

      insert.run(
        name, info.address || 'Bucuresti', info.sector, c.lat, c.lng,
        info.phone, info.email, info.website || fbUrl,
        info.price || null, null, null, null,
        6, 12,
        `After school din Bucuresti${info.zone ? ' zona ' + info.zone : ''}${info.sector ? ', Sector ' + info.sector : ''}.`,
        'Teme,Engleza,Arte,Sport'
      );

      existingNames.push(normalizedName);
      existingWebsites.push(fbUrl);
      console.log(`  ✅ ADAUGAT!\n`);
      added++;

    } catch (e) {
      console.log(`  ✗ Eroare: ${e.message.substring(0, 80)}\n`);
    }
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM afterschools').get();
  console.log('═══════════════════════════════');
  console.log(`✅ Adaugate noi:     ${added}`);
  console.log(`🔗 Website actualizat: ${updatedWebsite}`);
  console.log(`⏭️  Sarite (existau): ${skipped}`);
  console.log(`📦 Total in DB:      ${total.count}`);
  console.log('═══════════════════════════════');

  await browser.close();
}

main().catch(console.error);
