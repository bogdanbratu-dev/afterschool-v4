// Crawler Superprof.ro - platformă dedicată profesorilor particulari
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const db = new Database(path.join(__dirname,'..','data','afterschool.db'));
const DOMAIN = process.argv[2];
const logStream = fs.createWriteStream(path.join(__dirname,'..','data',`scrape-superprof-${DOMAIN}.log`),{flags:'w'});
function log(...a){ const l=a.join(' '); console.log(l); logStream.write(l+'\n'); }

const CFG = {
  limbi_straine: ['engleza','franceza','germana','spaniola','italiana'],
  muzica: ['pian','chitara','vioara','canto'],
  dans: ['balet','dans modern','hip-hop'],
  matematica: ['matematica'],
  stiinte: ['fizica','chimie','biologie'],
  arta: ['desen','pictura'],
  teatru: ['teatru'],
  sah: ['sah'],
  yoga: ['yoga'],
  gatit: ['gatit'],
  logopedie: ['logopedie'],
  psihologie: ['psihologie copii'],
  terapie: ['terapie ABA'],
};
if (!DOMAIN || !CFG[DOMAIN]) { console.error('Domenii:', Object.keys(CFG).join(', ')); process.exit(1); }

function normalize(n){ return n.toLowerCase().replace(/[ăâ]/g,'a').replace(/[îí]/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t').replace(/[^a-z0-9]/g,''); }
const insert = db.prepare(`INSERT INTO professionals (name,category,kind,address,sector,lat,lng,coverage_area,phone,email,website,description,availability,online_available,home_service,is_premium,is_featured,contacts_hidden) VALUES (?,?,'independent',NULL,NULL,0,0,'Bucuresti',NULL,NULL,?,?,'unknown',1,1,0,0,0)`);

async function scrapeSubject(page, subj, seen){
  log(`\n🔍 superprof.ro/${subj}`);
  const url = `https://www.superprof.ro/cursuri/${encodeURIComponent(subj)}/bucuresti.html`;
  try {
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(2000);
    try { await page.locator('[class*="cookie"] button:has-text("Accept")').first().click({timeout:2000}); } catch{}
  } catch(e){ log('  err: '+e.message.slice(0,60)); return 0; }

  const cards = await page.locator('.profile-card,.teacher-card,[class*="profile"],[class*="teacher"]').all();
  log(`  ${cards.length} profesori`);

  let added = 0;
  for (const c of cards.slice(0,20)) {
    try {
      const name = (await c.locator('h2,h3,[class*="name"]').first().textContent({timeout:800}).catch(()=>''))?.trim()||'';
      const href = await c.locator('a').first().getAttribute('href').catch(()=>null);
      const desc = (await c.locator('p,[class*="desc"],[class*="bio"]').first().textContent({timeout:800}).catch(()=>''))?.trim()||'';
      if(!name || name.length < 3) continue;
      const nn = normalize(name);
      if(seen.has(nn)) continue;
      const profileUrl = href ? (href.startsWith('http')?href:'https://www.superprof.ro'+href) : null;
      insert.run(name, DOMAIN, profileUrl, desc.substring(0,400)||`${name} - profesor particular ${subj} in Bucuresti.`);
      seen.add(nn); added++;
      log(`  ✅ ${name}`);
    } catch{}
  }
  log(`  → ${added} noi`); return added;
}

async function main(){
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({locale:'ro-RO',userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',viewport:{width:1400,height:900}});
  const page=await ctx.newPage();
  const seen=new Set(db.prepare('SELECT name FROM professionals').all().map(e=>normalize(e.name)));
  log(`📦 superprof.ro domeniu=${DOMAIN} | ${seen.size} existenti`);
  let total=0;
  for(const q of CFG[DOMAIN]){
    try{ total+=await scrapeSubject(page,q,seen); }catch(e){ log('❌ '+String(e.message).slice(0,80)); }
    await page.waitForTimeout(3000);
  }
  await browser.close();
  log(`\n✅ [superprof ${DOMAIN}] NOI: ${total}`);
}
main().catch(e=>{ log('FATAL: '+e.message); process.exit(1); });