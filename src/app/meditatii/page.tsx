import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import TutorsSearch from './TutorsSearch';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Meditatii pentru copii in Bucuresti | Meditatori, Logopezi, Psihologi | ActivKids',
  description:
    'Gaseste meditatori, logopezi, psihologi, terapeuti si animatori pentru copii in Bucuresti. Meditatii verificati, disponibili online sau la domiciliu, filtrati pe categorie si sector.',
  alternates: { canonical: 'https://activkids.ro/meditatii' },
  openGraph: {
    title: 'Meditatii pentru copii in Bucuresti | ActivKids',
    description: 'Meditatori, logopezi, psihologi, terapeuti si animatori pentru copii in Bucuresti.',
    url: 'https://activkids.ro/meditatii',
    siteName: 'ActivKids',
    locale: 'ro_RO',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Meditatii pentru copii in Bucuresti | ActivKids',
    description: 'Meditatori, logopezi, psihologi, terapeuti si animatori pentru copii in Bucuresti.',
  },
};

export default function ProfessionalsPage() {
  const db = getDb();
  const { n: count } = db.prepare('SELECT count(*) as n FROM tutors').get() as { n: number };

  const jsonLdList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Meditatii pentru copii in Bucuresti',
    description: 'Director de meditatori, logopezi, psihologi, terapeuti si animatori pentru copii in Bucuresti',
    url: 'https://activkids.ro/meditatii',
    numberOfItems: count,
  };

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Ce meditatii pentru copii gasesc pe ActivKids?',
        acceptedAnswer: { '@type': 'Answer', text: 'Gasesti meditatori si profesori particulari, logopezi, psihologi si consilieri, terapeuti, instructori extracurriculari, animatori pentru petreceri, fotografi si cadre medicale - toti specializati in lucrul cu copiii.' },
      },
      {
        '@type': 'Question',
        name: 'Meditatiii lucreaza online sau la domiciliu?',
        acceptedAnswer: { '@type': 'Answer', text: 'Multi meditatii ofera sedinte online, iar altii se deplaseaza la domiciliul copilului. Fiecare profil indica disponibilitatea (online / la domiciliu) si zona acoperita.' },
      },
      {
        '@type': 'Question',
        name: 'Cat costa o sedinta cu un colaborator?',
        acceptedAnswer: { '@type': 'Answer', text: 'Preturile variaza in functie de specializare si experienta. Fiecare profil afiseaza pretul orientativ pe sedinta.' },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <Navbar />

      <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white py-7 sm:py-10">
        <div className="max-w-6xl mx-auto text-center mb-5 px-4">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-3">
            {count} meditatii pentru copii in Bucuresti
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base max-w-2xl mx-auto hidden sm:block">
            Cauta dupa specializare, nume sau zona si gaseste colaboratorul potrivit pentru copilul tau
          </p>
        </div>
        <Suspense fallback={
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <TutorsSearch initialCount={count} />
        </Suspense>
      </section>

      <footer className="bg-[var(--color-card)] border-t border-[var(--color-border)] py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-light)]">
          <span>ActivKids · Meditatii pentru copii Bucuresti</span>
          <div className="flex gap-4">
            <a href="https://www.facebook.com/profile.php?id=61591256207467" target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</a>
            <a href="/" className="hover:underline">Afterschool-uri</a>
            <a href="/activitati" className="hover:underline">Activitati copii</a>
            <a href="/catering" className="hover:underline">Catering</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
