const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-info.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Pages to visit for each site
const INFO_PATHS = [
  '/', '/program', '/programul-nostru', '/despre', '/despre-noi',
  '/servicii', '/activitati', '/oferta', '/inscriere', '/contact',
];

const PRICING_LINK_KEYWORDS = [
  'program', 'activitat', 'servicii', 'despre', 'oferta', 'inscriere',
  'tarif', 'pret', 'info',
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

// Extract time in HH:MM format from a string
function extractTime(str) {
  const m = str.match(/\b(\d{1,2})[:.h](\d{2})\b/);
  if (!m) return null;
  const h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (h < 6 || h > 22 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function extractSchedule(text) {
  let pickupTime = null;
  let endTime = null;

  // Pattern: "program: HH:MM - HH:MM" or "HH:MM-HH:MM"
  const programRangeRe = /(?:program|orar|orele?)[:\s]*(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/g;
  let m = programRangeRe.exec(text);
  if (m) {
    pickupTime = extractTime(m[1]);
    endTime = extractTime(m[2]);
  }

  // Explicit preluare mentions
  const preluareRe = /preluare[^.]{0,50}(\d{1,2}[:.]\d{2})/;
  m = preluareRe.exec(text);
  if (m) pickupTime = extractTime(m[1]);

  // "de la ora X:XX" or "incepand cu X:XX"
  if (!pickupTime) {
    const delaRe = /(?:de la|incepand(?: de la)?|start|incepe la)\s+ora\s+(\d{1,2}[:.]\d{2})/;
    m = delaRe.exec(text);
    if (m) pickupTime = extractTime(m[1]);
  }

  // "pana la ora X:XX" or "se termina la X:XX"
  const panaRe = /(?:pana la|se (?:termina|incheie|inchide)|inchidere|sfarsit)[^.]{0,30}(\d{1,2}[:.]\d{2})/;
  m = panaRe.exec(text);
  if (m) endTime = extractTime(m[1]);

  // Simple HH:MM-HH:MM anywhere (last resort)
  if (!pickupTime || !endTime) {
    const simpleRe = /\b(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})\b/g;
    let best = null;
    while ((m = simpleRe.exec(text)) !== null) {
      const t1 = extractTime(m[1]);
      const t2 = extractTime(m[2]);
      if (t1 && t2) { best = [t1, t2]; break; }
    }
    if (best) {
      if (!pickupTime) pickupTime = best[0];
      if (!endTime) endTime = best[1];
    }
  }

  return { pickupTime, endTime };
}

const KNOWN_ACTIVITIES = [
  'matematica', 'engleza', 'romana', 'stiinte', 'sport', 'fotbal', 'baschet', 'volei', 'tenis', 'inot',
  'arte', 'pictura', 'desen', 'sculptura', 'muzica', 'pian', 'vioara', 'chitara', 'cant',
  'dans', 'balet', 'teatru', 'robotica', 'programare', 'coding', 'sah', 'lectura', 'gatit',
  'yoga', 'karate', 'judo', 'dans sportiv', 'aerobic', 'origami', 'debate', 'astronomie',
  'experimente', 'chimie', 'fizica', 'biologie', 'limbi straine', 'franceza', 'germana', 'spaniola',
  'teme', 'meditatii', 'dans modern', 'dans popular',
];

const ACTIVITY_LABELS = {
  'matematica': 'Matematica', 'engleza': 'Engleza', 'romana': 'Romana',
  'stiinte': 'Stiinte', 'sport': 'Sport', 'fotbal': 'Fotbal', 'baschet': 'Baschet',
  'volei': 'Volei', 'tenis': 'Tenis', 'inot': 'Inot',
  'arte': 'Arte', 'pictura': 'Pictura', 'desen': 'Desen', 'sculptura': 'Sculptura',
  'muzica': 'Muzica', 'pian': 'Pian', 'vioara': 'Vioara', 'chitara': 'Chitara', 'cant': 'Cant',
  'dans': 'Dans', 'balet': 'Balet', 'teatru': 'Teatru', 'robotica': 'Robotica',
  'programare': 'Programare', 'coding': 'Programare', 'sah': 'Sah', 'lectura': 'Lectura',
  'gatit': 'Gatit', 'yoga': 'Yoga', 'karate': 'Karate', 'judo': 'Judo',
  'origami': 'Origami', 'debate': 'Debate', 'astronomie': 'Astronomie',
  'experimente': 'Experimente', 'chimie': 'Stiinte', 'fizica': 'Stiinte',
  'biologie': 'Stiinte', 'limbi straine': 'Limbi straine', 'franceza': 'Franceza',
  'germana': 'Germana', 'spaniola': 'Spaniola', 'teme': 'Teme', 'meditatii': 'Meditatii',
  'dans modern': 'Dans', 'dans popular': 'Dans', 'aerobic': 'Sport',
  'dans sportiv': 'Dans',
};

function extractActivities(text) {
  const found = new Set();
  for (const act of KNOWN_ACTIVITIES) {
    if (text.includes(act)) {
      found.add(ACTIVITY_LABELS[act] || act);
    }
  }
  // Always add Teme if not already there and we found something
  if (found.size > 0 && !found.has('Teme')) found.add('Teme');
  return [...found];
}

function extractAvailability(text) {
  // Full / no spots
  const fullPatterns = [
    'nu mai (?:sunt|avem|exista) locuri', 'locuri epuizate', 'complet ocupat',
    'lista de asteptare', 'nu mai acceptam', 'capacitate maxima',
    'no spots', 'fully booked', 'sold out',
  ];
  for (const p of fullPatterns) {
    if (new RegExp(p).test(text)) return 'full';
  }

  // Available
  const availablePatterns = [
    'locuri disponibile', 'locuri libere', 'inscrieri deschise', 'inscrie-?te acum',
    'mai sunt locuri', 'locuri ramase', 'rezerva un loc', 'aplica acum',
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
    if (PRICING_LINK_KEYWORDS.some(k => href.includes(k))) {
      try {
        const full = m[1].startsWith('http') ? m[1] : new URL(m[1], baseUrl).href;
        if (full.startsWith(baseUrl)) links.add(full);
      } catch {}
    }
  }
  return [...links].slice(0, 4);
}

function normalizeUrl(website) {
  let url = website.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  return url.replace(/\/$/, '');
}

async function scrapeWebsite(baseUrl) {
  let pickupTime = null;
  let endTime = null;
  const allActivities = new Set();
  let availability = 'unknown';
  const triedUrls = new Set();

  for (const pagePath of INFO_PATHS) {
    const url = baseUrl + pagePath;
    if (triedUrls.has(url)) continue;
    triedUrls.add(url);

    const html = await fetchPage(url);
    if (!html) continue;

    const text = cleanHtml(html);

    // Schedule
    if (!pickupTime || !endTime) {
      const sched = extractSchedule(text);
      if (sched.pickupTime && !pickupTime) pickupTime = sched.pickupTime;
      if (sched.endTime && !endTime) endTime = sched.endTime;
    }

    // Activities
    extractActivities(text).forEach(a => allActivities.add(a));

    // Availability
    if (availability === 'unknown') {
      availability = extractAvailability(text);
    }

    // From homepage, follow relevant internal links
    if (pagePath === '/') {
      const extra = extractInternalLinks(html, baseUrl);
      for (const link of extra) {
        if (triedUrls.has(link)) continue;
        triedUrls.add(link);
        await sleep(300);
        const lHtml = await fetchPage(link);
        if (!lHtml) continue;
        const lText = cleanHtml(lHtml);
        if (!pickupTime || !endTime) {
          const sched = extractSchedule(lText);
          if (sched.pickupTime && !pickupTime) pickupTime = sched.pickupTime;
          if (sched.endTime && !endTime) endTime = sched.endTime;
        }
        extractActivities(lText).forEach(a => allActivities.add(a));
        if (availability === 'unknown') availability = extractAvailability(lText);
      }
    }

    await sleep(400);
  }

  return {
    pickupTime,
    endTime,
    activities: allActivities.size > 0 ? [...allActivities].join(',') : null,
    availability,
  };
}

async function main() {
  // Process all afterschools with a website
  const rows = db.prepare(
    `SELECT id, name, website, pickup_time, end_time, activities, availability FROM afterschools
     WHERE website IS NOT NULL AND website != ''
     ORDER BY id`
  ).all();

  log(`Procesez ${rows.length} afterschool-uri...\n`);

  const updateStmt = db.prepare(`
    UPDATE afterschools
    SET pickup_time = COALESCE(pickup_time, ?),
        end_time = COALESCE(end_time, ?),
        activities = CASE WHEN activities IS NULL OR activities = '' OR activities = 'Teme' THEN COALESCE(?, activities) ELSE activities END,
        availability = ?
    WHERE id = ?
  `);

  let updatedSchedule = 0;
  let updatedActivities = 0;
  let foundAvailable = 0;
  let foundFull = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameShort = row.name.substring(0, 35);
    process.stdout.write(`[${i+1}/${rows.length}] ${nameShort}... `);

    try {
      const baseUrl = normalizeUrl(row.website);
      const info = await scrapeWebsite(baseUrl);

      const parts = [];
      if (info.pickupTime || info.endTime) parts.push(`${info.pickupTime || '?'}-${info.endTime || '?'}`);
      if (info.activities) parts.push(`act:${info.activities.split(',').length}`);
      if (info.availability !== 'unknown') parts.push(info.availability === 'available' ? '✓ locuri' : '✗ plin');

      updateStmt.run(
        info.pickupTime,
        info.endTime,
        info.activities,
        info.availability,
        row.id
      );

      if (info.pickupTime || info.endTime) updatedSchedule++;
      if (info.activities) updatedActivities++;
      if (info.availability === 'available') foundAvailable++;
      if (info.availability === 'full') foundFull++;

      log(parts.length > 0 ? `✅ ${parts.join(' | ')}` : '— nimic gasit');
    } catch (e) {
      log(`❌ ${e.message?.substring(0, 50)}`);
    }

    await sleep(300);
  }

  log(`\n${'═'.repeat(60)}`);
  log(`Cu program (preluare/sfarsit): ${updatedSchedule}`);
  log(`Cu activitati gasite: ${updatedActivities}`);
  log(`Cu locuri disponibile: ${foundAvailable}`);
  log(`Pline: ${foundFull}`);
  log(`Total procesate: ${rows.length}`);
}

main().catch(console.error);
