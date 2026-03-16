export type ClubCategory =
  | 'inot' | 'fotbal' | 'dansuri' | 'arte_martiale' | 'gimnastica'
  | 'limbi_straine' | 'robotica' | 'muzica' | 'arte_creative';

export const CLUB_CATEGORY_LABELS: Record<ClubCategory, string> = {
  inot: 'Înot',
  fotbal: 'Fotbal',
  dansuri: 'Dansuri',
  arte_martiale: 'Arte Marțiale',
  gimnastica: 'Gimnastică',
  limbi_straine: 'Limbi Străine',
  robotica: 'Robotică / Programare',
  muzica: 'Muzică',
  arte_creative: 'Arte Creative',
};
