const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, 'data', 'afterschool.db'));

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.(?:com|ro|net|org|eu|info|biz|co|io|me|shop|store|group|business)(?![a-zA-Z])/g;

const SKIP_DOMAINS = ['sentry.io','sentry-next.wixpress.com','wixpress.com','wix.com','example.com','example.org','yoursite.com','domain.com','domainname.com','companyname.com','email.com','yourdomain.com','godaddy.com','squarespace.com','wordpress.com','wordpress.org','googleapis.com','gstatic.com','cloudflare.com','schema.org','w3.org','facebook.com','twitter.com','instagram.com','jsdelivr.net','gravatar.com','exemplu.ro','example.ro','siteulmeu.com','mysite.com','test.ro','test.com','copilul.ro','eduindex.ro','paginiaurii.ro','gradinitebucuresti.ro'];
const SKIP_PREFIXES = ['noreply','no-reply','donotreply','mailer-daemon','bounce','postmaster','webmaster'];
const SKIP_EXACT = ['expertcatering@yahoo.com'];

function isValidEmail(email) {
  const lower = email.toLowerCase();
  if (!lower.includes('.')) return false;
  if (lower.match(/@.*\.(png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|webp|ico|mp4|pdf)$/)) return false;
  if (SKIP_DOMAINS.some(d => lower.includes('@' + d))) return false;
  if (SKIP_EXACT.includes(lower)) return false;
  if (SKIP_PREFIXES.some(p => lower.startsWith(p + '@'))) return false;
  if (/^[0-9a-f]{16,}@/.test(lower)) return false;
  if (lower.length > 60) return false;
  return true;
}

function cleanEmails(list) {
  const seen = new Set();
  const out = [];
  for (let e of list || []) {
    e = String(e).toLowerCase().replace(/[.,;:>)\]]+$/, '').trim();
    e = e.replace(/^\d{7,}(?=[a-z])/, '');
    if (!e || e.indexOf('@') === -1) continue;
    if (!isValidEmail(e)) continue;
    if (seen.has(e)) continue;
    seen.add(e); out.push(e);
  }
  return out.filter((e) => !out.some((other) => other !== e && e.length > other.length && e.includes(other)));
}

async function fetchPage(url, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
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

function deobfuscate(html) {
  if (!html) return html;
  return html
    .replace(/\s*[\[(]\s*at\s*[\])]\s*/gi, '@')
    .replace(/\s*[\[(]\s*dot\s*[\])]\s*/gi, '.');
}

function extractEmails(html) {
  if (!html) return [];
  const matches = deobfuscate(html).match(EMAIL_REGEX) || [];
  return cleanEmails(matches);
}

function buildBaseVariants(website) {
  let raw = website.trim().replace(/\/$/, '');
  if (!raw.startsWith('http')) raw = 'https://' + raw;
  let url;
  try { url = new URL(raw); } catch { return [raw]; }

  const bareHost = url.hostname.startsWith('www.') ? url.hostname.slice(4) : url.hostname;
  const hosts = [url.hostname, bareHost === url.hostname ? 'www.' + url.hostname : bareHost];
  const protocols = [url.protocol, url.protocol === 'https:' ? 'http:' : 'https:'];

  const seen = new Set();
  const variants = [];
  for (const proto of protocols) {
    for (const h of hosts) {
      const v = `${proto}//${h}`;
      if (!seen.has(v)) { seen.add(v); variants.push(v); }
    }
  }
  return variants;
}

async function findWorkingHome(website) {
  for (const base of buildBaseVariants(website)) {
    const html = await fetchPage(base);
    if (html !== null) return { base, html };
  }
  return null;
}

function discoverContactLinks(html, base, limit = 4) {
  if (!html) return [];
  let baseHost;
  try { baseHost = new URL(base).hostname; } catch { return []; }

  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  const seen = new Set();
  const out = [];
  for (const href of hrefs) {
    if (!/contact|contacte|despre|about|kontakt/i.test(href)) continue;
    let abs;
    try { abs = new URL(href, base).toString(); } catch { continue; }
    try { if (new URL(abs).hostname !== baseHost) continue; } catch { continue; }
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
    if (out.length >= limit) break;
  }
  return out;
}

async function findEmail(website) {
  const home = await findWorkingHome(website);
  if (!home) return null;

  const homeEmails = extractEmails(home.html);
  if (homeEmails.length > 0) return homeEmails[0];

  const fixedPaths = ['/contact', '/contact-us', '/contacte', '/despre-noi', '/despre', '/about'];
  const candidates = [
    ...fixedPaths.map((p) => home.base + p),
    ...discoverContactLinks(home.html, home.base),
  ];

  for (const url of candidates) {
    const html = await fetchPage(url);
    const emails = extractEmails(html);
    if (emails.length > 0) return emails[0];
  }
  return null;
}

async function main() {
  const listings = db.prepare(`
    SELECT cl.id, cl.name, cl.website
    FROM clubs cl
    LEFT JOIN outreach_contacts oc ON oc.listing_type = 'club' AND oc.listing_id = cl.id
    WHERE cl.category = 'inot'
      AND (cl.email IS NULL OR cl.email = '')
      AND cl.website IS NOT NULL AND cl.website != ''
      AND oc.status IS NULL
    ORDER BY cl.id
  `).all();

  console.log(`Gasit ${listings.length} cluburi de inot cu website dar fara email. Incep...`);
  let found = 0;

  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    try {
      const email = await findEmail(l.website);
      if (email) {
        db.prepare(`UPDATE clubs SET email = ? WHERE id = ?`).run(email, l.id);
        found++;
        console.log(`[${i + 1}/${listings.length}] GASIT ${l.name} -> ${email}`);
      } else {
        console.log(`[${i + 1}/${listings.length}] nimic gasit: ${l.name} (${l.website})`);
      }
    } catch (e) {
      console.log(`[${i + 1}/${listings.length}] eroare: ${l.name}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log(`\nGata! Gasite ${found} emailuri din ${listings.length} cluburi de inot.`);
  db.close();
}

main().catch(console.error);
