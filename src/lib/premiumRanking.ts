import type Database from 'better-sqlite3';

// ─────────────────────────────────────────────────────────────
// Premium "spotlight" ranking cu rotatie pe fereastra de timp.
//
// Ideea: resursa rara NU e "a fi premium", ci spatiul din capul
// paginii. Vindem premium nelimitat (contactele lor sunt mereu
// deblocate), dar fixam sus doar `k` spotlight-uri per set, unde
// k = clamp(round(total * ratio), min, max). Daca s-au vandut mai
// multe premium decat incap, le rotim echitabil pe felii de timp,
// astfel incat fiecare platitor ajunge periodic in capul paginii.
// ─────────────────────────────────────────────────────────────

export interface SpotlightConfig {
  ratio: number;     // ce procent din set poate fi spotlight (ex. 0.25)
  min: number;       // podea: minim spotlight-uri chiar si intr-o zona mica
  max: number;       // plafon: maxim fixate sus oricat de mare e setul
  windowMin: number; // fereastra (minute) in care setul spotlight e stabil
  alertRatio: number; // prag alerta: avertizeaza cand premium/zona atinge acest %
}

const DEFAULTS: SpotlightConfig = { ratio: 0.25, min: 1, max: 4, windowMin: 15, alertRatio: 0.5 };

export function readSpotlightConfig(db: Database.Database): SpotlightConfig {
  const get = (k: string) =>
    (db.prepare('SELECT value FROM settings WHERE key = ?').get(k) as { value: string } | undefined)?.value;
  const num = (k: string, d: number) => {
    const v = get(k);
    const n = v == null ? NaN : parseFloat(v);
    return Number.isFinite(n) ? n : d;
  };
  return {
    ratio: num('premium_spotlight_ratio', DEFAULTS.ratio),
    min: num('premium_spotlight_min', DEFAULTS.min),
    max: num('premium_spotlight_max', DEFAULTS.max),
    windowMin: num('premium_rotation_window_min', DEFAULTS.windowMin),
    alertRatio: num('premium_zone_alert_ratio', DEFAULTS.alertRatio),
  };
}

interface Rankable {
  id?: number;
  is_premium?: number;
  is_featured?: number;
  is_spotlight?: boolean;
}

// Cate spotlight-uri pentru un set dat (util si pentru dashboard-ul de saturatie).
export function spotlightCount(total: number, premiumCount: number, cfg: SpotlightConfig): number {
  let k = Math.round(total * cfg.ratio);
  k = Math.max(cfg.min, Math.min(cfg.max, k));
  return Math.min(k, premiumCount);
}

// Reordoneaza lista: [featured..., spotlight premium..., restul interleaved by tieBreak].
// - featured: mereu sus, exceptat de rotatie.
// - spotlight: `k` premium alesi prin rotatie pe fereastra de timp, dintre cei eligibili
//   (`spotlightEligible`, ex. doar cei aflati intr-o raza reala de cautare geografica --
//   altfel un premium irelevant geografic tot ar ajunge sus doar pentru ca-i vine randul
//   la rotatie). Premium-urile neeligibile raman premium (contacte tot deblocate) dar se
//   ordoneaza normal prin tieBreak, fara sa fie fixate sus.
// - rest: premium ne-spotlight + premium neeligibil + non-premium, ordonati prin tieBreak.
export function applyPremiumSpotlight<T extends Rankable>(
  list: T[],
  cfg: SpotlightConfig,
  opts: { now?: number; tieBreak?: (a: T, b: T) => number; spotlightEligible?: (x: T) => boolean } = {}
): T[] {
  const now = opts.now ?? Date.now();
  const tie = opts.tieBreak;
  const sortMaybe = (arr: T[]) => (tie ? [...arr].sort(tie) : arr);

  const featured = list.filter((x) => x.is_featured === 1);
  const premium = list.filter((x) => !!x.is_premium && x.is_featured !== 1);
  const normal = list.filter((x) => !x.is_premium && x.is_featured !== 1);

  const eligible = opts.spotlightEligible ? premium.filter(opts.spotlightEligible) : premium;
  const ineligible = opts.spotlightEligible ? premium.filter((x) => !opts.spotlightEligible!(x)) : [];

  const k = spotlightCount(list.length, eligible.length, cfg);

  // Rotatie pe fereastra de timp: ordonam premium eligibil stabil dupa id, apoi rotim
  // INTREAGA lista cu `windowIndex`. Astfel se roteste ATAT cine intra in
  // spotlight (cand sunt mai multi premium decat sloturi), CAT SI cine e pe
  // pozitia #1 — fiecare premium ajunge pe rand in capul paginii, o fereastra
  // pe rand. Ex: 3 premium [A,B,C] -> [A,B,C] -> [B,C,A] -> [C,A,B] -> ...
  let spotlight: T[] = [];
  let restPremium: T[] = [];
  if (eligible.length > 0) {
    const rot = [...eligible].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    const len = eligible.length;
    const windowMs = Math.max(1, cfg.windowMin) * 60 * 1000;
    const windowIndex = Math.floor(now / windowMs);
    const offset = ((windowIndex % len) + len) % len;
    const rotated = [...rot.slice(offset), ...rot.slice(0, offset)];
    // in ordinea de rotatie: #1 se schimba la fiecare fereastra
    spotlight = rotated.slice(0, k).map((x) => ({ ...x, is_spotlight: true }));
    restPremium = rotated.slice(k);
  }

  return [
    ...sortMaybe(featured),
    ...spotlight, // pastram ordinea de rotatie (NU resortam) ca #1 sa se roteasca
    ...sortMaybe([...restPremium, ...ineligible, ...normal]),
  ];
}
// Citeste config spotlight cu override per zona (table + sector).
// Daca exista un override specific in settings, il merge deasupra globalului.
export function readZoneSpotlightConfig(
  db: Database.Database,
  table: string,
  sector: number | null
): SpotlightConfig {
  const base = readSpotlightConfig(db);
  const sectorKey = sector == null ? 'null' : String(sector);
  const key = `spotlight_override_${table}_${sectorKey}`;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row?.value) return base;
  try {
    const ov = JSON.parse(row.value) as Partial<SpotlightConfig>;
    return { ...base, ...ov };
  } catch {
    return base;
  }
}
