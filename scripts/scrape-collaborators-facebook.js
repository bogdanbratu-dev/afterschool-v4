// Crawler Facebook Groups pentru colaboratori independenti
// Cauta in grupuri publice de tipul "Profesori particulari Bucuresti"
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const db = new Database(path.join(__dirname,'..','data','afterschool.db'));
const DOMAIN = process.argv[2];
const logStream = fs.createWriteStream(path.join(__dirname,'..','data',`scrape-facebook-${DOMAIN}.log`),{flags:'w'});
function log(...a){ const l=a.join(' '); console.log(l); logStream.write(l+'\n'); }

// Grupuri publice cu anunturi de profesori
const GROUPS = [
  'https://www.facebook.com/groups/profesoriparticularibucaresti',
  'https://www.facebook.com/groups/meditatiibucaresti',
  'https://www.facebook.com/groups/animatoricopiibucuresti',
  'https://www.facebook.com/groups/logopezibucuresti',
  'https://www.facebook.com/groups/psihologicopiibucuresti',
];

// Keywords per domain to filter relevant posts
const CFG = {
  limbi_straine: ['engleza','franceza','germana','spaniola','italiana','limba'],
  muzica: ['pian','chitara','canto','muzica','vioara'],
  dans: ['dans','balet','hip-hop'],
  sah: ['sah','chess'],
  arta: ['desen','pictura','arta'],
  teatru: ['teatru','actorie'],
  sport_indoor: ['karate','judo','fitness','arte martiale','taekwondo'],
  yoga: ['yoga','mindfulness','meditatie'],
  terapie: ['ABA','terapie','ocupational','senzorial'],
  logopedie: ['logoped','logopedie','vorbire','limbaj'],
  psihologie: ['psiholog','consilier','psihologie'],
  personal_afterschool: ['afterschool','educator','supraveghetor','tutore'],
  gatit: ['gatit','culinar','cofetarie'],
  robotica: ['robotica','programare','coding','scratch'],
  dans: ['dans','balet'],
};
if (!DOMAIN || !CFG[DOMAIN]) { console.error('Domenii:', Object.keys(CFG).join(', ')); process.exit(1); }
const keywords = CFG[DOMAIN];

function normalize(n){ return n.toLowerCase().replace(/[ăâ]/g,'a').replace(/[îí]/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t').replace(/[^a-z0-9]/g,''); }
function extractPhone(text){ const m=text.match(/(?:\+40|0040|0)[0-9\s\-\.]{8,12}/g); if(!m)return null; return m.map(p=>p.replace(/[\s\-\.]/g,'')).find(p=>p.length>=10)||null; }
function extractEmail(text){ const m=text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/); return m?m[0].toLowerCase():null; }

const insert = db.prepare(`INSERT INTO professionals (name,category,kind,address,sector,lat,lng,coverage_area,phone,email,website,description,availability,online_available,home_service,is_premium,is_featured,contacts_hidden) VALUES (?,?,'independent',NULL,NULL,0,0,'Bucuresti',?,?,?,?,'unknown',0,1,0,0,0)`);

async function scrapeGroup(page, groupUrl, seen){
  log(`\n📘 Facebook: ${groupUrl}`);
  try {
    await page.goto(groupUrl, {waitUntil:'domcontentloaded', timeout:30000});
    await page.waitForTimeout(3000);
    // Dismiss login popup if present
    try { await page.locator('[aria-label="Inchide"], [aria-label="Close"], [data-testid="dialog_title_close_button"]').first().click({timeout:2000}); await page.waitForTimeout(1000); } catch{}
    // Scroll to load posts
    for(let i=0;i<3;i++){ await page.evaluate(()=>window.scrollBy(0,1500)); await page.waitForTimeout(1500); }
  } catch(e){ log('  err: '+e.message.slice(0,60)); return 0; }

  const posts = await page.locator('[role="article"]').all();
  log(`  ${posts.length} posts vizibile`);
  let added = 0;

  for (const post of posts.slice(0,30)) {
    try {
      const text = (await post.textContent({timeout:1000}).catch(()=>''))||'';
      // Check if post is relevant for this domain
      const relevant = keywords.some(k => text.toLowerCase().includes(k.toLowerCase()));
      if(!relevant) continue;

      // Extract author name
      const authorEl = post.locator('[role="link"]:first-child, a[href*="/user/"], a[href*="/profile/"]').first();
      const author = (await authorEl.textContent({timeout:800}).catch(()=>''))?.trim()||'';
      const authorUrl = await authorEl.getAttribute('href').catch(()=>null);
      if(!author || author.length < 3) continue;

      const nn = normalize(author);
      if(seen.has(nn)) continue;

      const phone = extractPhone(text);
      const email = extractEmail(text);
      const desc = text.substring(0,400).replace(/\s+/g,' ').trim();

      insert.run(author, DOMAIN, phone, email, authorUrl?`https://facebook.com${authorUrl.split('?')[0]}`:'https://www.facebook.com', desc||`${author} - colaborator independent ${DOMAIN} Bucuresti`);
      seen.add(nn); added++;
      log(`  ✅ ${author} | ${phone||'no tel'} | ${email||'no email'}`);
    } catch{}
  }
  log(`  → ${added} noi`); return added;
}

async function main(){
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({locale:'ro-RO',userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',viewport:{width:1400,height:900}});
  const page=await ctx.newPage();
  const seen=new Set(db.prepare('SELECT name FROM professionals').all().map(e=>normalize(e.name)));
  log(`📦 facebook domeniu=${DOMAIN} | ${seen.size} existenti`);
  let total=0;
  for(const g of GROUPS){
    try{ total+=await scrapeGroup(page,g,seen); }catch(e){ log('❌ '+String(e.message).slice(0,80)); }
    await page.waitForTimeout(3000);
  }
  await browser.close();
  log(`\n✅ [facebook ${DOMAIN}] NOI: ${total}`);
}
main().catch(e=>{ log('FATAL: '+e.message); process.exit(1); });