import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activități Copii București 2026 – 600+ Cluburi: Înot, Dans, Fotbal | ActivKids',
  description: 'Compară 600+ activități extracurriculare pentru copii în București: înot, fotbal, dans, arte marțiale, muzică, robotică. Filtrează după zonă și preț. Gratuit.',
  alternates: { canonical: 'https://activkids.ro/activitati' },
  openGraph: {
    title: 'Activitati pentru Copii in Bucuresti',
    description: 'Inot, fotbal, dansuri, arte martiale, gimnastica, muzica si robotica pentru copii in Bucuresti.',
    url: 'https://activkids.ro/activitati',
    siteName: 'ActivKids',
    locale: 'ro_RO',
    type: 'website',
  },
};

export default function ActivitatiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
