const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'afterschool.db');
const db = new Database(DB_PATH);

const extra = [
  {
    name: 'After School Rainbow Kids',
    address: 'Bucuresti',
    sector: null,
    lat: 44.4350,
    lng: 26.1000,
    phone: null,
    email: null,
    website: null,
    price_min: null,
    price_max: null,
    pickup_time: null,
    end_time: null,
    age_min: 6,
    age_max: 12,
    description: 'After school Bucuresti, program educational pentru copii.',
    activities: 'Teme,Engleza,Arte,Sport,Jocuri',
  },
  {
    name: 'After school Micul Scolar',
    address: 'Bucuresti',
    sector: null,
    lat: 44.4350,
    lng: 26.1000,
    phone: null,
    email: null,
    website: null,
    price_min: null,
    price_max: null,
    pickup_time: null,
    end_time: null,
    age_min: 6,
    age_max: 12,
    description: 'After school Bucuresti, sprijin educational pentru micii scolari.',
    activities: 'Teme,Engleza,Arte,Sport',
  },
  {
    name: 'After School Zmeul Albastru',
    address: 'Bucuresti',
    sector: null,
    lat: 44.4350,
    lng: 26.1000,
    phone: null,
    email: null,
    website: null,
    price_min: null,
    price_max: null,
    pickup_time: null,
    end_time: null,
    age_min: 6,
    age_max: 12,
    description: 'After school Bucuresti, program educativ si recreativ pentru copii.',
    activities: 'Teme,Engleza,Arte,Sport,Jocuri',
  },
  {
    name: 'KeiKo AfterSchool',
    address: 'Bucuresti',
    sector: null,
    lat: 44.4350,
    lng: 26.1000,
    phone: null,
    email: null,
    website: null,
    price_min: null,
    price_max: null,
    pickup_time: null,
    end_time: null,
    age_min: 6,
    age_max: 12,
    description: 'After school Bucuresti, program complet educational si recreativ.',
    activities: 'Teme,Engleza,Arte,Sport',
  },
  {
    name: 'Schnuffelgarten Creșă Grădiniță & Afterschool',
    address: 'Bucuresti',
    sector: null,
    lat: 44.4350,
    lng: 26.1000,
    phone: null,
    email: null,
    website: null,
    price_min: null,
    price_max: null,
    pickup_time: null,
    end_time: null,
    age_min: 3,
    age_max: 12,
    description: 'Creșă, grădiniță și after school Bucuresti. Program integrat pentru copii de la vârste mici.',
    activities: 'Teme,Engleza,Arte,Sport,Jocuri educative',
  },
  {
    name: 'LU-LU Gradinita Afterschool Club',
    address: 'Bucuresti',
    sector: null,
    lat: 44.4350,
    lng: 26.1000,
    phone: null,
    email: null,
    website: null,
    price_min: null,
    price_max: null,
    pickup_time: null,
    end_time: null,
    age_min: 3,
    age_max: 12,
    description: 'Grădiniță, afterschool si club de activitati recreative si distractive pentru copii in Bucuresti.',
    activities: 'Teme,Engleza,Arte,Activitati recreative,Jocuri',
  },
  {
    name: 'Learn In After School',
    address: 'Bucuresti',
    sector: null,
    lat: 44.4350,
    lng: 26.1000,
    phone: null,
    email: null,
    website: null,
    price_min: null,
    price_max: null,
    pickup_time: null,
    end_time: null,
    age_min: 6,
    age_max: 14,
    description: 'After school Bucuresti cu focus pe invatare activa si dezvoltarea competentelor.',
    activities: 'Teme,Engleza,Matematica,Sport,Arte',
  },
];

const existing = db.prepare('SELECT name FROM afterschools').all().map(r => r.name.toLowerCase());

const insert = db.prepare(`
  INSERT INTO afterschools (name, address, sector, lat, lng, phone, email, website, price_min, price_max, pickup_time, end_time, age_min, age_max, description, activities)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let added = 0;
for (const a of extra) {
  const nameLower = a.name.toLowerCase();
  const isDuplicate = existing.some(e =>
    e.includes(nameLower.substring(0, 12)) || nameLower.includes(e.substring(0, 12))
  );
  if (isDuplicate) {
    console.log(`⏭️  Skip: ${a.name}`);
    continue;
  }
  insert.run(
    a.name, a.address, a.sector, a.lat, a.lng,
    a.phone, a.email, a.website, a.price_min, a.price_max,
    a.pickup_time, a.end_time, a.age_min, a.age_max,
    a.description, a.activities
  );
  console.log(`✅ Adaugat: ${a.name}`);
  added++;
}

const total = db.prepare('SELECT COUNT(*) as count FROM afterschools').get();
console.log(`\n📊 Adaugate: ${added}`);
console.log(`📦 Total in baza de date: ${total.count}`);
