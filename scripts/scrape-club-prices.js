const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-club-prices.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

// Common pricing/schedule page paths to try
const PAGE_PATHS = [
  '/tarife', '/tarife-servicii', '/tarife-si-servicii',
  '/preturi', '/pret', '/lista-preturi',
  '/servicii', '/serviciile-noastre', '/servicii-si-tarife',
  '/costuri', '/abonament', '/abonamente', '/plan', '/planuri',
  '/inscriere', '/inscrieri', '/cum-ma-inscriu',
  '/program', '/programul-nostru', '/orar', '/orare', '/orarul-cursurilor',
  '/oferta', '/oferte', '/pachete', '/pachete-si-preturi',
  '/despre', '/despre-noi', '/informatii', '/info', '/faq',
  '/contact', '/contactati-ne',
  '/', // homepage
];

const PRICING_LINK_KEYWORDS = ['tarif', 'pret', 'cost', 'abonament', 'inscriere', 'oferta', 'pachet', 'servicii', 'program', 'orar'];

const PRICE_PATTERNS = [
  /(\d{3,4})\s*(?:ron|lei)\b/gi,
  /(?:ron|lei)\s*(\d{3,4})\b/gi,
  /(\d{1,2}[.,]\d{3})\s*(?:ron|lei)\b/gi,
  /(\d{3,4})\s*(?:lei|ron)\s*\/?\s*(?:luna|an|zi|saptamana|sedinta|ora)/gi,
  /(?:pret|tarif|abonament|cost|taxa)[:\s]+(\d{3,4})/gi,
  /de\s+la\s+(\d{3,4})\s*(?:ron|lei)/gi,
  /(\d{3,4})\s*(?:lei|ron)?[^a-z0-9]{0,30}(?:luna|lunar|pe\s+luna|sedinta)/gi,
];

const DAY_WORDS = ['luni', 'marti', 'marţi', 'miercuri', 'joi', 'vineri', 'sambata', 'sâmbătă', 'duminica', 'duminică'];
const TIME_PATTERN = /\b([01]?\d|2[0-3])[:.]\d{2}\b|\bora\s+\d{1,2}\b|\borele\s+\d{1,2}\s*[-–]\s*\d{1,2}\b/i;

// Lines that read like "we're open Mon-Fri 8-22" (facility hours) rather than
// "class runs Tue/Thu 17:00-18:00" (an actual session time) — reject these.
const FACILITY_HOURS_KEYWORDS = [
  'program de functionare', 'program functionare', 'orar de functionare',
  'suntem deschisi', 'deschis de la', 'deschis intre', 'deschis luni', 'deschisi luni',
  'program acces', 'acces bazin', 'program bazin',
];
const MAX_CLASS_SPAN_MINUTES = 300; // 5h — a single kids' session/slot pair shouldn't span more than this

// Matches explicit "HH:MM - HH:MM", "de la HH:MM la HH:MM", "HH:MM până la HH:MM",
// or bare "HH:MM HH:MM" (some sites drop the dash) style ranges — i.e. two times
// separated by nothing but whitespace and, optionally, a connector word. Any other
// text in between (a day name, a bullet, a comma) blocks the match, so unrelated
// single start times for different days aren't mistaken for a range
// (e.g. "Sâmbătă 12:00 · Miercuri 19:40" has "·"+"Miercuri" in between — no match).
const TIME_RANGE_PATTERN = /([01]?\d|2[0-3])[:.]([0-5]\d)\s*(?:[-–—]|\bla\b|\bpân[aă]\s+la\b)?\s*([01]?\d|2[0-3])[:.]([0-5]\d)/gi;

// A line where any explicit time range spans more than MAX_CLASS_SPAN_MINUTES
// looks like facility opening hours (e.g. "8:00-22:00") rather than one
// specific class slot, so we reject it.
function looksLikeSpecificClassTime(line) {
  const lower = line.toLowerCase();
  if (FACILITY_HOURS_KEYWORDS.some((k) => lower.includes(k))) return false;
  TIME_RANGE_PATTERN.lastIndex = 0;
  let m;
  while ((m = TIME_RANGE_PATTERN.exec(line)) !== null) {
    const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    const end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
    if (Math.abs(end - start) > MAX_CLASS_SPAN_MINUTES) return false;
  }
  return true;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function stripToLines(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<(br|p|div|li|tr|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function extractPrices(lines) {
  const clean = lines.join(' ').toLowerCase();
  const prices = new Set();
  for (const pattern of PRICE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(clean)) !== null) {
      const raw = match[1].replace(/[.,]/, '');
      const val = parseInt(raw);
      if (val >= 30 && val <= 3000) prices.add(val); // per-activity prices are much lower than afterschool monthly fees
    }
  }
  const sorted = [...prices].sort((a, b) => a - b);
  if (sorted.length === 0) return sorted;
  // Large multi-location/multi-package sites (e.g. one homepage listing a whole
  // swim-school chain's every branch and tier) can leak a huge min-max spread that
  // isn't a real price range for a single activity. Keep only values within 4x the
  // lowest price found, on the assumption the lowest is this page's actual entry tier.
  const cap = sorted[0] * 4;
  return sorted.filter((p) => p <= cap);
}

function extractSchedule(lines) {
  const hits = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    const hasDay = DAY_WORDS.some((d) => lower.includes(d));
    if (hasDay && TIME_PATTERN.test(lower) && line.length < 200 && looksLikeSpecificClassTime(line)) {
      hits.push(line);
      if (hits.length >= 4) break;
    }
  }
  return hits;
}

function extractPricingLinks(html, baseUrl) {
  const links = new Set();
  const hrefPattern = /href=["']([^"'#?]+)["']/gi;
  let m;
  while ((m = hrefPattern.exec(html)) !== null) {
    const href = m[1];
    const lower = href.toLowerCase();
    if (PRICING_LINK_KEYWORDS.some((k) => lower.includes(k))) {
      try {
        const full = href.startsWith('http') ? href : new URL(href, baseUrl).href;
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

async function fetchPage(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

async function scrapeWebsite(baseUrl) {
  const allPrices = new Set();
  const allSchedule = [];
  const triedUrls = new Set();

  for (const pagePath of PAGE_PATHS) {
    const url = baseUrl + pagePath;
    if (triedUrls.has(url)) continue;
    triedUrls.add(url);

    const html = await fetchPage(url);
    if (!html) continue;

    const lines = stripToLines(html);
    extractPrices(lines).forEach((p) => allPrices.add(p));
    if (allSchedule.length < 4) allSchedule.push(...extractSchedule(lines));

    const havePrice = allPrices.size > 0;
    const haveSchedule = allSchedule.length > 0;
    if (havePrice && haveSchedule && pagePath !== '/') break;

    if (pagePath === '/') {
      const extraLinks = extractPricingLinks(html, baseUrl);
      for (const link of extraLinks) {
        if (triedUrls.has(link)) continue;
        triedUrls.add(link);
        await sleep(300);
        const linkHtml = await fetchPage(link);
        if (!linkHtml) continue;
        const linkLines = stripToLines(linkHtml);
        extractPrices(linkLines).forEach((p) => allPrices.add(p));
        if (allSchedule.length < 4) allSchedule.push(...extractSchedule(linkLines));
        if (allPrices.size > 0 && allSchedule.length > 0) break;
      }
    }

    await sleep(400);
  }

  return {
    prices: [...allPrices].sort((a, b) => a - b),
    schedule: allSchedule.slice(0, 4),
  };
}

async function main() {
  const limit = process.argv[2] ? parseInt(process.argv[2], 10) : null;

  let rows = db.prepare(
    `SELECT id, name, website FROM clubs
     WHERE website IS NOT NULL
       AND website != ''
       AND (price_min IS NULL OR schedule IS NULL OR schedule = '')
     ORDER BY id`
  ).all();

  if (limit) rows = rows.slice(0, limit);

  log(`Procesez ${rows.length} cluburi cu website dar fara pret/program...\n`);

  const update = db.prepare(
    `UPDATE clubs SET
       price_min = COALESCE(?, price_min),
       price_max = COALESCE(?, price_max),
       schedule = COALESCE(?, schedule)
     WHERE id = ?`
  );

  let updatedPrice = 0;
  let updatedSchedule = 0;
  let nothing = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameShort = row.name.substring(0, 40);
    process.stdout.write(`[${i + 1}/${rows.length}] ${nameShort}... `);

    try {
      const baseUrl = normalizeUrl(row.website);
      const { prices, schedule } = await scrapeWebsite(baseUrl);

      const priceMin = prices.length ? prices[0] : null;
      const priceMax = prices.length ? prices[prices.length - 1] : null;
      const uniqueSchedule = [...new Set(schedule.map(s => s.trim()))];
      const scheduleText = uniqueSchedule.length ? uniqueSchedule.join(' | ').substring(0, 500) : null;

      if (!priceMin && !scheduleText) {
        log(`❌ nimic gasit`);
        nothing++;
      } else {
        update.run(priceMin, priceMax === priceMin ? null : priceMax, scheduleText, row.id);
        if (priceMin) { log(`✅ pret ${prices.join(', ')} lei`); updatedPrice++; }
        if (scheduleText) { log(`✅ program: ${scheduleText.substring(0, 80)}`); updatedSchedule++; }
      }
    } catch (e) {
      log(`❌ eroare: ${e.message?.substring(0, 60)}`);
      nothing++;
    }

    await sleep(300);
  }

  log(`\n${'═'.repeat(60)}`);
  log(`Preț găsit: ${updatedPrice}`);
  log(`Program găsit: ${updatedSchedule}`);
  log(`Fără niciun rezultat: ${nothing}`);
  log(`Total procesate: ${rows.length}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { looksLikeSpecificClassTime };
