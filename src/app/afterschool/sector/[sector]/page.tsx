import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import type { Metadata } from 'next';
import type { AfterSchool } from '@/lib/db';

type Props = { params: Promise<{ sector: string }> };

const SECTOR_NAMES: Record<string, string> = {
  '1': 'Sectorul 1', '2': 'Sectorul 2', '3': 'Sectorul 3',
  '4': 'Sectorul 4', '5': 'Sectorul 5', '6': 'Sectorul 6',
};

const SECTOR_DESCRIPTIONS: Record<string, string> = {
  '1': 'Sectorul 1 acoperă zone precum Aviatorilor, Floreasca, Dorobanți și Băneasa. Este unul dintre sectoarele cu cea mai mare densitate de after school-uri private din București, datorită numărului mare de familii cu copii din zonele rezidențiale și de vile.',
  '2': 'Sectorul 2 include cartierele Colentina, Iancului, Pantelimon și Floreasca. Cu o populație numeroasă și multe școli generale, oferta de after school-uri acoperă o gamă variată de prețuri și programe.',
  '3': 'Sectorul 3 cuprinde cartierele Titan, Vitan, Dristor și Balta Albă — unele dintre cele mai populate zone rezidențiale din București. Cererea mare de locuri la after school face ca oferta să fie diversificată.',
  '4': 'Sectorul 4 include zonele Berceni, Olteniței și Brâncuși. After school-urile de aici servesc familiile din cartierele de blocuri, cu programe adaptate programului școlar.',
  '5': 'Sectorul 5 acoperă cartierele Rahova, 13 Septembrie și Cotroceni. Deși mai puțin dens în ofertă, găsești after school-uri cu programe solide aproape de marile școli din zonă.',
  '6': 'Sectorul 6 cuprinde Drumul Taberei, Militari și Giulești — cartiere mari cu mulți copii de vârstă școlară. After school-urile din sector acoperă atât programele standard cât și activitățile extracurriculare.',
};

export async function generateStaticParams() {
  return ['1','2','3','4','5','6'].map(s => ({ sector: s }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector } = await params;
  if (!SECTOR_NAMES[sector]) return { title: 'Pagina negăsită' };
  const name = SECTOR_NAMES[sector];
  return {
    title: `After School ${name} București | ActivKids`,
    description: `Găsește cele mai bune after school-uri din ${name} al Bucureștiului. Compară prețuri, program și activități. Listă completă și actualizată.`,
    alternates: { canonical: `https://activkids.ro/afterschool/sector/${sector}` },
    openGraph: {
      title: `After School ${name} București | ActivKids`,
      description: `Lista after school-urilor din ${name} București. Prețuri, program, contact.`,
      url: `https://activkids.ro/afterschool/sector/${sector}`,
    },
  };
}

export default async function SectorPage({ params }: Props) {
  const { sector } = await params;
  if (!SECTOR_NAMES[sector]) notFound();

  const db = getDb();
  const afterschools = db.prepare(
    'SELECT * FROM afterschools WHERE sector = ? ORDER BY is_premium DESC, name ASC'
  ).all(parseInt(sector)) as AfterSchool[];

  const sectorName = SECTOR_NAMES[sector];
  const sectorDescription = SECTOR_DESCRIPTIONS[sector];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `After School-uri ${sectorName} București`,
    description: `Lista completă a after school-urilor din ${sectorName} București`,
    url: `https://activkids.ro/afterschool/sector/${sector}`,
    numberOfItems: afterschools.length,
    itemListElement: afterschools.slice(0, 10).map((as, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://activkids.ro/afterschool/${toSlug(as.name, as.id)}`,
      name: as.name,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <a href="/" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">After School-uri</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-main)] font-medium">{sectorName}</span>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] mb-2">
            After School-uri în {sectorName} București
          </h1>
          <p className="text-[var(--color-text-light)] mb-2">
            {afterschools.length > 0
              ? `${afterschools.length} after school-uri găsite în ${sectorName}`
              : `Nu am găsit after school-uri în ${sectorName} momentan.`}
          </p>
          <p className="text-sm text-[var(--color-text-light)] mb-6 leading-relaxed max-w-2xl">
            {sectorDescription}
          </p>

          {/* Navigare sectoare */}
          <div className="flex flex-wrap gap-2 mb-8">
            {Object.entries(SECTOR_NAMES).map(([s, name]) => (
              <a key={s} href={`/afterschool/sector/${s}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${s === sector
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>
                {name}
              </a>
            ))}
          </div>

          {afterschools.length === 0 ? (
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
              <p className="text-[var(--color-text-light)] mb-4">Nu avem încă listări pentru {sectorName}.</p>
              <a href="/promovare" className="inline-block px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
                Adaugă primul after school din {sectorName}
              </a>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {afterschools.map(as => (
                <a key={as.id} href={`/afterschool/${toSlug(as.name, as.id)}`}
                  className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 hover:shadow-md transition-shadow block">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="font-bold text-[var(--color-text-main)] text-base leading-snug">{as.name}</h2>
                    {as.is_premium === 1 && (
                      <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">★ Premium</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-light)] mb-3">{as.address}</p>
                  <div className="flex flex-wrap gap-2">
                    {as.price_min && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                        {as.price_min}–{as.price_max} lei/lună
                      </span>
                    )}
                    {as.age_min && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                        {as.age_min}–{as.age_max} ani
                      </span>
                    )}
                    {as.availability === 'available' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg">Locuri disponibile</span>
                    )}
                    {as.availability === 'full' && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg">Complet</span>
                    )}
                  </div>
                  {as.description && (
                    <p className="text-xs text-[var(--color-text-light)] mt-3 line-clamp-2">{as.description}</p>
                  )}
                </a>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-blue-800 mb-2">Ai un after school în {sectorName}?</h3>
            <p className="text-sm text-blue-700 mb-4">Listează-te gratuit sau premium și ajunge în fața părinților din sector.</p>
            <a href="/promovare" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
              Adaugă / Revendică listarea →
            </a>
          </div>

          {/* Link-uri interne catre celelalte sectoare */}
          <div className="mt-8">
            <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">After school-uri în alte sectoare:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SECTOR_NAMES).filter(([s]) => s !== sector).map(([s, name]) => (
                <a key={s} href={`/afterschool/sector/${s}`}
                  className="text-sm text-[var(--color-primary)] hover:underline">
                  After School {name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
