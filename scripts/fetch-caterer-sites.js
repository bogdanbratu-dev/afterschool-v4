'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/afterschool.db'));

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractText(html) {
  // Remove scripts, styles, nav, footer, header tags
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  // Take first 1500 chars of meaningful content
  return t.substring(0, 1500);
}

async function fetchSiteText(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
        'Accept': 'text/html',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    return extractText(html);
  } catch { return null; }
}

async function main() {
  const caterers = db.prepare(
    `SELECT id, name, address, sector, coverage_area, phone, website, price_min, price_max FROM caterers WHERE website IS NOT NULL ORDER BY id`
  ).all();

  console.log(`Fetching ${caterers.length} sites...\n`);

  const results = [];
  for (const c of caterers) {
    process.stdout.write(`[${c.id}] ${c.name} (${c.website}) ... `);
    const text = await fetchSiteText(c.website);
    if (text) {
      console.log(`${text.length} chars`);
      results.push({ ...c, site_text: text });
    } else {
      console.log('failed');
      results.push({ ...c, site_text: null });
    }
    await sleep(700);
  }

  // Also add caterers without website
  const noSite = db.prepare(`SELECT id, name, address, sector, coverage_area, phone, website, price_min, price_max FROM caterers WHERE website IS NULL`).all();
  for (const c of noSite) results.push({ ...c, site_text: null });

  const fs = require('fs');
  fs.writeFileSync('/tmp/caterers_for_desc.json', JSON.stringify(results, null, 2));
  console.log(`\nSaved ${results.length} entries to /tmp/caterers_for_desc.json`);
}

main().catch(console.error);
