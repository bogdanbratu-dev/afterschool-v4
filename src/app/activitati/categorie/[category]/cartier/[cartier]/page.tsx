import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import { CATEGORIES } from '@/lib/clubCategories';
import { getCartierStats, cartierNameFromSlug, cartierIntro, cartierPriceNote, cartierClosing } from '@/lib/cartiere';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import { isContactVisible } from '@/lib/contactVisibility';
import ClubCard from '@/components/ClubCard';
import type { Metadata } from 'next';
import type { Club } from '@/lib/db';

type Props = { params: Promise<{ category: string; cartier: string }> };

const SECTOR_NAMES: Record<number, string> = {
  1: 'Sectorul 1', 2: 'Sectorul 2', 3: 'Sectorul 3', 4: 'Sectorul 4', 5: 'Sectorul 5', 6: 'Sectorul 6',
};

export async function generateStaticParams() {
  const db = getDb();
  const params: { category: string; cartier: string }[] = [];
  for (const category of Object.keys(CATEGORIES)) {
    const stats = getCartierStats(db, 'clubs', 'AND category = ?', [category]);
    for (const stat of stats) params.push({ category, cartier: stat.slug });
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, cartier } = await params;
  const cat = CATEGORIES[category];
  const cartierName = cartierNameFromSlug(cartier);
  if (!cat || !cartierName) return { title: 'Pagina negăsită' };
  const title = `Cursuri ${cat.label} Copii ${cartierName} București | ActivKids`;
  const description = `${cat.label} pentru copii în ${cartierName}: cluburi, prețuri și program actualizate. ${cat.description}`;
  const url = `https://activkids.ro/activitati/categorie/${category}/cartier/${cartier}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url } };
}

export default async function CategoryCartierPage({ params }: Props) {
  const { category, cartier } = await params;
  const cat = CATEGORIES[category];
  const cartierName = cartierNameFromSlug(cartier);
  if (!cat || !cartierName) notFound();

  const db = getDb();
  const stats = getCartierStats(db, 'clubs', 'AND category = ?', [category]);
  const stat = stats.find(c => c.slug === cartier);
  if (!stat) notFound();

  let clubs = db.prepare(
    'SELECT * FROM clubs WHERE category = ? AND neighborhood = ? ORDER BY is_featured DESC, is_premium DESC'
  ).all(category, cartierName) as Club[];

  clubs = applyPremiumSpotlight(clubs, readSpotlightConfig(db));

  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    clubs = clubs.map(c => isContactVisible(c)
      ? { ...c, contacts_masked: false }
      : { ...c, phone: null, email: null, contacts_masked: true, has_phone: !!c.phone, has_email: !!c.email });
  }

  const sectorLabel = stat.sector ? SECTOR_NAMES[stat.sector] : null;
  const intro = cartierIntro(`cluburi de ${cat.label.toLowerCase()}`, cartierName, clubs.length, sectorLabel);
  const priceNote = cartierPriceNote(cartierName, `cursurile de ${cat.label.toLowerCase()}`, stat.priceMin, stat.priceMax);
  const closing = cartierClosing(cartierName, `cluburi de ${cat.label.toLowerCase()}`);

  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${cat.label} Copii ${cartierName} București`,
    description: intro,
    url: `https://activkids.ro/activitati/categorie/${category}/cartier/${cartier}`,
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
            <span className="text-sm text-[var(--color-text-main)] font-medium">{cartierName}</span>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] mb-2">
            {cat.emoji} {cat.label} pentru Copii în {cartierName}
          </h1>
          <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-2 max-w-2xl">{intro}</p>
          {priceNote && <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-6 max-w-2xl">{priceNote}</p>}

          {/* Continut editorial din categorie (reutilizat, valabil pentru toate cartierele) */}
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

          {sectorLabel && (
            <div className="mb-6">
              <a href={`/activitati/categorie/${category}/sector/${stat.sector}`} className="text-sm text-[var(--color-primary)] hover:underline">
                ← Vezi {cat.label} din tot {sectorLabel}
              </a>
            </div>
          )}

          <div className="mb-8">
            <a href={`/activitati/categorie/${category}`} className="text-sm text-[var(--color-primary)] hover:underline">
              ← Vezi {cat.label} din tot Bucureștiul
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {clubs.map(club => (
              <ClubCard key={club.id} data={club} businessMode={businessMode} />
            ))}
          </div>

          <p className="text-sm text-[var(--color-text-light)] leading-relaxed mt-6 max-w-2xl">{closing}</p>

          {/* CTA */}
          <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-blue-800 mb-2">Ai un club de {cat.label} în {cartierName}?</h3>
            <p className="text-sm text-blue-700 mb-4">Listează-te gratuit sau premium și ajunge în fața părinților din cartier.</p>
            <a href="/promovare" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
              Adaugă / Revendică listarea →
            </a>
          </div>

          {/* Link-uri interne catre alte categorii, in acelasi cartier */}
          <div className="mt-8">
            <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">Alte activități pentru copii în {cartierName}:</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(CATEGORIES).filter(([k]) => k !== category).map(([key, c]) => (
                <a key={key} href={`/activitati/categorie/${key}/cartier/${cartier}`}
                  className="text-sm text-[var(--color-primary)] hover:underline">
                  {c.emoji} {c.label}
                </a>
              ))}
            </div>
          </div>

          {/* Link-uri interne catre alte cartiere, aceeasi categorie */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">{cat.label} în alte cartiere:</p>
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {stats.filter(c => c.slug !== cartier).map(c => (
                <a key={c.slug} href={`/activitati/categorie/${category}/cartier/${c.slug}`}
                  className="text-sm text-[var(--color-primary)] hover:underline">
                  {c.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
