// Motorul de calcul pentru widgetul public "Potentialul zonei" (/promovare). Raspunde la intrebarea
// unui proprietar de afterschool/gradinita/club: "cat de buna e zona asta pentru afacerea mea?".
//
// Regula de baza a intregului fisier: NICIO cifra afisata nu se inventeaza. Fiecare metrica vine
// dintr-o interogare reala pe DB-ul propriu (concurenta, clickuri, vizualizari, sloturi Premium) sau
// e etichetata explicit ca estimare pe benchmark (bugetul de reclama, din adBenchmarks.ts). Nu exista
// date demografice (populatie, natalitate, venit) in DB si nu se aproximeaza aici.
import type Database from 'better-sqlite3';
import { calculateDistance } from './distance';
import { ZONE_CENTROIDS, getZone } from './zones';
import { readZoneSpotlightConfig, type SpotlightConfig } from './premiumRanking';
import { estimateBudget, type BudgetEstimate } from './adBenchmarks';

export type BusinessType = 'afterschool' | 'kindergarten' | 'club';
export type RadiusKm = number; // validat/rotunjit la intreg intre 1 si 5 in rutele API, vezi clampRadiusKm

export function clampRadiusKm(raw: unknown): number {
  const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export const TABLE_FOR_TYPE: Record<BusinessType, string> = {
  afterschool: 'afterschools',
  kindergarten: 'kindergartens',
  club: 'clubs',
};

const CLICK_TYPE_FOR_BUSINESS: Record<BusinessType, string> = {
  afterschool: 'afterschool',
  kindergarten: 'kindergarten',
  club: 'club',
};

// Prefixul de ruta publica al fiecarui tip, pentru extragerea id-ului din slug-ul salvat in
// pageviews.page (ex. "/afterschool/nume-listare-246" -> id 246).
export const PAGE_PREFIX: Record<BusinessType, RegExp> = {
  afterschool: /^\/afterschool\/[^/]+-(\d+)\/?$/,
  club: /^\/activitati\/[^/]+-(\d+)\/?$/,
  kindergarten: /^\/gradinite\/[^/]+-(\d+)\/?$/,
};

const LABEL_FOR_TYPE: Record<BusinessType, string> = {
  afterschool: 'afterschool-uri',
  kindergarten: 'gradinite',
  club: 'cluburi de activitati',
};

// Capacitatea totala de sloturi de promovare pt. un sector (k = clamp(round(total*ratio), min, max)),
// aceeasi formula ca `spotlightCount` din premiumRanking.ts, dar FARA clamparea suplimentara la
// premiumCount pe care o face acea functie (ea raspunde la "cate din premiumurile EXISTENTE se
// rotesc in spotlight" - corect pentru afisarea live a listarilor, dar gresit pentru argumentul de
// vanzare de-aici: cand un sector n-are inca niciun Premium, spotlightCount ar intoarce 0 sloturi
// libere, adica exact opusul mesajului pe care vrem sa-l transmitem unui cumparator nou).
function spotlightCapacity(total: number, cfg: SpotlightConfig): number {
  const k = Math.round(total * cfg.ratio);
  return Math.max(cfg.min, Math.min(cfg.max, k));
}

// Centroide aproximative pe sector, aceleasi valori ca in scripts/geocode-professionals.js
// (SECTOR_CENTROID) - folosite doar cand adresa a fost rezolvata printr-un cartier fara sector
// explicit (strada rezolvata prin circ_streets are deja sectorul real, direct din DB).
const SECTOR_CENTROIDS: [number, number, number][] = [
  [1, 44.4796, 26.0765],
  [2, 44.4368, 26.1225],
  [3, 44.4268, 26.1608],
  [4, 44.3801, 26.1225],
  [5, 44.4034, 26.0623],
  [6, 44.4378, 26.0298],
];

export function resolveSector(lat: number, lng: number): number {
  let best = 1;
  let bestDist = Infinity;
  for (const [sector, slat, slng] of SECTOR_CENTROIDS) {
    const d = (lat - slat) ** 2 + (lng - slng) ** 2;
    if (d < bestDist) { bestDist = d; best = sector; }
  }
  return best;
}

interface RawMetrics {
  competitorCount: number;
  premiumCount: number;
  avgRating: number | null;
  ratedCount: number;
  priceMidAvg: number | null;
  priceSampleN: number;
  schoolsInRadius: number;
  kindergartensInRadius: number;
  ssdSchoolsInRadius: number;
  avgMediaEn: number | null;
  demandClicks90d: number;
  pageviews90d: number;
  searchesResolved: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMAND_WINDOW_MS = 90 * DAY_MS;
const CLICK_CAP_PER_ITEM_PER_DAY = 5; // plafon anti-bot, vezi CLAUDE.md re. inflatia din iulie 2026
const VALID_CLICK_LINK_TYPES = new Set(['phone', 'website', 'email', 'maps']);

function radiusRows<T extends { lat: number | null; lng: number | null }>(
  rows: T[], lat: number, lng: number, radiusKm: number
): (T & { distance: number })[] {
  const out: (T & { distance: number })[] = [];
  for (const r of rows) {
    if (r.lat == null || r.lng == null || r.lat === 0 || r.lng === 0) continue;
    const distance = calculateDistance(lat, lng, r.lat, r.lng);
    if (distance <= radiusKm) out.push({ ...r, distance });
  }
  return out;
}

// Toate metricile brute, reale, pentru un punct+raza+tip de business dat. Reutilizata atat pentru
// raportul cerut de user, cat si pentru distributia de referinta (cele 43 de zone) folosita la scor.
function computeRawMetrics(
  db: Database.Database,
  businessType: BusinessType,
  clubCategory: string | null,
  lat: number,
  lng: number,
  radiusKm: number
): RawMetrics {
  const table = TABLE_FOR_TYPE[businessType];

  // --- A. Concurenta ---
  type ListingRow = {
    id: number; lat: number | null; lng: number | null; is_premium: number;
    rating: number | null; reviews_count: number | null;
    price_min: number | null; price_max: number | null; category?: string;
  };
  const cols = 'id, lat, lng, is_premium, rating, reviews_count, price_min, price_max' + (table === 'clubs' ? ', category' : '');
  const pausedFilter = table === 'afterschools' ? 'WHERE is_paused = 0' : '';
  const allRows = db.prepare(`SELECT ${cols} FROM ${table} ${pausedFilter}`).all() as ListingRow[];
  const scoped = table === 'clubs' && clubCategory ? allRows.filter((r) => r.category === clubCategory) : allRows;
  const inRadius = radiusRows(scoped, lat, lng, radiusKm);

  const competitorCount = inRadius.length;
  const premiumCount = inRadius.filter((r) => r.is_premium === 1).length;
  const rated = inRadius.filter((r) => r.rating != null);
  const avgRating = rated.length ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : null;
  const priced = inRadius.filter((r) => r.price_min != null && r.price_max != null);
  const priceMidAvg = priced.length
    ? priced.reduce((s, r) => s + ((r.price_min as number) + (r.price_max as number)) / 2, 0) / priced.length
    : null;

  // --- copii din zona: scoli + gradinite in raza ---
  const schoolRows = db.prepare('SELECT id, lat, lng FROM schools').all() as { id: number; lat: number; lng: number }[];
  const schoolsInRadius = radiusRows(schoolRows, lat, lng, radiusKm).length;

  const kgRows = table === 'kindergartens'
    ? scoped as unknown as { lat: number | null; lng: number | null }[]
    : (db.prepare('SELECT lat, lng FROM kindergartens').all() as { lat: number | null; lng: number | null }[]);
  const kindergartensInRadius = table === 'kindergartens' ? competitorCount : radiusRows(kgRows, lat, lng, radiusKm).length;

  // --- circumscriptii: concurenta directa (SSD) + calitate medie (Evaluare Nationala) ---
  const circRows = db.prepare(
    'SELECT id, lat, lng, ssd_available, media_en FROM circ_schools WHERE lat IS NOT NULL AND lng IS NOT NULL'
  ).all() as { id: number; lat: number; lng: number; ssd_available: number; media_en: number | null }[];
  const circInRadius = radiusRows(circRows, lat, lng, radiusKm);
  const ssdSchoolsInRadius = circInRadius.filter((c) => c.ssd_available === 1).length;
  const withMedia = circInRadius.filter((c) => c.media_en != null);
  const avgMediaEn = withMedia.length ? withMedia.reduce((s, c) => s + (c.media_en as number), 0) / withMedia.length : null;

  // --- B. Cerere observata (clickuri, ultimele 90 zile, plafonate anti-bot) ---
  const competitorIds = new Set(inRadius.map((r) => r.id));
  const since = Date.now() - DEMAND_WINDOW_MS;
  const clickType = CLICK_TYPE_FOR_BUSINESS[businessType];
  const clickRows = db.prepare(
    `SELECT item_id, timestamp, link_type FROM result_clicks WHERE type = ? AND timestamp >= ?`
  ).all(clickType, since) as { item_id: number; timestamp: number; link_type: string }[];

  const perItemDay = new Map<string, number>();
  for (const c of clickRows) {
    if (!competitorIds.has(c.item_id)) continue;
    if (!VALID_CLICK_LINK_TYPES.has(c.link_type)) continue;
    const day = Math.floor(c.timestamp / DAY_MS);
    const key = `${c.item_id}:${day}`;
    perItemDay.set(key, (perItemDay.get(key) || 0) + 1);
  }
  let demandClicks90d = 0;
  for (const v of perItemDay.values()) demandClicks90d += Math.min(v, CLICK_CAP_PER_ITEM_PER_DAY);

  // --- pageviews (vizualizari pagina de detaliu, ultimele 90 zile) ---
  const pvRows = db.prepare('SELECT page, timestamp FROM pageviews WHERE timestamp >= ?').all(since) as { page: string; timestamp: number }[];
  let pageviews90d = 0;
  const prefixRe = PAGE_PREFIX[businessType];
  for (const pv of pvRows) {
    const m = pv.page.match(prefixRe);
    if (m && competitorIds.has(parseInt(m[1], 10))) pageviews90d++;
  }

  // --- searches (semnal slab, doar cele geolocalizabile prin schools/listare cu nume identic) ---
  const searchRows = db.prepare('SELECT query FROM searches').all() as { query: string }[];
  let searchesResolved = 0;
  if (searchRows.length) {
    const schoolByLabel = new Map<string, { lat: number; lng: number }>();
    for (const s of db.prepare('SELECT number, lat, lng FROM schools').all() as { number: string; lat: number; lng: number }[]) {
      schoolByLabel.set(`Scoala nr. ${s.number}`, { lat: s.lat, lng: s.lng });
    }
    const nameByLabel = new Map<string, { lat: number | null; lng: number | null }>();
    for (const r of scoped) {
      // numele exact al listarii ca eticheta de cautare (SearchBar trimite as.name ca query)
      const full = allRows.find((x) => x.id === r.id);
      if (full) nameByLabel.set((full as unknown as { name?: string }).name || '', { lat: r.lat, lng: r.lng });
    }
    for (const s of searchRows) {
      const coord = schoolByLabel.get(s.query) || nameByLabel.get(s.query);
      if (!coord || coord.lat == null || coord.lng == null) continue;
      if (calculateDistance(lat, lng, coord.lat, coord.lng) <= radiusKm) searchesResolved++;
    }
  }

  return {
    competitorCount, premiumCount, avgRating, ratedCount: rated.length,
    priceMidAvg, priceSampleN: priced.length,
    schoolsInRadius, kindergartensInRadius, ssdSchoolsInRadius, avgMediaEn,
    demandClicks90d, pageviews90d, searchesResolved,
  };
}

// --- Scor 0-100: percentila fata de cele 43 de zone cunoscute, la aceeasi raza/tip. Memoizat 1h,
// ca sa nu recalculam 43 de scanari de tabel la fiecare cerere. ---
interface ScoreBaseline { ts: number; zones: RawMetrics[]; }
const baselineCache = new Map<string, ScoreBaseline>();
const BASELINE_TTL_MS = 60 * 60 * 1000;

function getBaseline(db: Database.Database, businessType: BusinessType, clubCategory: string | null, radiusKm: number): RawMetrics[] {
  const key = `${businessType}|${clubCategory ?? ''}|${radiusKm}`;
  const cached = baselineCache.get(key);
  if (cached && Date.now() - cached.ts < BASELINE_TTL_MS) return cached.zones;
  const zones = ZONE_CENTROIDS.map(([, zlat, zlng]) => computeRawMetrics(db, businessType, clubCategory, zlat, zlng, radiusKm));
  baselineCache.set(key, { ts: Date.now(), zones });
  return zones;
}

function percentile(value: number, distribution: number[]): number {
  if (distribution.length === 0) return 50;
  const countLessEq = distribution.filter((v) => v <= value).length;
  return Math.round((countLessEq / distribution.length) * 100);
}

interface ScoreBreakdown {
  score: number;
  demandPct: number;
  catchmentPct: number;
  competitionPct: number; // deja inversat (100 = putina concurenta)
  premiumSlotsPct: number;
}

function computeScore(
  target: RawMetrics, baseline: RawMetrics[], freeSlotsTarget: number, freeSlotsBaseline: number[]
): ScoreBreakdown {
  const demandPct = percentile(target.demandClicks90d + target.pageviews90d, baseline.map((b) => b.demandClicks90d + b.pageviews90d));
  const catchmentPct = percentile(target.schoolsInRadius + target.kindergartensInRadius, baseline.map((b) => b.schoolsInRadius + b.kindergartensInRadius));
  const densityPct = percentile(target.competitorCount, baseline.map((b) => b.competitorCount));
  const competitionPct = 100 - densityPct; // putina concurenta = scor bun
  const premiumSlotsPct = percentile(freeSlotsTarget, freeSlotsBaseline);

  const score = Math.round(demandPct * 0.35 + catchmentPct * 0.25 + competitionPct * 0.25 + premiumSlotsPct * 0.15);
  return { score, demandPct, catchmentPct, competitionPct, premiumSlotsPct };
}

export interface ZoneInsightsParams {
  lat: number;
  lng: number;
  zoneLabel: string;
  radiusKm: RadiusKm;
  businessType: BusinessType;
  clubCategory?: string | null;
  budgetLei?: number | null;
  sector?: number | null; // daca vine dintr-o strada rezolvata (circ_streets.sector), mai precis
}

export interface ZoneInsightsReport {
  zoneLabel: string;
  radiusKm: RadiusKm;
  businessType: BusinessType;
  businessLabel: string;
  competition: {
    count: number;
    premiumCount: number;
    densityPerKm2: number;
    avgRating: number | null;
    ratedCount: number;
    priceMidAvg: number | null;
    priceSampleN: number;
    schoolsInRadius: number;
    kindergartensInRadius: number;
    ssdSchoolsInRadius: number;
    avgMediaEn: number | null;
  };
  demand: {
    clicks90d: number;
    pageviews90d: number;
    searches: number | null; // null = sub pragul de afisare (n < 5)
  };
  premiumSlots: {
    sector: number;
    total: number;
    occupied: number;
    slots: number;
    free: number;
  };
  budgetEstimate: BudgetEstimate | null;
  score: ScoreBreakdown;
  narrative: string;
  factSheet: string;
}

function deterministicNarrative(score: number, businessLabel: string, freeSlots: number): string {
  if (score >= 70) {
    return `Zona are potential ridicat pentru ${businessLabel}: cerere reala observata pe ActivKids, multe scoli si gradinite in apropiere si concurenta relativ redusa. ${freeSlots > 0 ? `Mai sunt ${freeSlots} sloturi de promovare libere in sectorul acesta, inainte sa se ocupe.` : 'Sloturile de promovare din sector sunt deja ocupate, deci o listare Premium ar concura direct pentru rotatie.'}`;
  }
  if (score >= 40) {
    return `Zona este echilibrata pentru ${businessLabel}: exista atat cerere, cat si concurenta stabilita. O listare Premium ajuta sa iesi in evidenta fata de restul ofertei din zona. ${freeSlots > 0 ? `Sunt ${freeSlots} sloturi de promovare libere in sector.` : 'Sloturile de promovare din sector sunt ocupate momentan.'}`;
  }
  return `Zona pare saturata pentru ${businessLabel}, cu concurenta ridicata fata de cererea observata pe ActivKids. O listare Premium tot ajuta la vizibilitate, dar diferentierea (activitati, program, pret) conteaza mai mult decat in alte zone.`;
}

function buildFactSheet(report: Omit<ZoneInsightsReport, 'narrative' | 'factSheet'>): string {
  const c = report.competition;
  const d = report.demand;
  const p = report.premiumSlots;
  const lines = [
    `Zona: ${report.zoneLabel}, raza ${report.radiusKm} km, tip afacere: ${report.businessLabel}.`,
    `Concurenta: ${c.count} listari de acelasi tip in raza (din care ${c.premiumCount} Premium), densitate ${c.densityPerKm2.toFixed(1)}/km patrat.`,
    c.ratedCount >= 3 ? `Rating mediu ${c.avgRating?.toFixed(1)} din ${c.ratedCount} listari evaluate.` : 'Prea putine listari evaluate pentru un rating mediu relevant.',
    c.priceSampleN >= 3 ? `Pret mediu observat ${Math.round(c.priceMidAvg || 0)} lei/luna (esantion ${c.priceSampleN} listari).` : 'Esantion de preturi prea mic pentru o medie relevanta.',
    report.businessType === 'kindergarten'
      ? `In raza aleasa sunt ${c.kindergartensInRadius} gradinite (nu avem date despre numarul exact de copii inscrisi, doar numarul de institutii).`
      : `In raza aleasa sunt ${c.schoolsInRadius} scoli si ${c.kindergartensInRadius} gradinite (nu avem date despre numarul exact de copii inscrisi, doar numarul de institutii).`,
    // SSD (Scoala dupa scoala) e concurenta directa doar pentru afterschool-uri; pentru gradinite/
    // cluburi nu e un semnal relevant si ar confuza o interpretare AI care il citeaza fara context.
    report.businessType === 'afterschool'
      ? (c.ssdSchoolsInRadius > 0 ? `${c.ssdSchoolsInRadius} scoli din raza au deja program propriu de tip Scoala dupa scoala (concurenta directa).` : 'Nicio scoala din raza nu are program propriu de tip Scoala dupa scoala.')
      : '',
    report.businessType === 'afterschool' && c.avgMediaEn != null ? `Media Evaluarii Nationale a scolilor din zona: ${c.avgMediaEn.toFixed(2)}.` : '',
    `Cerere observata pe ActivKids, ultimele 90 de zile: ${d.clicks90d} clickuri pe telefon/site/email/harta, ${d.pageviews90d} vizualizari de pagina.`,
    d.searches != null ? `${d.searches} cautari geolocalizate in zona.` : '',
    `Sectorul ${p.sector}: ${p.total} listari de acest tip, ${p.occupied} ocupa sloturi de promovare din ${p.slots} disponibile (${p.free} libere).`,
    `Scor calculat al zonei: ${report.score.score}/100.`,
  ].filter(Boolean);
  return lines.join('\n');
}

export function computeZoneInsights(db: Database.Database, params: ZoneInsightsParams): ZoneInsightsReport {
  const { lat, lng, zoneLabel, radiusKm, businessType, clubCategory = null, budgetLei = null } = params;
  const table = TABLE_FOR_TYPE[businessType];
  const businessLabel = LABEL_FOR_TYPE[businessType];
  const sector = params.sector ?? resolveSector(lat, lng);

  const raw = computeRawMetrics(db, businessType, clubCategory, lat, lng, radiusKm);
  const areaKm2 = Math.PI * radiusKm * radiusKm;

  // sloturi Premium: la nivel de sector (granularitatea reala a readZoneSpotlightConfig), nu la
  // nivel de raza arbitrara - se eticheteaza explicit ca "in sectorul X" in UI, nu ca "in raza ta".
  const sectorAgg = db.prepare(
    `SELECT COUNT(*) as total, SUM(CASE WHEN is_premium = 1 THEN 1 ELSE 0 END) as premium FROM ${table} WHERE sector = ?`
  ).get(sector) as { total: number; premium: number };
  const cfg = readZoneSpotlightConfig(db, table, sector);
  const slots = spotlightCapacity(sectorAgg.total || 0, cfg);
  const occupied = Math.min(sectorAgg.premium || 0, slots);
  const freeSlots = Math.max(0, slots - occupied);

  // baseline pentru scor: aceleasi metrici pe cele 43 de zone cunoscute, plus sloturile libere per
  // zona (aproximate prin sectorul cel mai apropiat de fiecare centroid).
  const baseline = getBaseline(db, businessType, clubCategory, radiusKm);
  const freeSlotsBaseline = ZONE_CENTROIDS.map(([, zlat, zlng]) => {
    const zSector = resolveSector(zlat, zlng);
    const agg = db.prepare(
      `SELECT COUNT(*) as total, SUM(CASE WHEN is_premium = 1 THEN 1 ELSE 0 END) as premium FROM ${table} WHERE sector = ?`
    ).get(zSector) as { total: number; premium: number };
    const zcfg = readZoneSpotlightConfig(db, table, zSector);
    const zSlots = spotlightCapacity(agg.total || 0, zcfg);
    return Math.max(0, zSlots - Math.min(agg.premium || 0, zSlots));
  });

  const score = computeScore(raw, baseline, freeSlots, freeSlotsBaseline);

  const reportBase: Omit<ZoneInsightsReport, 'narrative' | 'factSheet'> = {
    zoneLabel, radiusKm, businessType, businessLabel,
    competition: {
      count: raw.competitorCount,
      premiumCount: raw.premiumCount,
      densityPerKm2: raw.competitorCount / areaKm2,
      avgRating: raw.avgRating,
      ratedCount: raw.ratedCount,
      priceMidAvg: raw.priceMidAvg,
      priceSampleN: raw.priceSampleN,
      schoolsInRadius: raw.schoolsInRadius,
      kindergartensInRadius: raw.kindergartensInRadius,
      ssdSchoolsInRadius: raw.ssdSchoolsInRadius,
      avgMediaEn: raw.avgMediaEn,
    },
    demand: {
      clicks90d: raw.demandClicks90d,
      pageviews90d: raw.pageviews90d,
      searches: raw.searchesResolved >= 5 ? raw.searchesResolved : null,
    },
    premiumSlots: { sector, total: sectorAgg.total || 0, occupied, slots, free: freeSlots },
    budgetEstimate: budgetLei ? estimateBudget(budgetLei, db) : null,
    score,
  };

  const narrative = deterministicNarrative(score.score, businessLabel, freeSlots);
  const factSheet = buildFactSheet(reportBase);

  return { ...reportBase, narrative, factSheet };
}

export { getZone };
