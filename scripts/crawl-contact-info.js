// Verifica emailul/telefonul afterschool-urilor cu website contra a ceea ce e publicat
// chiar pe site-ul lor (homepage + pagini de contact uzuale), si salveaza propuneri
// de actualizare/completare in contact_crawl_suggestions - NU scrie direct in afterschools,
// un admin aproba/respinge fiecare propunere din tab-ul dedicat din /admin.
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const LOG_PATH = path.join(__dirname, '..', 'data', 'crawl-contact-info.log');
const db = new Database(DB_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
function log(...args) {
  const line = args.join(' ');
  console.log(line);
  logStream.write(line + '\n');
}

const CONTACT_PATHS = ['/', '/contact', '/contacte', '/contactati-ne', '/despre', '/despre-noi', '/despre-noi/contact'];

const EMAIL_DOMAIN_BLOCKLIST = [
  'sentry', 'wixpress', 'schema.org', 'example.com', 'godaddy', 'cloudflare', 'w3.org',
  'wordpress.org', 'gstatic', 'google-analytics', 'googleapis', 'facebook.com', 'yourdomain',
  'domain.com', 'test.com', 'sentry.io', '2x.png', 'placeholder',
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

function isJunkEmail(email) {
  const lower = email.toLowerCase();
  return EMAIL_DOMAIN_BLOCKLIST.some(b => lower.includes(b));
}

function extractEmails(html) {
  const counts = new Map();

  // Prioritate: linkuri mailto: (intentie explicita de contact, nu text incidental)
  const mailtoPattern = /href=["']mailto:([^"'?]+)/gi;
  let m;
  while ((m = mailtoPattern.exec(html)) !== null) {
    const email = m[1].trim().toLowerCase();
    if (email.includes('@') && !isJunkEmail(email)) counts.set(email, (counts.get(email) || 0) + 5);
  }

  // Fallback: email brut in text, pondere mai mica (mai predispus la fals-pozitive)
  const clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  const textPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  while ((m = textPattern.exec(clean)) !== null) {
    const email = m[0].trim().toLowerCase();
    if (!isJunkEmail(email)) counts.set(email, (counts.get(email) || 0) + 1);
  }

  return counts;
}

function normalizePhone(digitsRaw) {
  let digits = digitsRaw.replace(/\D/g, '');
  if (digits.startsWith('40') && digits.length === 11) digits = '0' + digits.slice(2);
  if (digits.startsWith('0040') && digits.length === 13) digits = '0' + digits.slice(4);
  if (digits.length !== 10 || digits[0] !== '0') return null;
  // Bucuresti/mobil: 07xxxxxxxx, 02xx sau 03xx
  if (!/^0(7\d|2\d|3\d)\d{7}$/.test(digits)) return null;
  return digits;
}

function extractPhones(html) {
  const counts = new Map();

  const telPattern = /href=["']tel:([^"']+)/gi;
  let m;
  while ((m = telPattern.exec(html)) !== null) {
    const norm = normalizePhone(m[1]);
    if (norm) counts.set(norm, (counts.get(norm) || 0) + 5);
  }

  const clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
  const textPattern = /(?:\+?4?0)[\s.-]?\d{2,3}(?:[\s.-]?\d{2,3}){2,3}/g;
  while ((m = textPattern.exec(clean)) !== null) {
    const norm = normalizePhone(m[0]);
    if (norm) counts.set(norm, (counts.get(norm) || 0) + 1);
  }

  return counts;
}

function topCandidate(counts) {
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

async function crawlSite(baseUrl) {
  const emailCounts = new Map();
  const phoneCounts = new Map();
  let sourceUrl = null;

  for (const p of CONTACT_PATHS) {
    const url = baseUrl + p;
    const html = await fetchPage(url);
    if (!html) { await sleep(300); continue; }

    const emails = extractEmails(html);
    const phones = extractPhones(html);
    if ((emails.size > 0 || phones.size > 0) && !sourceUrl) sourceUrl = url;
    for (const [k, v] of emails) emailCounts.set(k, (emailCounts.get(k) || 0) + v);
    for (const [k, v] of phones) phoneCounts.set(k, (phoneCounts.get(k) || 0) + v);

    await sleep(350);
  }

  return { email: topCandidate(emailCounts), phone: topCandidate(phoneCounts), sourceUrl };
}

function upsertSuggestion(insertStmt, clearStmt, listingId, listingName, field, oldValue, newValue, sourceUrl) {
  clearStmt.run(listingId, field);
  insertStmt.run(listingId, listingName, field, oldValue, newValue, sourceUrl);
}

async function main() {
  const limit = parseInt(process.argv[2] || '0', 10) || null;

  let rows = db.prepare(
    `SELECT id, name, email, phone, website FROM afterschools
     WHERE website IS NOT NULL AND website != ''
     ORDER BY id`
  ).all();
  if (limit) rows = rows.slice(0, limit);

  log(`Verific datele de contact pentru ${rows.length} afterschool-uri cu website...\n`);

  const clearStmt = db.prepare(`DELETE FROM contact_crawl_suggestions WHERE listing_id = ? AND field = ? AND status = 'pending'`);
  const insertStmt = db.prepare(`
    INSERT INTO contact_crawl_suggestions (listing_id, listing_name, field, old_value, new_value, source_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let suggested = 0, confirmed = 0, nothing = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.name.substring(0, 40)}... `);

    try {
      const baseUrl = normalizeUrl(row.website);
      const found = await crawlSite(baseUrl);
      let changed = false;

      if (found.email && found.email !== (row.email || '').toLowerCase()) {
        upsertSuggestion(insertStmt, clearStmt, row.id, row.name, 'email', row.email, found.email, found.sourceUrl);
        log(`✅ email: ${row.email || '(lipsa)'} → ${found.email}`);
        changed = true;
      }
      if (found.phone && found.phone !== (row.phone || '').replace(/\D/g, '')) {
        upsertSuggestion(insertStmt, clearStmt, row.id, row.name, 'phone', row.phone, found.phone, found.sourceUrl);
        log(`✅ telefon: ${row.phone || '(lipsa)'} → ${found.phone}`);
        changed = true;
      }

      if (changed) suggested++;
      else if (found.email || found.phone) { log(`= confirmat, fara schimbari`); confirmed++; }
      else { log(`❌ nimic gasit`); nothing++; }
    } catch (e) {
      log(`❌ eroare: ${e.message?.substring(0, 60)}`);
      nothing++;
    }
  }

  log(`\n${'═'.repeat(60)}`);
  log(`Propuneri noi/actualizate: ${suggested}`);
  log(`Confirmate fara schimbari: ${confirmed}`);
  log(`Fara rezultat: ${nothing}`);
  log(`Total procesate: ${rows.length}`);
}

main().catch(console.error);
