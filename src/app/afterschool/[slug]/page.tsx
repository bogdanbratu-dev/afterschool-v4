import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { idFromSlug, toSlug } from '@/lib/slug';
import type { Metadata } from 'next';
import type { AfterSchool } from '@/lib/db';
import AfterSchoolsNearby from '@/components/AfterSchoolsNearby';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const db = getDb();
  const as = db.prepare('SELECT * FROM afterschools WHERE id = ?').get(id) as AfterSchool | undefined;
  if (!as) return { title: 'AfterSchool negasit' };

  const title = `${as.name} - After School ${as.address}`;
  const description = as.description
    ? as.description.slice(0, 160)
    : `After school ${as.name} din ${as.address}, Bucuresti. ${as.price_min ? `Pret de la ${as.price_min} lei/luna.` : ''}`;

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
  const as = db.prepare('SELECT * FROM afterschools WHERE id = ?').get(id) as (AfterSchool & { banner_url?: string | null }) | undefined;
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

              {as.description && (
                <p className="text-sm text-[var(--color-text-main)] mb-5 leading-relaxed">{as.description}</p>
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
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${as.lat},${as.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Cum ajung aici
                    </a>
                    {as.phone && (
                      <a href={`tel:${as.phone}`} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                        {as.phone}
                      </a>
                    )}
                    {as.email && (
                      <a href={`mailto:${as.email}`} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                        {as.email}
                      </a>
                    )}
                    {as.website && (
                      <a href={as.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
                        Website
                      </a>
                    )}
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

          <AfterSchoolsNearby lat={as.lat} lng={as.lng} currentId={as.id} />
        </main>
      </div>
    </>
  );
}
