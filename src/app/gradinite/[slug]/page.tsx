import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { idFromSlug, toSlug, cleanAddressDisplay } from '@/lib/slug';
import type { Metadata } from 'next';
import type { Kindergarten } from '@/lib/db';
import PageviewTracker from '@/components/PageviewTracker';
import PhotoCarousel from '@/components/PhotoCarousel';
import TrackedLink from '@/components/TrackedLink';
import ClaimButton from '@/components/ClaimButton';
import LeadModal from '@/components/LeadModal';
import LockedContactButton from '@/components/LockedContactButton';
import { isContactVisible } from '@/lib/contactVisibility';
import { cartierSlug, CARTIER_MIN_LISTINGS } from '@/lib/cartiere';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const db = getDb();
  const k = db.prepare('SELECT * FROM kindergartens WHERE id = ?').get(id) as Kindergarten | undefined;
  if (!k) return { title: 'Gradinita negasita' };

  const tip = k.type === 'cresa' ? 'Cresa' : 'Gradinita';
  const sectorSuffix = k.sector ? ` Sector ${k.sector}` : '';
  const title = `${k.name} | ${tip} privata${sectorSuffix} Bucuresti — ActivKids`;

  const rawDesc = (k.description
    ? k.description.replace(/\s+/g, ' ').trim()
    : `${k.name}, ${tip.toLowerCase()} privata in Bucuresti${sectorSuffix}.${k.price_min ? ` Pret de la ${k.price_min} lei/luna.` : ''}`);
  let description = rawDesc;
  if (description.length > 155) {
    const cut = rawDesc.slice(0, 155);
    const lastSpace = cut.lastIndexOf(' ');
    description = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-—]+$/, '') + '…';
  }

  let ogImage: string | undefined;
  try { const ph = k.photo_urls ? JSON.parse(k.photo_urls) : []; if (Array.isArray(ph) && ph.length && typeof ph[0] === 'string') ogImage = ph[0]; } catch {}

  const canonical = `https://activkids.ro/gradinite/${toSlug(k.name, k.id)}`;
  return {
    title, description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: 'ActivKids', locale: 'ro_RO', type: 'website', ...(ogImage && { images: [{ url: ogImage, alt: k.name }] }) },
    twitter: { card: ogImage ? 'summary_large_image' : 'summary', title, description, ...(ogImage && { images: [ogImage] }) },
  };
}

export default async function KindergartenPage({ params }: Props) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const db = getDb();
  const k = db.prepare('SELECT * FROM kindergartens WHERE id = ?').get(id) as Kindergarten | undefined;
  if (!k) notFound();

  const tip = k.type === 'cresa' ? 'Cresa' : 'Gradinita';
  const bMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  const contactHidden = bMode && !isContactVisible(k);
  const activities = k.activities?.split(',').map(a => a.trim()).filter(Boolean) || [];

  const cartierCount = k.neighborhood
    ? (db.prepare('SELECT COUNT(*) as c FROM kindergartens WHERE neighborhood = ?').get(k.neighborhood) as { c: number }).c
    : 0;
  const showCartierLink = !!k.neighborhood && cartierCount >= CARTIER_MIN_LISTINGS;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': k.type === 'cresa' ? 'ChildCare' : 'Preschool',
    name: k.name,
    description: k.description || `${tip} in Bucuresti`,
    address: { '@type': 'PostalAddress', streetAddress: k.address, addressLocality: 'București', addressCountry: 'RO' },
    ...(k.lat && k.lng ? { geo: { '@type': 'GeoCoordinates', latitude: k.lat, longitude: k.lng } } : {}),
    ...(k.phone && { telephone: k.phone }),
    ...(k.website && { url: k.website }),
    ...(k.email && { email: k.email }),
    ...(k.price_min && { priceRange: `${k.price_min}${k.price_max && k.price_max !== k.price_min ? `-${k.price_max}` : ''} lei/luna` }),
    ...(k.rating && k.reviews_count && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: k.rating, reviewCount: k.reviews_count },
    }),
  };

  return (
    <>
      <PageviewTracker page={`/gradinite/${slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <a href="/gradinite" className="text-pink-600 hover:underline text-sm">← Gradinite</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-light)] truncate">{k.name}</span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
            {k.banner_url && (<img src={k.banner_url} alt={`Banner ${k.name}`} className="w-full h-40 object-cover" />)}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{k.name}</h1>
                  {k.rating && k.reviews_count ? (
                    <div className="mt-1 mb-1">
                      <a href={k.maps_url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:opacity-80">
                        <span className="flex">{Array.from({ length: 5 }, (_, i) => { const fill = Math.min(Math.max(k.rating! - i, 0), 1); const type = fill >= 0.75 ? 'full' : fill >= 0.25 ? 'half' : 'empty'; return (<svg key={i} className="w-4 h-4" viewBox="0 0 20 20">{type === 'full' && <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#FBBF24" />}{type === 'half' && (<><defs><linearGradient id={`hg${i}`}><stop offset="50%" stopColor="#FBBF24"/><stop offset="50%" stopColor="#D1D5DB"/></linearGradient></defs><polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill={`url(#hg${i})`} /></>)}{type === 'empty' && <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#D1D5DB" />}</svg>); })}</span>
                        <span className="text-sm font-semibold text-gray-700">{k.rating.toFixed(1)}</span>
                        <span className="text-sm text-gray-400">({k.reviews_count} recenzii Google)</span>
                      </a>
                    </div>
                  ) : null}
                  <p className="text-sm text-[var(--color-text-light)] mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {cleanAddressDisplay(k.address)}
                  </p>
                  {showCartierLink && (
                    <a href={`/gradinite/cartier/${cartierSlug(k.neighborhood!)}`} className="inline-block mt-1 text-xs text-pink-600 hover:underline">
                      Vezi alte gradinite în cartierul {k.neighborhood} →
                    </a>
                  )}
                  <p className="mt-1 text-xs text-[var(--color-text-light)]">
                    Nu ești sigur că e alegerea potrivită?{' '}
                    <a href="/potrivire" className="text-amber-600 font-semibold hover:underline">Încearcă Potrivirea 🎯</a>
                  </p>
                </div>
                {k.is_premium === 1 && (<span className="flex-shrink-0 inline-flex items-center gap-1 bg-amber-400 text-white px-3 py-1 rounded-full text-sm font-bold">★ Premium</span>)}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1 bg-pink-50 text-pink-700 border border-pink-200 px-3 py-1 rounded-full text-sm font-semibold">{tip}</span>
                {(k.age_min || k.age_max) && (<span className="inline-flex items-center gap-1 bg-blue-50 text-[var(--color-primary)] border border-blue-200 px-3 py-1 rounded-full text-sm font-semibold">{k.age_min ?? '?'}-{k.age_max ?? '?'} ani</span>)}
                {k.program && (<span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full text-sm font-semibold">Program: {k.program}</span>)}
              </div>

              {k.photo_urls && (<PhotoCarousel photos={JSON.parse(k.photo_urls)} name={k.name} />)}

              {(k.description || k.editorial_summary) && (
                <div className="mb-5">
                  {k.description && <p className="text-sm text-[var(--color-text-main)] leading-relaxed" style={{ whiteSpace: 'pre-line' }}>{k.description}</p>}
                  {k.editorial_summary && k.editorial_summary !== k.description && (<p className="text-sm text-[var(--color-text-main)] leading-relaxed mt-2" dangerouslySetInnerHTML={{ __html: k.editorial_summary }} />)}
                  {k.website && (<a href={k.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-block mt-2 text-sm text-pink-600 hover:underline">Citeste mai mult →</a>)}
                </div>
              )}

              {activities.length > 0 && (
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-[var(--color-text-main)] mb-2">Activitati</h2>
                  <div className="flex flex-wrap gap-2">{activities.map((a, i) => (<span key={i} className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs">{a}</span>))}</div>
                </div>
              )}

              {(k.price_min !== null || k.program) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  {k.price_min !== null && (<div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-xs text-[var(--color-text-light)]">Pret/luna</div><div className="font-semibold text-sm text-[var(--color-success)]">{k.price_min === k.price_max ? `${k.price_min} lei` : `${k.price_min}-${k.price_max} lei`}</div></div>)}
                  {k.program && (<div className="bg-purple-50 rounded-lg p-3 text-center"><div className="text-xs text-[var(--color-text-light)]">Program</div><div className="font-semibold text-sm text-purple-700">{k.program}</div></div>)}
                </div>
              )}

              <div className="pt-4 border-t border-[var(--color-border)]">
                <div className="flex flex-wrap gap-3">
                  <TrackedLink href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(k.address + ', Bucuresti')}`} type="kindergarten" itemId={k.id} itemName={k.name} linkType="maps" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors">Vezi pe harta</TrackedLink>
                  {k.phone && (contactHidden
                    ? <LockedContactButton label="Telefonul" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">{k.phone}</LockedContactButton>
                    : <TrackedLink href={`tel:${k.phone}`} type="kindergarten" itemId={k.id} itemName={k.name} linkType="phone" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">{k.phone}</TrackedLink>)}
                  {k.email && (contactHidden
                    ? <LockedContactButton label="Emailul" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">{k.email}</LockedContactButton>
                    : <TrackedLink href={`mailto:${k.email}`} type="kindergarten" itemId={k.id} itemName={k.name} linkType="email" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">{k.email}</TrackedLink>)}
                  {k.website && (<TrackedLink href={k.website} type="kindergarten" itemId={k.id} itemName={k.name} linkType="website" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">Website</TrackedLink>)}
                  {k.facebook_url && (<TrackedLink href={k.facebook_url} type="kindergarten" itemId={k.id} itemName={k.name} linkType="facebook" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#0f63d2] text-white text-sm font-semibold rounded-lg transition-colors">Facebook</TrackedLink>)}
                  {k.leads_enabled !== 0 && <LeadModal listingType="kindergarten" listingId={k.id} listingName={k.name} />}
                </div>
              </div>
                <div className="mt-3">
                  <TrackedLink href="https://www.facebook.com/profile.php?id=61591256207467" type="kindergarten" itemId={k.id} itemName={k.name} linkType="activkids_facebook" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
                    📘 Stai la curent cu noutăți: afterschooluri și activități noi
                  </TrackedLink>
                </div>
            </div>
          </div>
          <div className="mt-6 text-center"><a href="/gradinite" className="text-pink-600 hover:underline text-sm">← Inapoi la gradinite</a></div>
          <ClaimButton listingType="kindergarten" listingId={k.id} listingName={k.name} />
        </main>
      </div>
    </>
  );
}
