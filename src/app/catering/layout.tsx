import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Catering Afterschool București și Ilfov | ActivKids',
  description:
    'Furnizori de catering specializați pentru afterschool-uri, grădinițe și școli din București și Ilfov. Mese calde zilnice, meniuri echilibrate pentru copii, livrare la sediu.',
  alternates: { canonical: 'https://activkids.ro/catering' },
  openGraph: {
    title: 'Catering Afterschool București și Ilfov | ActivKids',
    description:
      'Furnizori de catering specializați pentru afterschool-uri, grădinițe și școli din București și Ilfov. Mese calde zilnice, meniuri echilibrate pentru copii.',
    url: 'https://activkids.ro/catering',
    siteName: 'ActivKids',
    locale: 'ro_RO',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Catering Afterschool București și Ilfov | ActivKids',
    description:
      'Furnizori de catering specializați pentru afterschool-uri și grădinițe din București și Ilfov.',
  },
};

export default function CateringLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
