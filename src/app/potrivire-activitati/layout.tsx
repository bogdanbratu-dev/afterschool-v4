import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Potrivire Activități pentru Copii București – Test Gratuit Personalizat | ActivKids',
  description:
    'Răspunde la câteva întrebări despre interesele, personalitatea și bugetul copilului și primești gratuit un top personalizat cu activități (înot, arte marțiale, dansuri, robotică și altele) din București.',
  alternates: { canonical: 'https://activkids.ro/potrivire-activitati' },
  openGraph: {
    title: 'Potrivire Activități pentru Copii București – Test Gratuit',
    description:
      'Găsește în 2 minute activitatea potrivită pentru copilul tău din București, pe baza intereselor, personalității, vârstei și bugetului.',
    url: 'https://activkids.ro/potrivire-activitati',
    siteName: 'ActivKids',
    locale: 'ro_RO',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Potrivire Activități pentru Copii București – Test Gratuit',
    description: 'Găsește în 2 minute activitatea potrivită pentru copilul tău din București.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Potrivire Activități ActivKids',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  url: 'https://activkids.ro/potrivire-activitati',
  description:
    'Chestionar gratuit care recomandă activități individuale (sport, arte marțiale, dansuri, robotică...) din București potrivite după interese, personalitate, vârstă și buget.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'RON' },
};

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'ActivKids', item: 'https://activkids.ro' },
    { '@type': 'ListItem', position: 2, name: 'Potrivire Activități', item: 'https://activkids.ro/potrivire-activitati' },
  ],
};

export default function PotrivireActivitatiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {children}
    </>
  );
}
