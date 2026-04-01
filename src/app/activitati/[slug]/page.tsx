import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { idFromSlug, toSlug } from '@/lib/slug';
import { CLUB_CATEGORY_LABELS } from '@/lib/clubs';
import type { Metadata } from 'next';
import type { Club } from '@/lib/db';
import ClubsNearby from '@/components/ClubsNearby';
import PageviewTracker from '@/components/PageviewTracker';

type Props = { params: Promise<{ slug: string }> };

const CATEGORY_ICONS: Record<string, string> = {
  inot: '🏊', fotbal: '⚽', dansuri: '💃', arte_martiale: '🥋',
  gimnastica: '🤸', limbi_straine: '🌍', robotica: '🤖', muzica: '🎵', arte_creative: '🎨',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const db = getDb();
  const club = db.prepare('SELECT * FROM clubs WHERE id = ?').get(id) as Club | undefined;
  if (!club) return { title: 'Activitate negasita' };

  const categoryLabel = CLUB_CATEGORY_LABELS[club.category] || club.category;
  const title = `${club.name} - ${categoryLabel} in Bucuresti`;
  const description = club.description
    ? club.description.slice(0, 160)
    : `${categoryLabel} pentru copii la ${club.name}, ${club.address}, Bucuresti.${club.price_min ? ` Pret de la ${club.price_min} lei.` : ''}`;

  return {
    title,
    description,
    alternates: { canonical: `https://activkids.ro/activitati/${toSlug(club.name, club.id)}` },
    openGraph: {
      title,
      description,
      url: `https://activkids.ro/activitati/${toSlug(club.name, club.id)}`,
      siteName: 'ActiveKids',
      locale: 'ro_RO',
      type: 'website',
    },
  };
}

export default async function ClubPage({ params }: Props) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const db = getDb();
  const club = db.prepare('SELECT * FROM clubs WHERE id = ?').get(id) as (Club & { banner_url?: string | null }) | undefined;
  if (!club) notFound();

  const bMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  const contactHidden = bMode && !club.is_premium && club.contacts_hidden;
  const categoryLabel = CLUB_CATEGORY_LABELS[club.category] || club.category;
  const icon = CATEGORY_ICONS[club.category] || '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: club.name,
    description: club.description || `${categoryLabel} pentru copii in Bucuresti`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: club.address,
      addressLocality: 'București',
      addressCountry: 'RO',
    },
    geo: { '@type': 'GeoCoordinates', latitude: club.lat, longitude: club.lng },
    ...(club.phone && { telephone: club.phone }),
    ...(club.website && { url: club.website }),
    ...(club.email && { email: club.email }),
    ...(club.price_min && { priceRange: `${club.price_min}${club.price_max && club.price_max !== club.price_min ? `-${club.price_max}` : ''} lei` }),
  };

  return (
    <>
      <PageviewTracker page={`/activitati/${slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <a href="/activitati" className="text-[var(--color-primary)] hover:underline text-sm">← Activitati</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-light)] truncate">{club.name}</span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
            {club.banner_url && (
              <img src={club.banner_url} alt={`Banner ${club.name}`} className="w-full h-40 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{club.name}</h1>
                  {club.rating && club.reviews_count ? (
                    <div className="mt-1 mb-1">
                      <a href={club.maps_url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:opacity-80">
                        <span className="flex">
                          {Array.from({ length: 5 }, (_, i) => {
                            const fill = Math.min(Math.max(club.rating! - i, 0), 1);
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
                        <span className="text-sm font-semibold text-gray-700">{club.rating.toFixed(1)}</span>
                        <span className="text-sm text-gray-400">({club.reviews_count} recenzii Google)</span>
                      </a>
                    </div>
                  ) : null}
                  <p className="text-sm text-[var(--color-text-light)] mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {club.address}
                  </p>
                </div>
                {club.is_premium === 1 && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 bg-amber-400 text-white px-3 py-1 rounded-full text-sm font-bold">★ Premium</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1 bg-blue-50 text-[var(--color-primary)] border border-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                  {icon} {categoryLabel}
                </span>
                {club.availability === 'available' && (
                  <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-semibold">
                    Locuri disponibile
                  </span>
                )}
                {club.availability === 'full' && (
                  <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-semibold">
                    Locuri indisponibile
                  </span>
                )}
              </div>

              {club.description && (
                <p className="text-sm text-[var(--color-text-main)] mb-5 leading-relaxed">{club.description}</p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {club.price_min !== null && (
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-[var(--color-text-light)]">Pret</div>
                    <div className="font-semibold text-sm text-[var(--color-success)]">
                      {club.price_min === club.price_max ? `${club.price_min} lei` : `${club.price_min}-${club.price_max} lei`}
                    </div>
                  </div>
                )}
                {club.schedule && (
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-[var(--color-text-light)]">Program</div>
                    <div className="font-semibold text-xs text-[var(--color-accent)]">{club.schedule}</div>
                  </div>
                )}
                {club.age_min !== null && (
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-[var(--color-text-light)]">Varsta</div>
                    <div className="font-semibold text-sm text-[var(--color-primary)]">{club.age_min}-{club.age_max} ani</div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--color-border)]">
                {contactHidden ? (
                  <p className="text-sm text-[var(--color-text-light)]">Contactul este disponibil doar pentru listari premium.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(club.address + ', Bucuresti')}`}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Cum ajung aici
                    </a>
                    {club.phone && (
                      <a href={`tel:${club.phone}`} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                        {club.phone}
                      </a>
                    )}
                    {club.email && (
                      <a href={`mailto:${club.email}`} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                        {club.email}
                      </a>
                    )}
                    {club.website && (
                      <a href={club.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
                        Website
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/activitati" className="text-[var(--color-primary)] hover:underline text-sm">
              ← Inapoi la activitati
            </a>
          </div>

          <ClubsNearby lat={club.lat} lng={club.lng} currentId={club.id} defaultCategory={club.category} />
        </main>
      </div>
    </>
  );
}
