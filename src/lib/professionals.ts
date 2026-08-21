export type ProfessionalCategory =
  | 'invatatori' | 'personal_afterschool'
  | 'asistenta_teme' | 'limbi_straine' | 'robotica' | 'sah' | 'soroban' | 'stiinte' | 'educatie_financiara'
  | 'lectura' | 'caligrafie' | 'muzica' | 'arta' | 'teatru' | 'dans'
  | 'public_speaking' | 'sport_indoor' | 'yoga' | 'dezvoltare_personala' | 'gatit'
  | 'foto_video' | 'altele'
  | 'logopedie' | 'psihologie' | 'terapie';

export const PROFESSIONAL_CATEGORY_LABELS: Record<ProfessionalCategory, string> = {
  invatatori: 'Invatatori / educatori',
  personal_afterschool: 'Personal afterschool',
  asistenta_teme: 'Asistenta la teme',
  limbi_straine: 'Limbi straine',
  robotica: 'Robotica & Programare',
  sah: 'Sah',
  soroban: 'Soroban & aritmetica mentala',
  stiinte: 'Stiinte & STEM',
  educatie_financiara: 'Educatie financiara',
  lectura: 'Lectura / cluburi de lectura',
  caligrafie: 'Caligrafie',
  muzica: 'Muzica',
  arta: 'Arta',
  teatru: 'Teatru & actorie',
  dans: 'Dans',
  public_speaking: 'Public speaking & dezbateri',
  sport_indoor: 'Sport indoor',
  yoga: 'Yoga & mindfulness',
  dezvoltare_personala: 'Dezvoltare personala',
  gatit: 'Atelier culinar',
  foto_video: 'Foto/Video evenimente',
  altele: 'Altele',
  logopedie: 'Logopedie',
  psihologie: 'Psihologie & consiliere',
  terapie: 'Terapie (ABA, ocupationala)',
};

// Ordinea de afisare (grupata: personal -> optionale -> terapie)
export const PROFESSIONAL_CATEGORY_ORDER: ProfessionalCategory[] = [
  'invatatori', 'personal_afterschool',
  'asistenta_teme', 'limbi_straine', 'robotica', 'sah', 'soroban', 'stiinte', 'educatie_financiara',
  'lectura', 'caligrafie', 'muzica', 'arta', 'teatru', 'dans',
  'public_speaking', 'sport_indoor', 'yoga', 'dezvoltare_personala', 'gatit',
  'foto_video', 'altele',
  'logopedie', 'psihologie', 'terapie',
];

// ---- Grupare pe rol (axa principala pe /colaboratori) ----
export type ProfessionalGroup = 'personal' | 'optionale' | 'terapie';

export const PROFESSIONAL_GROUP_LABELS: Record<ProfessionalGroup, string> = {
  personal: 'Personal permanent',
  optionale: 'Optionale',
  terapie: 'Terapie & consiliere',
};

export const PROFESSIONAL_GROUP_ORDER: ProfessionalGroup[] = ['personal', 'optionale', 'terapie'];

export const PROFESSIONAL_GROUPS: Record<ProfessionalGroup, ProfessionalCategory[]> = {
  personal: ['invatatori', 'personal_afterschool'],
  optionale: [
    'asistenta_teme', 'limbi_straine', 'robotica', 'sah', 'soroban', 'stiinte', 'educatie_financiara',
    'lectura', 'caligrafie', 'muzica', 'arta', 'teatru', 'dans',
    'public_speaking', 'sport_indoor', 'yoga', 'dezvoltare_personala', 'gatit',
    'foto_video', 'altele',
  ],
  terapie: ['logopedie', 'psihologie', 'terapie'],
};

// Invers derivat: categorie -> grup
export const CATEGORY_TO_GROUP: Record<ProfessionalCategory, ProfessionalGroup> =
  (Object.entries(PROFESSIONAL_GROUPS) as [ProfessionalGroup, ProfessionalCategory[]][])
    .reduce((acc, [group, cats]) => {
      cats.forEach(c => { acc[c] = group; });
      return acc;
    }, {} as Record<ProfessionalCategory, ProfessionalGroup>);

// Axa a 2-a (vestigiala, pastrata pt. compat admin/terapii): tip colaborator
export type CollaboratorKind = 'independent' | 'institutie';

export const KIND_LABELS: Record<CollaboratorKind, string> = {
  independent: 'Se deplaseaza la tine',
  institutie: 'La sediul lor',
};
