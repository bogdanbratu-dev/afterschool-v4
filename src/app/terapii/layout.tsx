import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terapii & Consiliere pentru Copii in Bucuresti | ActivKids',
  description: 'Cabinete de logopedie, psihologie si terapie (ABA, ocupationala, senzoriala) pentru copii in Bucuresti. Gaseste specialistul potrivit filtrand dupa categorie si sector.',
  alternates: { canonical: 'https://activkids.ro/terapii' },
  openGraph: {
    title: 'Terapii & Consiliere pentru Copii | ActivKids',
    description: 'Cabinete de logopedie, psihologie si terapie ABA pentru copii in Bucuresti.',
    url: 'https://activkids.ro/terapii',
    siteName: 'ActivKids',
    locale: 'ro_RO',
    type: 'website',
  },
};

export default function TerapiiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}