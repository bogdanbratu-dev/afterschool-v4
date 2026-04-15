import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { idFromSlug, toSlug } from '@/lib/slug';
import type { Metadata } from 'next';
import type { AfterSchool } from '@/lib/db';
import AfterSchoolsNearby from '@/components/AfterSchoolsNearby';
import PageviewTracker from '@/components/PageviewTracker';
import PhotoCarousel from '@/components/PhotoCarousel';
import TrackedLink from '@/components/TrackedLink';
import ClaimButton from '@/components/ClaimButton';
import LeadModal from '@/components/LeadModal';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const db = getDb();
  const as = db.prepare('SELECT * FROM afterschools WHERE id = ?').get(id) as AfterSchool | undefined;
  if (!as) return { title: 'AfterSchool negasit' };

  const sectorSuffix = as.sector ? ` Sector ${as.sector}` : '';
  const title = `${as.name} | After School${sectorSuffix} București — ActivKids`;
  const description = as.description
    ? as.description.slice(0, 160)
    : `After school ${as.name}${sectorSuffix}, București. ${as.price_min ? `Preț de la ${as.price_min} lei/lună. ` : ''}Program extins, activități diverse pentru copii.`;

  return {
    title,
    description,
    alternates: { canonical: `https://activkids.ro/afterschool/${toSlug(as.name, as.id)}` },
    openGraph: {
      title,
      description,
      url: `https://activkids.ro/afterschool/${toSlug(as.name, as.id)}`,
      siteName: 'ActiveKids',
      locale: 'ro_RO',
      type: 'website',
    },
  };
}

export default async function AfterSchoolPage({ params }: Props) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const db = getDb();
  const as = db.prepare('SELECT * FROM afterschools WHERE id = ?').get(id) as (AfterSchool & { banner_url?: string | null; video_urls?: string | null; reviews_url?: string | null }) | undefined;
  if (!as) notFound();

  const bMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  const contactHidden = bMode && !as.is_premium && as.contacts_hidden;
  const activities = as.activities?.split(',').map(a => a.trim()).filter(Boolean) || [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ChildCare',
    name: as.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: as.address,
      addressLocality: 'București',
      addressCountry: 'RO',
    },
    geo: { '@type': 'GeoCoordinates', latitude: as.lat, longitude: as.lng },
    ...(as.phone && { telephone: as.phone }),
    ...(as.website && { url: as.website }),
    ...(as.email && { email: as.email }),
    ...(as.description && { description: as.description }),
    ...(as.price_min && { priceRange: `${as.price_min}${as.price_max && as.price_max !== as.price_min ? `-${as.price_max}` : ''} lei/luna` }),
  };

  return (
    <>
      <PageviewTracker page={`/afterschool/${slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <a href="/" className="text-[var(--color-primary)] hover:underline text-sm">← AfterSchool Finder</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-light)] truncate">{as.name}</span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
            {as.banner_url && (
              <img src={as.banner_url} alt={`Banner ${as.name}`} className="w-full h-40 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{as.name}</h1>
                  {as.rating && as.reviews_count ? (
                    <div className="mt-1 mb-1">
                      <a href={as.maps_url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:opacity-80">
                        <span className="flex">
                          {Array.from({ length: 5 }, (_, i) => {
                            const fill = Math.min(Math.max(as.rating! - i, 0), 1);
                            const type = fill >= 0.75 ? 'full' : fill >= 0.25 ? 'half' : 'empty';
                            return (
                              <svg key={i} className="w-4 h-4" viewBox="0 0 20 20">
                                {type === 'full' && <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#FBBF24" />}
                                {type === 'half' && (<><defs><linearGradient id={`hs${i}`}><stop offset="50%" stopColor="#FBBF24"/><stop offset="50%" stopColor="#D1D5DB"/></linearGradient></defs><polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill={`url(#hs${i})`} /></>)}
                                {type === 'empty' && <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#D1D5DB" />}
                              </svg>
                            );
                          })}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">{as.rating.toFixed(1)}</span>
                        <span className="text-sm text-gray-400">({as.reviews_count} recenzii Google)</span>
                      </a>
                    </div>
                  ) : null}
                  <p className="text-sm text-[var(--color-text-light)] mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {as.address}
                  </p>
                </div>
                {as.is_premium === 1 && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 bg-amber-400 text-white px-3 py-1 rounded-full text-sm font-bold">★ Premium</span>
                )}
              </div>

              {as.availability === 'available' && (
                <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-semibold mb-4">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Locuri disponibile
                </div>
              )}
              {as.availability === 'full' && (
                <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-semibold mb-4">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  Locuri indisponibile
                </div>
              )}

              {as.photo_urls && (
                <PhotoCarousel photos={JSON.parse(as.photo_urls)} name={as.name} />
              )}

              {as.video_urls && (() => {
                const videos: string[] = JSON.parse(as.video_urls);
                const getYtId = (url: string) => {
                  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
                  return m ? m[1] : null;
                };
                const ids = videos.map(getYtId).filter(Boolean) as string[];
                if (!ids.length) return null;
                return (
                  <div className="mb-5 space-y-3">
                    {ids.map(id => (
                      <div key={id} className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src={`https://www.youtube.com/embed/${id}`}
                          title="Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(as.description || as.editorial_summary) && (
                <div className="mb-5">
                  {as.description && (
                    <p className="text-sm text-[var(--color-text-main)] leading-relaxed">{as.description}</p>
                  )}
                  {as.editorial_summary && as.editorial_summary !== as.description && (
                    <p className="text-sm text-[var(--color-text-main)] leading-relaxed mt-2">{as.editorial_summary}</p>
                  )}
                  {as.website && (
                    <a href={as.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-block mt-2 text-sm text-[var(--color-primary)] hover:underline">
                      Citeste mai mult →
                    </a>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {as.price_min !== null && (
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-[var(--color-text-light)]">Pret lunar</div>
                    <div className="font-semibold text-sm text-[var(--color-success)]">
                      {as.price_min === as.price_max ? `${as.price_min} lei` : `${as.price_min}-${as.price_max} lei`}
                    </div>
                  </div>
                )}
                {as.pickup_time && (
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-[var(--color-text-light)]">Preluare</div>
                    <div className="font-semibold text-sm text-[var(--color-accent)]">{as.pickup_time}</div>
                  </div>
                )}
                {as.end_time && (
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-[var(--color-text-light)]">Program pana la</div>
                    <div className="font-semibold text-sm text-purple-600">{as.end_time}</div>
                  </div>
                )}
                {as.age_min !== null && (
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-[var(--color-text-light)]">Varsta</div>
                    <div className="font-semibold text-sm text-[var(--color-primary)]">{as.age_min}-{as.age_max} ani</div>
                  </div>
                )}
              </div>

              {activities.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-[var(--color-text-light)] uppercase mb-2">Activitati oferite</p>
                  <div className="flex flex-wrap gap-2">
                    {activities.map((a, i) => (
                      <span key={i} className="px-3 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full text-sm">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--color-border)]">
                {contactHidden ? (
                  <p className="text-sm text-[var(--color-text-light)]">Contactul este disponibil doar pentru listari premium.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <TrackedLink href={`https://www.google.com/maps/dir/?api=1&destination=${as.lat},${as.lng}`} type="afterschool" itemId={as.id} itemName={as.name} linkType="maps" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors">
                      Cum ajung aici
                    </TrackedLink>
                    {as.phone && (
                      <TrackedLink href={`tel:${as.phone}`} type="afterschool" itemId={as.id} itemName={as.name} linkType="phone" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                        {as.phone}
                      </TrackedLink>
                    )}
                    {as.email && (
                      <TrackedLink href={`mailto:${as.email}`} type="afterschool" itemId={as.id} itemName={as.name} linkType="email" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                        {as.email}
                      </TrackedLink>
                    )}
                    {as.website && (
                      <TrackedLink href={as.website} type="afterschool" itemId={as.id} itemName={as.name} linkType="website" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
                        Website
                      </TrackedLink>
                    )}
                    {as.reviews_url && (
                      <TrackedLink href={as.reviews_url} type="afterschool" itemId={as.id} itemName={as.name} linkType="reviews" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg transition-colors">
                        ⭐ Recenzii
                      </TrackedLink>
                    )}
                    <LeadModal listingType="afterschool" listingId={as.id} listingName={as.name} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-[var(--color-primary)] hover:underline text-sm">
              ← Inapoi la lista de after school-uri
            </a>
          </div>

          <ClaimButton listingType="afterschool" listingId={as.id} listingName={as.name} />
          <AfterSchoolsNearby lat={as.lat} lng={as.lng} currentId={as.id} />
        </main>
      </div>
    </>
  );
}
