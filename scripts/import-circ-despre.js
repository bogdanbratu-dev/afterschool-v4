// Importa despre in circ_schools, din rezultatele agentilor de research (research per
// site propriu al scolii, confidence "high"/"low"). Doar randurile "high" se aplica.
// Match direct pe circ_schools.id (worklist-ul agentilor a fost generat din acelasi id, nu e
// nevoie de matching pe nume).
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const MERGED_PATH = process.argv[2];
if (!MERGED_PATH) {
  console.error('Usage: node import-circ-despre.js <merged.json>');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'data', 'afterschool.db');
const db = new Database(dbPath);

const rows = JSON.parse(fs.readFileSync(MERGED_PATH, 'utf8'));
const high = rows.filter((r) => r.confidence === 'high' && r.despre);

const update = db.prepare(
  'UPDATE circ_schools SET despre = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
);

let applied = 0;
let skippedAlreadySet = 0;
let skippedNoMatch = 0;

const getExisting = db.prepare('SELECT id, despre FROM circ_schools WHERE id = ?');

for (const r of high) {
  const existing = getExisting.get(r.id);
  if (!existing) {
    skippedNoMatch++;
    console.log(`Fara rand in DB pt. id ${r.id} (${r.name})`);
    continue;
  }
  if (existing.despre) {
    skippedAlreadySet++;
    continue;
  }
  update.run(r.despre, r.id);
  applied++;
}

console.log(`Aplicat: ${applied}`);
console.log(`Sarite (deja populate): ${skippedAlreadySet}`);
console.log(`Sarite (fara rand in DB): ${skippedNoMatch}`);
console.log(`Total randuri high confidence in input: ${high.length}`);
