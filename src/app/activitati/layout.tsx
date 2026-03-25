import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activitati pentru Copii in Bucuresti - Inot, Fotbal, Dans, Arte Martiale',
  description: 'Gaseste activitati extracurriculare pentru copii in Bucuresti: inot, fotbal, dansuri, arte martiale, gimnastica, muzica, robotica si multe altele. Cauta dupa locatie.',
  alternates: { canonical: 'https://activkids.ro/activitati' },
  openGraph: {
    title: 'Activitati pentru Copii in Bucuresti',
    description: 'Inot, fotbal, dansuri, arte martiale, gimnastica, muzica si robotica pentru copii in Bucuresti.',
    url: 'https://activkids.ro/activitati',
    siteName: 'ActiveKids',
    locale: 'ro_RO',
    type: 'website',
  },
};

export default function ActivitatiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
