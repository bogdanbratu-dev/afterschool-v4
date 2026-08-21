// Crawler GRADINITE & CRESE PRIVATE la nivel de cartier (Google Maps).
// Regula de aur: DOAR rezultate cu ADRESA STRADALA REALA. Fara adresa -> skip.
// Utilizare: node scrape-kindergartens-cartier.js [nr_cartiere]
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const db = new Database(DB_PATH);
const CARTIERE_LIMIT = process.argv[2] ? parseInt(process.argv[2]) : 999;
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-kg-cartier.log');
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...a){ const l=a.join(' '); console.log(l); logStream.write(l+'\n'); }

const CARTIERE = ['Drumul Taberei','Militari','Berceni','Titan','Colentina','Pantelimon','Rahova','Ferentari','Giurgiului','Floreasca','Dorobanti','Aviatorilor','Baneasa','Pipera','Tei','Vitan','Dristor','Obor','Crangasi','Cotroceni','Grozavesti','Iancului','Vatra Luminoasa','Unirii','Universitate','Piata Victoriei','Piata Romana','Domenii','Bucurestii Noi','13 Septembrie','Tineretului','Sisesti','Brancoveanu','Camil Ressu','Ghencea','Voluntari','Otopeni','Popesti-Leordeni'];

// per cartier: query + type
const TEMPLATES = [
  { t: 'gradinita privata {c} Bucuresti', type: 'gradinita' },
  { t: 'cresa privata {c} Bucuresti', type: 'cresa' },
];

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function normalize(n){ return n.toLowerCase().replace(/[ăâ]/g,'a').replace(/[îí]/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t').replace(/[^a-z0-9]/g,''); }
function extractSector(a){ const m=(a||'').match(/[Ss]ector\s*([1-6])/); return m?parseInt(m[1]):null; }
function extractCoords(u){ const m=u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/); if(m)return{lat:parseFloat(m[1]),lng:parseFloat(m[2])}; const m2=u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/); if(m2)return{lat:parseFloat(m2[1]),lng:parseFloat(m2[2])}; return null; }

const STREET_START = /^(strada|str\.?|bulevardul|bd\.?|b-dul|calea|[sșş]oseaua|[sșş]os\.?|aleea|intrarea|splaiul|pia[tțţ]a|drumul|prelungirea|intr\.?)\b/i;
function validAddress(a){ a=(a||'').trim(); if(a.length<10) return false; const ILFOV=/\b(ilfov|chiajna|bragadiru|ro[sş]u|m[ăa]gurele|jilava|glina|chitila|dobroie[sş]ti|balotesti|corbeanca|mogosoaia|1\s*decembrie)\b/i; if(ILFOV.test(a)) return false; if(STREET_START.test(a)) return true; return /\d/.test(a) && /(sector\s*[1-6]|bucure[sșş]ti|voluntari|otopeni|pantelimon|pope[sş]ti)/i.test(a); }

async function dismissConsent(page){ try{ for(const lab of ['Respinge tot','Refuz tot','Reject all','Alle ablehnen','Accepta tot','Accept all','Alle akzeptieren']){ const b=page.locator('button:has-text("'+lab+'")').first(); if(await b.isVisible({timeout:1500}).catch(()=>false)){ await b.click().catch(()=>{}); await sleep(2000); return; } } }catch{} }

const insert = db.prepare(`
  INSERT INTO kindergartens (name, type, address, sector, lat, lng, phone, email, website, maps_url, age_min, age_max, description, activities, availability, is_premium, is_featured, contacts_hidden)
  VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'unknown', 0, 0, 0)
`);
let SKIP_NOADDR = 0;

async function scrapeQuery(page, query, type, seen){
  log(`\n🔍 [${type}] "${query}"`);
  await page.goto('https://www.google.com/maps/search/'+encodeURIComponent(query),{waitUntil:'domcontentloaded',timeout:30000});
  await sleep(2800); await dismissConsent(page); await sleep(1200);
  await page.locator('[role="feed"], .Nv2PK').first().waitFor({timeout:9000}).catch(()=>{});
  let last=0;
  for(let sc=0;sc<5;sc++){ const c=await page.locator('.Nv2PK').count(); if(c===last&&sc>1)break; last=c; await page.evaluate(()=>{const f=document.querySelector('[role="feed"]'); if(f)f.scrollTop+=800;}); await sleep(1300); }
  const items=await page.locator('.Nv2PK').all();
  let added=0; const cap=Math.min(items.length,20);
  for(let i=0;i<cap;i++){
    try{
      const it=items[i];
      const name=await it.locator('.qBF1Pd, .fontHeadlineSmall').first().textContent({timeout:3000}).catch(()=>'');
      if(!name||name.length<3) continue;
      const nl=name.toLowerCase();
      // exclude ce nu e gradinita/cresa
      if(nl.includes('after school')||nl.includes('afterschool')||nl.includes('scoala gimnaziala')||nl.includes('liceu')) continue;
      const nn=normalize(name); if(seen.has(nn)) continue;
      await it.click(); await sleep(1900);
      const url=page.url(); const coords=extractCoords(url);
      let phone=null, website=null, address='';
      try{
        const ae=page.locator('button[data-item-id="address"]').first();
        if(await ae.isVisible({timeout:2000}).catch(()=>false)){
          address=(await ae.getAttribute('aria-label').catch(()=>'')||'').replace(/^Adres[ăa]:\s*/i,'').trim();
          if(!address) address=(await ae.textContent()||'').trim();
        }
        const pe=page.locator('[data-item-id^="phone"] .fontBodyMedium, button[data-item-id^="phone"]').first();
        if(await pe.isVisible({timeout:1500}).catch(()=>false)) phone=(await pe.textContent()||'').trim().replace(/\s+/g,'');
        const we=page.locator('a[data-item-id="authority"]').first();
        if(await we.isVisible({timeout:1500}).catch(()=>false)) website=await we.getAttribute('href')||null;
      }catch{}
      if(!validAddress(address)){ SKIP_NOADDR++; log(`  ⏭️  fara adresa: ${name}`); await page.goBack({waitUntil:'domcontentloaded',timeout:10000}).catch(()=>{}); await sleep(1300); continue; }
      if(coords && (coords.lat<44.30||coords.lat>44.60||coords.lng<25.90||coords.lng>26.30)){ await page.goBack({waitUntil:'domcontentloaded',timeout:10000}).catch(()=>{}); await sleep(1300); continue; }
      const fc=coords||{lat:0,lng:0};
      const sector=extractSector(address);
      const ageMin=type==='cresa'?0:3, ageMax=type==='cresa'?3:6;
      const desc=(type==='cresa'?'Cresa':'Gradinita')+' in Bucuresti'+(sector?', Sector '+sector:'')+'. Copii '+ageMin+'-'+ageMax+' ani.';
      const acts=type==='cresa'?'Ingrijire,Somn,Masa,Joaca':'Engleza,Arte,Muzica,Sport,Joaca';
      insert.run(name.trim(), type, address, sector, fc.lat, fc.lng, phone, website, url.split('?')[0], ageMin, ageMax, desc, acts);
      seen.add(nn); added++;
      log(`  ✅ ${name} | ${address} | ${phone||'-'}`);
      await page.goBack({waitUntil:'domcontentloaded',timeout:10000}).catch(()=>{}); await sleep(1600);
    }catch(e){ log('  ✗ '+String(e.message).substring(0,50)); await page.goBack({waitUntil:'domcontentloaded',timeout:10000}).catch(()=>{}); await sleep(900); }
  }
  log(`  → ${added} noi`); return added;
}

async function main(){
  const cartiere=CARTIERE.slice(0,CARTIERE_LIMIT);
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({locale:'ro-RO',userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',viewport:{width:1400,height:900}});
  const page=await ctx.newPage();
  const existing=db.prepare('SELECT name FROM kindergartens').all();
  const seen=new Set(existing.map(e=>normalize(e.name)));
  log(`📦 ${existing.length} gradinite existente | ${cartiere.length} cartiere x ${TEMPLATES.length} tipuri\n`);
  await page.goto('https://www.google.com/maps',{waitUntil:'domcontentloaded',timeout:30000}); await sleep(2800); await dismissConsent(page); await sleep(1200);
  let total=0;
  for(const cartier of cartiere){
    for(const tpl of TEMPLATES){
      try{ total+=await scrapeQuery(page, tpl.t.replace('{c}',cartier), tpl.type, seen); }catch(e){ log('❌ '+String(e.message).substring(0,80)); }
      await sleep(1400);
    }
  }
  await browser.close();
  const g=db.prepare("SELECT COUNT(*) c FROM kindergartens WHERE type='gradinita'").get();
  const c=db.prepare("SELECT COUNT(*) c FROM kindergartens WHERE type='cresa'").get();
  log(`\n✅ NOI: ${total} | sarite fara adresa: ${SKIP_NOADDR} | total: gradinite=${g.c}, crese=${c.c}`);
}
main().catch(e=>{ log('FATAL: '+e.message); process.exit(1); });
