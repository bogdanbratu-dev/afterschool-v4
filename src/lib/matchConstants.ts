// Aceeasi taxonomie de activitati ca FilterPanel.tsx (ALL_ACTIVITIES) - nu inventam o lista noua,
// ca sa fie consistenta cu restul site-ului si cu datele existente in coloana `activities`.
export const MATCH_ACTIVITIES = [
  'Teme', 'Engleza', 'Sport', 'Arte', 'Muzica', 'Robotica',
  'Programare', 'Stiinta', 'Teatru', 'Dans', 'Lectura',
  'Matematica', 'Pictura', 'Gatit', 'Jocuri',
];

// Aceleasi sloturi ca "Program minim pana la ora" din FilterPanel.tsx.
export const SCHEDULE_TIME_OPTIONS = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];

export const BUDGET_BUCKETS: { label: string; value: number | null }[] = [
  { label: 'Sub 1000 lei', value: 1000 },
  { label: '1000 - 1300 lei', value: 1300 },
  { label: '1300 - 1600 lei', value: 1600 },
  { label: '1600 - 2000 lei', value: 2000 },
  { label: 'Peste 2000 lei', value: 3500 },
  { label: 'Nu sunt sigur(ă)', value: null },
];

export const AGE_OPTIONS_AFTERSCHOOL = [6, 7, 8, 9, 10, 11, 12, 13, 14];
export const AGE_OPTIONS_KINDERGARTEN = [1, 2, 3, 4, 5, 6];
