// Enrichment: viziteaza website-ul fiecarui profesionist si extrage telefon + email
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const db = new Database('/var/www/afterschool-v4/data/afterschool.db');

const update = db.prepare('UPDATE professionals SET phone=?, email=? WHERE id=?');

function extractPhone(text) {
  const m = text.match(/(?:\+40|0040|0)[0-9\s\-\.]{8,12}/g);
  if (!m) return null;
  const cleaned = m.map(p => p.replace(/[\s\-\.]/g,'')).find(p => p.length >= 10);
  return cleaned || null;
}
function extractEmail(text) {
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}

async function enrich(page, row) {
  try {
    await page.goto(row.website, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body.innerText || '');
    const html = await page.evaluate(() => document.body.innerHTML || '');
    
    const phone = row.phone || extractPhone(text) || 
      (() => { const m = html.match(/href="tel:([^"]+)"/); return m ? m[1] : null; })();
    const email = row.email || extractEmail(text) ||
      (() => { const m = html.match(/href="mailto:([^"]+)"/); return m ? m[1] : null; })();
    
    if ((phone && !row.phone) || (email && !row.email)) {
      update.run(phone || row.phone || null, email || row.email || null, row.id);
      return { updated: true, phone: !row.phone && phone, email: !row.email && email };
    }
  } catch {}
  return { updated: false };
}

async function main() {
  // Get pros with website but missing phone OR email
  const rows = db.prepare(`
    SELECT id, name, website, phone, email FROM professionals
    WHERE website IS NOT NULL AND website != '' AND website NOT LIKE '%olx%' AND website NOT LIKE '%anunturi%'
    AND (phone IS NULL OR email IS NULL)
    ORDER BY RANDOM()
    LIMIT 400
  `).all();
  
  console.log(`Enriching ${rows.length} professionals...`);
  
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ locale: 'ro-RO', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  
  let phonesAdded = 0, emailsAdded = 0, errors = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = await enrich(page, row);
    if (result.updated) {
      if (result.phone) { phonesAdded++; process.stdout.write('+p'); }
      if (result.email) { emailsAdded++; process.stdout.write('+e'); }
    } else {
      errors++;
    }
    if ((i+1) % 20 === 0) {
      console.log(`\n[${i+1}/${rows.length}] phones+${phonesAdded} emails+${emailsAdded} skip${errors}`);
    }
  }
  
  await browser.close();
  const stats = db.prepare("SELECT COUNT(*) as c FROM professionals WHERE phone IS NOT NULL").get();
  console.log(`\nDONE. phones+${phonesAdded} emails+${emailsAdded} | total cu tel: ${stats.c}`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });