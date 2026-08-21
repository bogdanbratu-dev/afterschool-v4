import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import { ensureCircTables } from '@/lib/circumscriptii';
import CircSearch from '@/components/CircSearch';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Circumscripții școlare București 2026 – La ce școală este arondată adresa mea | ActivKids',
  description: 'Află gratuit la ce școală gimnazială de stat este arondată adresa ta în București, conform circumscripțiilor oficiale ISMB 2026. Vezi și afterschool-urile și activitățile din zonă.',
  alternates: { canonical: 'https://activkids.ro/circumscriptii' },
  openGraph: {
    title: 'Circumscripții școlare București 2026 – La ce școală este arondată adresa mea',
    description: 'Caută strada și află școala de circumscripție, media la Evaluarea Națională, programul „Școală după școală” și afterschool-urile din apropiere.',
    url: 'https://activkids.ro/circumscriptii',
  },
};

const SECTOR_NAMES: Record<number, string> = {
  1: 'Sectorul 1', 2: 'Sectorul 2', 3: 'Sectorul 3', 4: 'Sectorul 4', 5: 'Sectorul 5', 6: 'Sectorul 6',
};

export default function CircumscriptiiPage() {
  const db = getDb();
  ensureCircTables(db);
  const schools = db.prepare(
    `SELECT id, name, sector, type FROM circ_schools WHERE type != 'structura' ORDER BY sector, name`
  ).all() as { id: number; name: string; sector: number; type: string }[];
  const bySector: Record<number, typeof schools> = {};
  for (const s of schools) (bySector[s.sector] ||= []).push(s);
  const total = schools.length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Circumscripții școlare București 2026',
    description: 'Caută la ce școală gimnazială de stat este arondată o adresă din București, conform circumscripțiilor oficiale ISMB.',
    url: 'https://activkids.ro/circumscriptii',
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ActivKids', item: 'https://activkids.ro' },
      { '@type': 'ListItem', position: 2, name: 'Circumscripții școlare', item: 'https://activkids.ro/circumscriptii' },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-main)] font-medium">Circumscripții școlare</span>
          </div>
        </header>

        <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-8 sm:py-12 px-4">
          <div className="max-w-3xl mx-auto text-center mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              La ce școală este arondată adresa mea?
            </h1>
            <p className="text-blue-100 text-sm sm:text-lg max-w-2xl mx-auto">
              Introdu strada și află școala gimnazială de stat de circumscripție din București,
              conform datelor oficiale ISMB 2026. Vezi apoi afterschool-urile și activitățile din zonă.
            </p>
          </div>
          <CircSearch />
          <p className="text-center text-blue-100 text-xs sm:text-sm mt-5 max-w-2xl mx-auto">
            ℹ️ Informații oficiale preluate de la{' '}
            <a href="https://ismb.ro/primar/circumscriptii.php" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-white">
              Inspectoratul Școlar al Municipiului București (ISMB)
            </a>
            , actualizate pentru anul școlar 2026-2027.
          </p>
        </section>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Continut editorial (SEO) */}
          <div className="max-w-2xl space-y-5 mb-10">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Ce este circumscripția școlară</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">
                Circumscripția școlară este zona arondată fiecărei școli gimnaziale de stat. Copilul are
                loc garantat la înscrierea în clasa pregătitoare la școala de circumscripție a adresei de
                domiciliu, dacă dosarul este depus în prima etapă. Această pagină acoperă toate cele 6
                sectoare ale Bucureștiului, cu {total} unități școlare de circumscripție.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Cum folosești căutarea</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">
                Scrie numele străzii (poți omite „Strada/Bulevardul”) și, opțional, alege sectorul.
                Pe arterele lungi, numerele pare și impare pot fi arondate la școli diferite, așa că
                verifică intervalul de numere afișat lângă fiecare rezultat.
              </p>
            </div>
          </div>

          {/* Scoli pe sector */}
          <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-4">Școli de circumscripție pe sectoare</h2>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5, 6].map((sec) => (
              <div key={sec}>
                <div className="flex items-center justify-between mb-2">
                  <a href={`/circumscriptii/sector/${sec}`} className="font-semibold text-[var(--color-primary)] hover:underline">
                    {SECTOR_NAMES[sec]}
                  </a>
                  <span className="text-xs text-[var(--color-text-light)]">{(bySector[sec] || []).length} școli</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {(bySector[sec] || []).slice(0, 12).map((s) => (
                    <a key={s.id} href={`/circumscriptii/${toSlug(s.name, s.id)}`} className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-primary)]">
                      {s.name.replace(/^SCOALA GIMNAZIALA /i, 'Șc. ').replace(/"/g, '')}
                    </a>
                  ))}
                  {(bySector[sec] || []).length > 12 && (
                    <a href={`/circumscriptii/sector/${sec}`} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                      vezi toate →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-blue-800 mb-2">Cauți un afterschool sau activități pentru copil?</h3>
            <p className="text-sm text-blue-700 mb-4">Pe pagina fiecărei școli găsești afterschool-urile și activitățile din raza de 2 km.</p>
            <a href="/" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
              Caută afterschool după școală →
            </a>
          </div>
        </main>
      </div>
    </>
  );
}
