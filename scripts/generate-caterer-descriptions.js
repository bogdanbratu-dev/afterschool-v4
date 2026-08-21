'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/afterschool.db'));

function generateDescription(c) {
  const parts = [];
  const location = c.sector ? `Sector ${c.sector}, București` : 'București';

  // Fraza principala
  parts.push(`${c.name} este o firmă de catering din ${location}, specializată în livrarea de mese pentru afterschool-uri, grădinițe și școli.`);

  // Zone deservite
  if (c.coverage_area) {
    parts.push(`Deserveşte ${c.coverage_area}.`);
  }

  // Pret
  if (c.price_min !== null && c.price_min !== undefined) {
    if (c.price_max && c.price_max !== c.price_min) {
      parts.push(`Prețul porneşte de la ${c.price_min}–${c.price_max} lei/porție.`);
    } else {
      parts.push(`Prețul este de ${c.price_min} lei/porție.`);
    }
  }

  // Inchidere cu contact
  const contacts = [];
  if (c.phone) contacts.push(`telefon: ${c.phone}`);
  if (c.website) contacts.push(`website: ${c.website}`);
  if (contacts.length > 0) {
    parts.push(`Pentru detalii și comenzi: ${contacts.join(', ')}.`);
  }

  return parts.join(' ');
}

// Genereaza pentru toti catererii fara descriere (sau cu descrierea auto de 1 propozitie)
const caterers = db.prepare(
  `SELECT * FROM caterers WHERE editorial_summary IS NULL OR editorial_summary LIKE 'Firma de catering din%'`
).all();

console.log(`Caterers fara descriere: ${caterers.length}`);

let count = 0;
for (const c of caterers) {
  const desc = generateDescription(c);
  db.prepare(`UPDATE caterers SET editorial_summary = ? WHERE id = ?`).run(desc, c.id);
  console.log(`  [${c.id}] ${c.name}`);
  count++;
}

console.log(`\nGenerate ${count} descrieri.`);
db.close();
