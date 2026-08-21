// Crawler Anunturi.ro pentru COLABORATORI INDEPENDENTI (kind=independent).
// Sursa: anunturi.ro - al doilea mare clasified din Romania dupa OLX.
// Acelasi model ca OLX: coverage_area + sector, fara adresa fixa (se deplaseaza).
// Utilizare: node scrape-collaborators-anunturi.js <domeniu>
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const db = new Database(DB_PATH);

const DOMAIN = process.argv[2];
const LOG_PATH = path.join(__dirname, '..', 'data', `scrape-anunturi-${DOMAIN}.log`);
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...a){ const l=a.join(' '); console.log(l); logStream.write(l+'\n'); }

const CFG = {
  limbi_straine: ['profesor engleza bucuresti','profesor franceza particular','tutor limbi straine copii bucuresti'],
  robotica: ['instructor robotica copii','profesor programare copii bucuresti','mentor coding copii'],
  sah: ['profesor sah particular','instructor sah copii bucuresti'],
  soroban: ['instructor soroban bucuresti','profesor abac mental copii'],
  stiinte: ['instructor stiinte copii','educator STEM bucuresti'],
  educatie_financiara: ['educator financiar copii','instructor educatie financiara'],
  lectura: ['instructor lectura copii','animator club lectura'],
  caligrafie: ['profesor caligrafie','instructor scriere frumoasa copii'],
  muzica: ['profesor pian particular','profesor chitara copii','profesor canto bucuresti'],
  arta: ['profesor desen copii','instructor arte plastice','pictor instructor copii'],
  teatru: ['instructor teatru copii','profesor teatru actorie copii'],
  dans: ['profesor dans particular','instructor dans copii bucuresti'],
  public_speaking: ['trainer public speaking copii','instructor dezbateri tineri bucuresti'],
  sport_indoor: ['instructor fitness copii','antrenor sport copii particular','instructor arte martiale copii'],
  yoga: ['instructor yoga copii bucuresti','profesor mindfulness copii'],
  dezvoltare_personala: ['coach dezvoltare personala copii','formator inteligenta emotionala copii'],
  gatit: ['instructor gatit copii','chef atelier culinar copii','instructor cofetarie'],
  terapie: ['terapeut ABA copii','kinetoterapeut copii la domiciliu','terapeut ocupational copii'],
  foto_video: ['fotograf petreceri copii','videograf evenimente copii'],
  logopedie: ['logoped independent','logoped la domiciliu copii'],
  psihologie: ['psiholog copii','consilier educational independent bucuresti'],
  personal_afterschool: ['educator afterschool','supraveghetor copii afterschool','tutore copii particular','ingrijitor copii program afterschool'],
};
if (!DOMAIN || !CFG[DOMAIN]) { console.error('Domenii:', Object.keys(CFG).join(', ')); process.exit(1); }

const SECTORE_ZONE = {
  'militari':6,'drumul taberei':6,'ghencea':6,'crangasi':6,'giulesti':6,
  'berceni':4,'giurgiului':4,'rahova':5,'ferentari':5,'cotroceni':5,'13 septembrie':5,
  'titan':3,'dristor':3,'vitan':3,
  'colentina':2,'pantelimon':2,'obor':2,'tei':2,'iancului':2,
  'floreasca':1,'dorobanti':1,'aviatorilor':1,'baneasa':1,'domenii':1,'victoriei':1,
  'voluntari':2,'otopeni':1,'popesti':4,
};
function zoneToSector(z){ if(!z)return null; const zl=z.toLowerCase(); const m=zl.match(/sector\s*([1-6])/); if(m)return parseInt(m[1]); for(const[k,v]of Object.entries(SECTORE_ZONE)){ if(zl.includes(k))return v; } return null; }
async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function normalize(n){ return n.toLowerCase().replace(/[ăâ]/g,'a').replace(/[îí]/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t').replace(/[^a-z0-9]/g,''); }

const insert = db.prepare(`
  INSERT INTO professionals (name, category, kind, address, sector, lat, lng, coverage_area, phone, email, website, description, availability, online_available, home_service, is_premium, is_featured, contacts_hidden)
  VALUES (?, ?, 'independent', NULL, ?, 0, 0, ?, ?, NULL, ?, ?, 'unknown', 0, 1, 0, 0, 0)
`);

async function scrapeQuery(page, query, seen){
  log(`\n🔍 anunturi.ro "${query}"`);
  const url = 'https://www.anunturi.ro/cautare/?q=' + encodeURIComponent(query) + '&locatie=Bucuresti';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await sleep(3000);

  // Accept cookies if present
  try {
    const cookieBtn = page.locator('button:has-text("Accept"), button:has-text("De acord"), #acceptAllBtn').first();
    if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieBtn.click(); await sleep(1000);
    }
  } catch {}

  const cards = await page.locator('.listing-item, .ad-item, article.ad, .adsListItem').all();
  log(`  ${cards.length} anunturi`);

  // Fallback: get all links with title + location
  let leads = [];
  if (cards.length === 0) {
    // Try alternative structure
    const links = await page.locator('a[href*="/anunt/"], a[href*="/ad/"]').all();
    for (const l of links.slice(0, 30)) {
      try {
        const title = (await l.textContent({ timeout: 1000 }).catch(() => ''))?.trim() || '';
        const href = await l.getAttribute('href').catch(() => null);
        if (title && href && title.length > 5) {
          leads.push({ title, href: href.startsWith('http') ? href : 'https://www.anunturi.ro' + href, zone: 'Bucuresti' });
        }
      } catch {}
    }
  } else {
    for (const c of cards.slice(0, 40)) {
      try {
        const titleEl = c.locator('h2, h3, .title, .ad-title').first();
        const title = (await titleEl.textContent({ timeout: 1500 }).catch(() => ''))?.trim() || '';
        const href = await c.locator('a').first().getAttribute('href').catch(() => null);
        const locEl = c.locator('.location, .zone, [class*="location"], [class*="zone"]').first();
        const zone = (await locEl.textContent({ timeout: 1000 }).catch(() => ''))?.trim() || 'Bucuresti';
        if (title && href && title.length > 5) {
          leads.push({ title, href: href.startsWith('http') ? href : 'https://www.anunturi.ro' + href, zone });
        }
      } catch {}
    }
  }

  let added = 0;
  for (const ld of leads) {
    const nn = normalize(ld.title);
    if (seen.has(nn)) continue;
    let phone = null, desc = '';
    try {
      await page.goto(ld.href, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(2000);
      desc = (await page.locator('.description, .ad-description, [class*="description"]').first().textContent({ timeout: 2000 }).catch(() => '')) || '';
      // Try to find phone
      const phoneEl = page.locator('a[href^="tel:"], .phone, [class*="phone"]').first();
      if (await phoneEl.isVisible({ timeout: 1500 }).catch(() => false)) {
        const tel = await phoneEl.getAttribute('href').catch(() => null);
        if (tel && tel.startsWith('tel:')) phone = tel.replace('tel:', '').trim();
        else phone = (await phoneEl.textContent({ timeout: 1000 }).catch(() => ''))?.trim() || null;
      }
    } catch {}
    const sector = zoneToSector(ld.zone);
    desc = (desc || '').replace(/\s+/g, ' ').trim().substring(0, 400) || `${ld.title} - colaborator independent in Bucuresti.`;
    insert.run(ld.title, DOMAIN, sector, ld.zone || 'Bucuresti', phone, ld.href, desc);
    seen.add(nn); added++;
    log(`  ✅ ${ld.title} | zona:${ld.zone} | ${phone || '(fara tel)'}`);
    await sleep(1000);
  }
  log(`  → ${added} noi`); return added;
}

async function main(){
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    locale: 'ro-RO',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 }
  });
  const page = await ctx.newPage();
  const existing = db.prepare('SELECT name FROM professionals').all();
  const seen = new Set(existing.map(e => normalize(e.name)));
  log(`📦 anunturi.ro domeniu=${DOMAIN} | ${existing.length} existenti\n`);
  let total = 0;
  for (const q of CFG[DOMAIN]) {
    try { total += await scrapeQuery(page, q, seen); } catch(e) { log('❌ ' + String(e.message).substring(0, 80)); }
    await sleep(2500);
  }
  await browser.close();
  const cnt = db.prepare("SELECT COUNT(*) as c FROM professionals WHERE category=? AND kind='independent'").get(DOMAIN);
  log(`\n✅ [anunturi ${DOMAIN}] NOI: ${total} | total independenti in categorie: ${cnt.c}`);
}
main().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
