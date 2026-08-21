import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import { getCartierStats, cartierNameFromSlug, cartierIntro, cartierPriceNote, cartierClosing, getCartierExtras, cartierDespre, cartierRecomandari } from '@/lib/cartiere';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import { isContactVisible } from '@/lib/contactVisibility';
import KindergartenCard from '@/components/KindergartenCard';
import type { Kindergarten } from '@/lib/db';

type Props = { params: Promise<{ cartier: string }> };

const SECTOR_NAMES: Record<number, string> = {
  1: 'Sectorul 1', 2: 'Sectorul 2', 3: 'Sectorul 3', 4: 'Sectorul 4', 5: 'Sectorul 5', 6: 'Sectorul 6',
};

export function generateStaticParams() {
  const db = getDb();
  return getCartierStats(db, 'kindergartens').map(c => ({ cartier: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cartier } = await params;
  const name = cartierNameFromSlug(cartier);
  if (!name) return { title: 'Cartier negasit' };
  const title = `Gradinite si crese private ${name} Bucuresti | ActivKids`;
  const description = `Gradinite si crese private in cartierul ${name}, Bucuresti. Program, preturi, varste si contact pentru fiecare unitate.`;
  const canonical = `https://activkids.ro/gradinite/cartier/${cartier}`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, siteName: 'ActivKids', locale: 'ro_RO', type: 'website' }, twitter: { card: 'summary', title, description } };
}

export default async function KindergartenCartierPage({ params }: Props) {
  const { cartier } = await params;
  const cartierName = cartierNameFromSlug(cartier);
  if (!cartierName) notFound();

  const db = getDb();
  const allStats = getCartierStats(db, 'kindergartens');
  const stat = allStats.find(c => c.slug === cartier);
  if (!stat) notFound();

  let items = db.prepare(
    'SELECT * FROM kindergartens WHERE neighborhood = ? ORDER BY is_featured DESC, is_premium DESC, rating IS NULL, rating DESC, name'
  ).all(cartierName) as Kindergarten[];

  items = applyPremiumSpotlight(items, readSpotlightConfig(db));

  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    items = items.map(k => isContactVisible(k)
      ? { ...k, contacts_masked: false }
      : { ...k, phone: null, email: null, contacts_masked: true, has_phone: !!k.phone, has_email: !!k.email });
  }

  const sectorLabel = stat.sector ? SECTOR_NAMES[stat.sector] : null;
  const intro = cartierIntro('gradinite si crese', cartierName, items.length, sectorLabel);
  const priceNote = cartierPriceNote(cartierName, 'gradinitele si cresele', stat.priceMin, stat.priceMax);
  const closing = cartierClosing(cartierName, 'gradinite si crese');
  const extras = getCartierExtras(db, 'kindergartens', cartierName);
  const despre = cartierDespre('gradinite si crese', cartierName, sectorLabel, items.length, extras);
  const recomandari = cartierRecomandari('gradinite si crese', extras);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Gradinite si crese private ${cartierName} Bucuresti`,
    url: `https://activkids.ro/gradinite/cartier/${cartier}`,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 10).map((k, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://activkids.ro/gradinite/${toSlug(k.name, k.id)}`,
      name: k.name,
    })),
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/gradinite" className="text-pink-600 hover:underline text-sm">← Gradinite</a>
          <span className="text-[var(--color-text-light)]">/</span>
          <span className="text-sm text-[var(--color-text-light)]">{cartierName}</span>
        </div>
      </header>
      <section className="bg-gradient-to-br from-pink-600 to-pink-800 text-white py-8">
        <div className="max-w-6xl mx-auto text-center px-4">
          <h1 className="text-xl sm:text-3xl font-bold">Gradinite si crese private in {cartierName}</h1>
          <p className="text-pink-100 text-sm mt-2">{items.length} unitati gasite</p>
        </div>
      </section>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-2 max-w-2xl">{intro}</p>
        {priceNote && <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-6 max-w-2xl">{priceNote}</p>}

        <div className="mb-8 space-y-6 max-w-2xl">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Despre cartier</h2>
            <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{despre}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Recomandari practice</h2>
            <ul className="space-y-1.5">
              {recomandari.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-light)]">
                  <span className="text-pink-600 mt-0.5 flex-shrink-0">✓</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {sectorLabel && (
          <div className="mb-6">
            <a href={`/gradinite/sector/${stat.sector}`} className="text-sm text-pink-600 hover:underline">
              ← Vezi toate gradinitele si cresele din {sectorLabel}
            </a>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
            <p className="text-[var(--color-text-light)] mb-4">Nu avem inca gradinite sau crese listate in {cartierName}.</p>
            <a href="/promovare" className="inline-block px-5 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-semibold">
              Adauga prima gradinita din {cartierName}
            </a>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map(k => (
              <KindergartenCard key={k.id} data={k} businessMode={businessMode} />
            ))}
          </div>
        )}

        <p className="text-sm text-[var(--color-text-light)] leading-relaxed mt-6 max-w-2xl">{closing}</p>

        <div className="mt-10 bg-pink-50 border border-pink-200 rounded-2xl p-6 text-center">
          <h3 className="font-bold text-pink-800 mb-2">Ai o gradinita sau cresa in {cartierName}?</h3>
          <p className="text-sm text-pink-700 mb-4">Listeaza-te gratuit sau premium si ajunge in fata parintilor din cartier.</p>
          <a href="/promovare" className="inline-block px-6 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-semibold">
            Adauga / Revendica listarea →
          </a>
        </div>

        <div className="mt-8">
          <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">Gradinite si crese in alte cartiere:</p>
          <div className="flex flex-wrap gap-x-3 gap-y-2">
            {allStats.filter(c => c.slug !== cartier).map(c => (
              <a key={c.slug} href={`/gradinite/cartier/${c.slug}`} className="text-sm text-pink-600 hover:underline">
                {c.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
