/**
 * scrape-all.js — Verificare periodica completa a tuturor afterschool-urilor
 *
 * Mod de rulare:
 *   - Saptamanal: verifica disponibilitate + orar pentru TOATE
 *   - Lunar:      verifica si preturi (doar daca nu au pret sau daca a trecut >30 zile)
 *
 * Folosit de cron: node /path/to/scripts/scrape-all.js >> /path/to/data/scrape-all.log 2>&1
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-all.log');

const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' }); // append
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── HTTP ────────────────────────────────────────────────────────────────────

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

function normalizeUrl(website) {
  let url = website.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  return url.replace(/\/$/, '');
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

// ─── DISPONIBILITATE ─────────────────────────────────────────────────────────

function extractAvailability(text) {
  const fullPatterns = [
    'nu mai (?:sunt|avem|exista) locuri', 'locuri epuizate', 'complet ocupat',
    'lista de asteptare', 'nu mai acceptam', 'capacitate maxima',
    'no spots', 'fully booked', 'sold out',
  ];
  for (const p of fullPatterns) {
    if (new RegExp(p).test(text)) return 'full';
  }
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

// ─── PRETURI ─────────────────────────────────────────────────────────────────

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
    let m;
    while ((m = pattern.exec(text)) !== null) {
      const val = parseInt(m[1].replace(/[.,]/, ''));
      if (val >= 200 && val <= 6000) prices.add(val);
    }
  }
  return [...prices].sort((a, b) => a - b);
}

// ─── ORAR ─────────────────────────────────────────────────────────────────────

function extractTime(str) {
  const m = str.match(/\b(\d{1,2})[:.h](\d{2})\b/);
  if (!m) return null;
  const h = parseInt(m[1]), min = parseInt(m[2]);
  if (h < 6 || h > 22 || min > 59) return null;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}

function extractSchedule(text) {
  let pickupTime = null, endTime = null;
  const rangeRe = /(?:program|orar|orele?)[:\s]*(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/g;
  let m = rangeRe.exec(text);
  if (m) { pickupTime = extractTime(m[1]); endTime = extractTime(m[2]); }
  if (!pickupTime) {
    m = /preluare[^.]{0,50}(\d{1,2}[:.]\d{2})/.exec(text);
    if (m) pickupTime = extractTime(m[1]);
  }
  if (!endTime) {
    m = /(?:pana la|se (?:termina|incheie)|inchidere)[^.]{0,30}(\d{1,2}[:.]\d{2})/.exec(text);
    if (m) endTime = extractTime(m[1]);
  }
  if (!pickupTime || !endTime) {
    const simple = /\b(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})\b/g;
    while ((m = simple.exec(text)) !== null) {
      const t1 = extractTime(m[1]), t2 = extractTime(m[2]);
      if (t1 && t2) { if (!pickupTime) pickupTime = t1; if (!endTime) endTime = t2; break; }
    }
  }
  return { pickupTime, endTime };
}

// ─── PAGINI DE VERIFICAT ──────────────────────────────────────────────────────

const CHECK_PATHS = ['/', '/tarife', '/preturi', '/servicii', '/inscriere', '/program', '/despre'];
const PRICING_PATHS = [
  '/tarife', '/tarife-servicii', '/preturi', '/pret', '/servicii',
  '/abonament', '/abonamente', '/oferta', '/pachete', '/inscriere',
];

async function scrapeAvailability(baseUrl) {
  for (const p of CHECK_PATHS) {
    const html = await fetchPage(baseUrl + p);
    if (!html) continue;
    const av = extractAvailability(cleanHtml(html));
    if (av !== 'unknown') return av;
    await sleep(300);
  }
  return 'unknown';
}

async function scrapePrices(baseUrl) {
  const allPrices = new Set();
  for (const p of PRICING_PATHS) {
    const html = await fetchPage(baseUrl + p);
    if (!html) { await sleep(200); continue; }
    const prices = extractPrices(cleanHtml(html));
    prices.forEach(v => allPrices.add(v));
    if (prices.length > 0) break;
    await sleep(300);
  }
  return [...allPrices].sort((a, b) => a - b);
}

async function scrapeSchedule(baseUrl) {
  for (const p of ['/', '/program', '/despre', '/servicii']) {
    const html = await fetchPage(baseUrl + p);
    if (!html) continue;
    const sched = extractSchedule(cleanHtml(html));
    if (sched.pickupTime || sched.endTime) return sched;
    await sleep(300);
  }
  return { pickupTime: null, endTime: null };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function setSetting(key, value) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}
function getSetting(key) {
  return db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value;
}

async function main() {
  const now = Date.now();
  const oneMonth = 30 * 24 * 60 * 60 * 1000;

  const rows = db.prepare(`
    SELECT id, name, website, price_min, pickup_time, end_time, availability, last_checked
    FROM afterschools
    WHERE website IS NOT NULL AND website != ''
    ORDER BY last_checked ASC NULLS FIRST
  `).all();

  // Initializeaza progresul in DB
  setSetting('cron_running', 'true');
  setSetting('cron_stop_requested', 'false');
  setSetting('cron_progress', '0');
  setSetting('cron_total', rows.length.toString());

  log(`\n${'═'.repeat(65)}`);
  log(`[${new Date().toLocaleString('ro-RO')}] Verificare periodica — ${rows.length} afterschool-uri`);
  log('═'.repeat(65));

  const updateFull = db.prepare(`
    UPDATE afterschools
    SET availability = ?, price_min = COALESCE(?, price_min), price_max = COALESCE(?, price_max),
        pickup_time = COALESCE(?, pickup_time), end_time = COALESCE(?, end_time),
        last_checked = ?
    WHERE id = ?
  `);

  const updateAvail = db.prepare(`
    UPDATE afterschools SET availability = ?, last_checked = ? WHERE id = ?
  `);

  let changedAvail = 0, changedPrice = 0, changedSchedule = 0, errors = 0;

  for (let i = 0; i < rows.length; i++) {
    // Verifica daca s-a cerut oprirea
    if (getSetting('cron_stop_requested') === 'true') {
      log(`\n⛔ Verificare oprita manual la ${i}/${rows.length}`);
      break;
    }

    const row = rows[i];
    const nameShort = row.name.substring(0, 38);
    const needsFullCheck = !row.last_checked || (now - row.last_checked) > oneMonth;

    process.stdout.write(`[${i+1}/${rows.length}] ${nameShort}... `);

    try {
      const baseUrl = normalizeUrl(row.website);
      const changes = [];

      if (needsFullCheck) {
        const [availability, prices, schedule] = await Promise.all([
          scrapeAvailability(baseUrl),
          scrapePrices(baseUrl),
          scrapeSchedule(baseUrl),
        ]);

        const newPriceMin = prices.length > 0 ? prices[0] : null;
        const newPriceMax = prices.length > 0 ? prices[prices.length - 1] : null;

        if (availability !== row.availability) { changes.push(`disponibilitate: ${row.availability}→${availability}`); changedAvail++; }
        if (newPriceMin && newPriceMin !== row.price_min) { changes.push(`pret: ${row.price_min ?? '?'}→${newPriceMin}`); changedPrice++; }
        if (schedule.pickupTime && schedule.pickupTime !== row.pickup_time) { changes.push(`preluare: ${row.pickup_time ?? '?'}→${schedule.pickupTime}`); changedSchedule++; }

        updateFull.run(availability, newPriceMin, newPriceMax, schedule.pickupTime, schedule.endTime, now, row.id);
        log(changes.length > 0 ? `✏️  ${changes.join(' | ')}` : `✓ neschimbat (full)`);
      } else {
        const availability = await scrapeAvailability(baseUrl);
        if (availability !== row.availability) { changes.push(`disponibilitate: ${row.availability}→${availability}`); changedAvail++; }
        updateAvail.run(availability, now, row.id);
        log(changes.length > 0 ? `✏️  ${changes.join(' | ')}` : `✓ neschimbat`);
      }
    } catch (e) {
      log(`❌ ${e.message?.substring(0, 60)}`);
      errors++;
    }

    // Actualizeaza progresul in DB
    setSetting('cron_progress', (i + 1).toString());
    await sleep(400);
  }

  log(`\n${'─'.repeat(65)}`);
  log(`Modificari disponibilitate: ${changedAvail}`);
  log(`Modificari pret:            ${changedPrice}`);
  log(`Modificari orar:            ${changedSchedule}`);
  log(`Erori:                      ${errors}`);
  log('═'.repeat(65) + '\n');

  setSetting('cron_running', 'false');
  setSetting('cron_stop_requested', 'false');
}

main().catch(e => {
  log(`EROARE FATALA: ${e.message}`);
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cron_running', 'false')").run();
  process.exit(1);
});
