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

// Get table info
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
const hasPageviews = tables.some(t => t.name === 'pageviews');
const hasSearches = tables.some(t => t.name === 'searches');
const hasClicks = tables.some(t => t.name === 'result_clicks');

console.log(`Tables: pageviews=${hasPageviews}, searches=${hasSearches}, result_clicks=${hasClicks}`);

if (!hasPageviews || !hasSearches || !hasClicks) {
  console.error('❌ Missing required tables. Run migrate first.');
  db.close();
  process.exit(1);
}

// Clear old data
const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
db.exec(`DELETE FROM pageviews WHERE timestamp < ${cutoffTime}`);
db.exec(`DELETE FROM searches WHERE timestamp < ${cutoffTime}`);
db.exec(`DELETE FROM result_clicks WHERE timestamp < ${cutoffTime}`);

const pages = ['/', '/activitati', '/rezultate'];
const sources = ['google', 'direct', 'facebook', 'instagram'];
const devices = ['mobile', 'desktop'];
const countries = ['Romania', 'Hungary', 'Bulgaria'];
const cities = ['Bucharest', 'Constanta', 'Brasov', 'Timisoara', 'Cluj'];
const queries = ['after school activities', 'activitati copii', 'cluburi'];
const itemNames = ['Activity 1', 'Activity 2', 'Club A', 'Club B'];

const insertPageview = db.prepare(
  'INSERT INTO pageviews (page, device, timestamp, source, country, city, referrer) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

const insertSearch = db.prepare(
  'INSERT INTO searches (query, timestamp) VALUES (?, ?)'
);

const insertClick = db.prepare(
  'INSERT INTO result_clicks (item_id, item_name, type, timestamp) VALUES (?, ?, ?, ?)'
);

// Add data for last 7 days
let pageviewCount = 0;
let searchCount = 0;
let clickCount = 0;

for (let day = 0; day < 7; day++) {
  const dayStart = Date.now() - (7 - day) * 24 * 60 * 60 * 1000;
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  
  // 30-50 pageviews per day
  const pvCount = Math.floor(Math.random() * 20) + 30;
  for (let i = 0; i < pvCount; i++) {
    const timestamp = Math.floor(dayStart + Math.random() * (dayEnd - dayStart));
    insertPageview.run(
      pages[Math.floor(Math.random() * pages.length)],
      devices[Math.floor(Math.random() * devices.length)],
      timestamp,
      sources[Math.floor(Math.random() * sources.length)],
      countries[Math.floor(Math.random() * countries.length)],
      cities[Math.floor(Math.random() * cities.length)],
      null
    );
    pageviewCount++;
  }
  
  // 2-8 searches per day
  const sqCount = Math.floor(Math.random() * 6) + 2;
  for (let i = 0; i < sqCount; i++) {
    const timestamp = Math.floor(dayStart + Math.random() * (dayEnd - dayStart));
    insertSearch.run(
      queries[Math.floor(Math.random() * queries.length)],
      timestamp
    );
    searchCount++;
  }
  
  // 5-15 clicks per day
  const clCount = Math.floor(Math.random() * 10) + 5;
  for (let i = 0; i < clCount; i++) {
    const timestamp = Math.floor(dayStart + Math.random() * (dayEnd - dayStart));
    insertClick.run(
      Math.floor(Math.random() * 100),
      itemNames[Math.floor(Math.random() * itemNames.length)],
      'click',
      timestamp
    );
    clickCount++;
  }
}

console.log(`✅ Analytics test data added:`);
console.log(`   - ${pageviewCount} pageviews`);
console.log(`   - ${searchCount} searches`);
console.log(`   - ${clickCount} clicks`);

db.close();
