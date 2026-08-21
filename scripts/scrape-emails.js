const Database = require('better-sqlite3');
const db = new Database('/var/www/afterschool-v4/data/afterschool.db');

// TLD restrans la o lista cunoscuta (nu [a-zA-Z]{2,} deschis): text lipit fara spatiu dupa domeniu
// (ex. "...@yahoo.com" + "str" -> "yahoo.comstr") nu mai e inghitit ca TLD fals.
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.(?:com|ro|net|org|eu|info|biz|co|io|me|shop|store|group|business)(?![a-zA-Z])/g;

const SKIP_DOMAINS = ['sentry.io','sentry-next.wixpress.com','wixpress.com','wix.com','example.com','example.org','yoursite.com','domain.com','domainname.com','email.com','yourdomain.com','godaddy.com','squarespace.com','wordpress.com','wordpress.org','googleapis.com','gstatic.com','cloudflare.com','schema.org','w3.org','facebook.com','twitter.com','instagram.com','jsdelivr.net','gravatar.com','exemplu.ro','example.ro','siteulmeu.com','mysite.com','test.ro','test.com'];
const SKIP_PREFIXES = ['noreply','no-reply','donotreply','mailer-daemon','bounce','postmaster','webmaster'];

function isValidEmail(email) {
  const lower = email.toLowerCase();
  if (!lower.includes('.')) return false;
  if (lower.match(/@.*\.(png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|webp|ico|mp4|pdf)$/)) return false;
  if (SKIP_DOMAINS.some(d => lower.includes('@' + d))) return false;
  if (SKIP_PREFIXES.some(p => lower.startsWith(p + '@'))) return false;
  if (/^[0-9a-f]{16,}@/.test(lower)) return false; // hash-uri
  if (lower.length > 60) return false;
  return true;
}

function cleanEmails(list) {
  const seen = new Set();
  const out = [];
  for (let e of list || []) {
    e = String(e).toLowerCase().replace(/[.,;:>)\]]+$/, '').trim();
    // taie un numar de telefon lipit fara spatiu inaintea inceputului adresei
    // (ex. "0773967033office_imt@..." -> "office_imt@...")
    e = e.replace(/^\d{7,}(?=[a-z])/, '');
    if (!e || e.indexOf('@') === -1) continue;
    if (!isValidEmail(e)) continue;
    if (seen.has(e)) continue;
    seen.add(e); out.push(e);
  }
  // elimina "superstring"-uri: cand innerText/HTML lipesc text fara spatiu langa un email, regexul
  // global il prinde ca pe o adresa mai lunga si diferita. daca varianta scurta exista deja in
  // lista (prefix SAU suffix), cea lunga e aproape sigur artefact, nu adresa reala.
  return out.filter((e) => !out.some((other) => other !== e && e.length > other.length && e.includes(other)));
}

async function fetchPage(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractEmails(html) {
  if (!html) return [];
  const matches = html.match(EMAIL_REGEX) || [];
  return cleanEmails(matches);
}

async function findEmail(website) {
  let base = website.trim().replace(/\/$/, '');
  if (!base.startsWith('http')) base = 'https://' + base;

  const home = await fetchPage(base);
  const homeEmails = extractEmails(home);
  if (homeEmails.length > 0) return homeEmails[0];

  for (const path of ['/contact', '/contact-us', '/contacte', '/despre-noi', '/despre', '/about']) {
    const html = await fetchPage(base + path);
    const emails = extractEmails(html);
    if (emails.length > 0) return emails[0];
  }
  return null;
}

async function main() {
  const listings = [
    ...db.prepare(`SELECT id, name, website, 'afterschool' as type FROM afterschools WHERE (email IS NULL OR email = '') AND website IS NOT NULL AND website != '' AND is_premium = 0`).all(),
    ...db.prepare(`SELECT id, name, website, 'club' as type FROM clubs WHERE (email IS NULL OR email = '') AND website IS NOT NULL AND website != '' AND is_premium = 0`).all(),
  ];

  console.log(`Gasit ${listings.length} listari cu website dar fara email. Incep...`);
  let found = 0;

  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    try {
      const email = await findEmail(l.website);
      if (email) {
        const table = l.type === 'afterschool' ? 'afterschools' : 'clubs';
        db.prepare(`UPDATE ${table} SET email = ? WHERE id = ?`).run(email, l.id);
        found++;
        console.log(`[${i+1}/${listings.length}] GASIT ${l.name} -> ${email}`);
      } else {
        if ((i+1) % 50 === 0) console.log(`[${i+1}/${listings.length}] ${found} gasite pana acum...`);
      }
    } catch (e) {
      console.log(`[${i+1}/${listings.length}] eroare: ${l.name}`);
    }
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log(`\nGata! Gasite ${found} emailuri din ${listings.length} listari.`);
  db.close();
}

main().catch(console.error);
