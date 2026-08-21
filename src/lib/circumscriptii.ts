import type Database from 'better-sqlite3';
import { calculateDistance } from '@/lib/distance';
import { similarity } from '@/lib/fuzzy';

// Circumscriptii scolare: entitate proprie (nu tabelul `schools`, care ramane strict gimnaziale pt.
// cautarea de pe home). Tabelele sunt create/populate de scripts/import-circumscriptii.js, in afara
// initializeDb (acelasi pattern ca professionals/tutors/microsites) - vezi memoria
// reference_ismb_circumscriptii_data. `school_id` leaga optional de schools.id (reutilizam lat/lng).
export interface CircSchool {
  id: number;
  ismb_id: number | null;
  name: string;
  type: string;
  sector: number | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  school_id: number | null;
  plan: string | null;
  criterii: string | null;
  media_en: number | null;
  media_en_year: number | null;
  facilities: string | null;
  facilities_highlight: string | null;
  ssd_available: number;
  ssd_info: string | null;
  news_url: string | null;
  despre: string | null;
  show_all_contacts: number;
  updated_at: number;
}

export interface CircStreet {
  id: number;
  circ_school_id: number;
  sector: number | null;
  street_raw: string;
  street_norm: string;
}

// Creeaza tabelele daca lipsesc (idempotent). Apelat defensiv de helperii de citire, ca feature-ul
// sa nu pice pe un DB unde importer-ul n-a rulat inca.
export function ensureCircTables(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS circ_schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ismb_id INTEGER, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'gimnaziu',
    sector INTEGER, address TEXT, phone TEXT, website TEXT, lat REAL, lng REAL, school_id INTEGER,
    plan TEXT, criterii TEXT, media_en REAL, media_en_year INTEGER, facilities TEXT, facilities_highlight TEXT,
    ssd_available INTEGER NOT NULL DEFAULT 0, ssd_info TEXT, news_url TEXT, despre TEXT,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000))`);
  try { db.exec(`ALTER TABLE circ_schools ADD COLUMN show_all_contacts INTEGER NOT NULL DEFAULT 0`); } catch {}
  db.exec(`CREATE TABLE IF NOT EXISTS circ_streets (
    id INTEGER PRIMARY KEY AUTOINCREMENT, circ_school_id INTEGER NOT NULL, sector INTEGER,
    street_raw TEXT NOT NULL, street_norm TEXT NOT NULL)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_circ_streets_norm ON circ_streets(street_norm)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_circ_streets_school ON circ_streets(circ_school_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_circ_schools_sector ON circ_schools(sector)`);
}

// Raza implicita pentru afterschool-urile aratate langa o scoala de circumscriptie.
export const DEFAULT_RADIUS_KM = 2;

const STREET_PREFIX = /^(STRADA|STR|BULEVARDUL|B DUL|BDUL|BLD|BD|CALEA|SOSEAUA|SOS|ALEEA|ALE|INTRAREA|INTR|PIATA|DRUMUL|DRM|DRUM|SPLAIUL|SPLAI|PRELUNGIREA|PREL|FUNDATURA|FDT)\b/;

// Grupeaza variantele de scriere ale fiecarui tip de strada, ca sa putem compara ce tip a scris
// parintele ("Soseaua"/"Sos.") cu tipul din street_raw ("SOS.") chiar daca formele difera.
const PREFIX_GROUPS: Record<string, string[]> = {
  STR: ['STRADA', 'STR'],
  BD: ['BULEVARDUL', 'B DUL', 'BDUL', 'BLD', 'BD'],
  CALEA: ['CALEA'],
  SOS: ['SOSEAUA', 'SOS'],
  ALEEA: ['ALEEA', 'ALE'],
  INTR: ['INTRAREA', 'INTR'],
  PIATA: ['PIATA'],
  DRUM: ['DRUMUL', 'DRM', 'DRUM'],
  SPLAI: ['SPLAIUL', 'SPLAI'],
  PREL: ['PRELUNGIREA', 'PREL'],
  FDT: ['FUNDATURA', 'FDT'],
};
function prefixGroupOf(word: string): string | null {
  for (const [key, words] of Object.entries(PREFIX_GROUPS)) if (words.includes(word)) return key;
  return null;
}
// street_raw poate scrie tipul lipit de restul ("STR.DUDESTI...") sau cu spatiu ("SOS. PANTELIMON");
// normalizam punctele la spatiu ca sa detectam corect primul cuvant in ambele cazuri.
function rawStartsWithPrefixGroup(streetRaw: string, group: string): boolean {
  const norm = streetRaw.toUpperCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  return PREFIX_GROUPS[group].some((w) => new RegExp(`^${w}\\b`).test(norm));
}

// Normalizare identica cu cea din scripts/import-circumscriptii.js (street_norm): fara diacritice,
// majuscule, fara numere de casa, fara prefixul de tip strada. Pastrata pentru compatibilitate;
// parseAddressQuery de mai jos e varianta folosita de lookupStreet (separa si numarul de casa si
// retine tipul de strada scris de parinte, pentru dezambiguizare).
export function normalizeStreetQuery(input: string): string {
  return parseAddressQuery(input).streetQuery;
}

// Separa textul liber introdus de parinte in partea de strada, tipul de strada scris (daca exista,
// ex. "Soseaua"/"Str."/"Aleea") si numarul de casa (daca exista), fie scris explicit ("Nr. 260"),
// fie ca ultimul token numeric din text ("Soseaua Pantelimon 260").
export function parseAddressQuery(input: string): { streetQuery: string; houseNumber: string | null; typedPrefixGroup: string | null } {
  let s = input.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  let houseNumber: string | null = null;

  const nrMatch = s.match(/\bNR\.?:?\s*(\d+[A-Z]?)\b/);
  if (nrMatch) {
    houseNumber = nrMatch[1];
    s = s.slice(0, nrMatch.index).trim();
  } else {
    const trailMatch = s.match(/^(.*?)[\s,]+(\d+[A-Z]?)\s*$/);
    if (trailMatch) {
      s = trailMatch[1];
      houseNumber = trailMatch[2];
    }
  }

  const cleaned = s.replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const prefixMatch = cleaned.match(STREET_PREFIX);
  const typedPrefixGroup = prefixMatch ? prefixGroupOf(prefixMatch[1]) : null;
  const streetQuery = cleaned.replace(STREET_PREFIX, '').trim();
  return { streetQuery, houseNumber, typedPrefixGroup };
}

// Parseaza specificatia de numere din street_raw (dupa "NR"): intervale simple, intervale cu
// paritate ("NR. 251-283 (NR.IMPARE)", "72 - 148 (NR. PARE)"), numere individuale separate prin
// virgula, si cazul "NR: TOATE NUMERELE" (fara restrictie).
interface HouseNumberSegment {
  type: 'all' | 'single' | 'range';
  min?: number;
  max?: number;
  parity?: 'even' | 'odd' | 'all';
}

function parseHouseNumberSegments(streetRaw: string): HouseNumberSegment[] {
  const specMatch = streetRaw.match(/\bNR\.?:?\s*(.+)$/i);
  if (!specMatch) return [];
  const spec = specMatch[1];
  if (/TOATE\s+NUMERELE/i.test(spec)) return [{ type: 'all' }];

  const segments: HouseNumberSegment[] = [];
  for (const rawSeg of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const rangeMatch = rawSeg.match(/^(\d+)\s*-\s*(\d+)\s*(?:\(([^)]+)\))?/);
    if (rangeMatch) {
      const label = rangeMatch[3] || '';
      const hasImpare = /IMPARE/i.test(label);
      const hasPareWord = /\bPARE\b/i.test(label);
      let parity: 'even' | 'odd' | 'all' = 'all';
      if (hasImpare && !hasPareWord) parity = 'odd';
      else if (hasPareWord && !hasImpare) parity = 'even';
      segments.push({ type: 'range', min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10), parity });
      continue;
    }
    const singleMatch = rawSeg.match(/^(\d+)/);
    if (singleMatch) segments.push({ type: 'single', min: parseInt(singleMatch[1], 10) });
  }
  return segments;
}

// Verifica daca un numar de casa se incadreaza in specificatia de numere a lui street_raw. Daca
// street_raw nu are nicio specificatie de numere parsabila, consideram ca nu putem exclude (true).
function houseNumberMatches(streetRaw: string, houseNumber: string): boolean {
  const segments = parseHouseNumberSegments(streetRaw);
  if (segments.length === 0) return true;
  const numMatch = houseNumber.match(/^(\d+)/);
  if (!numMatch) return true;
  const num = parseInt(numMatch[1], 10);
  for (const seg of segments) {
    if (seg.type === 'all') return true;
    if (seg.type === 'single' && seg.min === num) return true;
    if (seg.type === 'range' && seg.min !== undefined && seg.max !== undefined && num >= seg.min && num <= seg.max) {
      if (seg.parity === 'even' && num % 2 !== 0) continue;
      if (seg.parity === 'odd' && num % 2 === 0) continue;
      return true;
    }
  }
  return false;
}

export interface StreetMatch {
  circ_school_id: number;
  school_name: string;
  type: string;
  sector: number | null;
  street_raw: string;
}

export interface LookupResult {
  matches: StreetMatch[];
  // true cand exista exact un rezultat (fie strada e unica, fie numarul de casa a restrans la o
  // singura scoala) - UI-ul poate afisa "adresa dvs. e arondata la" in loc de o lista generica.
  resolved: boolean;
  // true cand numarul de casa a fost folosit ca sa restranga rezultatele (informativ pt. UI).
  numberFiltered: boolean;
  // sugestii de nume de strada (fuzzy) cand cautarea exacta nu a gasit nimic - userul alege una.
  suggestions: string[];
}

const FUZZY_SUGGEST_THRESHOLD = 0.5;

// Cauta strada (+ optional numar de casa) -> scoala/scoli. O strada lunga poate fi impartita intre
// mai multe scoli dupa intervalul de numere: daca avem un numar de casa, incercam sa restrangem la
// scoala exacta; altfel intoarcem toate potrivirile (cu street_raw care contine intervalul), ca
// parintele sa-si identifice tronsonul. Cand nu exista nicio potrivire exacta, propunem sugestii
// fuzzy (typo-tolerante) dintre numele de strada distincte din DB.
export function lookupStreet(db: Database.Database, input: string, sector?: number): LookupResult {
  ensureCircTables(db);
  const { streetQuery, houseNumber, typedPrefixGroup } = parseAddressQuery(input);
  if (streetQuery.length < 3) return { matches: [], resolved: false, numberFiltered: false, suggestions: [] };

  const params: (string | number)[] = [`%${streetQuery}%`];
  let where = 't.street_norm LIKE ?';
  if (sector) { where += ' AND t.sector = ?'; params.push(sector); }
  let matches = db.prepare(
    `SELECT t.circ_school_id, t.street_raw, t.sector, s.name AS school_name, s.type
     FROM circ_streets t JOIN circ_schools s ON s.id = t.circ_school_id
     WHERE ${where}
     ORDER BY (t.street_norm = ?) DESC, s.name
     LIMIT 40`
  ).all(...params, streetQuery) as StreetMatch[];

  // Cand parintele a scris explicit tipul strazii (Soseaua/Str./Aleea...), il folosim ca sa
  // dezambiguizam strazi diferite care coincid dupa stripping-ul prefixului la normalizare
  // (ex. "Sos. Pantelimon" vs "Aleea Pantelimon" vs "Str. Biserica Pantelimon" normalizeaza toate
  // spre variante ce contin "PANTELIMON").
  if (typedPrefixGroup && matches.length > 1) {
    const filtered = matches.filter((m) => rawStartsWithPrefixGroup(m.street_raw, typedPrefixGroup));
    if (filtered.length > 0 && filtered.length < matches.length) matches = filtered;
  }

  let numberFiltered = false;
  if (houseNumber && matches.length > 1) {
    const filtered = matches.filter((m) => houseNumberMatches(m.street_raw, houseNumber));
    if (filtered.length > 0 && filtered.length < matches.length) {
      matches = filtered;
      numberFiltered = true;
    }
  }

  if (matches.length > 0) {
    return { matches, resolved: matches.length === 1, numberFiltered, suggestions: [] };
  }

  // Nicio potrivire exacta: propunem strazi similare (typo-tolerant), acelasi prag ca in
  // /api/schools/route.ts (FUZZY_THRESHOLD = 0.6), usor coborat aici pt. nume de strada mai scurte.
  const distinctParams: (string | number)[] = [];
  let distinctWhere = '';
  if (sector) { distinctWhere = 'WHERE sector = ?'; distinctParams.push(sector); }
  const distinct = db.prepare(
    `SELECT DISTINCT street_norm FROM circ_streets ${distinctWhere}`
  ).all(...distinctParams) as { street_norm: string }[];

  const scored = distinct
    .map((d) => ({ norm: d.street_norm, score: similarity(streetQuery, d.street_norm) }))
    .filter((d) => d.score >= FUZZY_SUGGEST_THRESHOLD && d.norm !== streetQuery)
    .sort((a, b) => b.score - a.score);

  const suggestions: string[] = [];
  for (const s of scored) {
    if (!suggestions.includes(s.norm)) suggestions.push(s.norm);
    if (suggestions.length >= 6) break;
  }

  return { matches: [], resolved: false, numberFiltered: false, suggestions };
}

export interface SchoolNameMatch {
  id: number;
  name: string;
  type: string;
  sector: number | null;
  address: string | null;
}

export interface SchoolNameLookupResult {
  matches: SchoolNameMatch[];
  resolved: boolean;
}

const NAME_FUZZY_THRESHOLD = 0.6;

// Cuvinte generice care apar in majoritatea numelor (tip de unitate, conectori) - le excludem din
// scorarea fuzzy ca sa comparam pe partea distinctiva a numelui (numele propriu, ex. "Bolintineanu"),
// nu pe cuvinte care s-ar potrivi oricum cu aproape orice scoala.
const SCHOOL_NAME_GENERIC_WORDS = new Set([
  'SCOALA', 'SCOLII', 'GIMNAZIALA', 'GIMNAZIAL', 'LICEUL', 'LICEU', 'COLEGIUL', 'COLEGIU',
  'NATIONAL', 'NATIONALA', 'TEORETIC', 'TEORETICA', 'DE', 'LA', 'NR', 'STRUCTURA', 'STRUCTURA',
  'ARONDATA', 'ARONDAT',
]);

// Normalizeaza un nume de scoala pentru comparare: fara diacritice, majuscule, fara ghilimele/
// paranteze/liniute, spatii comprimate. Datele ISMB au diacritice inconsistente intre randuri
// (unele nume au diacritice, altele nu), asa ca normalizarea e obligatorie pt. potrivire corecta.
function normalizeSchoolName(input: string): string {
  return input
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cauta scoala dupa nume (integral sau partial), tolerant la scriere aproximativa. Intai incearca
// potrivire exacta (substring, dupa normalizare) - cazul comun cand parintele scrie corect o parte
// din nume (ex. "Bolintineanu"). Daca nu gaseste nimic, cade pe potrivire fuzzy cuvant-cu-cuvant
// (typo-tolerant): fiecare cuvant distinctiv din query trebuie sa aiba un cuvant apropiat in nume.
export function lookupSchoolByName(db: Database.Database, input: string): SchoolNameLookupResult {
  ensureCircTables(db);
  const query = normalizeSchoolName(input);
  if (query.length < 3) return { matches: [], resolved: false };

  const rows = db.prepare('SELECT id, name, type, sector, address FROM circ_schools').all() as SchoolNameMatch[];
  const normalized = rows.map((r) => ({ row: r, norm: normalizeSchoolName(r.name) }));

  let matched = normalized.filter((r) => r.norm.includes(query));

  if (matched.length === 0) {
    const allWords = query.split(' ').filter((w) => w.length >= 3);
    const queryWords = allWords.filter((w) => !SCHOOL_NAME_GENERIC_WORDS.has(w));
    const words = queryWords.length > 0 ? queryWords : allWords;
    if (words.length > 0) {
      const scored = normalized
        .map((r) => {
          const nameWords = r.norm.split(' ');
          const wordScores = words.map((qw) => Math.max(...nameWords.map((nw) => similarity(qw, nw))));
          const avg = wordScores.reduce((a, b) => a + b, 0) / wordScores.length;
          const min = Math.min(...wordScores);
          return { r, avg, min };
        })
        .filter((s) => s.min >= NAME_FUZZY_THRESHOLD)
        .sort((a, b) => b.avg - a.avg);
      matched = scored.slice(0, 10).map((s) => s.r);
    }
  }

  const matches = matched.slice(0, 15).map((m) => m.row);
  return { matches, resolved: matches.length === 1 };
}

export interface SchoolNumberMatch {
  id: number;
  name: string;
  type: string;
  sector: number | null;
  address: string | null;
}

export interface SchoolNumberLookupResult {
  matches: SchoolNumberMatch[];
  resolved: boolean;
}

// Nu exista o coloana dedicata de numar: numerele stau in text liber in `name`
// (ex. "SCOALA GIMNAZIALA NR.82", "SCOALA GIMNAZIALA NR. 85 - STRUCTURA LA SCOALA GIMNAZIALA NR. 77").
// Cautam potrivire exacta pe numar (cu limite de cuvant, ca "82" sa nu prinda "182"/"382"), apoi
// sortam scolile la care numarul e propriu (apare in prima portiune a numelui, inainte de "-"/"("
// care introduce referinta catre scoala-mama la structurile arondate) inaintea celor unde numarul
// apare doar ca referinta catre alta scoala.
export function lookupSchoolNumber(db: Database.Database, input: string): SchoolNumberLookupResult {
  ensureCircTables(db);
  const query = input.trim().replace(/^NR\.?\s*/i, '').trim();
  if (!/^\d+$/.test(query)) return { matches: [], resolved: false };

  const rows = db.prepare(
    `SELECT id, name, type, sector, address FROM circ_schools WHERE name LIKE '%' || ? || '%'`
  ).all(query) as SchoolNumberMatch[];

  const numberRe = new RegExp(`\\bNR\\.?\\s*${query}\\b`, 'i');
  const matches = rows.filter((r) => numberRe.test(r.name));

  matches.sort((a, b) => {
    const aOwn = numberRe.test(a.name.split(/[-(]/)[0]);
    const bOwn = numberRe.test(b.name.split(/[-(]/)[0]);
    if (aOwn !== bOwn) return aOwn ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { matches, resolved: matches.length === 1 };
}

export function getCircSchool(db: Database.Database, id: number): CircSchool | undefined {
  ensureCircTables(db);
  return db.prepare('SELECT * FROM circ_schools WHERE id = ?').get(id) as CircSchool | undefined;
}

// Toate scolile (pentru generateStaticParams / liste), asigurand tabelele.
export function getAllCircSchools(db: Database.Database): { id: number; name: string }[] {
  ensureCircTables(db);
  return db.prepare('SELECT id, name FROM circ_schools').all() as { id: number; name: string }[];
}

export function getCircStreets(db: Database.Database, circSchoolId: number): string[] {
  return (db.prepare('SELECT street_raw FROM circ_streets WHERE circ_school_id = ? ORDER BY street_raw')
    .all(circSchoolId) as { street_raw: string }[]).map((r) => r.street_raw);
}

export interface NearbyAfterschool {
  id: number; name: string; lat: number; lng: number; distance: number;
  [k: string]: unknown;
}

// Afterschool-uri in raza (implicit 2km), sortate dupa distanta. Server-side (SEO).
export function getNearbyAfterschools(db: Database.Database, lat: number, lng: number, radiusKm = DEFAULT_RADIUS_KM): NearbyAfterschool[] {
  const rows = db.prepare('SELECT * FROM afterschools WHERE is_paused = 0').all() as NearbyAfterschool[];
  return rows
    .map((a) => ({ ...a, distance: calculateDistance(lat, lng, a.lat, a.lng) }))
    .filter((a) => a.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// Numar de activitati (cluburi) pe categorie in raza, pentru widget-ul de sub scoala.
export function getActivityCounts(db: Database.Database, lat: number, lng: number, radiusKm = DEFAULT_RADIUS_KM): Record<string, number> {
  const rows = db.prepare('SELECT category, lat, lng FROM clubs').all() as { category: string; lat: number; lng: number }[];
  const counts: Record<string, number> = {};
  for (const c of rows) {
    if (calculateDistance(lat, lng, c.lat, c.lng) <= radiusKm) counts[c.category] = (counts[c.category] || 0) + 1;
  }
  return counts;
}

export const CIRC_TYPE_LABEL: Record<string, string> = {
  gimnaziu: 'Școală gimnazială',
  liceu: 'Liceu (cu clase gimnaziale)',
  colegiu: 'Colegiu național (cu clase gimnaziale)',
  structura: 'Structură arondată',
};

// Continut editorial unic per sector (SEO) pentru paginile de circumscriptie.
export const CIRC_SECTOR_INFO: Record<string, { despre: string; sfaturi: string[] }> = {
  '1': {
    despre: 'În Sectorul 1, circumscripția școlară stabilește la ce școală gimnazială de stat este arondată adresa copilului. Sectorul acoperă zone precum Aviatorilor, Dorobanți, Băneasa, Domenii și Gara de Nord, cu unele dintre cele mai căutate școli din București.',
    sfaturi: [
      'Verificați intervalul de numere al străzii: pe arterele lungi (Calea Griviței, Bd. Ion Mihalache) numerele pare și impare pot fi arondate la școli diferite',
      'Înscrierea în clasa pregătitoare se face în prima etapă pe baza circumscripției; locurile rămase se completează în etapa a doua',
      'Dacă adresa din buletin diferă de cea de reședință, verificați ce document acceptă școala pentru dovada domiciliului',
    ],
  },
  '2': {
    despre: 'Circumscripțiile școlare din Sectorul 2 acoperă cartiere diverse: Floreasca, Tei, Colentina, Pantelimon și Obor. Fiecare stradă este arondată la o școală gimnazială de stat, care are prioritate la înscrierea în învățământul primar.',
    sfaturi: [
      'Pe Șos. Colentina și Șos. Pantelimon, arondarea se face frecvent pe tronsoane de numere: citiți cu atenție intervalul afișat',
      'Copilul are locul garantat la școala de circumscripție dacă dosarul este complet și depus în prima etapă',
      'Verificați dacă școala are grădiniță arondată, un criteriu de departajare pentru locurile suplimentare',
    ],
  },
  '3': {
    despre: 'Sectorul 3 este cel mai populat sector al Bucureștiului, iar circumscripțiile școlare acoperă Titan, Dristor, Vitan, Balta Albă și IOR. Aflați aici la ce școală gimnazială de stat este arondată adresa dumneavoastră.',
    sfaturi: [
      'În zonele cu multe blocuri (Titan, Balta Albă), o singură școală poate acoperi mai multe alei apropiate',
      'Locurile la clasa pregătitoare sunt limitate, iar cererea în Sectorul 3 este mare: depuneți dosarul din prima zi a etapei',
      'Dacă vă mutați în sector, actualizați dovada de domiciliu înainte de perioada de înscriere',
    ],
  },
  '4': {
    despre: 'Circumscripțiile din Sectorul 4 acoperă Berceni, Olteniței, Giurgiului și Timpuri Noi. Fiecare adresă are o școală gimnazială de stat de circumscripție, cu prioritate la înscrierea în clasa pregătitoare.',
    sfaturi: [
      'Verificați dacă locuiți pe un tronson arondat unei structuri (o școală mai mică arondată la o unitate principală)',
      'Proximitatea față de metrou nu influențează arondarea, aceasta se face strict pe stradă și numere',
      'Întrebați secretariatul școlii despre programul „Școală după școală” dacă aveți nevoie de supraveghere după ore',
    ],
  },
  '5': {
    despre: 'Sectorul 5 cuprinde Cotroceni, 13 Septembrie, Rahova și Ferentari. Circumscripția școlară arată la ce școală gimnazială de stat este arondată adresa copilului pentru înscrierea în învățământul primar.',
    sfaturi: [
      'Oferta de școli variază mult între nordul (Cotroceni) și sudul sectorului: verificați exact strada',
      'Unele străzi sunt arondate la structuri ale unei școli principale; școala de contact rămâne unitatea principală',
      'Dovada domiciliului trebuie să corespundă adresei arondate în circumscripție',
    ],
  },
  '6': {
    despre: 'Circumscripțiile școlare din Sectorul 6 acoperă Drumul Taberei, Militari, Crângași și Giulești. Aflați la ce școală gimnazială de stat este arondată adresa dumneavoastră și ce afterschool-uri sunt în apropiere.',
    sfaturi: [
      'Militari și Drumul Taberei au multe școli apropiate: o diferență de câteva numere poate schimba școala de circumscripție',
      'Verificați intervalul de numere pe Calea Giulești și Bd. Timișoara, artere lungi împărțite între mai multe școli',
      'Dacă școala de circumscripție are sală de sport modernă sau alte facilități, sunt menționate pe pagina școlii',
    ],
  },
};
