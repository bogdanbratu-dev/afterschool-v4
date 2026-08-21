// Crawler Google Search pentru COLABORATORI care vin la afterschool-uri
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const db = new Database(path.join(__dirname,'..','data','afterschool.db'));

const DOMAIN = process.argv[2];
const logStream = fs.createWriteStream(path.join(__dirname,'..','data',`scrape-google-collab-${DOMAIN}.log`),{flags:'w'});
function log(...a){ const l=a.join(' '); console.log(l); logStream.write(l+'\n'); }

const CFG = {
  limbi_straine: [
    'profesor engleza afterschool Bucuresti',
    'instructor engleza copii afterschool Bucuresti',
    'profesor franceza copii afterschool Bucuresti',
    'tutor engleza copii acasa Bucuresti',
    'profesor germana copii Bucuresti',
  ],
  muzica: [
    'profesor pian afterschool Bucuresti',
    'instructor muzica copii afterschool Bucuresti',
    'lectii chitara copii afterschool Bucuresti',
    'profesor canto copii Bucuresti afterschool',
    'instructor instrumente muzicale copii Bucuresti',
  ],
  dans: [
    'profesor dans afterschool Bucuresti',
    'instructor dans copii afterschool Bucuresti',
    'curs balet copii afterschool Bucuresti',
    'instructor dans modern copii Bucuresti',
  ],
  sah: [
    'profesor sah afterschool Bucuresti',
    'instructor sah copii afterschool Bucuresti',
    'curs sah copii afterschool Bucuresti',
    'antrenor sah pentru afterschool Bucuresti',
    'club sah copii Bucuresti afterschool',
  ],
  robotica: [
    'instructor robotica afterschool Bucuresti',
    'profesor programare copii afterschool Bucuresti',
    'cursuri coding copii afterschool Bucuresti',
    'atelier robotica copii Bucuresti afterschool',
    'curs scratch programare copii Bucuresti',
  ],
  arta: [
    'profesor desen afterschool Bucuresti',
    'instructor arte plastice afterschool Bucuresti',
    'atelier pictura copii afterschool Bucuresti',
    'curs desen copii Bucuresti afterschool',
  ],
  teatru: [
    'instructor teatru copii afterschool Bucuresti',
    'atelier teatru copii Bucuresti afterschool',
    'curs actorie copii afterschool Bucuresti',
  ],
  sport_indoor: [
    'instructor karate copii afterschool Bucuresti',
    'antrenor arte martiale copii afterschool Bucuresti',
    'instructor judo copii afterschool Bucuresti',
    'curs sport copii afterschool Bucuresti',
  ],
  yoga: [
    'instructor yoga copii afterschool Bucuresti',
    'curs yoga copii Bucuresti afterschool',
    'mindfulness copii afterschool Bucuresti',
  ],
  gatit: [
    'atelier gatit copii afterschool Bucuresti',
    'curs culinar copii afterschool Bucuresti',
    'instructor culinar copii Bucuresti',
  ],
  terapie: [
    'terapeut ABA afterschool Bucuresti',
    'terapeut ocupational copii Bucuresti afterschool',
    'integrare senzoriala copii afterschool Bucuresti',
    'terapeut comportamental copii Bucuresti',
  ],
  logopedie: [
    'logoped afterschool Bucuresti',
    'logoped copii la domiciliu Bucuresti',
    'logoped pentru afterschool Bucuresti',
    'curs logopedic copii Bucuresti',
  ],
  psihologie: [
    'psiholog copii afterschool Bucuresti',
    'psiholog scolar Bucuresti afterschool',
    'consilier educational copii afterschool Bucuresti',
  ],
  soroban: [
    'instructor soroban afterschool Bucuresti',
    'curs soroban copii afterschool Bucuresti',
    'aritmetica mentala copii afterschool Bucuresti',
    'instructor aritmetica mentala Bucuresti afterschool',
  ],
  lectura: [
    'instructor lectura copii afterschool Bucuresti',
    'club lectura copii afterschool Bucuresti',
    'atelier lectura copii Bucuresti afterschool',
  ],
  caligrafie: [
    'profesor caligrafie copii afterschool Bucuresti',
    'atelier caligrafie copii Bucuresti afterschool',
    'cursuri scriere frumoasa copii afterschool Bucuresti',
  ],
  stiinte: [
    'experimente stiintifice copii afterschool Bucuresti',
    'instructor STEM copii afterschool Bucuresti',
    'atelier stiinte copii Bucuresti afterschool',
    'curs chimie fizica distractiva copii Bucuresti',
  ],
  foto_video: [
    'atelier foto copii afterschool Bucuresti',
    'curs fotografie copii afterschool Bucuresti',
    'instructor foto video copii Bucuresti afterschool',
  ],
  educatie_financiara: [
    'educatie financiara copii afterschool Bucuresti',
    'curs bani economii copii afterschool Bucuresti',
    'instructor finante personale copii Bucuresti',
  ],
  personal_afterschool: [
    'educator afterschool Bucuresti disponibil',
    'tutore copii afterschool Bucuresti',
    'supraveghetor copii afterschool Bucuresti',
  ],
};

if (!DOMAIN || !CFG[DOMAIN]) { console.error('Domenii:', Object.keys(CFG).join(', ')); process.exit(1); }

const SKIP_DOMAINS = [
  'olx.ro','anunturi.ro','publi24.ro','facebook.com','youtube.com','instagram.com',
  'tiktok.com','wikipedia.org','lajobs.ro',
  'google.com','maps.google','activkids.ro','after-school','afterschool',
  'autovit.ro','storia.ro','imobiliare.ro','titirez.ro','didactic.ro',
  'duckduckgo.com',
];

function normalize(n){ return n.toLowerCase().replace(/[ăâ]/g,'a').replace(/[îí]/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t').replace(/[^a-z0-9]/g,''); }
function extractPhone(text){ const m=text.match(/(?:\+40|0040|0)[0-9\s\-\.]{8,12}/g); if(!m)return null; return m.map(p=>p.replace(/[\s\-\.]/g,'')).find(p=>p.length>=10)||null; }
function extractEmail(text){ const m=text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/); return m?m[0].toLowerCase():null; }
function extractName(url, title) {
  return title.replace(/[\|\-–]\s*(bucuresti|contact|despre|home|acasa|afterschool).*/i,'').trim().substring(0,80);
}

const insert = db.prepare(`INSERT INTO professionals (name,category,kind,address,sector,lat,lng,coverage_area,phone,email,website,description,availability,online_available,home_service,is_premium,is_featured,contacts_hidden) VALUES (?,?,'independent',NULL,NULL,0,0,'Bucuresti',?,?,?,?,'unknown',0,1,0,0,0)`);

async function searchGoogle(page, query, seen) {
  log(`\n🔍 Bing: "${query}"`);
  const url = 'https://www.bing.com/search?q=' + encodeURIComponent(query) + '&cc=RO&setlang=ro-RO&count=10';
  try {
    await page.goto(url, {waitUntil:'domcontentloaded', timeout:20000});
    await page.waitForTimeout(2000);
  } catch(e) { log('  nav err: '+e.message.slice(0,60)); return 0; }

  const results = await page.evaluate(() => {
    const links = [];
    // Bing organic results: li.b_algo h2 a
    document.querySelectorAll('li.b_algo h2 a, li.b_algo .b_title a').forEach(a => {
      const href = a.href;
      const title = a.textContent?.trim() || '';
      if (href && title && title.length > 3 && href.startsWith('http') && !href.includes('bing.com') && !href.includes('microsoft.com')) {
        links.push({href, title});
      }
    });
    return links.slice(0, 12);
  });

  log(`  ${results.length} rezultate Google`);
  let added = 0;

  for (const res of results) {
    try {
      const domain = new URL(res.href).hostname.replace('www.','');
      if (SKIP_DOMAINS.some(d => domain.includes(d))) continue;

      const name = extractName(res.href, res.title);
      if (!name || name.length < 4) continue;
      const nn = normalize(name);
      if (seen.has(nn)) continue;

      let phone = null, email = null, desc = '';
      try {
        await page.goto(res.href, {waitUntil:'domcontentloaded', timeout:12000});
        await page.waitForTimeout(1500);
        const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(()=>'');
        const bodyHtml = await page.evaluate(() => document.body?.innerHTML || '').catch(()=>'');
        phone = extractPhone(bodyText) || (() => { const m = bodyHtml.match(/href="tel:([^"]+)"/); return m?m[1]:null; })();
        email = extractEmail(bodyText) || (() => { const m = bodyHtml.match(/href="mailto:([^"]+)"/); return m?m[1]:null; })();
        const paras = bodyText.split(/\n+/).map(p=>p.trim()).filter(p=>p.length>40);
        desc = paras.slice(0,3).join(' ').substring(0,400);
      } catch(e) { desc = ''; }

      if (!desc) desc = res.title.substring(0, 200);
      insert.run(name, DOMAIN, phone, email, res.href, desc.substring(0,400));
      seen.add(nn); added++;
      log(`  ✅ ${name} | ${phone||'no tel'} | ${email||'no email'} | ${domain}`);
      await page.waitForTimeout(1500);
    } catch(e) { log(`  ⚠ ${e.message.slice(0,60)}`); }
  }

  await page.waitForTimeout(3000);
  log(`  → ${added} noi`);
  return added;
}

async function main() {
  const browser = await chromium.launch({headless:true});
  const ctx = await browser.newContext({
    locale:'ro-RO',
    userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport:{width:1366,height:768}
  });
  const page = await ctx.newPage();
  const seen = new Set(db.prepare('SELECT name FROM professionals').all().map(e=>normalize(e.name)));
  log(`📦 Google collab domeniu=${DOMAIN} | ${seen.size} existenti`);

  let total = 0;
  for (const q of CFG[DOMAIN]) {
    try { total += await searchGoogle(page, q, seen); } catch(e) { log('❌ '+e.message.slice(0,80)); }
    await page.waitForTimeout(4000);
  }

  await browser.close();
  const cnt = db.prepare("SELECT COUNT(*) as c FROM professionals WHERE category=? AND kind='independent'").get(DOMAIN);
  log(`\n✅ [google-collab ${DOMAIN}] NOI: ${total} | total independenti: ${cnt.c}`);
}

main().catch(e=>{ log('FATAL: '+e.message); process.exit(1); });
