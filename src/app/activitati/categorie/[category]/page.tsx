import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import { CATEGORIES } from '@/lib/clubCategories';
import { getCartierStats } from '@/lib/cartiere';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import { isContactVisible } from '@/lib/contactVisibility';
import ClubCard from '@/components/ClubCard';
import type { Metadata } from 'next';
import type { Club } from '@/lib/db';

type Props = { params: Promise<{ category: string }> };

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map(c => ({ category: c }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORIES[category];
  if (!cat) return { title: 'Pagina negăsită' };
  return {
    title: `Cursuri ${cat.label} Copii București 2026 – Cluburi & Prețuri | ActivKids`,
    description: cat.description,
    alternates: { canonical: `https://activkids.ro/activitati/categorie/${category}` },
    openGraph: {
      title: `Cursuri ${cat.label} Copii București 2026 – Cluburi & Prețuri | ActivKids`,
      description: cat.description,
      url: `https://activkids.ro/activitati/categorie/${category}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = CATEGORIES[category];
  if (!cat) notFound();

  const db = getDb();
  let clubs = db.prepare(
    'SELECT * FROM clubs WHERE category = ? ORDER BY is_featured DESC, is_premium DESC'
  ).all(category) as Club[];

  clubs = applyPremiumSpotlight(clubs, readSpotlightConfig(db));

  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    clubs = clubs.map(c => isContactVisible(c)
      ? { ...c, contacts_masked: false }
      : { ...c, phone: null, email: null, contacts_masked: true, has_phone: !!c.phone, has_email: !!c.email });
  }

  const cartiereForCategory = getCartierStats(db, 'clubs', 'AND category = ?', [category]);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: cat.faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${cat.title} București`,
    description: cat.description,
    url: `https://activkids.ro/activitati/categorie/${category}`,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <a href="/activitati" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">Activități</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-main)] font-medium">{cat.emoji} {cat.label}</span>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] mb-2">
            {cat.emoji} {cat.title} în București
          </h1>
          <p className="text-[var(--color-text-light)] mb-6">
            {clubs.length > 0
              ? `${clubs.length} cluburi și centre găsite în București`
              : `Nu am găsit listări pentru această categorie momentan.`}
          </p>

          {/* Continut editorial */}
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
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Ce găsești în București</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{cat.oferta}</p>
            </div>

            {cat.ghid && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-3">Ghid stiluri / niveluri</h2>
                <div className="space-y-3">
                  {cat.ghid.map((g, i) => (
                    <div key={i} className="flex gap-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-3">
                      <span className="text-xl flex-shrink-0">{g.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-main)]">{g.nume}</p>
                        <p className="text-xs text-[var(--color-text-light)] mt-0.5 leading-relaxed">{g.descriere}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

          {/* Navigare categorii */}
          <div className="flex flex-wrap gap-2 mb-8">
            {Object.entries(CATEGORIES).map(([key, c]) => (
              <a key={key} href={`/activitati/categorie/${key}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${key === category
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>
                {c.emoji} {c.label}
              </a>
            ))}
          </div>

          {/* Navigare sectoare pentru aceasta categorie */}
          <div className="flex flex-wrap gap-2 mb-8">
            {['1', '2', '3', '4', '5', '6'].map(s => (
              <a key={s} href={`/activitati/categorie/${category}/sector/${s}`}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors">
                Sectorul {s}
              </a>
            ))}
          </div>

          {/* Navigare cartiere pentru aceasta categorie */}
          {cartiereForCategory.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {cartiereForCategory.map(c => (
                <a key={c.slug} href={`/activitati/categorie/${category}/cartier/${c.slug}`}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors">
                  {c.name}
                </a>
              ))}
            </div>
          )}

          {clubs.length === 0 ? (
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
              <p className="text-[var(--color-text-light)] mb-4">Nu avem încă listări pentru {cat.label}.</p>
              <a href="/promovare" className="inline-block px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
                Adaugă primul club de {cat.label} din București
              </a>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {clubs.map(club => (
                <ClubCard key={club.id} data={club} businessMode={businessMode} />
              ))}
            </div>
          )}

          {/* FAQ */}
          <div className="mt-10 max-w-2xl">
            <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-4">Întrebări frecvente</h2>
            <div className="space-y-4">
              {cat.faq.map(({ q, a }, i) => (
                <div key={i} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
                  <p className="text-sm font-semibold text-[var(--color-text-main)] mb-1">{q}</p>
                  <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-blue-800 mb-2">Ai un club de {cat.label} în București?</h3>
            <p className="text-sm text-blue-700 mb-4">Listează-te gratuit sau premium și ajunge în fața părinților care caută exact ce oferi tu.</p>
            <a href="/promovare" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
              Adaugă / Revendică listarea →
            </a>
          </div>

          {/* Link-uri interne */}
          <div className="mt-8">
            <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">Alte activități pentru copii în București:</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(CATEGORIES).filter(([k]) => k !== category).map(([key, c]) => (
                <a key={key} href={`/activitati/categorie/${key}`}
                  className="text-sm text-[var(--color-primary)] hover:underline">
                  {c.emoji} {c.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
