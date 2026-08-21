const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-kindergartens.log');
const db = new Database(DB_PATH);
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...a){ const l=a.join(' '); console.log(l); logStream.write(l+'\n'); }

const QUERIES = [];
for (let s = 1; s <= 6; s++) QUERIES.push({ q: `gradinita privata sector ${s} Bucuresti`, type: 'gradinita' });
QUERIES.push({ q: 'gradinita privata Bucuresti', type: 'gradinita' });
QUERIES.push({ q: 'gradinita cu program prelungit Bucuresti', type: 'gradinita' });
for (let s = 1; s <= 6; s++) QUERIES.push({ q: `cresa privata sector ${s} Bucuresti`, type: 'cresa' });
QUERIES.push({ q: 'cresa privata Bucuresti', type: 'cresa' });

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function normalize(n){ return n.toLowerCase().replace(/[ăâ]/g,'a').replace(/[îí]/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t').replace(/[^a-z0-9]/g,''); }
function extractSector(a){ const m=(a||'').match(/[Ss]ector\s*([1-6])/); return m?parseInt(m[1]):null; }
function extractCoords(u){ const m=u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/); if(m)return{lat:parseFloat(m[1]),lng:parseFloat(m[2])}; const m2=u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/); if(m2)return{lat:parseFloat(m2[1]),lng:parseFloat(m2[2])}; return null; }

async function dismissConsent(page){
  try{
    const labels=['Respinge tot','Refuz tot','Reject all','Alle ablehnen','Accepta tot','Accept all','Alle akzeptieren'];
    for(const lab of labels){
      const b=page.locator('button:has-text("'+lab+'")').first();
      if(await b.isVisible({timeout:1500}).catch(()=>false)){ await b.click().catch(()=>{}); await sleep(2000); return; }
    }
  }catch{}
}

const insert = db.prepare(`
  INSERT INTO kindergartens (name, type, address, sector, lat, lng, phone, email, website, price_min, price_max, program, age_min, age_max, description, activities, availability, is_premium, is_featured, contacts_hidden)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unknown', 0, 0, 0)
`);

async function scrapeQuery(page, item, seen){
  const { q, type } = item;
  log(`\n🔍 [${type}] "${q}"`);
  await page.goto('https://www.google.com/maps/search/'+encodeURIComponent(q), { waitUntil:'domcontentloaded', timeout:30000 });
  await sleep(3000); await dismissConsent(page); await sleep(1500);
  await page.locator('[role="feed"], .Nv2PK').first().waitFor({ timeout:10000 }).catch(()=>{});
  let last=0;
  for(let sc=0; sc<6; sc++){
    const c=await page.locator('.Nv2PK').count();
    if(c===last && sc>2) break; last=c;
    await page.evaluate(()=>{ const f=document.querySelector('[role="feed"]'); if(f) f.scrollTop+=800; });
    await sleep(1500);
  }
  const items=await page.locator('.Nv2PK').all();
  log(`  Gasit ${items.length}`);
  let added=0; const cap=Math.min(items.length,22);
  for(let i=0;i<cap;i++){
    try{
      const it=items[i];
      const name=await it.locator('.qBF1Pd, .fontHeadlineSmall').first().textContent({timeout:3000}).catch(()=>'');
      if(!name||name.length<3) continue;
      const nl=name.toLowerCase();
      // skip scoli/afterschool/cabinete care nu sunt gradinite/crese
      if(nl.includes('after school')||nl.includes('afterschool')) continue;
      const nn=normalize(name);
      if(seen.has(nn)) continue;
      const sec=await it.locator('.W4Efsd').textContent({timeout:3000}).catch(()=>'');
      await it.click(); await sleep(2000);
      const url=page.url(); const coords=extractCoords(url);
      let phone=null, website=null, address='';
      try{
        const ae=page.locator('[data-item-id="address"] .fontBodyMedium, button[data-item-id="address"]').first();
        if(await ae.isVisible({timeout:2000}).catch(()=>false)) address=(await ae.textContent()||'').trim();
        const pe=page.locator('[data-item-id^="phone"] .fontBodyMedium, button[data-item-id^="phone"]').first();
        if(await pe.isVisible({timeout:2000}).catch(()=>false)) phone=(await pe.textContent()||'').trim().replace(/\s+/g,'');
        const we=page.locator('a[data-item-id="authority"]').first();
        if(await we.isVisible({timeout:2000}).catch(()=>false)) website=await we.getAttribute('href')||null;
      }catch{}
      if(!address && sec){ const p=sec.split('·'); address=p[p.length-1]?.trim()||''; }
      const sector=extractSector(address)||extractSector(sec);
      if(coords && (coords.lat<44.3||coords.lat>44.7||coords.lng<25.9||coords.lng>26.5)){ await page.goBack({waitUntil:'domcontentloaded',timeout:10000}).catch(()=>{}); await sleep(1500); continue; }
      const fc=coords||{lat:44.4268,lng:26.1025};
      const ageMin = type==='cresa'?0:3; const ageMax = type==='cresa'?3:6;
      const desc = (type==='cresa'?'Cresa':'Gradinita')+' in Bucuresti'+(sector?', Sector '+sector:'')+'. Program pentru copii cu varste intre '+ageMin+' si '+ageMax+' ani.';
      insert.run(name.trim(), type, address||'Bucuresti', sector, fc.lat, fc.lng, phone, null, website, null, null, null, ageMin, ageMax, desc, type==='cresa'?'Ingrijire,Somn,Masa,Joaca':'Engleza,Arte,Muzica,Sport,Joaca');
      seen.add(nn); added++;
      log(`  ✅ ${name} | ${address||'-'} | ${phone||'-'}`);
      await page.goBack({waitUntil:'domcontentloaded',timeout:10000}).catch(()=>{}); await sleep(1800);
    }catch(e){ log('  ✗ '+String(e.message).substring(0,50)); await page.goBack({waitUntil:'domcontentloaded',timeout:10000}).catch(()=>{}); await sleep(1000); }
  }
  log(`  → ${added} noi`); return added;
}

async function main(){
  const browser=await chromium.launch({ headless:true });
  const ctx=await browser.newContext({ locale:'ro-RO', userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', viewport:{width:1400,height:900} });
  const page=await ctx.newPage();
  const existing=db.prepare('SELECT name FROM kindergartens').all();
  const seen=new Set(existing.map(e=>normalize(e.name)));
  log(`📦 DB curent: ${existing.length} gradinite\n`);
  await page.goto('https://www.google.com/maps',{waitUntil:'domcontentloaded',timeout:30000}); await sleep(3000); await dismissConsent(page); await sleep(1500);
  let total=0;
  for(const item of QUERIES){ try{ total+=await scrapeQuery(page,item,seen); }catch(e){ log('❌ '+String(e.message).substring(0,80)); } await sleep(2000); }
  await browser.close();
  const c=db.prepare('SELECT COUNT(*) as c FROM kindergartens').get();
  log(`\n✅ TOTAL NOI: ${total}`); log(`📦 Total gradinite: ${c.c}`);
}
main().catch(e=>{ log('FATAL: '+e.message); process.exit(1); });
