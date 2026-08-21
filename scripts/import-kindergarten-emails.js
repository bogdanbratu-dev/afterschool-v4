/**
 * import-kindergarten-emails.js — RULAT PE VPS. Citeste data/kindergarten-emails.json (produs local
 * de scrape-kindergarten-emails.js prin Method 2) si scrie emailurile in tabela `kindergartens`.
 *
 * Sigur by default: actualizeaza DOAR randurile care nu au deja email (nu suprascrie), si doar
 * cu adrese valide. Face un dry-run daca dai --dry-run.
 *
 *   node scripts/import-kindergarten-emails.js --dry-run   # arata ce ar face
 *   node scripts/import-kindergarten-emails.js             # aplica (fa backup DB inainte!)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DRY = process.argv.includes('--dry-run');
const FILE = path.join(__dirname, '..', 'data', 'kindergarten-emails.json');
const DB = path.join(__dirname, '..', 'data', 'afterschool.db');

const EMAIL_RE = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;
// domenii placeholder / de test care nu sunt adrese reale de contact
const PLACEHOLDER_DOMAINS = ['exemplu.ro', 'example.com', 'example.ro', 'example.org',
  'mysite.com', 'domain.com', 'domainname.com', 'email.com', 'yourdomain.com', 'test.ro',
  'test.com', 'siteulmeu.com'];

function isRealEmail(e) {
  if (!e || !EMAIL_RE.test(e)) return false;
  const domain = e.split('@')[1] || '';
  return !PLACEHOLDER_DOMAINS.includes(domain);
}

function main() {
  const rows = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const candidates = rows.filter((r) => isRealEmail(r.email));
  console.log(`[import] intrari=${rows.length} cu_email_valid=${candidates.length} ${DRY ? '(DRY RUN)' : ''}`);

  const db = new Database(DB);
  const getCur = db.prepare('SELECT id, name, email FROM kindergartens WHERE id = ?');
  const upd = db.prepare("UPDATE kindergartens SET email = ? WHERE id = ? AND (email IS NULL OR TRIM(email) = '')");

  let updated = 0, skippedHasEmail = 0, missing = 0;
  const apply = db.transaction((list) => {
    for (const r of list) {
      const cur = getCur.get(r.id);
      if (!cur) { missing++; continue; }
      if (cur.email && cur.email.trim()) { skippedHasEmail++; continue; }
      if (DRY) { updated++; console.log(`  would set #${r.id} ${cur.name} → ${r.email}`); continue; }
      const info = upd.run(r.email, r.id);
      if (info.changes) { updated++; console.log(`  ✓ #${r.id} ${cur.name} → ${r.email}`); }
    }
  });
  apply(candidates);

  const totalWithEmail = db.prepare("SELECT COUNT(*) n FROM kindergartens WHERE email IS NOT NULL AND TRIM(email) != ''").get().n;
  db.close();
  console.log(`\n[import] ${DRY ? 'ar actualiza' : 'actualizate'}=${updated} sarite(au deja email)=${skippedHasEmail} lipsa_in_db=${missing}`);
  console.log(`[import] gradinite cu email acum: ${totalWithEmail}${DRY ? ' (dupa aplicare)' : ''}`);
}

main();
