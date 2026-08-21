export type TutorSubject =
  | 'matematica' | 'romana' | 'fizica' | 'chimie' | 'biologie' | 'informatica'
  | 'istorie' | 'geografie' | 'limbi_straine' | 'evaluare_nationala' | 'bacalaureat' | 'altele';

export const TUTOR_SUBJECT_LABELS: Record<TutorSubject, string> = {
  matematica: 'Matematica',
  romana: 'Limba Romana',
  fizica: 'Fizica',
  chimie: 'Chimie',
  biologie: 'Biologie',
  informatica: 'Informatica',
  istorie: 'Istorie',
  geografie: 'Geografie',
  limbi_straine: 'Engleza & Limbi straine',
  evaluare_nationala: 'Pregatire Evaluare Nationala',
  bacalaureat: 'Pregatire Bacalaureat',
  altele: 'Alte materii',
};

export const TUTOR_SUBJECT_ORDER: TutorSubject[] = [
  'matematica', 'romana', 'fizica', 'chimie', 'biologie', 'informatica',
  'istorie', 'geografie', 'limbi_straine', 'evaluare_nationala', 'bacalaureat', 'altele',
];

export type TutorKind = 'independent' | 'institutie';
export const TUTOR_KIND_LABELS: Record<TutorKind, string> = {
  independent: 'Profesor / se deplaseaza',
  institutie: 'Centru de meditatii',
};
