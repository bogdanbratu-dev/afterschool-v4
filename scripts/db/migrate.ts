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

console.log('Current pageviews schema:');
const schema = db.prepare('PRAGMA table_info(pageviews)').all() as ColumnInfo[];
console.log(schema.map(c => `${c.name} (${c.type})`).join('\n'));

// Add missing columns
const columns = schema.map(c => c.name);

if (!columns.includes('source')) {
  console.log('\n✓ Adding column: source');
  db.exec('ALTER TABLE pageviews ADD COLUMN source TEXT');
}

if (!columns.includes('country')) {
  console.log('✓ Adding column: country');
  db.exec('ALTER TABLE pageviews ADD COLUMN country TEXT');
}

if (!columns.includes('city')) {
  console.log('✓ Adding column: city');
  db.exec('ALTER TABLE pageviews ADD COLUMN city TEXT');
}

if (!columns.includes('referrer')) {
  console.log('✓ Adding column: referrer');
  db.exec('ALTER TABLE pageviews ADD COLUMN referrer TEXT');
}

console.log('\n✅ Migration complete');
console.log('\nNew schema:');
const newSchema = db.prepare('PRAGMA table_info(pageviews)').all() as ColumnInfo[];
console.log(newSchema.map(c => `${c.name} (${c.type})`).join('\n'));

db.close();
