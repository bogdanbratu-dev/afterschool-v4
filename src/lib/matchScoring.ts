import { calculateDistance, formatDistance } from '@/lib/distance';
import type { AfterSchool, Kindergarten, Club } from '@/lib/db';
import { CLUB_CATEGORY_LABELS, type ClubCategory } from '@/lib/clubs';
import { CLUB_CATEGORY_PROFILES, COMPETITIVE_CATEGORIES, levelMatchFraction, type EnergyLevel, type SocialLevel, type GoalType, type CompetitionLevel } from '@/lib/clubMatchConstants';

export type MatchListingType = 'afterschool' | 'kindergarten' | 'club';

export interface MatchAnswers {
  listingType: MatchListingType;
  lat: number;
  lng: number;
  locationLabel: string;
  schoolName?: string;
  age: number;
  budget: number | null; // lei/luna sau lei/activitate dupa listingType, null = "nu sunt sigur"
  budgetRequired: boolean;
  scheduleTime: string | null; // "18:00"
  scheduleRequired: boolean;
  desiredActivities: string[]; // doar afterschool
  requiredActivities: string[]; // subset din desiredActivities, doar afterschool
  // doar pentru listingType === 'club'
  category?: ClubCategory;
  energy?: EnergyLevel;
  social?: SocialLevel;
  goal?: GoalType;
  competition?: CompetitionLevel;
}

type CriterionKey = 'distance' | 'price' | 'schedule' | 'activities' | 'reviews' | 'category' | 'energy' | 'social' | 'goal' | 'competition';

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
  category?: ClubCategory;
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

function normalizeClub(c: Club): NormalizedListing {
  return {
    id: c.id, name: c.name, lat: c.lat, lng: c.lng,
    price_min: c.price_min,
    age_min: c.age_min, age_max: c.age_max,
    scheduleEnd: null, // programul e doar afisat pe card, nu scorat - vezi CLUB_MATCH_CONFIG
    activitiesText: CLUB_CATEGORY_LABELS[c.category].toLowerCase(),
    rating: null,
    category: c.category,
  };
}

export interface MatchConfig {
  listingType: MatchListingType;
  maxDistanceKm: number;
  priceUnitLabel: string;
  weights: {
    distance: number; price: number; schedule: number; activities: number; reviews: number;
    category: number; energy: number; social: number; goal: number; competition: number;
  };
  normalize: (listing: AfterSchool | Kindergarten | Club) => NormalizedListing;
}

export const AFTERSCHOOL_MATCH_CONFIG: MatchConfig = {
  listingType: 'afterschool',
  maxDistanceKm: 6,
  priceUnitLabel: 'lei/lună',
  weights: { distance: 30, price: 25, schedule: 25, activities: 20, reviews: 0, category: 0, energy: 0, social: 0, goal: 0, competition: 0 },
  normalize: (l) => normalizeAfterschool(l as AfterSchool),
};

export const KINDERGARTEN_MATCH_CONFIG: MatchConfig = {
  listingType: 'kindergarten',
  maxDistanceKm: 6,
  priceUnitLabel: 'lei/lună',
  weights: { distance: 30, price: 25, schedule: 25, activities: 0, reviews: 20, category: 0, energy: 0, social: 0, goal: 0, competition: 0 },
  normalize: (l) => normalizeKindergarten(l as Kindergarten),
};

// Program NU e criteriu aici (schedule: 0) - completitudinea prea mica (19.8%) si riscul de a
// confunda orarul general al salii cu ora reala a unei grupe (vezi cleanup-ul din scrape-club-prices.js)
// l-au facut display-only pe card, nu scorat. Categorie/energie/social/obiectiv/competitie sunt
// criteriile noi, specifice cluburilor - vezi normalizeClub() si blocurile din scoreListing() de mai jos.
export const CLUB_MATCH_CONFIG: MatchConfig = {
  listingType: 'club',
  maxDistanceKm: 6,
  priceUnitLabel: 'lei/activitate',
  weights: { distance: 20, price: 15, schedule: 0, activities: 0, reviews: 0, category: 20, energy: 15, social: 10, goal: 10, competition: 10 },
  normalize: (l) => normalizeClub(l as Club),
};

const CRITERION_LABELS: Record<CriterionKey, string> = {
  distance: 'Distanță', price: 'Preț', schedule: 'Program', activities: 'Activități', reviews: 'Recenzii',
  category: 'Categorie', energy: 'Energie', social: 'Social', goal: 'Obiectiv', competition: 'Competiție',
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
  listingRaw: AfterSchool | Kindergarten | Club,
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
        const unit = config.priceUnitLabel;
        if (price == null) return { fraction: 0.5, detail: 'Preț neafișat', passed: true };
        if (price <= answers.budget) return { fraction: 1, detail: `${price} ${unit}, în bugetul tău`, passed: true };
        const overRatio = (price - answers.budget) / answers.budget;
        return { fraction: Math.max(0, 1 - overRatio * 2), detail: `${price} ${unit}, peste bugetul tău de ${answers.budget} lei`, passed: false };
      },
      hardFail: () => {
        if (!answers.budgetRequired || answers.budget == null) return null;
        if (l.price_min != null && l.price_min > answers.budget) {
          return { key: 'budget', label: 'Buget', reason: `costă de la ${l.price_min} ${config.priceUnitLabel}, peste bugetul tău maxim de ${answers.budget} lei` };
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

  // Categorie: scor soft, nu hard filter - o listare dintr-o alta categorie primeste un
  // punctaj de baza (nu 0), ca ranking-ul sa ramana cross-categorie (vezi exemplul din brief),
  // nu filtrat strict pe categoria aleasa.
  if (config.weights.category > 0) {
    criteria.push({
      key: 'category',
      weight: config.weights.category,
      compute: () => {
        if (!answers.category || !l.category) return null;
        const isMatch = l.category === answers.category;
        return {
          fraction: isMatch ? 1 : 0.4,
          detail: isMatch ? `Categoria dorită: ${CLUB_CATEGORY_LABELS[l.category]}` : `${CLUB_CATEGORY_LABELS[l.category]} - altă categorie, dar poate fi o alternativă potrivită`,
          passed: isMatch,
        };
      },
    });
  }

  // Energie/Social/Obiectiv/Competitie: compara raspunsul parintelui cu profilul categoriei
  // listarii (CLUB_CATEGORY_PROFILES), nu cu date per-club (nu exista). Competitie se exclude
  // din calcul (compute() -> null) atat cand parintele n-a raspuns (intrebare sarita in wizard
  // pentru categorii necompetitive), cat si cand categoria listarii nu e una competitiva.
  if (config.weights.energy > 0) {
    criteria.push({
      key: 'energy',
      weight: config.weights.energy,
      compute: () => {
        if (!answers.energy || !l.category) return null;
        const fraction = levelMatchFraction(answers.energy, CLUB_CATEGORY_PROFILES[l.category].energy);
        return { fraction, detail: fraction >= 0.75 ? 'Nivel de energie potrivit' : 'Nivel de energie diferit de ce cauți', passed: fraction >= 0.5 };
      },
    });
  }

  if (config.weights.social > 0) {
    criteria.push({
      key: 'social',
      weight: config.weights.social,
      compute: () => {
        if (!answers.social || !l.category) return null;
        const fraction = levelMatchFraction(answers.social, CLUB_CATEGORY_PROFILES[l.category].social);
        return { fraction, detail: fraction >= 0.75 ? 'Potrivit pentru cât de sociabil e copilul' : 'Nivel de socializare diferit de ce cauți', passed: fraction >= 0.5 };
      },
    });
  }

  if (config.weights.goal > 0) {
    criteria.push({
      key: 'goal',
      weight: config.weights.goal,
      compute: () => {
        if (!answers.goal || !l.category) return null;
        const fraction = CLUB_CATEGORY_PROFILES[l.category].goal === answers.goal ? 1 : 0.4;
        return { fraction, detail: fraction === 1 ? 'Se potrivește cu obiectivul urmărit' : 'Obiectiv parțial diferit de ce urmărești', passed: fraction === 1 };
      },
    });
  }

  if (config.weights.competition > 0) {
    criteria.push({
      key: 'competition',
      weight: config.weights.competition,
      compute: () => {
        if (!answers.competition || !l.category || !COMPETITIVE_CATEGORIES.has(l.category)) return null;
        const fraction = levelMatchFraction(answers.competition, CLUB_CATEGORY_PROFILES[l.category].competition);
        return { fraction, detail: fraction >= 0.75 ? 'Nivel de competitivitate potrivit' : 'Nivel de competitivitate diferit de ce cauți', passed: fraction >= 0.5 };
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
export function rankMatches<T extends AfterSchool | Kindergarten | Club>(
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

  // Categoria aleasa e semnalul principal, nu doar un criteriu de scor: fara asta, un club dintr-o
  // alta categorie care se potriveste perfect pe energie/social/obiectiv/competitie poate depasi la
  // scor un club chiar din categoria ceruta (penalizarea de 0.4x pe categorie e prea mica fata de cate
  // 4 criterii de personalitate insumate). Categoria aleasa trece mereu inaintea altor categorii;
  // alte categorii umplu doar sloturile ramase, cand categoria ceruta n-are suficiente rezultate bune.
  if (config.weights.category > 0 && answers.category) {
    const categoryRank = (item: MatchResultItem<T>) => (config.normalize(item.listing).category === answers.category ? 0 : 1);
    const byCategoryThenScore = (a: MatchResultItem<T>, b: MatchResultItem<T>) => categoryRank(a) - categoryRank(b) || byScoreThenDistance(a, b);
    matches.sort(byCategoryThenScore);
    nearMisses.sort(byCategoryThenScore);
  } else {
    matches.sort(byScoreThenDistance);
    nearMisses.sort(byScoreThenDistance);
  }

  return { matches, nearMisses };
}
