import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import { CATEGORIES } from '@/lib/clubCategories';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import { isContactVisible } from '@/lib/contactVisibility';
import ClubCard from '@/components/ClubCard';
import type { Metadata } from 'next';
import type { Club } from '@/lib/db';

type Props = { params: Promise<{ category: string; sector: string }> };

const SECTOR_NAMES: Record<string, string> = {
  '1': 'Sectorul 1', '2': 'Sectorul 2', '3': 'Sectorul 3',
  '4': 'Sectorul 4', '5': 'Sectorul 5', '6': 'Sectorul 6',
};

const SECTOR_AREAS: Record<string, string[]> = {
  '1': ['Aviatorilor', 'Floreasca', 'Dorobanți', 'Băneasa', 'Herăstrău'],
  '2': ['Floreasca', 'Iancului', 'Colentina', 'Pantelimon', 'Fundeni'],
  '3': ['Titan', 'Vitan', 'Dristor', 'Balta Albă', 'IOR'],
  '4': ['Berceni', 'Olteniței', 'Giurgiului', 'Brâncuși'],
  '5': ['Cotroceni', '13 Septembrie', 'Rahova', 'Ferentari'],
  '6': ['Drumul Taberei', 'Militari', 'Giulești', 'Crângași'],
};

export async function generateStaticParams() {
  const params: { category: string; sector: string }[] = [];
  for (const category of Object.keys(CATEGORIES)) {
    for (const sector of Object.keys(SECTOR_NAMES)) {
      params.push({ category, sector });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, sector } = await params;
  const cat = CATEGORIES[category];
  const sectorName = SECTOR_NAMES[sector];
  if (!cat || !sectorName) return { title: 'Pagina negăsită' };
  const title = `Cursuri ${cat.label} Copii ${sectorName} București – Cluburi & Prețuri | ActivKids`;
  const description = `${cat.label} pentru copii în ${sectorName} al Bucureștiului: cluburi, prețuri și program actualizate. ${cat.description}`;
  const url = `https://activkids.ro/activitati/categorie/${category}/sector/${sector}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function CategorySectorPage({ params }: Props) {
  const { category, sector } = await params;
  const cat = CATEGORIES[category];
  const sectorName = SECTOR_NAMES[sector];
  const areas = SECTOR_AREAS[sector];
  if (!cat || !sectorName) notFound();

  const db = getDb();
  let clubs = db.prepare(
    'SELECT * FROM clubs WHERE category = ? AND sector = ? ORDER BY is_featured DESC, is_premium DESC'
  ).all(category, parseInt(sector)) as Club[];

  clubs = applyPremiumSpotlight(clubs, readSpotlightConfig(db));

  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    clubs = clubs.map(c => isContactVisible(c)
      ? { ...c, contacts_masked: false }
      : { ...c, phone: null, email: null, contacts_masked: true, has_phone: !!c.phone, has_email: !!c.email });
  }

  const intro = clubs.length > 0
    ? `Cauți ${cat.label.toLowerCase()} pentru copii în ${sectorName}? Am adunat ${clubs.length} ${clubs.length === 1 ? 'club' : 'cluburi'} din zone precum ${areas.join(', ')}, cu prețuri, program și locuri disponibile actualizate.`
    : `Cauți ${cat.label.toLowerCase()} pentru copii în ${sectorName}, în zone precum ${areas.join(', ')}? Nu am găsit încă cluburi listate pentru această combinație, dar poți vedea toate cluburile de ${cat.label.toLowerCase()} din București mai jos sau reveni în curând.`;

  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${cat.label} Copii ${sectorName} București`,
    description: intro,
    url: `https://activkids.ro/activitati/categorie/${category}/sector/${sector}`,
    numberOfItems: clubs.length,
    itemListElement: clubs.slice(0, 10).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://activkids.ro/activitati/${toSlug(c.name, c.id)}`,
      name: c.name,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />

      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3 flex-wrap">
            <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <a href="/activitati" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">Activități</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <a href={`/activitati/categorie/${category}`} className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">{cat.emoji} {cat.label}</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-main)] font-medium">{sectorName}</span>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] mb-2">
            {cat.emoji} {cat.label} pentru Copii în {sectorName}
          </h1>
          <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-6 max-w-2xl">{intro}</p>

          {/* Continut editorial din categorie (reutilizat, valabil pentru toate sectoarele) */}
          <div className="mb-8 space-y-6 max-w-2xl">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Despre activitate</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{cat.despre}</p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Beneficii</h2>
              <ul className="space-y-1.5">
                {cat.beneficii.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-light)]">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Recomandări practice</h2>
              <ul className="space-y-1.5">
                {cat.recomandari.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-light)]">
                    <span className="text-[var(--color-primary)] mt-0.5 flex-shrink-0">✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Navigare sectoare, pastrand categoria curenta */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(SECTOR_NAMES).map(([s, name]) => (
              <a key={s} href={`/activitati/categorie/${category}/sector/${s}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${s === sector
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>
                {name}
              </a>
            ))}
          </div>
          <div className="mb-8">
            <a href={`/activitati/categorie/${category}`} className="text-sm text-[var(--color-primary)] hover:underline">
              ← Vezi {cat.label} din tot Bucureștiul
            </a>
          </div>

          {clubs.length === 0 ? (
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
              <p className="text-[var(--color-text-light)] mb-4">Nu avem încă cluburi de {cat.label} listate în {sectorName}.</p>
              <a href="/promovare" className="inline-block px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
                Adaugă primul club de {cat.label} din {sectorName}
              </a>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {clubs.map(club => (
                <ClubCard key={club.id} data={club} businessMode={businessMode} />
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-blue-800 mb-2">Ai un club de {cat.label} în {sectorName}?</h3>
            <p className="text-sm text-blue-700 mb-4">Listează-te gratuit sau premium și ajunge în fața părinților din zonă.</p>
            <a href="/promovare" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
              Adaugă / Revendică listarea →
            </a>
          </div>

          {/* Link-uri interne catre alte categorii, in acelasi sector */}
          <div className="mt-8">
            <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">Alte activități pentru copii în {sectorName}:</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(CATEGORIES).filter(([k]) => k !== category).map(([key, c]) => (
                <a key={key} href={`/activitati/categorie/${key}/sector/${sector}`}
                  className="text-sm text-[var(--color-primary)] hover:underline">
                  {c.emoji} {c.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
