import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Potrivire Afterschool & Grădiniță București – Test Gratuit Personalizat | ActivKids',
  description:
    'Răspunde la 6 întrebări despre școală, vârstă, buget și program și primești gratuit un top personalizat cu afterschool-urile sau grădinițele potrivite din București, fiecare cu scor de potrivire explicat.',
  alternates: { canonical: 'https://activkids.ro/potrivire' },
  openGraph: {
    title: 'Potrivire Afterschool & Grădiniță București – Test Gratuit',
    description:
      'Găsește în 2 minute afterschool-ul sau grădinița potrivită pentru copilul tău din București, pe baza școlii, vârstei, bugetului și programului.',
    url: 'https://activkids.ro/potrivire',
    siteName: 'ActivKids',
    locale: 'ro_RO',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Potrivire Afterschool & Grădiniță București – Test Gratuit',
    description: 'Găsește în 2 minute afterschool-ul sau grădinița potrivită pentru copilul tău din București.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Potrivire ActivKids',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  url: 'https://activkids.ro/potrivire',
  description:
    'Chestionar gratuit care recomandă afterschool-uri și grădinițe din București potrivite după școală, vârstă, buget, program și activități dorite.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'RON' },
};

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'ActivKids', item: 'https://activkids.ro' },
    { '@type': 'ListItem', position: 2, name: 'Potrivire', item: 'https://activkids.ro/potrivire' },
  ],
};

export default function PotrivireLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {children}
    </>
  );
}
