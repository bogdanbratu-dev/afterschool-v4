// Crawler Publi24.ro pentru COLABORATORI INDEPENDENTI
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const db = new Database(DB_PATH);

const DOMAIN = process.argv[2];
const LOG_PATH = path.join(__dirname, '..', 'data', `scrape-publi24-${DOMAIN}.log`);
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...a){ const l=a.join(' '); console.log(l); logStream.write(l+'\n'); }

const CFG = {
  limbi_straine: ['profesor engleza particular bucuresti','profesor franceza copii bucuresti','tutor limbi straine'],
  robotica: ['instructor robotica copii','profesor programare copii','mentor coding copii bucuresti'],
  sah: ['profesor sah particular','instructor sah copii bucuresti'],
  soroban: ['instructor soroban bucuresti','profesor abac mental'],
  stiinte: ['instructor stiinte copii','educator STEM bucuresti'],
  educatie_financiara: ['educator financiar copii'],
  lectura: ['instructor lectura copii','animator club lectura'],
  caligrafie: ['profesor caligrafie','instructor scriere frumoasa'],
  muzica: ['profesor pian particular','profesor chitara copii','profesor canto bucuresti'],
  arta: ['profesor desen copii','instructor arte plastice'],
  teatru: ['instructor teatru copii','profesor actorie copii'],
  dans: ['profesor dans particular','instructor dans copii'],
  public_speaking: ['trainer public speaking copii','instructor dezbateri'],
  sport_indoor: ['instructor fitness copii','antrenor arte martiale copii','instructor karate'],
  yoga: ['instructor yoga copii','profesor mindfulness copii'],
  dezvoltare_personala: ['coach dezvoltare personala copii'],
  gatit: ['instructor gatit copii','chef atelier culinar copii'],
  terapie: ['terapeut ABA copii','terapeut ocupational copii'],
  foto_video: ['fotograf evenimente copii','videograf copii'],
  logopedie: ['logoped independent','logoped la domiciliu copii'],
  psihologie: ['psiholog copii particular','consilier educational'],
  personal_afterschool: ['educator afterschool','tutore copii particular','supraveghetor copii'],
};
if (!DOMAIN || !CFG[DOMAIN]) { console.error('Domenii:', Object.keys(CFG).join(', ')); process.exit(1); }

const SECTORE_ZONE = { militari:6, berceni:4, titan:3, colentina:2, floreasca:1, voluntari:2, otopeni:1 };
function zoneToSector(z){ if(!z)return null; const zl=(z||'').toLowerCase(); const m=zl.match(/sector\s*([1-6])/); if(m)return parseInt(m[1]); for(const[k,v]of Object.entries(SECTORE_ZONE)){ if(zl.includes(k))return v; } return null; }
function normalize(n){ return n.toLowerCase().replace(/[ăâ]/g,'a').replace(/[îí]/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t').replace(/[^a-z0-9]/g,''); }

const insert = db.prepare(`INSERT INTO professionals (name,category,kind,address,sector,lat,lng,coverage_area,phone,email,website,description,availability,online_available,home_service,is_premium,is_featured,contacts_hidden) VALUES (?,?,'independent',NULL,?,0,0,?,?,NULL,?,?,'unknown',0,1,0,0,0)`);

async function scrapeQuery(page, query, seen){
  log(`\n🔍 publi24.ro "${query}"`);
  const url = 'https://www.publi24.ro/anunturi/q-' + encodeURIComponent(query.replace(/\s+/g,'-')) + '/judet-bucuresti/';
  try {
    await page.goto(url, { waitUntil:'domcontentloaded', timeout:30000 });
    await page.waitForTimeout(2000);
    // Accept cookies
    try { await page.locator('button:has-text("Accept"), #CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll').first().click({timeout:2000}); await page.waitForTimeout(800); } catch{}
  } catch(e) { log('  nav err: '+e.message.slice(0,60)); return 0; }

  const cards = await page.locator('.listing-item,.ad-item,.adItem,article[class*="listing"],.ann-item').all();
  log(`  ${cards.length} anunturi`);

  let leads = [];
  if (cards.length === 0) {
    const links = await page.locator('a[href*="/anunturi/"]').all();
    for (const l of links.slice(0,30)) {
      const title = (await l.textContent({timeout:800}).catch(()=>''))?.trim()||'';
      const href = await l.getAttribute('href').catch(()=>null);
      if (title.length > 8 && href && !href.includes('/q-')) leads.push({title,href:href.startsWith('http')?href:'https://www.publi24.ro'+href,zone:'Bucuresti'});
    }
  } else {
    for (const c of cards.slice(0,30)) {
      const title=(await c.locator('h2,h3,.title').first().textContent({timeout:800}).catch(()=>''))?.trim()||'';
      const href=await c.locator('a').first().getAttribute('href').catch(()=>null);
      const zone=(await c.locator('.location,.zone').first().textContent({timeout:600}).catch(()=>''))?.trim()||'Bucuresti';
      if(title.length>8&&href) leads.push({title,href:href.startsWith('http')?href:'https://www.publi24.ro'+href,zone});
    }
  }

  let added=0;
  for(const ld of leads){
    const nn=normalize(ld.title);
    if(seen.has(nn)) continue;
    let phone=null,desc='';
    try {
      await page.goto(ld.href,{waitUntil:'domcontentloaded',timeout:20000});
      await page.waitForTimeout(1500);
      desc=(await page.locator('.description,.desc,[class*="description"]').first().textContent({timeout:1500}).catch(()=>''))||'';
      const telEl=page.locator('a[href^="tel:"],.phone,[class*="phone"]').first();
      if(await telEl.isVisible({timeout:1200}).catch(()=>false)){
        const tel=await telEl.getAttribute('href').catch(()=>null);
        phone=tel?.startsWith('tel:')?tel.replace('tel:','').trim():(await telEl.textContent({timeout:800}).catch(()=>''))?.trim()||null;
      }
    } catch{}
    const sector=zoneToSector(ld.zone);
    desc=(desc||'').replace(/\s+/g,' ').trim().substring(0,400)||`${ld.title} - colaborator independent in Bucuresti.`;
    insert.run(ld.title,DOMAIN,sector,ld.zone||'Bucuresti',phone,ld.href,desc);
    seen.add(nn); added++;
    log(`  ✅ ${ld.title} | ${phone||'(fara tel)'}`);
    await page.waitForTimeout(1000);
  }
  log(`  → ${added} noi`); return added;
}

async function main(){
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({locale:'ro-RO',userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',viewport:{width:1400,height:900}});
  const page=await ctx.newPage();
  const seen=new Set(db.prepare('SELECT name FROM professionals').all().map(e=>normalize(e.name)));
  log(`📦 publi24.ro domeniu=${DOMAIN} | ${seen.size} existenti`);
  let total=0;
  for(const q of CFG[DOMAIN]){
    try{ total+=await scrapeQuery(page,q,seen); }catch(e){ log('❌ '+String(e.message).slice(0,80)); }
    await page.waitForTimeout(2500);
  }
  await browser.close();
  const cnt=db.prepare("SELECT COUNT(*) as c FROM professionals WHERE category=? AND kind='independent'").get(DOMAIN);
  log(`\n✅ [publi24 ${DOMAIN}] NOI: ${total} | total independenti: ${cnt.c}`);
}
main().catch(e=>{ log('FATAL: '+e.message); process.exit(1); });