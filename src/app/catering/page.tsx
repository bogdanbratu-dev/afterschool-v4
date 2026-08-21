import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import CateringSearch from './CateringSearch';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Catering Afterschool București și Ilfov | ActivKids',
  description:
    'Furnizori de catering specializați pentru afterschool-uri, grădinițe și școli din București și Ilfov. Mese calde zilnice, meniuri echilibrate pentru copii, livrare la sediu.',
  alternates: { canonical: 'https://activkids.ro/catering' },
  openGraph: {
    title: 'Catering Afterschool București și Ilfov | ActivKids',
    description:
      'Furnizori de catering specializați pentru afterschool-uri, grădinițe și școli din București și Ilfov.',
    url: 'https://activkids.ro/catering',
    siteName: 'ActivKids',
    locale: 'ro_RO',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Catering Afterschool București și Ilfov | ActivKids',
    description: 'Furnizori de catering pentru afterschool-uri și grădinițe din București și Ilfov.',
  },
};

export default function CateringPage() {
  const db = getDb();
  const { n: count } = db.prepare('SELECT count(*) as n FROM caterers').get() as { n: number };

  const jsonLdList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Furnizori de catering pentru afterschool-uri în București și Ilfov',
    description: 'Director de firme de catering specializate în livrarea de mese calde pentru afterschool-uri, grădinițe și școli din București și Ilfov',
    url: 'https://activkids.ro/catering',
    numberOfItems: count,
  };

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Cât costă catering-ul pentru un afterschool?',
        acceptedAnswer: { '@type': 'Answer', text: 'Meniurile complete (supă + fel principal + desert) pornesc în general de la 20–35 lei/porție, în funcție de numărul de porții și furnizor.' },
      },
      {
        '@type': 'Question',
        name: 'Ce include un meniu de catering pentru afterschool?',
        acceptedAnswer: { '@type': 'Answer', text: 'Un meniu standard include supă sau ciorbă, un fel principal cu garnitură și desert sau fruct. Mulți furnizori oferă și meniuri bio sau adaptate alergiilor.' },
      },
      {
        '@type': 'Question',
        name: 'Cum găsesc un furnizor de catering pentru afterschool în București?',
        acceptedAnswer: { '@type': 'Answer', text: 'Pe ActivKids găsești un director complet de furnizori de catering din București și Ilfov, filtrabili după sector și zonă de livrare.' },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <Navbar />

      <section className="bg-gradient-to-br from-teal-600 to-teal-800 text-white py-7 sm:py-10">
        <div className="max-w-6xl mx-auto text-center mb-5 px-4">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-3">
            {count} furnizori de catering pentru afterschool-uri și grădinițe
          </h1>
          <p className="text-teal-100 text-sm sm:text-base max-w-2xl mx-auto hidden sm:block">
            Caută după nume sau zona deservită și găsește furnizorul potrivit pentru afterschool-ul tău din București sau Ilfov
          </p>
        </div>
        <Suspense fallback={
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <CateringSearch initialCount={count} />
        </Suspense>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 sm:p-8">
          <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-main)] mb-3">
            Cum alegi un furnizor de catering pentru afterschool?
          </h2>
          <p className="text-sm text-[var(--color-text-light)] mb-4 leading-relaxed">
            Catering-ul pentru afterschool-uri este un serviciu specializat — furnizorii trebuie să livreze mese calde zilnice,
            meniuri echilibrate nutritional adaptate vârstei copiilor, respectând normele sanitar-veterinare.
            Spre deosebire de catering-ul pentru evenimente, contractele sunt continue pe toată durata anului școlar.
          </p>
          <h3 className="text-sm font-semibold text-[var(--color-text-main)] mb-2">Ce să urmărești când alegi un furnizor:</h3>
          <ul className="text-sm text-[var(--color-text-light)] space-y-1 mb-5 list-disc list-inside leading-relaxed">
            <li>Experiență în catering instituțional (școli, grădinițe, afterschool-uri)</li>
            <li>Autorizații sanitar-veterinare și ANPC valabile</li>
            <li>Meniuri zilnice variate, fără coloranți sau conservanți</li>
            <li>Posibilitatea de adaptare la alergii și regimuri alimentare speciale</li>
            <li>Zona de livrare acoperă locația afterschool-ului tău</li>
            <li>Referințe de la alte afterschool-uri sau instituții similare</li>
          </ul>
          <h3 className="text-sm font-semibold text-[var(--color-text-main)] mb-3">Întrebări frecvente</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-main)]">Cât costă catering-ul pentru un afterschool?</p>
              <p className="text-sm text-[var(--color-text-light)] mt-0.5">Meniurile complete (supă + fel principal + desert) pornesc în general de la 20–35 lei/porție, în funcție de numărul de porții și complexitatea meniului.</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-main)]">Ce include un meniu de catering pentru afterschool?</p>
              <p className="text-sm text-[var(--color-text-light)] mt-0.5">Un meniu standard include supă sau ciorbă, un fel principal cu garnitură și desert sau fruct. Mulți furnizori oferă și opțiuni bio sau meniuri adaptate alergiilor.</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-main)]">Livrează firmele din această listă în zona mea?</p>
              <p className="text-sm text-[var(--color-text-light)] mt-0.5">Fiecare furnizor are o zonă de livrare specificată (sector, Voluntari, Pipera etc.). Folosește filtrele de sector sau caută după zonă pentru a găsi furnizori aproape de tine.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[var(--color-card)] border-t border-[var(--color-border)] py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-light)]">
          <span>ActivKids · Catering afterschool București și Ilfov</span>
          <div className="flex gap-4">
            <a href="https://www.facebook.com/profile.php?id=61591256207467" target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</a>
            <a href="/" className="hover:underline">Afterschool-uri</a>
            <a href="/activitati" className="hover:underline">Activități copii</a>
            <a href="/promovare" className="hover:underline">Adaugă firma ta</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
