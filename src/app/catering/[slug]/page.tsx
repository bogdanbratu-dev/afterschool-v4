import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { idFromSlug, toSlug } from '@/lib/slug';
import { isContactVisible } from '@/lib/contactVisibility';
import type { Metadata } from 'next';
import type { Caterer } from '@/lib/db';
import PageviewTracker from '@/components/PageviewTracker';
import PhotoCarousel from '@/components/PhotoCarousel';
import TrackedLink from '@/components/TrackedLink';
import ClaimButton from '@/components/ClaimButton';
import LeadModal from '@/components/LeadModal';
import LockedContactButton from '@/components/LockedContactButton';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const db = getDb();
  const c = db.prepare('SELECT * FROM caterers WHERE id = ?').get(id) as Caterer | undefined;
  if (!c) return { title: 'Firma de catering negasita' };

  const title = `${c.name} | Catering pentru Afterschool în București — ActivKids`;

  const rawDesc = (c.description
    ? c.description.replace(/\s+/g, ' ').trim()
    : `${c.name}, firma de catering pentru afterschool-uri în București și Ilfov.${c.coverage_area ? ` Deservește: ${c.coverage_area}.` : ''}`);
  let description = rawDesc;
  if (description.length > 155) {
    const cut = rawDesc.slice(0, 155);
    const lastSpace = cut.lastIndexOf(' ');
    description = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-—]+$/, '') + '…';
  }

  let ogImage: string | undefined;
  try {
    const photos = c.photo_urls ? JSON.parse(c.photo_urls) : [];
    if (Array.isArray(photos) && photos.length > 0 && typeof photos[0] === 'string') ogImage = photos[0];
  } catch {}

  const canonical = `https://activkids.ro/catering/${toSlug(c.name, c.id)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'ActivKids',
      locale: 'ro_RO',
      type: 'website',
      ...(ogImage && { images: [{ url: ogImage, alt: c.name }] }),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function CatererPage({ params }: Props) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const db = getDb();
  const c = db.prepare('SELECT * FROM caterers WHERE id = ?').get(id) as Caterer | undefined;
  if (!c) notFound();

  const bMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  const contactHidden = bMode && !isContactVisible(c);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    name: c.name,
    description: c.description || `Catering pentru afterschool-uri in Bucuresti`,
    servesCuisine: 'Mancare pentru copii',
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.address,
      addressLocality: 'București',
      addressCountry: 'RO',
    },
    ...(c.lat && c.lng ? { geo: { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } } : {}),
    ...(c.phone && { telephone: c.phone }),
    ...(c.website && { url: c.website }),
    ...(c.email && { email: c.email }),
    ...(c.price_min && { priceRange: `${c.price_min}${c.price_max && c.price_max !== c.price_min ? `-${c.price_max}` : ''} lei` }),
    ...(c.rating && c.reviews_count && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: c.rating, reviewCount: c.reviews_count },
    }),
  };

  return (
    <>
      <PageviewTracker page={`/catering/${slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <a href="/catering" className="text-teal-600 hover:underline text-sm">← Catering</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-light)] truncate">{c.name}</span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
            {c.banner_url && (
              <img src={c.banner_url} alt={`Banner ${c.name}`} className="w-full h-40 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{c.name}</h1>
                  {c.rating && c.reviews_count ? (
                    <div className="mt-1 mb-1">
                      <a href={c.maps_url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:opacity-80">
                        <span className="flex">
                          {Array.from({ length: 5 }, (_, i) => {
                            const fill = Math.min(Math.max(c.rating! - i, 0), 1);
                            const type = fill >= 0.75 ? 'full' : fill >= 0.25 ? 'half' : 'empty';
                            return (
                              <svg key={i} className="w-4 h-4" viewBox="0 0 20 20">
                                {type === 'full' && <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#FBBF24" />}
                                {type === 'half' && (<><defs><linearGradient id={`hc${i}`}><stop offset="50%" stopColor="#FBBF24"/><stop offset="50%" stopColor="#D1D5DB"/></linearGradient></defs><polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill={`url(#hc${i})`} /></>)}
                                {type === 'empty' && <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#D1D5DB" />}
                              </svg>
                            );
                          })}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">{c.rating.toFixed(1)}</span>
                        <span className="text-sm text-gray-400">({c.reviews_count} recenzii Google)</span>
                      </a>
                    </div>
                  ) : null}
                  <p className="text-sm text-[var(--color-text-light)] mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {c.address}
                  </p>
                </div>
                {c.is_premium === 1 && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 bg-amber-400 text-white px-3 py-1 rounded-full text-sm font-bold">★ Premium</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-full text-sm font-semibold">🍽️ Catering</span>
                {c.coverage_area && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-[var(--color-primary)] border border-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                    Deservește: {c.coverage_area}
                  </span>
                )}
              </div>

              {c.photo_urls && (
                <PhotoCarousel photos={JSON.parse(c.photo_urls)} name={c.name} />
              )}

              {c.video_urls && (() => {
                const videos: string[] = JSON.parse(c.video_urls);
                const getYtId = (url: string) => {
                  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
                  return m ? m[1] : null;
                };
                const ids = videos.map(getYtId).filter(Boolean) as string[];
                if (!ids.length) return null;
                return (
                  <div className="mb-5 space-y-3">
                    {ids.map(vid => (
                      <div key={vid} className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
                        <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${vid}`} title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(c.description || c.editorial_summary) && (
                <div className="mb-5">
                  {c.description && <p className="text-sm text-[var(--color-text-main)] leading-relaxed">{c.description}</p>}
                  {c.editorial_summary && c.editorial_summary !== c.description && (
                    <p className="text-sm text-[var(--color-text-main)] leading-relaxed mt-2" dangerouslySetInnerHTML={{ __html: c.editorial_summary }} />
                  )}
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-block mt-2 text-sm text-teal-600 hover:underline">Citește mai mult →</a>
                  )}
                </div>
              )}

              {c.price_min !== null && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-[var(--color-text-light)]">Pret</div>
                    <div className="font-semibold text-sm text-[var(--color-success)]">
                      {c.price_min === c.price_max ? `${c.price_min} lei` : `${c.price_min}-${c.price_max} lei`}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--color-border)]">
                <div className="flex flex-wrap gap-3">
                  <TrackedLink href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.address + ', Bucuresti')}`} type="caterer" itemId={c.id} itemName={c.name} linkType="maps" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors">
                    Vezi pe hartă
                  </TrackedLink>
                  {c.phone && (
                    contactHidden ? (
                      <LockedContactButton label="Telefonul" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                        {c.phone}
                      </LockedContactButton>
                    ) : (
                      <TrackedLink href={`tel:${c.phone}`} type="caterer" itemId={c.id} itemName={c.name} linkType="phone" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                      {c.phone}
                      </TrackedLink>
                    )
                  )}
                  {c.email && (
                    contactHidden ? (
                      <LockedContactButton label="Emailul" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                        {c.email}
                      </LockedContactButton>
                    ) : (
                      <TrackedLink href={`mailto:${c.email}`} type="caterer" itemId={c.id} itemName={c.name} linkType="email" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                      {c.email}
                      </TrackedLink>
                    )
                  )}
                  {c.website && (
                    <TrackedLink href={c.website} type="caterer" itemId={c.id} itemName={c.name} linkType="website" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
                    Website
                  </TrackedLink>
                  )}
                  {c.facebook_url && (
                    <TrackedLink href={c.facebook_url} type="caterer" itemId={c.id} itemName={c.name} linkType="facebook" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#0f63d2] text-white text-sm font-semibold rounded-lg transition-colors">
                    Facebook
                  </TrackedLink>
                  )}
                  {c.reviews_url && (
                    <TrackedLink href={c.reviews_url} type="caterer" itemId={c.id} itemName={c.name} linkType="reviews" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg transition-colors">
                    ⭐ Recenzii
                  </TrackedLink>
                  )}
                  {c.leads_enabled !== 0 && <LeadModal listingType="caterer" listingId={c.id} listingName={c.name} />}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/catering" className="text-teal-600 hover:underline text-sm">← Înapoi la catering</a>
          </div>

          <ClaimButton listingType="caterer" listingId={c.id} listingName={c.name} />
        </main>
      </div>
    </>
  );
}
