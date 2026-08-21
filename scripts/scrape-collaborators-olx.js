// Crawler OLX pentru COLABORATORI INDEPENDENTI (kind=independent).
// Model: zona acoperita (coverage_area) + sector, FARA adresa stradala (persoanele se deplaseaza).
// Telefon best-effort (click "Arata numarul"); daca nu, pastram link-ul OLX ca website.
// Utilizare: node scrape-collaborators-olx.js <domeniu> [nr_query]
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const db = new Database(DB_PATH);

const DOMAIN = process.argv[2];
const LOG_PATH = path.join(__dirname, '..', 'data', `scrape-olx-${DOMAIN}.log`);
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...a){ const l=a.join(' '); console.log(l); logStream.write(l+'\n'); }

const CFG = {
  // -------- domeniile din Maps (institutii) - echivalent independent --------
  limbi_straine: ['profesor engleza particular bucuresti','profesor franceza particular bucuresti','profesor germana copii bucuresti','tutor limbi straine copii'],
  robotica: ['instructor robotica copii bucuresti','profesor programare copii bucuresti','mentor coding copii bucuresti'],
  sah: ['profesor sah particular bucuresti','instructor sah copii bucuresti','antrenor sah junior'],
  soroban: ['instructor soroban bucuresti','profesor abac mental copii','instructor aritmetica mentala'],
  stiinte: ['instructor stiinte copii bucuresti','profesor experimente copii','educator STEM copii bucuresti'],
  educatie_financiara: ['educator financiar copii bucuresti','instructor educatie financiara tineri'],
  lectura: ['animator club lectura copii','instructor lectura copii bucuresti'],
  caligrafie: ['profesor caligrafie bucuresti','instructor scriere frumoasa copii'],
  muzica: ['profesor pian particular bucuresti','profesor chitara copii bucuresti','profesor canto particular'],
  arta: ['profesor desen copii bucuresti','instructor arte plastice copii','pictor instructor copii'],
  teatru: ['instructor teatru copii bucuresti','profesor teatru si actorie copii'],
  dans: ['profesor dans particular bucuresti','instructor dans copii bucuresti','coregraf copii'],
  public_speaking: ['trainer public speaking copii bucuresti','instructor dezbateri tineri','coach comunicare copii'],
  sport_indoor: ['instructor fitness copii bucuresti','antrenor sport copii particular','instructor karate copii bucuresti'],
  yoga: ['instructor yoga copii bucuresti','profesor mindfulness copii','instructor meditatie copii'],
  dezvoltare_personala: ['coach dezvoltare personala copii bucuresti','formator inteligenta emotionala copii'],
  gatit: ['instructor gatit copii bucuresti','chef atelier culinar copii','instructor cofetarie copii'],
  terapie: ['terapeut ABA copii particular bucuresti','kinetoterapeut copii la domiciliu','terapeut ocupational copii'],
  foto_video: ['fotograf evenimente copii bucuresti','videograf nunta botez bucuresti','fotograf particular copii'],
  // -------- categorii cu prezenta independenta dar fara echivalent Maps --------
  logopedie: ['logoped independent bucuresti','logoped la domiciliu copii','logoped particular bucuresti'],
  psihologie: ['psiholog copii particular bucuresti','consilier educational independent','psiholog scolar la domiciliu'],
  // -------- personal necesar in afterschool-uri --------
  personal_afterschool: ['educator afterschool bucuresti','supraveghetor copii dupa scoala','tutore copii particular','ingrijitor copii program afterschool','animator copii afterschool bucuresti'],
};
if (!DOMAIN || !CFG[DOMAIN]) { console.error('Domenii OLX:', Object.keys(CFG).join(', ')); process.exit(1); }

const SECTORE_ZONE = { // cartier -> sector (aproximativ, pt. extragere sector din zona)
  'militari':6,'drumul taberei':6,'ghencea':6,'crangasi':6,'giulesti':6,
  'berceni':4,'giurgiului':4,'rahova':5,'ferentari':5,'cotroceni':5,'13 septembrie':5,
  'titan':3,'dristor':3,'vitan':3,'balta alba':3,
  'colentina':2,'pantelimon':2,'obor':2,'tei':2,'iancului':2,
  'floreasca':1,'dorobanti':1,'aviatorilor':1,'baneasa':1,'domenii':1,'victoriei':1,'romana':1,'pipera':1,'bucurestii noi':1,
};
function zoneToSector(z){ if(!z)return null; const zl=z.toLowerCase(); const m=zl.match(/sector\s*([1-6])/); if(m)return parseInt(m[1]); for(const[k,v]of Object.entries(SECTORE_ZONE)){ if(zl.includes(k))return v; } return null; }

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function normalize(n){ return n.toLowerCase().replace(/[ăâ]/g,'a').replace(/[îí]/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t').replace(/[^a-z0-9]/g,''); }


// Cuvinte care indica anunt de VANZARE PRODUSE (nu colaborator)
const JUNK_PATTERNS = [
  /anvelope/i, /cauciucuri/i, /garantie \d+ ani/i,
  /transportul se efectueaza/i, /livrare prin curier/i,
  /vand /i, /de vanzare/i, /tractiune/i, /second.?hand/i,
  /apartament/i, /inchiriez/i, /auto /i, /piese auto/i,
  /angaj(ez|am|are|ari)/i, /caut job/i, /salariu/i,
  /muncitor/i, /constructor/i, /instalator/i, /electrician/i,
  /sofer/i, /depozit/i, /curatenie/i, /hotess/i, /brand ambassador/i,
  /gestionar/i, /fitofarmacie/i, /florarie/i, /parcauto/i, /parc auto/i,
  /vanzari produse/i, /agent (de )?vanzari/i, /reprezentant vanzari/i,
  /ingrijitor animale/i, /zootehnie/i,
];
// Minim un marker profesional educatie/terapie trebuie sa apara
const PROFESSIONAL_MARKERS = [
  /profesor/i, /instructor/i, /antrenor/i, /tutore?/i, /meditati/i,
  /curs(uri)?/i, /lectii/i, /ore particul/i, /particular/i,
  /coach/i, /terapeut/i, /logoped/i, /psiholog/i,
  /predau/i, /ofer (lectii|cursuri|servicii)/i,
  /experienta cu copii/i, /lucrez cu copii/i, /lucrez cu elevi/i,
  /tai chi/i, /soroban/i, /sah/i, /robotica/i,
];

function isRelevantListing(title, desc) {
  const text = (title + ' ' + desc).toLowerCase();
  for (const p of JUNK_PATTERNS) {
    if (p.test(text)) return false;
  }
  for (const p of PROFESSIONAL_MARKERS) {
    if (p.test(text)) return true;
  }
  return false;
}

const insert = db.prepare(`
  INSERT INTO professionals (name, category, kind, address, sector, lat, lng, coverage_area, phone, email, website, description, availability, online_available, home_service, is_premium, is_featured, contacts_hidden)
  VALUES (?, ?, 'independent', NULL, ?, 0, 0, ?, ?, NULL, ?, ?, 'unknown', 0, 1, 0, 0, 0)
`);

async function scrapeQuery(page, query, seen){
  const slug = query.replace(/\s+/g,'-');
  log(`\n🔍 OLX "${query}"`);
  await page.goto('https://www.olx.ro/oferte/q-'+encodeURIComponent(slug)+'/',{waitUntil:'domcontentloaded',timeout:35000});
  await sleep(3500);
  // colecteaza carduri
  const cards = await page.locator('[data-cy="l-card"]').all();
  log(`  ${cards.length} carduri`);
  const leads = [];
  for(const c of cards.slice(0,40)){
    try{
      const title=(await c.locator('h4, h6').first().textContent({timeout:2000}).catch(()=>''))||'';
      const href=await c.locator('a').first().getAttribute('href').catch(()=>null);
      const loc=(await c.locator('[data-testid="location-date"]').first().textContent({timeout:1500}).catch(()=>''))||'';
      if(title && href) leads.push({ title:title.trim(), href: href.startsWith('http')?href:'https://www.olx.ro'+href, zone: loc.split(' - ')[0].trim() });
    }catch{}
  }
  let added=0;
  for(const ld of leads){
    const nn=normalize(ld.title);
    if(seen.has(nn)) continue;
    // deschide detaliu pt telefon
    let phone=null, desc='';
    try{
      await page.goto(ld.href,{waitUntil:'domcontentloaded',timeout:30000});
      await sleep(2500);
      desc=(await page.locator('[data-cy="ad_description"]').first().textContent({timeout:2500}).catch(()=>''))||'';
      const btn=page.locator('button:has-text("Arată numărul"), [data-testid="show-phone"]').first();
      if(await btn.isVisible({timeout:2500}).catch(()=>false)){
        await btn.click().catch(()=>{}); await sleep(2000);
        const tel=await page.locator('a[href^="tel:"]').first().getAttribute('href').catch(()=>null);
        if(tel) phone=tel.replace('tel:','').replace(/\s+/g,'');
      }
    }catch{}
    const sector=zoneToSector(ld.zone);
    const cov = ld.zone || 'Bucuresti';
    desc = (desc||'').replace(/\s+/g,' ').trim().substring(0,400) || `${ld.title} - colaborator independent in Bucuresti.`;
    if (!isRelevantListing(ld.title, desc)) {
      log(`  ↷ skip (junk/produs): ${ld.title.substring(0,50)}`);
      continue;
    }
    insert.run(ld.title, DOMAIN, sector, cov, phone, ld.href, desc);
    seen.add(nn); added++;
    log(`  ✅ ${ld.title} | zona:${cov} | ${phone||'(fara tel, link OLX)'}`);
    await sleep(1200);
  }
  log(`  → ${added} noi`); return added;
}

async function main(){
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({locale:'ro-RO',userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',viewport:{width:1400,height:900}});
  const page=await ctx.newPage();
  const existing=db.prepare('SELECT name FROM professionals').all();
  const seen=new Set(existing.map(e=>normalize(e.name)));
  log(`📦 OLX domeniu=${DOMAIN} | ${existing.length} existenti\n`);
  let total=0;
  for(const q of CFG[DOMAIN]){ try{ total+=await scrapeQuery(page,q,seen); }catch(e){ log('❌ '+String(e.message).substring(0,80)); } await sleep(2000); }
  await browser.close();
  const cnt=db.prepare("SELECT COUNT(*) as c FROM professionals WHERE category=? AND kind='independent'").get(DOMAIN);
  log(`\n✅ [OLX ${DOMAIN}] NOI: ${total} | total independenti in categorie: ${cnt.c}`);
}
main().catch(e=>{ log('FATAL: '+e.message); process.exit(1); });
