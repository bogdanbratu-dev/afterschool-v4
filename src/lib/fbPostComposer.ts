// Compunerea textului postarilor automate pe Pagina de Facebook (vezi src/lib/fbAutoPost.ts
// pentru motorul care declanseaza postarea efectiva si actualizeaza rotatia).
//
// Principiu "cutie cu bile": selectAnchor() alege intotdeauna intre randurile niciodata
// promovate (fb_last_promoted_at NULL) sau cele mai demult promovate, cu ordine aleatorie
// intre randurile la egalitate (RANDOM() in SQL). Asta garanteaza ca toate listarile complete
// sunt mentionate macar o data inainte sa se repete vreuna, dar ordinea in care apar e
// aleatorie, nu determinista.
//
// Reguli de continut: afirmam doar fapte din DB (nume, program daca exista, categorii de club
// reale din raza). Nu inventam. Necunoscutele se formuleaza bland ("posibil program de dupa
// amiaza", "de regula"), fara a suna ca o certitudine. Fara em dash.
//
// Ton: cald, prietenos, modest, discret. Evitam formulari de marketing agresiv ("merita o
// privire", "optiune de urmarit", "nu rata") - preferam observatii simple, la persoana a treia,
// fara superlative si fara indemnuri ferme. CTA-ul de final e o invitatie blanda, nu o comanda.
//
// "Abordari diferite": pe langa variatia de fraze (pick()), fiecare postare foloseste si o
// "forma" de asamblare aleasa aleatoriu (vezi SHAPES mai jos) - ordinea faptelor variaza, uneori
// doua fraze se combina intr-una singura, alteori postarea e scurta si omite un fapt disponibil.
// Asta evita ca toate postarile sa aiba exact acelasi schelet (intro -> program -> activitati ->
// cluburi), chiar daca frazele individuale sunt deja diversificate.
//
// Claritate per-fraza (2026-07-21): userul a semnalat o postare de gradinita ilizibila -- nume de
// cluburi brute (titluri SEO lungi, ex. "SCOALA DE ARTE ZIZI - Cursuri copii de Dans Canto Chitara
// Vioara Balet Breakdance Arte Plastice Teatru - Bucuresti - Sector 4"), zero context de locatie
// pt. gradinita, si o fraza de program ambigua odata ce SHAPES a asezat-o langa fraza de cluburi
// (care are propria ei nota de program). Fix: fiecare fraza trebuie sa fie de-sine-statatoare, ca
// sa ramana clara indiferent de ordinea aleasa de SHAPES -- vezi shortDisplayName/joinNatural mai
// jos si subiectul explicit din programLine-ul gradinitei. Nu mai afisa asa ceva ("sa nu mai vad
// astfel de postari infecte").

import { getDb } from './db';
import type { AfterSchool, Club, Kindergarten, School } from './db';
import { calculateDistance } from './distance';
import { CLUB_CATEGORY_LABELS } from './clubs';
import type { ClubCategory } from './clubs';
import { toSlug } from './slug';

const SITE_URL = 'https://activkids.ro';
const NEARBY_CLUB_RADIUS_KM = 3;
const MAX_CLUBS_MENTIONED = 3;

// Categorii de club potrivite si pt. copii de gradinita (grupa mare), folosite ca preferinta la
// alegerea cluburilor mentionate langa o gradinita/cresa (vezi findNearbyClubs). Restul
// categoriilor (robotica, muzica, arte creative, gimnastica) raman rezervate implicit postarilor
// de afterschool, unde copiii sunt deja de varsta scolara - userul a cerut explicit aceasta
// distinctie 2026-07-22 ("inotul nu da gres niciodata... astea merg si la gradi grupa mare").
const YOUNGER_FRIENDLY_CATEGORIES: ClubCategory[] = ['inot', 'fotbal', 'dansuri', 'arte_martiale', 'limbi_straine'];

export type FbPostTemplate = 'A' | 'B' | 'C';
export type AnchorType = 'afterschool' | 'club' | 'kindergarten';

export interface MentionedEntity {
  type: AnchorType | 'school';
  id: number;
  name: string;
  facebook_url?: string | null;
}

export interface ComposedPost {
  template: FbPostTemplate;
  anchorType: AnchorType;
  anchorId: number;
  text: string;
  mentioned: MentionedEntity[];
}

// Criteriul "complet/eligibil" stabilit in plan: coordonate reale + descriere >60 caractere +
// rating + reviews_count > 3. Pornim doar din acest pool, ca sa nu promovam randuri cu date
// incomplete sau dubioase.
const COMPLETE_WHERE = `
  lat IS NOT NULL AND lng IS NOT NULL
  AND description IS NOT NULL AND length(description) > 60
  AND rating IS NOT NULL AND reviews_count IS NOT NULL AND reviews_count > 3
`;

const ROTATION_ORDER = `ORDER BY (fb_last_promoted_at IS NOT NULL), fb_last_promoted_at ASC, RANDOM()`;

// Verifica daca un interval orar (HH:MM - HH:MM) e plauzibil ca program complet de
// functionare, nu un artefact de scraping (ex. doar intervalul de sosire a copiilor
// capturat gresit ca program integral). Sub 2 ore sau interval negativ (peste miezul
// noptii, ceea ce nu are sens pentru gradinite/afterschooluri) e considerat neplauzibil
// si nu e citat in postare, ca sa nu afirmam ceva evident gresit.
function isPlausibleProgramWindow(start: string, end: string): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const s1 = toMin(start);
  const e1 = toMin(end);
  if (s1 == null || e1 == null) return false;
  return e1 - s1 >= 120;
}

// La fel ca isPlausibleProgramWindow, dar pentru campul liber text `program` care poate
// contine acelasi interval HH:MM-HH:MM extras gresit la scraping (vezi comentariul de mai
// sus). Daca textul e chiar un interval orar de acest tip, aplicam acelasi filtru; altfel
// (text descriptiv, nu un interval simplu) il lasam neschimbat.
function isPlausibleProgramText(text: string): boolean {
  const m = text.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!m) return true;
  return isPlausibleProgramWindow(m[1], m[2]);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Curata un nume brut de club/listare inainte sa apara intr-o fraza cu mai multe mentiuni la
// rand: multe nume din DB sunt titluri SEO lungi, cu segmente separate prin " - " sau cu cuvinte
// de umplutura ("cursuri", "bucuresti", "sector N") lipite la coada in timpul scrapingului.
// Pastram doar partea care identifica efectiv business-ul. Nu se aplica numelui ancorei
// postarii (acela ramane intreg, e subiectul principal), doar listarilor mentionate suplimentar.
function shortDisplayName(raw: string, maxLen = 42): string {
  let name = raw.split(' - ')[0].trim();
  name = name.replace(/\s+(cursuri|curs)\b.*$/i, '').trim();
  name = name.replace(/\s+(bucurești|bucuresti|sector\s*\d+)\b.*$/i, '').trim();
  if (!name) name = raw.split(' - ')[0].trim();
  if (name.length > maxLen) {
    const cut = name.slice(0, maxLen).replace(/\s+\S*$/, '').trim();
    name = cut || name.slice(0, maxLen).trim();
  }
  return name || raw;
}

// Leaga natural o lista de 2-3 elemente ("X, Y și Z") in loc de simplul join cu virgula, care la
// citire rapida se pierde intr-un singur bloc, mai ales cand elementele sunt deja lungi.
function joinNatural(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return items.join(' și ');
  return `${items.slice(0, -1).join(', ')} și ${items[items.length - 1]}`;
}

// "Abordari diferite": fiecare forma primeste intro-ul si pana la 3 fapte optionale, in ordinea
// lor naturala (fact1, fact2, fact3), si decide cum le asambleaza. Impartite intre toate cele 3
// sabloane, ca structura postarii sa varieze, nu doar cuvintele. O forma poate reordona faptele,
// le poate combina intr-o singura fraza, sau poate lasa postarea mai scurta (omitand un fapt
// disponibil) pentru un ton mai discret, fara sa afirme nimic in plus fata de ce exista deja.
// Fiecare fraza individuala ramane de-sine-statatoare (subiect explicit), tocmai ca ordinea
// aleasa aici sa nu poata produce o ambiguitate intre doua fapte alaturate.
type OptionalFact = string | null;
// Set de fapte optionale de lungime variabila (in ordinea lor naturala) - generalizat de la un
// triplet fix, ca sa incapa si fraza de scoala mutata aici de langa intro (vezi buildAfterschoolPost,
// userul a cerut 2026-07-22 ca intro-ul sa inceapa doar cu numele si adresa, nu si cu scoala).
type FactSet = OptionalFact[];

function onlyStrings(lines: OptionalFact[]): string[] {
  return lines.filter((x): x is string => !!x && x.length > 0);
}

function shapeNatural(intro: string, facts: FactSet): string[] {
  return onlyStrings([intro, ...facts]);
}

function shapeInversat(intro: string, facts: FactSet): string[] {
  return onlyStrings([intro, ...[...facts].reverse()]);
}

function shapeContopit(intro: string, facts: FactSet): string[] {
  const [f1, f2, ...rest] = facts;
  const merged = onlyStrings([f1 ?? null, f2 ?? null]).join(' ');
  return onlyStrings([intro, merged || null, ...rest]);
}

function shapeScurt(intro: string, facts: FactSet): string[] {
  return onlyStrings([intro, facts[0] ?? null]);
}

function shapeFapteIntai(intro: string, facts: FactSet): string[] {
  const [f1, f2, f3, ...rest] = facts;
  return onlyStrings([intro, f3 ?? null, f1 ?? null, f2 ?? null, ...rest]);
}

const SHAPES: Array<(intro: string, facts: FactSet) => string[]> = [
  shapeNatural,
  shapeInversat,
  shapeContopit,
  shapeScurt,
  shapeFapteIntai,
];

function assemble(intro: string, facts: FactSet): string[] {
  return pick(SHAPES)(intro, facts);
}

function schoolLabel(school: School): string {
  const num = (school.number || '').trim();
  // Scolile fara numar isi stocheaza numele propriu direct in coloana "number" (vezi
  // CLAUDE.md - refresh ismb.edu.ro 2026-07-15), deci le afisam ca atare, fara prefix "Scoala".
  return /^\d+$/.test(num) ? `Școala ${num}` : num || school.name;
}

function listingUrl(section: string, name: string, id: number): string {
  return `${SITE_URL}/${section}/${toSlug(name, id)}`;
}

// Extrage doar strada/bulevardul dintr-o adresa completa din DB (ex. "Str. Trotusului nr. 39,
// Sector 1" -> "strada Trotusului"), fara numarul casei si fara sector/oras/cod postal - userul a
// cerut explicit 2026-07-22 ca adresa mentionata in postare sa nu fie neaparat 100% completa, doar
// strada/bulevardul (+ cartierul, adaugat separat de apelant). Ia primul segment inainte de prima
// virgula, apoi taie orice numar de casa ramas la coada (simplu, "nr. 39", sau interval "5-11").
function streetLabel(address: string | null | undefined): string | null {
  if (!address) return null;
  let seg = address.split(',')[0].trim();
  seg = seg.replace(/\s+nr\.?\s*\d+[a-zA-Z]?(\s*-\s*\d+[a-zA-Z]?)?\s*$/i, '').trim();
  seg = seg.replace(/\s+\d+[a-zA-Z]?(\s*-\s*\d+[a-zA-Z]?)?\s*$/, '').trim();
  if (!seg) return null;
  seg = seg.replace(/^str\.\s*/i, 'strada ');
  seg = seg.replace(/^strada\b/i, 'strada');
  seg = seg.replace(/^(bd\.?|b-?dul\.?)\s*/i, 'bulevardul ');
  seg = seg.replace(/^bulevardul\b/i, 'bulevardul');
  seg = seg.replace(/^sos\.\s*/i, 'șoseaua ');
  return seg;
}

// Fraza de locatie pt. intro-ul postarii: strada (partiala) + cartier, cu fallback-uri gradate cand
// unul dintre ele lipseste. Niciodata sectorul/numarul complet in aceasta fraza (vezi streetLabel).
function locationPhrase(address: string | null | undefined, neighborhood: string | null | undefined): string | null {
  const street = streetLabel(address);
  if (street && neighborhood) return `pe ${street}, în cartierul ${neighborhood}`;
  if (street) return `pe ${street}`;
  if (neighborhood) return `în cartierul ${neighborhood}`;
  return null;
}

// Etichetare oportunista: daca avem un link de Pagina FB confirmat, il includem ca text simplu
// in mesaj (Facebook il transforma automat in link/preview). Nu e un @mention real garantat -
// Graph API nu garanteaza livrarea notificarii de eticheta catre Pagini pe care nu le
// administram, deci nu promitem asta, doar cream un semnal vizibil catre pagina lor.
function nameWithMention(name: string, facebookUrl?: string | null): string {
  if (facebookUrl) {
    return `${name} (${facebookUrl})`;
  }
  return name;
}

// Eticheta de afisare pt. un club mentionat suplimentar (nu ancora postarii): nume scurtat +
// eticheta FB oportunista + categoria intre paranteze, ca sa fie clar dintr-o privire care e
// clubul si la ce activitate se refera.
function mentionedClubLabel(c: Club): string {
  return `${nameWithMention(shortDisplayName(c.name), c.facebook_url)} (${CLUB_CATEGORY_LABELS[c.category]})`;
}

function formatActivities(raw: string | null | undefined, max = 3): string | null {
  if (!raw) return null;
  const parts = raw
    .split(/[,;]/)
    .map(p => p.trim())
    .filter(Boolean)
    .slice(0, max);
  if (!parts.length) return null;
  return parts.join(', ');
}

function findNearestSchool(lat: number, lng: number): School | null {
  const db = getDb();
  const schools = db.prepare('SELECT * FROM schools').all() as School[];
  let best: School | null = null;
  let bestDist = Infinity;
  for (const s of schools) {
    const d = calculateDistance(lat, lng, s.lat, s.lng);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

function getCompleteClubs(): Club[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM clubs WHERE ${COMPLETE_WHERE}`).all() as Club[];
}

// Alege pana la MAX_CLUBS_MENTIONED cluburi complete din raza, preferand categorii distincte
// (nu 3 cluburi de inot la rand) inainte sa completeze cu urmatoarele cele mai apropiate.
// preferCategories (optional) da prioritate unui subset de categorii (ex. varsta de gradinita)
// fara sa lase niciodata lista goala daca nu sunt destule cluburi din acel subset in apropiere -
// in acel caz se completeaza normal, din restul categoriilor.
function findNearbyClubs(lat: number, lng: number, excludeId?: number, preferCategories?: ClubCategory[]): Club[] {
  const withDist = getCompleteClubs()
    .filter(c => c.id !== excludeId)
    .map(club => ({ club, dist: calculateDistance(lat, lng, club.lat, club.lng) }))
    .filter(x => x.dist <= NEARBY_CLUB_RADIUS_KM)
    .sort((a, b) => a.dist - b.dist);

  const pool = preferCategories && preferCategories.length
    ? [
        ...withDist.filter(x => preferCategories.includes(x.club.category)),
        ...withDist.filter(x => !preferCategories.includes(x.club.category)),
      ]
    : withDist;

  const result: Club[] = [];
  const seenCategories = new Set<string>();
  for (const { club } of pool) {
    if (result.length >= MAX_CLUBS_MENTIONED) break;
    if (seenCategories.has(club.category)) continue;
    seenCategories.add(club.category);
    result.push(club);
  }
  if (result.length < MAX_CLUBS_MENTIONED) {
    for (const { club } of pool) {
      if (result.length >= MAX_CLUBS_MENTIONED) break;
      if (!result.find(c => c.id === club.id)) result.push(club);
    }
  }
  return result;
}

function clubsPhrase(clubs: Club[]): string | null {
  if (!clubs.length) return null;
  const items = clubs.map(mentionedClubLabel);
  // Nota de program atribuita explicit cluburilor (nu "programul" generic), ca sa nu se
  // confunde cu fraza de program a listarii ancora atunci cand SHAPES le aseaza alaturat.
  const scheduleNote = pick([
    'cluburile au, de regulă, propriul program, de după-amiază',
    'fiecare cu orarul lui, de obicei de după-amiază',
    'majoritatea cu program de după-amiază, stabilit separat de fiecare club în parte',
  ]);
  return `${joinNatural(items)}, ${scheduleNote}`;
}

// Gand de final (userul a cerut explicit 2026-07-22): un mesaj cald, subtil, despre echilibru -
// copiii au nevoie si de timp liber/joaca/timp cu parintii, nu doar de activitati, si ca merita
// alese activitati aproape de casa ca sa nu se piarda timp in trafic. Variat, ca sa nu sune
// mereu la fel, dar mereu formulat ca observatie, nu ca sfat ferm sau lista de reguli.
function closingThought(): string {
  return pick([
    'Un gand mic la final: copiii au nevoie și de timp liber, de joacă și de timp cu părinții, nu doar de activități organizate. De multe ori una sau două activități sunt suficiente pentru un copil, iar cele alese aproape de casă lasă mai mult timp liber și mai puțin pierdut în trafic.',
    'Merită spus și asta: pe lângă activități, copiii au nevoie de timp de joacă și de timp petrecut cu familia. O activitate sau două sunt de multe ori suficiente, iar opțiunile din apropiere ajută să nu se consume timp bun în trafic.',
    'O mică observație, nu o regulă: activitățile sunt utile, dar la fel de importante sunt joaca liberă și timpul cu părinții. Una sau două activități per copil sunt de obicei suficiente, iar cele din apropiere lasă mai mult timp pentru restul.',
    'Un ultim gând: copiii au nevoie și de timp nestructurat, de joacă și de părinți, nu doar de un program plin. Una-două activități sunt de regulă de ajuns, mai ales dacă sunt alese aproape, ca să nu se piardă ore bune în trafic.',
    'Și o vorbă bună la final: pe lângă activități, e important să rămână timp și pentru joacă liberă și pentru familie. De multe ori, una sau două activități sunt suficiente per copil, iar cele din apropierea casei lasă mai mult timp liber cu adevărat.',
  ]);
}

// Invitatie de final, blanda si discreta: fara comenzi ferme ("Da follow ca sa nu ratezi"),
// fara promisiuni de continut frecvent. Doar un semnal ca pagina exista, pentru cine e curios.
// Exportata pt. compunerea prin AI (fbAutoPost.ts) - CTA-ul ramane deterministic/verificat, Claude
// scrie doar corpul postarii, niciodata acest indemn final.
export function ctaClosing(): string {
  return pick([
    'Mai multe detalii sunt pe activkids.ro. Dacă vă e de folos, ne bucurăm să ne urmăriți pagina, mai apar din când în când recomandări din cartier.',
    'Detalii complete pe activkids.ro. Pagina noastră adună, încet, recomandări din diverse zone ale orașului, dacă vreți să le vedeți pe măsură ce apar.',
    'Găsiți restul informațiilor pe activkids.ro. Nu promitem postări dese, dar din când în când mai apare câte o recomandare din zonă.',
    'Toate detaliile sunt pe activkids.ro. Rămânem prin preajmă, cu câte o recomandare din când în când, dacă vă e de folos.',
    'Pe activkids.ro găsiți tot ce mai trebuie știut. Ne-ar face plăcere să ne urmăriți, fără zgomot, doar câte o recomandare bună din când în când.',
    'Restul detaliilor sunt pe activkids.ro. Din când în când mai apar recomandări din cartierele Bucureștiului, pentru cine e curios.',
  ]);
}

function selectAnchor<T>(table: string, mapRow: (r: unknown) => T): T | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM ${table} WHERE ${COMPLETE_WHERE} ${ROTATION_ORDER} LIMIT 1`).get();
  if (!row) return null;
  return mapRow(row);
}

function buildAfterschoolPost(afterschool: AfterSchool): ComposedPost {
  const school = findNearestSchool(afterschool.lat, afterschool.lng);
  const clubs = findNearbyClubs(afterschool.lat, afterschool.lng);
  const url = listingUrl('afterschool', afterschool.name, afterschool.id);
  const label = school ? schoolLabel(school) : null;

  // Intro-ul incepe mereu cu numele afacerii, apoi adresa (strada/bulevard, nu neaparat cu
  // numarul complet) si cartierul - userul a cerut explicit 2026-07-22 aceasta ordine, dupa o
  // postare generata (prin stratul AI) care incepea cu cartierul si o adresa 100% completa.
  const asName = nameWithMention(afterschool.name, afterschool.facebook_url);
  const loc = locationPhrase(afterschool.address, afterschool.neighborhood);
  const intro = loc
    ? pick([
        `${asName}, ${loc}, este un afterschool din București.`,
        `${asName} funcționează ${loc}.`,
        `${asName}, ${loc}, e una dintre variantele de afterschool din zonă.`,
        `Găsești ${asName} ${loc}.`,
        `${asName} activează ${loc}, ca afterschool.`,
      ])
    : pick([
        `${asName} este un afterschool din București.`,
        `${asName} funcționează ca afterschool și are câteva recenzii bune de la părinți.`,
        `Un afterschool despre care am auzit lucruri frumoase este ${asName}.`,
        `${asName} e unul dintre afterschoolurile din oraș, cu recenzii pozitive.`,
        `Printre afterschoolurile din București se numără și ${asName}.`,
        `${asName} e o variantă de afterschool, pentru cine caută prin zonă.`,
      ]);

  // Scoala apropiata devine o fraza separata (nu mai face parte din intro), cu subiect explicit
  // ca sa ramana clara indiferent de pozitia aleasa de SHAPES.
  const schoolLine = label
    ? pick([
        `Este aproape de ${label}.`,
        `Se află la mică distanță de ${label}.`,
        `În apropiere se află ${label}.`,
        `Nu departe se află ${label}.`,
      ])
    : null;

  let programLine: string | null = null;
  if (afterschool.pickup_time && afterschool.end_time && isPlausibleProgramWindow(afterschool.pickup_time, afterschool.end_time)) {
    programLine = pick([
      `Programul afterschoolului e între ${afterschool.pickup_time} și ${afterschool.end_time}.`,
      `Funcționează între ${afterschool.pickup_time} și ${afterschool.end_time}.`,
      `Copiii pot fi preluați între ${afterschool.pickup_time} și ${afterschool.end_time}.`,
      `Orarul e, de regulă, ${afterschool.pickup_time} - ${afterschool.end_time}.`,
    ]);
  }

  const activities = formatActivities(afterschool.activities);
  const activitiesLine = activities
    ? pick([
        `Printre activități se numără ${activities}.`,
        `La program sunt și ${activities}.`,
        `Copiii au parte, printre altele, de ${activities}.`,
      ])
    : null;

  const clubsText = clubsPhrase(clubs);
  const clubsLine = clubsText
    ? pick([
        `Tot în zonă mai sunt și câteva cluburi de activități, ca ${clubsText}.`,
        `Prin apropiere se găsesc și cluburi precum ${clubsText}, pentru cine vrea și o activitate în plus.`,
        `În cartier mai sunt și cluburi ca ${clubsText}.`,
      ])
    : null;

  const lines = assemble(intro, [schoolLine, programLine, activitiesLine, clubsLine]);

  lines.push(closingThought());
  lines.push(url);
  lines.push(ctaClosing());

  const mentioned: MentionedEntity[] = [
    { type: 'afterschool', id: afterschool.id, name: afterschool.name, facebook_url: afterschool.facebook_url },
    ...(school ? [{ type: 'school' as const, id: school.id, name: school.name }] : []),
    ...clubs.map(c => ({ type: 'club' as const, id: c.id, name: c.name, facebook_url: c.facebook_url })),
  ];

  return { template: 'A', anchorType: 'afterschool', anchorId: afterschool.id, text: lines.join('\n\n'), mentioned };
}

function composeTemplateA(): ComposedPost | null {
  const afterschool = selectAnchor<AfterSchool>('afterschools', r => r as AfterSchool);
  if (!afterschool) return null;
  return buildAfterschoolPost(afterschool);
}

export function composeForAfterschoolId(id: number): ComposedPost | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM afterschools WHERE id = ?').get(id) as AfterSchool | undefined;
  if (!row) return null;
  return buildAfterschoolPost(row);
}

function buildKindergartenPost(kindergarten: Kindergarten): ComposedPost {
  // Spre diferenta de afterschool, o gradinita/cresa nu are o legatura functionala cu o
  // scoala anume (copiii de acolo nu au inca scoala), deci nu ii cautam/mentionam scoala
  // cea mai apropiata aici. In schimb, ca sa nu ramana postarea fara niciun reper de locatie
  // (defect semnalat de user 2026-07-21), folosim cartierul/sectorul din DB.
  const clubs = findNearbyClubs(kindergarten.lat, kindergarten.lng, undefined, YOUNGER_FRIENDLY_CATEGORIES);
  const url = listingUrl('gradinite', kindergarten.name, kindergarten.id);
  const kindLabel = kindergarten.type === 'cresa' ? 'creșă' : 'grădiniță';
  const kindLabelPlural = kindergarten.type === 'cresa' ? 'creșele' : 'grădinițele';
  const kindGenitiv = kindergarten.type === 'cresa' ? 'creșei' : 'grădiniței';
  const kindLabelCap = kindergarten.type === 'cresa' ? 'Creșa' : 'Grădinița';

  // Intro-ul incepe mereu cu numele afacerii, apoi adresa (strada/bulevard, nu neaparat cu
  // numarul complet) si cartierul, cu fallback pe sector cand lipsesc ambele - vezi comentariul
  // identic din buildAfterschoolPost (cerinta userului din 2026-07-22).
  const loc = locationPhrase(kindergarten.address, kindergarten.neighborhood)
    ?? (kindergarten.sector ? `din Sectorul ${kindergarten.sector}` : 'din București');

  const kgName = nameWithMention(kindergarten.name, kindergarten.facebook_url);
  const intro = pick([
    `${kgName} este o ${kindLabel} ${loc}.`,
    `${kgName} e o ${kindLabel} ${loc}, despre care părinții vorbesc frumos.`,
    `${kgName} funcționează ca ${kindLabel} ${loc} și are câteva recenzii bune.`,
    `${kgName} e o ${kindLabel} ${loc}, cu recenzii pozitive de la părinți.`,
    `${kgName}, ${kindLabel} ${loc}, e una dintre opțiunile disponibile.`,
    `${kgName} este o ${kindLabel} ${loc}, printre ${kindLabelPlural} din zonă.`,
  ]);

  // Programul e mereu atribuit explicit gradinitei/cresei (nu o fraza generica "Programul e...")
  // ca sa ramana clar despre cine e vorba chiar si atunci cand SHAPES aseaza aceasta fraza
  // langa nota de program a cluburilor mentionate mai jos.
  let programLine: string | null = null;
  if (kindergarten.program_start && kindergarten.program_end && isPlausibleProgramWindow(kindergarten.program_start, kindergarten.program_end)) {
    programLine = pick([
      `Programul ${kindGenitiv} e între ${kindergarten.program_start} și ${kindergarten.program_end}.`,
      `${kindLabelCap} are program între ${kindergarten.program_start} și ${kindergarten.program_end}.`,
      `Program zilnic la ${kindLabel}: ${kindergarten.program_start} - ${kindergarten.program_end}.`,
    ]);
  } else if (kindergarten.program && isPlausibleProgramText(kindergarten.program)) {
    programLine = `Programul ${kindGenitiv}: ${kindergarten.program}.`;
  }

  const activities = formatActivities(kindergarten.activities);
  const activitiesLine = activities
    ? pick([
        `Printre activități se numără ${activities}.`,
        `La program sunt incluse și ${activities}.`,
        `Copiii au parte, printre altele, de ${activities}.`,
      ])
    : null;

  const clubsText = clubsPhrase(clubs);
  const clubsLine = clubsText
    ? pick([
        `Iar pentru mai târziu, când vor fi mai mari, în zonă mai sunt și cluburi de activități, ca ${clubsText}.`,
        `Pentru mai târziu, prin apropiere se găsesc și cluburi precum ${clubsText}.`,
        `Tot în cartier, pentru mai târziu, mai sunt și cluburi ca ${clubsText}.`,
      ])
    : null;

  const lines = assemble(intro, [programLine, activitiesLine, clubsLine]);

  lines.push(closingThought());
  lines.push(url);
  lines.push(ctaClosing());

  const mentioned: MentionedEntity[] = [
    { type: 'kindergarten', id: kindergarten.id, name: kindergarten.name, facebook_url: kindergarten.facebook_url },
    ...clubs.map(c => ({ type: 'club' as const, id: c.id, name: c.name, facebook_url: c.facebook_url })),
  ];

  return { template: 'B', anchorType: 'kindergarten', anchorId: kindergarten.id, text: lines.join('\n\n'), mentioned };
}

function composeTemplateB(): ComposedPost | null {
  const kindergarten = selectAnchor<Kindergarten>('kindergartens', r => r as Kindergarten);
  if (!kindergarten) return null;
  return buildKindergartenPost(kindergarten);
}

export function composeForKindergartenId(id: number): ComposedPost | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM kindergartens WHERE id = ?').get(id) as Kindergarten | undefined;
  if (!row) return null;
  return buildKindergartenPost(row);
}

function composeTemplateC(): ComposedPost | null {
  const club = selectAnchor<Club>('clubs', r => r as Club);
  if (!club) return null;

  const school = findNearestSchool(club.lat, club.lng);
  const otherClubs = findNearbyClubs(club.lat, club.lng, club.id).slice(0, 2);
  const url = listingUrl('activitati', club.name, club.id);
  const categoryLabel = CLUB_CATEGORY_LABELS[club.category];

  // Aceeasi ordine nume -> adresa (partiala) ca la sabloanele A/B, pt. consistenta, desi acest
  // sablon nu mai e ales in rotatia automata (vezi pickRandomTemplate) - ramane disponibil pt.
  // generare manuala/viitoare reactivare.
  const clubName = nameWithMention(club.name, club.facebook_url);
  const catLower = categoryLabel.toLowerCase();
  const clubLoc = locationPhrase(club.address, club.neighborhood);
  const intro = clubLoc
    ? pick([
        `${clubName}, ${clubLoc}, este un club de ${catLower}.`,
        `${clubName} funcționează ${clubLoc}, ca club de ${catLower}.`,
        `${clubName}, club de ${catLower}, se află ${clubLoc}.`,
        `Găsești ${clubName}, club de ${catLower}, ${clubLoc}.`,
      ])
    : pick([
        `${clubName} este un club de ${catLower} din zonă.`,
        `${clubName} e un club de ${catLower} despre care părinții vorbesc frumos.`,
        `${clubName}, club de ${catLower}, are câteva recenzii bune de la părinți.`,
      ]);

  const scheduleLine = club.schedule
    ? pick([
        `Program: ${club.schedule}.`,
        `Orar: ${club.schedule}.`,
        `Funcționează după programul ${club.schedule}.`,
      ])
    : pick([
        'Are, de regulă, program de după-amiază, potrivit după orele de școală.',
        'Programul e organizat, de regulă, după orele de școală.',
      ]);

  const schoolLine = school
    ? pick([
        `Se află aproape de ${schoolLabel(school)}.`,
        `E la mică distanță de ${schoolLabel(school)}.`,
        `Se găsește în apropierea ${schoolLabel(school)}.`,
      ])
    : null;

  let otherClubsLine: string | null = null;
  if (otherClubs.length) {
    const items = otherClubs.map(mentionedClubLabel);
    otherClubsLine = pick([
      `Tot în zonă mai sunt și ${joinNatural(items)}, pentru cine vrea și alte activități.`,
      `Prin apropiere mai găsești și ${joinNatural(items)}.`,
      `Pentru mai multe opțiuni, în zonă sunt și ${joinNatural(items)}.`,
    ]);
  }

  const lines = assemble(intro, [scheduleLine, schoolLine, otherClubsLine]);

  lines.push(closingThought());
  lines.push(url);
  lines.push(ctaClosing());

  const mentioned: MentionedEntity[] = [
    { type: 'club', id: club.id, name: club.name, facebook_url: club.facebook_url },
    ...(school ? [{ type: 'school' as const, id: school.id, name: school.name }] : []),
    ...otherClubs.map(c => ({ type: 'club' as const, id: c.id, name: c.name, facebook_url: c.facebook_url })),
  ];

  return { template: 'C', anchorType: 'club', anchorId: club.id, text: lines.join('\n\n'), mentioned };
}

export function composePost(template: FbPostTemplate): ComposedPost | null {
  if (template === 'A') return composeTemplateA();
  if (template === 'B') return composeTemplateB();
  return composeTemplateC();
}

// Momentan doar afterschool/gradinita pot fi ancora principala a rotatiei automate (cerere
// user 2026-07-22: "as vrea ca postarile sa se genereze momentan doar cu elementul principal
// afterschool sau gradinite si dupa aceea sa se mentioneze activitati pe langa ca si secundare").
// Sablonul C (club ca ancora) ramane definit mai sus (composeTemplateC/composePost('C')) pt.
// generare manuala/viitoare reactivare, dar nu mai e ales aici.
export function pickRandomTemplate(): FbPostTemplate {
  return pick(['A', 'B']);
}

// Fisa de fapte confirmate pt. o ancora, folosita de regenerarea prin AI (vezi fbAutoPost.ts
// regenerateQueuedPost) ca sa i se dea Claude-ului DOAR date reale din DB, niciodata inventate.
// Reutilizeaza `mentioned` deja salvat pe randul din coada (scoala + cluburi deja verificate/
// alese la generarea initiala), nu recalculeaza alte entitati noi de mentionat.
export interface AnchorFactSheet {
  text: string;
  website: string | null;
  url: string;
}

export function getFactSheetForAnchor(
  anchorType: AnchorType,
  anchorId: number,
  mentioned: MentionedEntity[]
): AnchorFactSheet | null {
  const db = getDb();
  const lines: string[] = [];
  let website: string | null = null;
  let url: string;

  if (anchorType === 'afterschool') {
    const a = db.prepare('SELECT * FROM afterschools WHERE id = ?').get(anchorId) as AfterSchool | undefined;
    if (!a) return null;
    lines.push(`Nume: ${a.name}`);
    lines.push(`Tip: afterschool`);
    if (a.sector) lines.push(`Sector: ${a.sector}`);
    if (a.neighborhood) lines.push(`Cartier real (singurul reper de zona valabil): ${a.neighborhood}`);
    if (streetLabel(a.address)) lines.push(`Strada (partiala, fara numar - de folosit ca atare, niciodata cu numarul/sectorul complet): ${streetLabel(a.address)}`);
    if (a.pickup_time && a.end_time) lines.push(`Program: ${a.pickup_time} - ${a.end_time}`);
    if (a.activities) lines.push(`Activitati: ${a.activities}`);
    if (a.rating) lines.push(`Rating: ${a.rating} (${a.reviews_count} recenzii)`);
    if (a.facebook_url) lines.push(`Pagina Facebook: ${a.facebook_url}`);
    website = a.website || null;
    if (website) lines.push(`Website propriu: ${website}`);
    url = listingUrl('afterschool', a.name, a.id);
    lines.push(`URL listare (obligatoriu de inclus in postare, ca linie separata): ${url}`);
  } else if (anchorType === 'kindergarten') {
    const k = db.prepare('SELECT * FROM kindergartens WHERE id = ?').get(anchorId) as Kindergarten | undefined;
    if (!k) return null;
    lines.push(`Nume: ${k.name}`);
    lines.push(`Tip: ${k.type === 'cresa' ? 'cresa' : 'gradinita'}`);
    if (k.sector) lines.push(`Sector: ${k.sector}`);
    if (k.neighborhood) lines.push(`Cartier real (singurul reper de zona valabil): ${k.neighborhood}`);
    if (streetLabel(k.address)) lines.push(`Strada (partiala, fara numar - de folosit ca atare, niciodata cu numarul/sectorul complet): ${streetLabel(k.address)}`);
    if (k.program_start && k.program_end) lines.push(`Program: ${k.program_start} - ${k.program_end}`);
    else if (k.program) lines.push(`Program: ${k.program}`);
    if (k.activities) lines.push(`Activitati: ${k.activities}`);
    if (k.rating) lines.push(`Rating: ${k.rating} (${k.reviews_count} recenzii)`);
    if (k.facebook_url) lines.push(`Pagina Facebook: ${k.facebook_url}`);
    website = k.website || null;
    if (website) lines.push(`Website propriu: ${website}`);
    url = listingUrl('gradinite', k.name, k.id);
    lines.push(`URL listare (obligatoriu de inclus in postare, ca linie separata): ${url}`);
  } else {
    const c = db.prepare('SELECT * FROM clubs WHERE id = ?').get(anchorId) as Club | undefined;
    if (!c) return null;
    lines.push(`Nume: ${c.name}`);
    lines.push(`Tip: club de ${CLUB_CATEGORY_LABELS[c.category].toLowerCase()}`);
    if (c.sector) lines.push(`Sector: ${c.sector}`);
    if (c.neighborhood) lines.push(`Cartier real (singurul reper de zona valabil): ${c.neighborhood}`);
    if (streetLabel(c.address)) lines.push(`Strada (partiala, fara numar - de folosit ca atare, niciodata cu numarul/sectorul complet): ${streetLabel(c.address)}`);
    if (c.schedule) lines.push(`Program: ${c.schedule}`);
    if (c.rating) lines.push(`Rating: ${c.rating} (${c.reviews_count} recenzii)`);
    if (c.facebook_url) lines.push(`Pagina Facebook: ${c.facebook_url}`);
    website = c.website || null;
    if (website) lines.push(`Website propriu: ${website}`);
    url = listingUrl('activitati', c.name, c.id);
    lines.push(`URL listare (obligatoriu de inclus in postare, ca linie separata): ${url}`);
  }

  const school = mentioned.find(m => m.type === 'school');
  if (school) lines.push(`Scoala apropiata (fapt confirmat, poate fi mentionata): ${school.name}`);
  const clubs = mentioned.filter(m => m.type === 'club');
  if (clubs.length) lines.push(`Cluburi apropiate (fapte confirmate, pot fi mentionate): ${clubs.map(c => c.name).join(', ')}`);

  return { text: lines.join('\n'), website, url };
}

export type CustomAnchorType = 'afterschool' | 'kindergarten';

export interface AnchorSearchResult {
  id: number;
  name: string;
}

// Cautare pe nume pt selectia manuala a unei ancore specifice (postare "la cerere", separata de
// rotatia automata). unaccent e inregistrata global pe conexiune (vezi db.ts), deci cautarea e
// insensibila la diacritice, la fel ca la cautarea de scoli.
export function searchAnchorsByName(anchorType: CustomAnchorType, q: string): AnchorSearchResult[] {
  const db = getDb();
  const table = anchorType === 'afterschool' ? 'afterschools' : 'kindergartens';
  const term = q.trim();
  if (!term) return [];
  return db
    .prepare(`SELECT id, name FROM ${table} WHERE unaccent(name) LIKE unaccent(?) ORDER BY name LIMIT 20`)
    .all(`%${term}%`) as AnchorSearchResult[];
}

export function composeForAnchor(anchorType: CustomAnchorType, id: number): ComposedPost | null {
  return anchorType === 'afterschool' ? composeForAfterschoolId(id) : composeForKindergartenId(id);
}

// Numarul de randuri eligibile (pool "complet") per verticala, folosit in admin ca sa se vada
// progresul rotatiei (cate au fost deja mentionate in ciclul curent, adica au
// fb_last_promoted_at != NULL, fata de total eligibile).
export function getEligiblePoolStats() {
  const db = getDb();
  const stat = (table: string) => {
    const row = db
      .prepare(
        `SELECT COUNT(*) as total, SUM(CASE WHEN fb_last_promoted_at IS NOT NULL THEN 1 ELSE 0 END) as promoted
         FROM ${table} WHERE ${COMPLETE_WHERE}`
      )
      .get() as { total: number; promoted: number | null };
    return { total: row.total, promoted: row.promoted || 0 };
  };
  return {
    afterschools: stat('afterschools'),
    clubs: stat('clubs'),
    kindergartens: stat('kindergartens'),
  };
}
