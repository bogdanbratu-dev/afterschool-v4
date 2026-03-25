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

console.log('✓ pageviews table created or already exists');

console.log('\nCurrent pageviews schema:');
const schema = db.prepare('PRAGMA table_info(pageviews)').all() as ColumnInfo[];
console.log(schema.map(c => `${c.name} (${c.type})`).join('\n'));

console.log('\n✅ Migration complete');
db.close();
