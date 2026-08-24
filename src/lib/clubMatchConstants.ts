import type { ClubCategory } from '@/lib/clubs';

// Prețurile din clubs.price_min/max sunt scrapuite per-activitate/pachet (nu lunar ca la
// afterschool) și inconsistente ca unitate (ședință vs. lună vs. abonament) — bucket-uri
// mai largi decât BUDGET_BUCKETS din matchConstants.ts, ca imprecizia să nu strice scorul.
export const CLUB_BUDGET_BUCKETS: { label: string; value: number | null }[] = [
  { label: 'Sub 150 lei', value: 150 },
  { label: '150 - 300 lei', value: 300 },
  { label: '300 - 500 lei', value: 500 },
  { label: 'Peste 500 lei', value: 1500 },
  { label: 'Nu sunt sigur(ă)', value: null },
];

export const CLUB_AGE_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export type EnergyLevel = 'low' | 'medium' | 'high';
export type SocialLevel = 'low' | 'medium' | 'high';
export type GoalType = 'fun' | 'discipline' | 'skill' | 'social';
export type CompetitionLevel = 'low' | 'medium' | 'high';

export const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'low', label: 'Calm, preferă activități liniștite' },
  { value: 'medium', label: 'Echilibrat, depinde de zi' },
  { value: 'high', label: 'Foarte energic, are nevoie de mișcare' },
];

export const SOCIAL_OPTIONS: { value: SocialLevel; label: string }[] = [
  { value: 'low', label: 'Timid, are nevoie de timp să se acomodeze' },
  { value: 'medium', label: 'Se acomodează normal, nici timid nici extrovertit' },
  { value: 'high', label: 'Sociabil, se simte bine imediat în grupuri noi' },
];

export const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'fun', label: 'Să se distreze și să socializeze' },
  { value: 'discipline', label: 'Să învețe disciplină și rutină' },
  { value: 'skill', label: 'Să dezvolte o abilitate/talent anume' },
  { value: 'social', label: 'Să facă prieteni noi' },
];

export const COMPETITION_OPTIONS: { value: CompetitionLevel; label: string }[] = [
  { value: 'low', label: 'Nu, vrea doar să participe și să se distreze' },
  { value: 'medium', label: 'Puțină competiție e ok, fără presiune' },
  { value: 'high', label: 'Da, îi place să concureze și să câștige' },
];

// Categoriile unde întrebarea de Competiție chiar are sens (sporturi/discipline cu
// concursuri reale) — pentru restul, întrebarea e sărită în wizard și criteriul de scor
// corespunzător e exclus din calcul (compute() -> null), nu doar ascuns din UI.
export const COMPETITIVE_CATEGORIES: Set<ClubCategory> = new Set(['fotbal', 'arte_martiale', 'gimnastica', 'inot']);

interface ClubCategoryProfile {
  energy: EnergyLevel;
  social: SocialLevel;
  competition: CompetitionLevel;
  goal: GoalType;
}

// "Mini knowledge layer" la granularitate de categorie (9 rânduri fixe) — mult mai restrâns
// decât documentul "Activity Knowledge Layer" (amânat): fără backoffice, fără metadate de
// sursă/încredere, fără atribute per-furnizor. Valori calibrate pe simț comun, nu pe date reale
// (nu există date per-club despre asta) — de revizuit dacă apar semnale din feedback real.
export const CLUB_CATEGORY_PROFILES: Record<ClubCategory, ClubCategoryProfile> = {
  inot: { energy: 'medium', social: 'medium', competition: 'medium', goal: 'skill' },
  fotbal: { energy: 'high', social: 'high', competition: 'high', goal: 'social' },
  dansuri: { energy: 'high', social: 'medium', competition: 'low', goal: 'skill' },
  arte_martiale: { energy: 'high', social: 'medium', competition: 'high', goal: 'discipline' },
  gimnastica: { energy: 'high', social: 'low', competition: 'high', goal: 'skill' },
  limbi_straine: { energy: 'low', social: 'medium', competition: 'low', goal: 'skill' },
  robotica: { energy: 'low', social: 'low', competition: 'low', goal: 'skill' },
  muzica: { energy: 'low', social: 'low', competition: 'low', goal: 'skill' },
  arte_creative: { energy: 'low', social: 'medium', competition: 'low', goal: 'fun' },
};

const LEVEL_RANK: Record<'low' | 'medium' | 'high', number> = { low: 0, medium: 1, high: 2 };

// Fracție de potrivire între răspunsul părintelui și profilul categoriei: match exact = 1,
// un pas distanță (ex. medium vs. high) = 0.5, opus (low vs. high) = 0.
export function levelMatchFraction(a: 'low' | 'medium' | 'high', b: 'low' | 'medium' | 'high'): number {
  const diff = Math.abs(LEVEL_RANK[a] - LEVEL_RANK[b]);
  return diff === 0 ? 1 : diff === 1 ? 0.5 : 0;
}
