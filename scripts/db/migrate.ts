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

// Create pageviews table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS pageviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page TEXT NOT NULL,
    device TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    source TEXT,
    country TEXT,
    city TEXT,
    referrer TEXT
  )
`);

// Create searches table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`);

// Create result_clicks table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS result_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    item_name TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`);

console.log('✓ pageviews table created or already exists');
console.log('✓ searches table created or already exists');
console.log('✓ result_clicks table created or already exists');

console.log('\nCurrent tables:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
console.log(tables.map(t => t.name).join(', '));

console.log('\n✅ Migration complete');
db.close();
