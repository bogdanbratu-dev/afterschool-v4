const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'scrape-prices.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

// Common pricing page paths to try
const PRICE_PATHS = [
  '/tarife', '/tarife-servicii', '/tarife-si-servicii', '/tarife-afterschool',
  '/preturi', '/pret', '/lista-preturi', '/pret-afterschool',
  '/servicii', '/serviciile-noastre', '/servicii-si-tarife',
  '/costuri', '/abonament', '/abonamente', '/plan', '/planuri',
  '/inscriere', '/inscrieri', '/cum-ma-inscriu',
  '/program', '/programul-nostru', '/orare',
  '/oferta', '/oferte', '/pachete', '/pachete-si-preturi',
  '/despre', '/despre-noi', '/informatii', '/info', '/faq',
  '/contact', '/contactati-ne',
  '/', // homepage
];

// Keywords in links that suggest a pricing page
const PRICING_LINK_KEYWORDS = [
  'tarif', 'pret', 'cost', 'abonament', 'inscriere', 'oferta', 'pachet', 'servicii', 'program',
];

// Regex patterns to extract prices in RON/LEI
const PRICE_PATTERNS = [
  // "1500 lei" / "1500 ron"
  /(\d{3,4})\s*(?:ron|lei)\b/gi,
  /(?:ron|lei)\s*(\d{3,4})\b/gi,
  // "1.500 lei" or "1,500 lei" (Romanian thousands separator)
  /(\d{1,2}[.,]\d{3})\s*(?:ron|lei)\b/gi,
  // "1500 lei/luna"
  /(\d{3,4})\s*(?:lei|ron)\s*\/?\s*(?:luna|an|zi|saptamana)/gi,
  // "pret: 1500" / "tarif: 1500" / "abonament: 1500"
  /(?:pret|tarif|abonament|cost|taxa)[:\s]+(\d{3,4})/gi,
  // "de la 1500" / "incepand de la 1500"
  /de\s+la\s+(\d{3,4})\s*(?:ron|lei)/gi,
  // Just "1500" near "luna" within 30 chars
  /(\d{3,4})\s*(?:lei|ron)?[^a-z0-9]{0,30}(?:luna|lunar|pe\s+luna)/gi,
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractPrices(html) {
  const clean = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .toLowerCase();

  const prices = new Set();

  for (const pattern of PRICE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(clean)) !== null) {
      // Handle "1.500" or "1,500" format
      const raw = match[1].replace(/[.,]/, '');
      const val = parseInt(raw);
      // Reasonable afterschool price range: 200-6000 lei/month
      if (val >= 200 && val <= 6000) {
        prices.add(val);
      }
    }
  }

  return [...prices].sort((a, b) => a - b);
}

// Extract internal links from HTML that might lead to pricing pages
function extractPricingLinks(html, baseUrl) {
  const links = new Set();
  const hrefPattern = /href=["']([^"'#?]+)["']/gi;
  let m;
  while ((m = hrefPattern.exec(html)) !== null) {
    const href = m[1];
    const lower = href.toLowerCase();
    if (PRICING_LINK_KEYWORDS.some(k => lower.includes(k))) {
      try {
        const full = href.startsWith('http') ? href : new URL(href, baseUrl).href;
        // Only follow same-domain links
        if (full.startsWith(baseUrl)) {
          links.add(full);
        }
      } catch {}
    }
  }
  return [...links].slice(0, 5); // max 5 extra links to follow
}

function normalizeUrl(website) {
  let url = website.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  // Remove trailing slash
  url = url.replace(/\/$/, '');
  return url;
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
    const text = await res.text();
    return text;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function scrapeWebsiteForPrices(baseUrl) {
  const allPrices = new Set();
  const triedUrls = new Set();

  // Step 1: try standard paths
  for (const pagePath of PRICE_PATHS) {
    const url = baseUrl + pagePath;
    if (triedUrls.has(url)) continue;
    triedUrls.add(url);

    const html = await fetchPage(url);
    if (!html) continue;

    const prices = extractPrices(html);
    prices.forEach(p => allPrices.add(p));

    // If we found prices on a dedicated pricing page, done
    if (prices.length > 0 && pagePath !== '/') {
      return [...allPrices].sort((a, b) => a - b);
    }

    // From homepage, also collect internal pricing links to follow
    if (pagePath === '/') {
      const extraLinks = extractPricingLinks(html, baseUrl);
      for (const link of extraLinks) {
        if (triedUrls.has(link)) continue;
        triedUrls.add(link);
        await sleep(300);
        const linkHtml = await fetchPage(link);
        if (!linkHtml) continue;
        const linkPrices = extractPrices(linkHtml);
        linkPrices.forEach(p => allPrices.add(p));
        if (linkPrices.length > 0) {
          return [...allPrices].sort((a, b) => a - b);
        }
      }
    }

    await sleep(400);
  }

  return [...allPrices].sort((a, b) => a - b);
}

async function main() {
  const rows = db.prepare(
    `SELECT id, name, website FROM afterschools
     WHERE website IS NOT NULL
       AND website != ''
       AND price_min IS NULL
     ORDER BY id`
  ).all();

  log(`Procesez ${rows.length} afterschool-uri cu website dar fara pret...\n`);

  const update = db.prepare('UPDATE afterschools SET price_min = ?, price_max = ? WHERE id = ?');

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameShort = row.name.substring(0, 40);
    process.stdout.write(`[${i+1}/${rows.length}] ${nameShort}... `);

    try {
      const baseUrl = normalizeUrl(row.website);
      const prices = await scrapeWebsiteForPrices(baseUrl);

      if (prices.length === 0) {
        log(`❌ fara pret gasit`);
        failed++;
      } else {
        const priceMin = prices[0];
        const priceMax = prices[prices.length - 1];
        update.run(priceMin, priceMax === priceMin ? null : priceMax, row.id);
        log(`✅ ${prices.join(', ')} lei → min=${priceMin}, max=${priceMax === priceMin ? priceMin : priceMax}`);
        updated++;
      }
    } catch (e) {
      log(`❌ eroare: ${e.message?.substring(0, 60)}`);
      failed++;
    }

    await sleep(300);
  }

  log(`\n${'═'.repeat(60)}`);
  log(`Actualizate: ${updated}`);
  log(`Fara pret: ${failed}`);
  log(`Total procesate: ${rows.length}`);
}

main().catch(console.error);
