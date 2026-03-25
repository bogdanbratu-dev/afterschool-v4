import Database from 'better-sqlite3';
import path from 'path';

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
}

const dbPath = path.join(process.cwd(), 'data', 'afterschool.db');
const db = new Database(dbPath);

// Check what columns exist
const columns = db.prepare('PRAGMA table_info(pageviews)').all() as ColumnInfo[];
const hasSource = columns.some(c => c.name === 'source');
const hasCountry = columns.some(c => c.name === 'country');
const hasCity = columns.some(c => c.name === 'city');
const hasReferrer = columns.some(c => c.name === 'referrer');

console.log('Pageviews columns:', columns.map(c => c.name).join(', '));

// Clear old data
const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
db.exec(`DELETE FROM pageviews WHERE timestamp < ${cutoffTime}`);

const pages = ['/', '/activitati', '/rezultate'];
const sources = ['google', 'direct', 'facebook', 'instagram'];
const devices = ['mobile', 'desktop'];
const countries = ['Romania', 'Hungary', 'Bulgaria'];
const cities = ['Bucharest', 'Constanta', 'Brasov', 'Timisoara', 'Cluj'];

let insertPageviewSql = 'INSERT INTO pageviews (page, device, timestamp';
const params: string[] = ['?', '?', '?'];

if (hasSource) insertPageviewSql += ', source', params.push('?');
if (hasCountry) insertPageviewSql += ', country', params.push('?');
if (hasCity) insertPageviewSql += ', city', params.push('?');
if (hasReferrer) insertPageviewSql += ', referrer', params.push('?');

insertPageviewSql += ') VALUES (' + params.join(', ') + ')';

const insertPageview = db.prepare(insertPageviewSql);

// Add data for last 7 days
let addedCount = 0;
for (let day = 0; day < 7; day++) {
  const dayStart = Date.now() - (7 - day) * 24 * 60 * 60 * 1000;
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  
  // 30-50 pageviews per day
  const pageviewCount = Math.floor(Math.random() * 20) + 30;
  for (let i = 0; i < pageviewCount; i++) {
    const timestamp = dayStart + Math.random() * (dayEnd - dayStart);
    const row: unknown[] = [
      pages[Math.floor(Math.random() * pages.length)],
      devices[Math.floor(Math.random() * devices.length)],
      Math.floor(timestamp)
    ];
    
    if (hasSource) row.push(sources[Math.floor(Math.random() * sources.length)]);
    if (hasCountry) row.push(countries[Math.floor(Math.random() * countries.length)]);
    if (hasCity) row.push(cities[Math.floor(Math.random() * cities.length)]);
    if (hasReferrer) row.push(null);
    
    insertPageview.run(...row);
    addedCount++;
  }
}

console.log(`✅ Analytics test data added: ${addedCount} pageviews for last 7 days`);
db.close();
