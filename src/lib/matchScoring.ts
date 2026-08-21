import { calculateDistance, formatDistance } from '@/lib/distance';
import type { AfterSchool, Kindergarten } from '@/lib/db';

export type MatchListingType = 'afterschool' | 'kindergarten';

export interface MatchAnswers {
  listingType: MatchListingType;
  lat: number;
  lng: number;
  locationLabel: string;
  schoolName?: string;
  age: number;
  budget: number | null; // lei/luna, null = "nu sunt sigur"
  budgetRequired: boolean;
  scheduleTime: string | null; // "18:00"
  scheduleRequired: boolean;
  desiredActivities: string[]; // doar afterschool
  requiredActivities: string[]; // subset din desiredActivities, doar afterschool
}

type CriterionKey = 'distance' | 'price' | 'schedule' | 'activities' | 'reviews';

export interface CriterionResult {
  key: CriterionKey;
  label: string;
  points: number;
  maxPoints: number;
  fraction: number;
  detail: string;
  passed: boolean;
}

export interface HardFilterFailure {
  key: 'budget' | 'schedule' | 'activities';
  label: string;
  reason: string;
}

export interface MatchResultItem<T> {
  listing: T;
  score: number;
  breakdown: CriterionResult[];
  failedHardFilters: HardFilterFailure[];
  distanceKm: number;
  recommendReason: string;
}

interface NormalizedListing {
  id: number;
  name: string;
  lat: number;
  lng: number;
  price_min: number | null;
  age_min: number | null;
  age_max: number | null;
  scheduleEnd: string | null;
  activitiesText: string;
  rating: number | null;
}

function normalizeAfterschool(a: AfterSchool): NormalizedListing {
  return {
    id: a.id, name: a.name, lat: a.lat, lng: a.lng,
    price_min: a.price_min,
    age_min: a.age_min, age_max: a.age_max,
    scheduleEnd: a.end_time,
    activitiesText: `${a.activities || ''} ${a.description || ''}`.toLowerCase(),
    rating: null,
  };
}

function normalizeKindergarten(k: Kindergarten): NormalizedListing {
  return {
    id: k.id, name: k.name, lat: k.lat, lng: k.lng,
    price_min: k.price_min,
    age_min: k.age_min, age_max: k.age_max,
    scheduleEnd: k.program_end,
    activitiesText: `${k.activities || ''} ${k.description || ''}`.toLowerCase(),
    rating: k.rating,
  };
}

export interface MatchConfig {
  listingType: MatchListingType;
  maxDistanceKm: number;
  weights: { distance: number; price: number; schedule: number; activities: number; reviews: number };
  normalize: (listing: AfterSchool | Kindergarten) => NormalizedListing;
}

export const AFTERSCHOOL_MATCH_CONFIG: MatchConfig = {
  listingType: 'afterschool',
  maxDistanceKm: 6,
  weights: { distance: 30, price: 25, schedule: 25, activities: 20, reviews: 0 },
  normalize: (l) => normalizeAfterschool(l as AfterSchool),
};

export const KINDERGARTEN_MATCH_CONFIG: MatchConfig = {
  listingType: 'kindergarten',
  maxDistanceKm: 6,
  weights: { distance: 30, price: 25, schedule: 25, activities: 0, reviews: 20 },
  normalize: (l) => normalizeKindergarten(l as Kindergarten),
};

const CRITERION_LABELS: Record<CriterionKey, string> = {
  distance: 'Distanță', price: 'Preț', schedule: 'Program', activities: 'Activități', reviews: 'Recenzii',
};

interface CriterionDef {
  key: CriterionKey;
  weight: number;
  compute: () => { fraction: number; detail: string; passed: boolean } | null;
  hardFail?: () => HardFilterFailure | null;
}

function buildRecommendReason(breakdown: CriterionResult[], name: string): string {
  const good = breakdown.filter((b) => b.fraction >= 0.75).sort((a, b) => b.fraction - a.fraction);
  if (good.length === 0) return `${name} se apropie de ce cauți — verifică detaliile de mai jos.`;
  return `Recomandat pentru că: ${good.slice(0, 2).map((b) => b.detail).join(' și ')}.`;
}

// Motor comun de scor, parametrizat prin `config` (vezi AFTERSCHOOL_MATCH_CONFIG / KINDERGARTEN_MATCH_CONFIG).
// Fiecare criteriu neaplicabil pentru un raspuns/listare dat (ex. "nu sunt sigur" la buget, sau rating
// lipsa la o gradinita) e scos din calcul si ponderea lui se redistribuie proportional pe restul, ca
// scorul final sa ramana mereu 0-100 si comparabil intre listari, indiferent ce date lipsesc.
export function scoreListing(
  listingRaw: AfterSchool | Kindergarten,
  answers: MatchAnswers,
  config: MatchConfig
): { score: number; breakdown: CriterionResult[]; failedHardFilters: HardFilterFailure[]; distanceKm: number; recommendReason: string; ageExcluded: boolean } {
  const l = config.normalize(listingRaw);
  const distanceKm = calculateDistance(answers.lat, answers.lng, l.lat, l.lng);

  const ageExcluded = (l.age_min != null && answers.age < l.age_min) || (l.age_max != null && answers.age > l.age_max);

  const criteria: CriterionDef[] = [];

  criteria.push({
    key: 'distance',
    weight: config.weights.distance,
    compute: () => {
      const fraction = Math.max(0, Math.min(1, 1 - distanceKm / config.maxDistanceKm));
      return { fraction, detail: `${formatDistance(distanceKm)} de ${answers.locationLabel || 'locația ta'}`, passed: fraction > 0 };
    },
  });

  if (config.weights.price > 0) {
    criteria.push({
      key: 'price',
      weight: config.weights.price,
      compute: () => {
        if (answers.budget == null) return null;
        const price = l.price_min;
        if (price == null) return { fraction: 0.5, detail: 'Preț neafișat', passed: true };
        if (price <= answers.budget) return { fraction: 1, detail: `${price} lei/lună, în bugetul tău`, passed: true };
        const overRatio = (price - answers.budget) / answers.budget;
        return { fraction: Math.max(0, 1 - overRatio * 2), detail: `${price} lei/lună, peste bugetul tău de ${answers.budget} lei`, passed: false };
      },
      hardFail: () => {
        if (!answers.budgetRequired || answers.budget == null) return null;
        if (l.price_min != null && l.price_min > answers.budget) {
          return { key: 'budget', label: 'Buget', reason: `costă de la ${l.price_min} lei/lună, peste bugetul tău maxim de ${answers.budget} lei` };
        }
        return null;
      },
    });
  }

  if (config.weights.schedule > 0) {
    criteria.push({
      key: 'schedule',
      weight: config.weights.schedule,
      compute: () => {
        if (!answers.scheduleTime) return null;
        if (!l.scheduleEnd) return { fraction: 0, detail: 'Program neafișat', passed: false };
        const ok = l.scheduleEnd >= answers.scheduleTime;
        return {
          fraction: ok ? 1 : 0,
          detail: ok ? `Program până la ${l.scheduleEnd}` : `Program doar până la ${l.scheduleEnd}, ai nevoie până la ${answers.scheduleTime}`,
          passed: ok,
        };
      },
      hardFail: () => {
        if (!answers.scheduleRequired || !answers.scheduleTime) return null;
        const ok = !!l.scheduleEnd && l.scheduleEnd >= answers.scheduleTime;
        if (ok) return null;
        return {
          key: 'schedule', label: 'Program',
          reason: l.scheduleEnd ? `are program doar până la ${l.scheduleEnd}, cerut de tine până la ${answers.scheduleTime}` : 'nu are program afișat până la ora cerută',
        };
      },
    });
  }

  if (config.weights.activities > 0 && answers.desiredActivities.length > 0) {
    criteria.push({
      key: 'activities',
      weight: config.weights.activities,
      compute: () => {
        const matched = answers.desiredActivities.filter((act) => l.activitiesText.includes(act.toLowerCase()));
        const fraction = matched.length / answers.desiredActivities.length;
        return {
          fraction,
          detail: matched.length > 0 ? `Are ${matched.length}/${answers.desiredActivities.length} activități dorite (${matched.join(', ')})` : 'Nu are activitățile dorite',
          passed: fraction > 0,
        };
      },
      hardFail: () => {
        if (answers.requiredActivities.length === 0) return null;
        const missing = answers.requiredActivities.filter((act) => !l.activitiesText.includes(act.toLowerCase()));
        if (missing.length === 0) return null;
        return { key: 'activities', label: 'Activități obligatorii', reason: `nu oferă: ${missing.join(', ')}` };
      },
    });
  }

  if (config.weights.reviews > 0) {
    criteria.push({
      key: 'reviews',
      weight: config.weights.reviews,
      compute: () => {
        if (l.rating == null) return null;
        const fraction = Math.max(0, Math.min(1, l.rating / 5));
        return { fraction, detail: `${l.rating.toFixed(1)}★ recenzii Google`, passed: fraction >= 0.7 };
      },
    });
  }

  const failedHardFilters: HardFilterFailure[] = [];
  for (const c of criteria) {
    const f = c.hardFail?.();
    if (f) failedHardFilters.push(f);
  }

  const active: { key: CriterionKey; weight: number; fraction: number; detail: string; passed: boolean }[] = [];
  for (const c of criteria) {
    const r = c.compute();
    if (r) active.push({ key: c.key, weight: c.weight, ...r });
  }
  const totalWeight = active.reduce((s, c) => s + c.weight, 0);
  const scale = totalWeight > 0 ? 100 / totalWeight : 0;

  const breakdown: CriterionResult[] = active.map((c) => {
    const maxPoints = Math.round(c.weight * scale);
    return {
      key: c.key, label: CRITERION_LABELS[c.key],
      points: Math.round(c.fraction * maxPoints), maxPoints,
      fraction: c.fraction, detail: c.detail, passed: c.passed,
    };
  });
  const score = Math.max(0, Math.min(100, breakdown.reduce((s, b) => s + b.points, 0)));

  return { score, breakdown, failedHardFilters, distanceKm, recommendReason: buildRecommendReason(breakdown, l.name), ageExcluded };
}

// Rezultatele principale (fara criterii obligatorii ratate) si "aproape de potrivire" (au ratat cel
// putin un criteriu marcat obligatoriu de parinte) - sortate descrescator dupa scor, apoi dupa distanta.
// Copiii care nu se incadreaza in [age_min, age_max] sunt excluse complet (nu are sens sa apara nicaieri).
export function rankMatches<T extends AfterSchool | Kindergarten>(
  listings: T[],
  answers: MatchAnswers,
  config: MatchConfig
): { matches: MatchResultItem<T>[]; nearMisses: MatchResultItem<T>[] } {
  const matches: MatchResultItem<T>[] = [];
  const nearMisses: MatchResultItem<T>[] = [];

  for (const listing of listings) {
    const result = scoreListing(listing, answers, config);
    if (result.ageExcluded) continue;
    const item: MatchResultItem<T> = {
      listing, score: result.score, breakdown: result.breakdown,
      failedHardFilters: result.failedHardFilters, distanceKm: result.distanceKm, recommendReason: result.recommendReason,
    };
    (result.failedHardFilters.length > 0 ? nearMisses : matches).push(item);
  }

  const byScoreThenDistance = (a: MatchResultItem<T>, b: MatchResultItem<T>) => b.score - a.score || a.distanceKm - b.distanceKm;
  matches.sort(byScoreThenDistance);
  nearMisses.sort(byScoreThenDistance);

  return { matches, nearMisses };
}
