const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'enrich-kindergartens-info.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Pagini comune de vizitat pe fiecare site (program + preturi + optionale, intr-o singura trecere)
const INFO_PATHS = [
  '/', '/program', '/programul-nostru', '/orar', '/orare',
  '/despre', '/despre-noi', '/servicii', '/activitati', '/oferta',
  '/tarife', '/preturi', '/pret', '/costuri', '/abonament', '/abonamente',
  '/inscriere', '/inscrieri', '/contact',
];

const LINK_KEYWORDS = [
  'program', 'orar', 'activitat', 'servicii', 'despre', 'oferta',
  'tarif', 'pret', 'cost', 'abonament', 'inscriere', 'info',
];

async function fetchPage(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.5',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function cleanHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .toLowerCase()
    .trim();
}

function extractTime(str) {
  const m = str.match(/\b(\d{1,2})[:.h](\d{2})\b/);
  if (!m) return null;
  const h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (h < 5 || h > 22 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// Program de gradinita: interval intreaga zi (ex. 07:30-18:00), nu preluare-dupa-scoala ca la afterschool
function extractSchedule(text) {
  let start = null;
  let end = null;

  const programRangeRe = /(?:program|orar|orele?)[:\s]*(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/g;
  let m = programRangeRe.exec(text);
  if (m) {
    start = extractTime(m[1]);
    end = extractTime(m[2]);
  }

  const delaRe = /(?:de la|incepand(?: de la)?|deschidem la)\s+ora\s+(\d{1,2}[:.]\d{2})/;
  m = delaRe.exec(text);
  if (m && !start) start = extractTime(m[1]);

  const panaRe = /(?:pana la|inchidem la|se (?:termina|incheie|inchide))[^.]{0,30}(\d{1,2}[:.]\d{2})/;
  m = panaRe.exec(text);
  if (m && !end) end = extractTime(m[1]);

  if (!start || !end) {
    const simpleRe = /\b(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})\b/g;
    let best = null;
    while ((m = simpleRe.exec(text)) !== null) {
      const t1 = extractTime(m[1]);
      const t2 = extractTime(m[2]);
      if (t1 && t2 && t1 < t2) { best = [t1, t2]; break; }
    }
    if (best) {
      if (!start) start = best[0];
      if (!end) end = best[1];
    }
  }

  return { start, end };
}

const PRICE_PATTERNS = [
  /(\d{3,4})\s*(?:ron|lei)\b/gi,
  /(?:ron|lei)\s*(\d{3,4})\b/gi,
  /(\d{1,2}[.,]\d{3})\s*(?:ron|lei)\b/gi,
  /(\d{3,4})\s*(?:lei|ron)\s*\/?\s*(?:luna|an|zi|saptamana)/gi,
  /(?:pret|tarif|abonament|cost|taxa)[:\s]+(\d{3,4})/gi,
  /de\s+la\s+(\d{3,4})\s*(?:ron|lei)/gi,
  /(\d{3,4})\s*(?:lei|ron)?[^a-z0-9]{0,30}(?:luna|lunar|pe\s+luna)/gi,
];

function extractPrices(text) {
  const prices = new Set();
  for (const pattern of PRICE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1].replace(/[.,]/, '');
      const val = parseInt(raw);
      if (val >= 400 && val <= 6000) prices.add(val);
    }
  }
  return [...prices].sort((a, b) => a - b);
}

// Optionale specifice gradinitelor (vezi KindergartenFilterPanel.tsx ALL_ACTIVITIES)
const KNOWN_ACTIVITIES = [
  'engleza', 'arte', 'pictura', 'desen', 'muzica', 'pian', 'vioara', 'chitara', 'cant',
  'sport', 'inot', 'gimnastica', 'dans', 'balet', 'dans modern', 'dans popular',
  'robotica', 'programare', 'coding', 'logopedie', 'karate', 'judo', 'teatru',
];

const ACTIVITY_LABELS = {
  'engleza': 'Engleza', 'arte': 'Arte', 'pictura': 'Arte', 'desen': 'Arte',
  'muzica': 'Muzica', 'pian': 'Muzica', 'vioara': 'Muzica', 'chitara': 'Muzica', 'cant': 'Muzica',
  'sport': 'Sport', 'inot': 'Inot', 'gimnastica': 'Gimnastica',
  'dans': 'Dans', 'balet': 'Balet', 'dans modern': 'Dans', 'dans popular': 'Dans',
  'robotica': 'Robotica', 'programare': 'Robotica', 'coding': 'Robotica',
  'logopedie': 'Logopedie', 'karate': 'Karate', 'judo': 'Karate', 'teatru': 'Teatru',
};

function extractActivities(text) {
  const found = new Set();
  for (const act of KNOWN_ACTIVITIES) {
    if (text.includes(act)) found.add(ACTIVITY_LABELS[act] || act);
  }
  return [...found];
}

function extractAvailability(text) {
  const fullPatterns = [
    'nu mai (?:sunt|avem|exista) locuri', 'locuri epuizate', 'complet ocupat',
    'lista de asteptare', 'nu mai acceptam', 'capacitate maxima', 'grupe complete',
    'no spots', 'fully booked', 'sold out',
  ];
  for (const p of fullPatterns) {
    if (new RegExp(p).test(text)) return 'full';
  }

  const availablePatterns = [
    'locuri disponibile', 'locuri libere', 'inscrieri deschise', 'inscrie-?te acum',
    'mai sunt locuri', 'locuri ramase', 'rezerva un loc', 'aplica acum', 'mai avem locuri',
    'apply now', 'enroll now', 'register now',
  ];
  for (const p of availablePatterns) {
    if (new RegExp(p).test(text)) return 'available';
  }

  return 'unknown';
}

function extractInternalLinks(html, baseUrl) {
  const links = new Set();
  const re = /href=["']([^"'#?]+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].toLowerCase();
    if (LINK_KEYWORDS.some(k => href.includes(k))) {
      try {
        const full = m[1].startsWith('http') ? m[1] : new URL(m[1], baseUrl).href;
        if (full.startsWith(baseUrl)) links.add(full);
      } catch {}
    }
  }
  return [...links].slice(0, 5);
}

function normalizeUrl(website) {
  let url = website.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  return url.replace(/\/$/, '');
}

async function scrapeWebsite(baseUrl) {
  let programStart = null;
  let programEnd = null;
  const allActivities = new Set();
  const allPrices = new Set();
  let availability = 'unknown';
  const triedUrls = new Set();

  for (const pagePath of INFO_PATHS) {
    const url = baseUrl + pagePath;
    if (triedUrls.has(url)) continue;
    triedUrls.add(url);

    const html = await fetchPage(url);
    if (!html) continue;

    const text = cleanHtml(html);

    if (!programStart || !programEnd) {
      const sched = extractSchedule(text);
      if (sched.start && !programStart) programStart = sched.start;
      if (sched.end && !programEnd) programEnd = sched.end;
    }

    extractActivities(text).forEach(a => allActivities.add(a));
    extractPrices(text).forEach(p => allPrices.add(p));

    if (availability === 'unknown') availability = extractAvailability(text);

    if (pagePath === '/') {
      const extra = extractInternalLinks(html, baseUrl);
      for (const link of extra) {
        if (triedUrls.has(link)) continue;
        triedUrls.add(link);
        await sleep(300);
        const lHtml = await fetchPage(link);
        if (!lHtml) continue;
        const lText = cleanHtml(lHtml);
        if (!programStart || !programEnd) {
          const sched = extractSchedule(lText);
          if (sched.start && !programStart) programStart = sched.start;
          if (sched.end && !programEnd) programEnd = sched.end;
        }
        extractActivities(lText).forEach(a => allActivities.add(a));
        extractPrices(lText).forEach(p => allPrices.add(p));
        if (availability === 'unknown') availability = extractAvailability(lText);
      }
    }

    await sleep(400);
  }

  const prices = [...allPrices].sort((a, b) => a - b);

  return {
    programStart,
    programEnd,
    activities: allActivities.size > 0 ? [...allActivities].join(',') : null,
    priceMin: prices.length > 0 ? prices[0] : null,
    priceMax: prices.length > 0 ? prices[prices.length - 1] : null,
    availability,
  };
}

// Activitati placeholder generice inserate la descoperire (scrape-kindergartens.js /
// scrape-kindergartens-cartier.js) - le suprascriem doar daca gasim ceva real pe site
const PLACEHOLDER_ACTIVITIES = new Set([
  'Ingrijire,Somn,Masa,Joaca',
  'Engleza,Arte,Muzica,Sport,Joaca',
]);

async function main() {
  const rows = db.prepare(
    `SELECT id, name, website, price_min, price_max, activities, availability
     FROM kindergartens
     WHERE website IS NOT NULL AND website != ''
     ORDER BY id`
  ).all();

  log(`Procesez ${rows.length} gradinite/crese cu website...\n`);

  const updateStmt = db.prepare(`
    UPDATE kindergartens
    SET program_start = COALESCE(program_start, ?),
        program_end = COALESCE(program_end, ?),
        program = CASE WHEN program IS NULL OR program = '' THEN COALESCE(?, program) ELSE program END,
        price_min = CASE WHEN price_min IS NULL THEN ? ELSE price_min END,
        price_max = CASE WHEN price_min IS NULL THEN ? ELSE price_max END,
        activities = CASE WHEN activities IS NULL OR activities = '' OR activities IN ('Ingrijire,Somn,Masa,Joaca', 'Engleza,Arte,Muzica,Sport,Joaca') THEN COALESCE(?, activities) ELSE activities END,
        availability = ?
    WHERE id = ?
  `);

  let updatedSchedule = 0;
  let updatedPrice = 0;
  let updatedActivities = 0;
  let foundAvailable = 0;
  let foundFull = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameShort = row.name.substring(0, 35);
    process.stdout.write(`[${i + 1}/${rows.length}] ${nameShort}... `);

    try {
      const baseUrl = normalizeUrl(row.website);
      const info = await scrapeWebsite(baseUrl);
      const programDisplay = (info.programStart && info.programEnd) ? `${info.programStart}-${info.programEnd}` : null;

      const parts = [];
      if (programDisplay) parts.push(`program:${programDisplay}`);
      if (info.priceMin && row.price_min === null) parts.push(`pret:${info.priceMin}${info.priceMax && info.priceMax !== info.priceMin ? `-${info.priceMax}` : ''}`);
      if (info.activities) parts.push(`optionale:${info.activities.split(',').length}`);
      if (info.availability !== 'unknown') parts.push(info.availability === 'available' ? '✅ locuri' : '✗ plin');

      updateStmt.run(
        info.programStart,
        info.programEnd,
        programDisplay,
        info.priceMin,
        info.priceMax === info.priceMin ? null : info.priceMax,
        info.activities,
        info.availability,
        row.id
      );

      if (info.programStart || info.programEnd) updatedSchedule++;
      if (info.priceMin && row.price_min === null) updatedPrice++;
      if (info.activities) updatedActivities++;
      if (info.availability === 'available') foundAvailable++;
      if (info.availability === 'full') foundFull++;

      log(parts.length > 0 ? `✅ ${parts.join(' | ')}` : '— nimic gasit');
    } catch (e) {
      log(`❌ ${e.message?.substring(0, 60)}`);
    }

    await sleep(300);
  }

  log(`\n${'═'.repeat(60)}`);
  log(`Cu program gasit: ${updatedSchedule}`);
  log(`Cu pret nou gasit: ${updatedPrice}`);
  log(`Cu optionale gasite: ${updatedActivities}`);
  log(`Cu locuri disponibile: ${foundAvailable}`);
  log(`Pline: ${foundFull}`);
  log(`Total procesate: ${rows.length}`);
}

main().catch(console.error);
