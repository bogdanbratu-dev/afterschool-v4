import { Suspense } from 'react';
import { getDb } from '@/lib/db';
import ProfessionalsSearch from '@/app/colaboratori/ProfessionalsSearch';

const TERAPII_CATS = ['logopedie', 'psihologie', 'terapie'] as const;
const TERAPII_LABELS: Record<string, string> = {
  logopedie: 'Logopedie',
  psihologie: 'Psihologie & Consiliere',
  terapie: 'Terapie (ABA, ocupationala, senzoriala)',
};

export default function TerapiiPage() {
  const db = getDb();
  const { n: count } = db.prepare(
    "SELECT count(*) as n FROM professionals WHERE category IN ('logopedie','psihologie','terapie')"
  ).get() as { n: number };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Terapii si Consiliere pentru Copii in Bucuresti',
    description: 'Cabinete de logopedie, psihologie si terapie pentru copii in Bucuresti',
    url: 'https://activkids.ro/terapii',
    numberOfItems: count,
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-teal-600">Terapii & Consiliere pentru copii</h1>
            <p className="text-sm text-[var(--color-text-light)]">Logopedie, psihologie, terapie ABA & ocupationala in Bucuresti</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
              <span className="hidden sm:inline">Afterschool</span><span className="sm:hidden">🏫</span>
            </a>
            <a href="/activitati" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
              <span className="hidden sm:inline">Activitati</span><span className="sm:hidden">🎯</span>
            </a>
            <a href="/promovare" className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
              <span>+</span><span className="hidden sm:inline">Adauga cabinet</span>
            </a>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-teal-600 to-teal-800 text-white py-7 sm:py-10">
        <div className="max-w-6xl mx-auto text-center mb-5 px-4">
          <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-3">
            {count} specialisti pentru copii in Bucuresti
          </h2>
          <p className="text-teal-100 text-sm sm:text-base max-w-2xl mx-auto hidden sm:block">
            Cabinete de logopedie, psihologie si terapie — filtreaza dupa specializare si sector
          </p>
        </div>
        <Suspense fallback={
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <ProfessionalsSearch
            initialCount={count}
            initialGroup="terapie"
            lockGroup={true}
            initialCategory={undefined}
            lockCategory={false}
            restrictCategories={['logopedie', 'psihologie', 'terapie']}
          />
        </Suspense>
      </section>

      <footer className="bg-[var(--color-card)] border-t border-[var(--color-border)] py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-light)]">
          <span>ActivKids · Terapii & Consiliere Bucuresti</span>
          <div className="flex gap-4">
            <a href="https://www.facebook.com/profile.php?id=61591256207467" target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</a>
            <a href="/" className="hover:underline">Afterschool-uri</a>
            <a href="/colaboratori" className="hover:underline">Colaboratori</a>
            <a href="/activitati" className="hover:underline">Activitati</a>
            <a href="/meditatii" className="hover:underline">Meditatii</a>
          </div>
        </div>
      </footer>
    </div>
  );
}