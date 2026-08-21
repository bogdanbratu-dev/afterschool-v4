// Rehosteaza pozele expirate (Google Places "place-photos", vezi CLAUDE.md) folosind poze reale
// de pe site-ul propriu al fiecarui business (nu Google API, gratuit). Reutilizeaza logica de
// extragere din scrape-caterer-photos.js (extrage <img>/srcset/background-image + pagini de
// galerie), dar headless (Playwright Method 1) si generic pe toate cele 4 tabele.
//
// Usage:
//   node scripts/rehost-website-photos.js --table=kindergartens --id=192   (o singura linie, pilot)
//   node scripts/rehost-website-photos.js --table=kindergartens           (tot tabelul)
//   node scripts/rehost-website-photos.js                                  (toate cele 4 tabele)

const Database = require('better-sqlite3');
const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/afterschool.db'));
const PUBLIC_DIR = path.join(__dirname, '../public/photos');

const argTable = (process.argv.find(a => a.startsWith('--table=')) || '').split('=')[1] || null;
const argId = (process.argv.find(a => a.startsWith('--id=')) || '').split('=')[1] || null;
const TABLES = argTable ? [argTable] : ['afterschools', 'clubs', 'kindergartens', 'caterers'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── in pagina (closure-free, la fel ca scrape-caterer-photos.js) ────────────
function extractImagesInPage() {
  var out = {};
  function add(src, w, h) {
    if (!src || src.indexOf('data:') === 0) return;
    var prev = out[src];
    if (!prev || (w * h > prev.w * prev.h)) out[src] = { src: src, w: w || 0, h: h || 0 };
  }
  var imgs = document.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var im = imgs[i];
    add(im.currentSrc || im.src, im.naturalWidth || 0, im.naturalHeight || 0);
  }
  var srcs = document.querySelectorAll('source[srcset]');
  for (var s = 0; s < srcs.length; s++) {
    var ss = (srcs[s].getAttribute('srcset') || '').split(',');
    for (var k = 0; k < ss.length; k++) {
      var u = ss[k].trim().split(' ')[0];
      if (u) add(u, 0, 0);
    }
  }
  var all = document.querySelectorAll('*');
  var lim = Math.min(all.length, 4000);
  for (var j = 0; j < lim; j++) {
    var bg = '';
    try { bg = getComputedStyle(all[j]).backgroundImage; } catch (e) {}
    if (bg && bg.indexOf('url(') !== -1) {
      var m = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (m && m[1]) add(m[1], 0, 0);
    }
  }
  return Object.keys(out).map(function (kk) { return out[kk]; });
}

function findGalleryLinksInPage() {
  var re = /galer|portofoli|produse|meniu|catering|servicii|evenimente|gallery|photos|poze|despre|about/i;
  var as = document.querySelectorAll('a[href]');
  var seen = {}, out = [];
  for (var i = 0; i < as.length; i++) {
    var t = (as[i].innerText || as[i].textContent || '');
    var h = as[i].href || '';
    if ((re.test(t) || re.test(h)) && h.indexOf('http') === 0 && !seen[h]) { seen[h] = 1; out.push(h); }
  }
  return out.slice(0, 3);
}

const IMG_EXT = /\.(jpe?g|png|webp)(\?|#|$)/i;
const JUNK = /(logo|icon|favicon|sprite|avatar|placeholder|loader|spinner|flag|badge|thumb-?\d*x|1x1|blank|pixel|wp-content\/(plugins|themes)[^\s]*(icon|logo))/i;

function absolutize(src, base) {
  try { return new URL(src, base).href; } catch { return null; }
}

function cleanAndRank(list, base) {
  const map = new Map();
  for (const it of list || []) {
    const abs = absolutize(it.src, base);
    if (!abs) continue;
    if (!IMG_EXT.test(abs)) continue;
    if (JUNK.test(abs)) continue;
    const key = abs.split('?')[0];
    const prev = map.get(key);
    const area = (it.w || 0) * (it.h || 0);
    if (!prev || area > prev.area) map.set(key, { src: abs, w: it.w || 0, h: it.h || 0, area });
  }
  let arr = [...map.values()];
  arr = arr.filter((x) => x.area === 0 || (x.w >= 350 && x.h >= 250));
  arr.sort((a, b) => b.area - a.area);
  return arr;
}

async function collectCandidates(page, url) {
  let raw = [];
  await page.goto(url, { timeout: 25000, waitUntil: 'domcontentloaded' });
  await sleep(1800);
  try { await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); }); } catch {}
  await sleep(1000);
  const base1 = page.url();
  raw = raw.concat((await page.evaluate(extractImagesInPage)).map((x) => ({ ...x, base: base1 })));

  let gal = [];
  try { gal = await page.evaluate(findGalleryLinksInPage); } catch {}
  for (const g of gal) {
    try {
      await page.goto(g, { timeout: 20000, waitUntil: 'domcontentloaded' });
      await sleep(1500);
      try { await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); }); } catch {}
      await sleep(800);
      const b = page.url();
      raw = raw.concat((await page.evaluate(extractImagesInPage)).map((x) => ({ ...x, base: b })));
    } catch {}
  }
  return cleanAndRank(raw.map((x) => ({ src: x.src, w: x.w, h: x.h })), url);
}

async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 3000) return false; // prea mic, probabil icon/placeholder scapat de filtre
    // redimensioneaza la max 1200px latime, jpeg calitate 78 - poze de pe site pot fi foarte mari (3-4MB)
    const resized = await sharp(buf).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
    fs.writeFileSync(destPath, resized);
    return true;
  } catch {
    return false;
  }
}

async function rehostRow(page, table, id, website, name) {
  let candidates;
  try {
    candidates = await collectCandidates(page, website);
  } catch (e) {
    console.log(`  x [${table}/${id}] ${name} - nu s-a putut incarca site-ul: ${String(e.message || e).slice(0, 80)}`);
    return;
  }
  if (candidates.length === 0) {
    console.log(`  - [${table}/${id}] ${name} - nicio poza gasita pe site`);
    return;
  }

  const dir = path.join(PUBLIC_DIR, table, String(id));
  fs.mkdirSync(dir, { recursive: true });

  const localUrls = [];
  let n = 1;
  for (const cand of candidates.slice(0, 12)) {
    if (localUrls.length >= 4) break;
    const dest = path.join(dir, `photo${n}.jpg`);
    const ok = await downloadImage(cand.src, dest);
    if (ok) { localUrls.push(`/photos/${table}/${id}/photo${n}.jpg`); n++; }
  }

  if (localUrls.length === 0) {
    console.log(`  x [${table}/${id}] ${name} - descarcare esuata pt. toti candidatii`);
    return;
  }

  db.prepare(`UPDATE ${table} SET photo_urls = ? WHERE id = ?`).run(JSON.stringify(localUrls), id);
  console.log(`  v [${table}/${id}] ${name} - ${localUrls.length} poze de pe site`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' });
  const page = await context.newPage();

  for (const table of TABLES) {
    const rows = db.prepare(
      `SELECT id, name, website FROM ${table} WHERE photo_urls LIKE '%place-photos%' AND website IS NOT NULL AND website != ''` +
      (argId ? ` AND id = ${Number(argId)}` : '') + ` ORDER BY id`
    ).all();
    console.log(`\n${table}: ${rows.length} de rehostuit (din website)`);
    for (const row of rows) {
      await rehostRow(page, table, row.id, row.website, row.name);
      await sleep(400);
    }
  }

  await browser.close();
  db.close();
  console.log('\nGata!');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
