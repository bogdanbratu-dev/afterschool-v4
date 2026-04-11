const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, '../data/afterschool.db'), { readonly: true });

let sql = '';

for (const { name, sql: createSql } of db.prepare(`SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all()) {
  sql += createSql + ';\n\n';
  const rows = db.prepare(`SELECT * FROM ${name}`).all();
  for (const row of rows) {
    const cols = Object.keys(row).map(c => `"${c}"`).join(', ');
    const vals = Object.values(row).map(v => {
      if (v === null) return 'NULL';
      if (typeof v === 'number') return v;
      return `'${String(v).replace(/'/g, "''")}'`;
    }).join(', ');
    sql += `INSERT INTO "${name}" (${cols}) VALUES (${vals});\n`;
  }
  sql += '\n';
}

fs.writeFileSync(path.join(__dirname, '../data/export.sql'), sql);
console.log('Export done:', path.join(__dirname, '../data/export.sql'));
db.close();
