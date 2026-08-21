import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import { getCartierStats, cartierNameFromSlug, cartierIntro, cartierPriceNote, cartierClosing, getCartierExtras, cartierDespre, cartierRecomandari } from '@/lib/cartiere';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import { isContactVisible } from '@/lib/contactVisibility';
import AfterSchoolCard from '@/components/AfterSchoolCard';
import type { Metadata } from 'next';
import type { AfterSchool } from '@/lib/db';

type Props = { params: Promise<{ cartier: string }> };

const SECTOR_NAMES: Record<number, string> = {
  1: 'Sectorul 1', 2: 'Sectorul 2', 3: 'Sectorul 3', 4: 'Sectorul 4', 5: 'Sectorul 5', 6: 'Sectorul 6',
};

export async function generateStaticParams() {
  const db = getDb();
  return getCartierStats(db, 'afterschools').map(c => ({ cartier: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cartier } = await params;
  const name = cartierNameFromSlug(cartier);
  if (!name) return { title: 'Pagina negăsită' };
  const title = `After School ${name} București | ActivKids`;
  const description = `After school-uri în cartierul ${name}, București. Prețuri, program și activități actualizate.`;
  const url = `https://activkids.ro/afterschool/cartier/${cartier}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url } };
}

export default async function AfterschoolCartierPage({ params }: Props) {
  const { cartier } = await params;
  const cartierName = cartierNameFromSlug(cartier);
  if (!cartierName) notFound();

  const db = getDb();
  const allStats = getCartierStats(db, 'afterschools');
  const stat = allStats.find(c => c.slug === cartier);
  if (!stat) notFound();

  let afterschools = db.prepare(
    'SELECT * FROM afterschools WHERE neighborhood = ? AND is_paused = 0 ORDER BY is_featured DESC, is_premium DESC'
  ).all(cartierName) as AfterSchool[];

  afterschools = applyPremiumSpotlight(afterschools, readSpotlightConfig(db));

  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    afterschools = afterschools.map(as => isContactVisible(as)
      ? { ...as, contacts_masked: false }
      : { ...as, phone: null, email: null, contacts_masked: true, has_phone: !!as.phone, has_email: !!as.email });
  }

  const sectorLabel = stat.sector ? SECTOR_NAMES[stat.sector] : null;
  const intro = cartierIntro('after school-uri', cartierName, afterschools.length, sectorLabel);
  const priceNote = cartierPriceNote(cartierName, 'after school-urile', stat.priceMin, stat.priceMax);
  const closing = cartierClosing(cartierName, 'after school-uri');
  const extras = getCartierExtras(db, 'afterschools', cartierName);
  const despre = cartierDespre('after school-uri', cartierName, sectorLabel, afterschools.length, extras);
  const recomandari = cartierRecomandari('after school-uri', extras);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `After School-uri ${cartierName} București`,
    description: intro,
    url: `https://activkids.ro/afterschool/cartier/${cartier}`,
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
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3 flex-wrap">
            <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <a href="/" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">After School-uri</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-main)] font-medium">{cartierName}</span>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] mb-2">
            After School-uri în {cartierName}, București
          </h1>
          <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-2 max-w-2xl">{intro}</p>
          {priceNote && <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-6 max-w-2xl">{priceNote}</p>}

          <div className="mb-8 space-y-6 max-w-2xl">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Despre cartier</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{despre}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Recomandări practice</h2>
              <ul className="space-y-1.5">
                {recomandari.map((r, i) => (
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
              <a href={`/afterschool/sector/${stat.sector}`} className="text-sm text-[var(--color-primary)] hover:underline">
                ← Vezi toate after school-urile din {sectorLabel}
              </a>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {afterschools.map(as => (
              <AfterSchoolCard key={as.id} data={as} businessMode={businessMode} />
            ))}
          </div>

          <p className="text-sm text-[var(--color-text-light)] leading-relaxed mt-6 max-w-2xl">{closing}</p>

          {/* CTA */}
          <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-blue-800 mb-2">Ai un after school în {cartierName}?</h3>
            <p className="text-sm text-blue-700 mb-4">Listează-te gratuit sau premium și ajunge în fața părinților din cartier.</p>
            <a href="/promovare" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
              Adaugă / Revendică listarea →
            </a>
          </div>

          {/* Link-uri interne catre alte cartiere */}
          <div className="mt-8">
            <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">After school-uri în alte cartiere:</p>
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {allStats.filter(c => c.slug !== cartier).map(c => (
                <a key={c.slug} href={`/afterschool/cartier/${c.slug}`}
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
