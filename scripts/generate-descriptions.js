const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/afterschool.db'));

function generateAfterSchool(as) {
  const parts = [];

  const location = as.sector ? `Sector ${as.sector}` : 'București';
  parts.push(`${as.name} este un after school din ${location}, ${as.address}.`);

  const activities = as.activities ? as.activities.split(',').map(a => a.trim()).filter(Boolean) : [];
  if (activities.length > 0) {
    parts.push(`Oferă activități de ${activities.join(', ')} pentru copii.`);
  }

  if (as.age_min !== null && as.age_max !== null) {
    parts.push(`Programul este destinat copiilor cu vârste între ${as.age_min} și ${as.age_max} ani.`);
  }

  if (as.price_min !== null) {
    const price = as.price_min === as.price_max || !as.price_max
      ? `${as.price_min} lei/lună`
      : `${as.price_min}-${as.price_max} lei/lună`;
    parts.push(`Prețul lunar pornește de la ${price}.`);
  }

  if (as.end_time) {
    parts.push(`Programul este disponibil până la ora ${as.end_time}.`);
  }

  return parts.join(' ');
}

function generateClub(club) {
  const CATEGORY_LABELS = {
    inot: 'înot', fotbal: 'fotbal', dansuri: 'dans', arte_martiale: 'arte marțiale',
    gimnastica: 'gimnastică', limbi_straine: 'limbi străine', robotica: 'robotică',
    muzica: 'muzică', arte_creative: 'arte creative',
  };

  const parts = [];
  const category = CATEGORY_LABELS[club.category] || club.category;
  const location = club.sector ? `Sector ${club.sector}` : 'București';

  parts.push(`${club.name} oferă cursuri de ${category} în ${location}, ${club.address}.`);

  if (club.age_min !== null && club.age_max !== null) {
    parts.push(`Activitățile sunt destinate copiilor cu vârste între ${club.age_min} și ${club.age_max} ani.`);
  }

  if (club.price_min !== null) {
    const price = club.price_min === club.price_max || !club.price_max
      ? `${club.price_min} lei`
      : `${club.price_min}-${club.price_max} lei`;
    parts.push(`Prețul cursurilor pornește de la ${price}.`);
  }

  if (club.schedule) {
    parts.push(`Program: ${club.schedule}.`);
  }

  return parts.join(' ');
}

// Only generate for entries that have NO editorial_summary AND NO website
const afterschools = db.prepare(
  `SELECT * FROM afterschools WHERE editorial_summary IS NULL AND (website IS NULL OR website = '')`
).all();

const clubs = db.prepare(
  `SELECT * FROM clubs WHERE editorial_summary IS NULL AND (website IS NULL OR website = '')`
).all();

console.log(`After school-uri fără descriere și fără website: ${afterschools.length}`);
console.log(`Activități fără descriere și fără website: ${clubs.length}`);

let asCount = 0, clubCount = 0;

for (const as of afterschools) {
  const summary = generateAfterSchool(as);
  db.prepare(`UPDATE afterschools SET editorial_summary = ? WHERE id = ?`).run(summary, as.id);
  asCount++;
}

for (const club of clubs) {
  const summary = generateClub(club);
  db.prepare(`UPDATE clubs SET editorial_summary = ? WHERE id = ?`).run(summary, club.id);
  clubCount++;
}

console.log(`\nGenerate: ${asCount} after school-uri, ${clubCount} activități.`);
console.log('Gata!');
db.close();
