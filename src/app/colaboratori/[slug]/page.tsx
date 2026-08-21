import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { idFromSlug, toSlug, cleanAddressDisplay } from '@/lib/slug';
import { isContactVisible } from '@/lib/contactVisibility';
import type { Metadata } from 'next';
import type { Professional } from '@/lib/db';
import { PROFESSIONAL_CATEGORY_LABELS, KIND_LABELS } from '@/lib/professionals';
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
  const p = db.prepare('SELECT * FROM professionals WHERE id = ?').get(id) as Professional | undefined;
  if (!p) return { title: 'Colaborator negasit' };

  const catLabel = PROFESSIONAL_CATEGORY_LABELS[p.category] || 'Colaborator';
  const title = `${p.name} | ${catLabel} in Bucuresti — ActivKids`;

  const rawDesc = (p.description
    ? p.description.replace(/\s+/g, ' ').trim()
    : `${p.name}, ${catLabel.toLowerCase()} pentru copii in Bucuresti.${p.coverage_area ? ` Zona: ${p.coverage_area}.` : ''}`);
  let description = rawDesc;
  if (description.length > 155) {
    const cut = rawDesc.slice(0, 155);
    const lastSpace = cut.lastIndexOf(' ');
    description = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-—]+$/, '') + '…';
  }

  let ogImage: string | undefined;
  try {
    const photos = p.photo_urls ? JSON.parse(p.photo_urls) : [];
    if (Array.isArray(photos) && photos.length > 0 && typeof photos[0] === 'string') ogImage = photos[0];
  } catch {}

  const canonical = `https://activkids.ro/colaboratori/${toSlug(p.name, p.id)}`;

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
      ...(ogImage && { images: [{ url: ogImage, alt: p.name }] }),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function ProfessionalPage({ params }: Props) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const db = getDb();
  const p = db.prepare('SELECT * FROM professionals WHERE id = ?').get(id) as Professional | undefined;
  if (!p) notFound();

  const catLabel = PROFESSIONAL_CATEGORY_LABELS[p.category] || 'Colaborator';
  const bMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  const contactHidden = bMode && !isContactVisible(p);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    jobTitle: catLabel,
    description: p.description || `${catLabel} pentru copii in Bucuresti`,
    ...(p.address ? { address: { '@type': 'PostalAddress', streetAddress: p.address, addressLocality: 'București', addressCountry: 'RO' } } : {}),
    ...(p.phone && { telephone: p.phone }),
    ...(p.website && { url: p.website }),
    ...(p.email && { email: p.email }),
    ...(p.coverage_area && { areaServed: p.coverage_area }),
  };

  return (
    <>
      <PageviewTracker page={`/colaboratori/${slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <a href="/colaboratori" className="text-indigo-600 hover:underline text-sm">← Colaboratori</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-light)] truncate">{p.name}</span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
            {p.banner_url && (
              <img src={p.banner_url} alt={`Banner ${p.name}`} className="w-full h-40 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{p.name}</h1>
                  {p.rating && p.reviews_count ? (
                    <div className="mt-1 mb-1">
                      <a href={p.maps_url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:opacity-80">
                        <span className="flex">
                          {Array.from({ length: 5 }, (_, i) => {
                            const fill = Math.min(Math.max(p.rating! - i, 0), 1);
                            const type = fill >= 0.75 ? 'full' : fill >= 0.25 ? 'half' : 'empty';
                            return (
                              <svg key={i} className="w-4 h-4" viewBox="0 0 20 20">
                                {type === 'full' && <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#FBBF24" />}
                                {type === 'half' && (<><defs><linearGradient id={`hp${i}`}><stop offset="50%" stopColor="#FBBF24"/><stop offset="50%" stopColor="#D1D5DB"/></linearGradient></defs><polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill={`url(#hp${i})`} /></>)}
                                {type === 'empty' && <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#D1D5DB" />}
                              </svg>
                            );
                          })}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">{p.rating.toFixed(1)}</span>
                        <span className="text-sm text-gray-400">({p.reviews_count} recenzii Google)</span>
                      </a>
                    </div>
                  ) : null}
                  {p.address && (
                    <p className="text-sm text-[var(--color-text-light)] mt-1 flex items-center gap-1">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {cleanAddressDisplay(p.address)}
                    </p>
                  )}
                </div>
                {p.is_premium === 1 && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 bg-amber-400 text-white px-3 py-1 rounded-full text-sm font-bold">★ Premium</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full text-sm font-semibold">{catLabel}</span>
                {p.kind && (<span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${p.kind === 'independent' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{KIND_LABELS[p.kind]}</span>)}
                {p.online_available === 1 && (
                  <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1 rounded-full text-sm font-semibold">💻 Online</span>
                )}
                {p.home_service === 1 && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-sm font-semibold">🏠 La domiciliu</span>
                )}
                {p.coverage_area && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-[var(--color-primary)] border border-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                    Zona: {p.coverage_area}
                  </span>
                )}
              </div>

              {p.photo_urls && (
                <PhotoCarousel photos={JSON.parse(p.photo_urls)} name={p.name} />
              )}

              {(p.description || p.editorial_summary) && (
                <div className="mb-5">
                  {p.description && <p className="text-sm text-[var(--color-text-main)] leading-relaxed" style={{ whiteSpace: 'pre-line' }}>{p.description}</p>}
                  {p.editorial_summary && p.editorial_summary !== p.description && (
                    <p className="text-sm text-[var(--color-text-main)] leading-relaxed mt-2" dangerouslySetInnerHTML={{ __html: p.editorial_summary }} />
                  )}
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-block mt-2 text-sm text-indigo-600 hover:underline">Citeste mai mult →</a>
                  )}
                </div>
              )}

              {p.video_urls && (() => {
                let videos: string[] = [];
                try { videos = JSON.parse(p.video_urls); } catch {}
                if (!videos.length) return null;
                return (
                  <div className="mb-5">
                    <h2 className="text-sm font-semibold text-[var(--color-text-main)] mb-2">Video</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {videos.map((v, i) => (
                        <video key={i} src={v} controls playsInline preload="metadata" className="w-full rounded-lg border border-[var(--color-border)] bg-black" />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {p.price_min !== null && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-[var(--color-text-light)]">Pret/sedinta</div>
                    <div className="font-semibold text-sm text-[var(--color-success)]">
                      {p.price_min === p.price_max ? `${p.price_min} lei` : `${p.price_min}-${p.price_max} lei`}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--color-border)]">
                <div className="flex flex-wrap gap-3">
                  {p.address && (
                    <TrackedLink href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address + ', Bucuresti')}`} type="professional" itemId={p.id} itemName={p.name} linkType="maps" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors">
                      Vezi pe harta
                    </TrackedLink>
                  )}
                  {p.phone && (
                    contactHidden ? (
                      <LockedContactButton label="Telefonul" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                        {p.phone}
                      </LockedContactButton>
                    ) : (
                      <TrackedLink href={`tel:${p.phone}`} type="professional" itemId={p.id} itemName={p.name} linkType="phone" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                      {p.phone}
                      </TrackedLink>
                    )
                  )}
                  {p.email && (
                    contactHidden ? (
                      <LockedContactButton label="Emailul" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                        {p.email}
                      </LockedContactButton>
                    ) : (
                      <TrackedLink href={`mailto:${p.email}`} type="professional" itemId={p.id} itemName={p.name} linkType="email" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                      {p.email}
                      </TrackedLink>
                    )
                  )}
                  {p.website && (
                    <TrackedLink href={p.website} type="professional" itemId={p.id} itemName={p.name} linkType="website" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
                      Website
                    </TrackedLink>
                  )}
                  {p.facebook_url && (
                    <TrackedLink href={p.facebook_url} type="professional" itemId={p.id} itemName={p.name} linkType="facebook" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#0f63d2] text-white text-sm font-semibold rounded-lg transition-colors">
                      Facebook
                    </TrackedLink>
                  )}
                  {p.leads_enabled !== 0 && <LeadModal listingType="professional" listingId={p.id} listingName={p.name} />}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/colaboratori" className="text-indigo-600 hover:underline text-sm">← Inapoi la colaboratori</a>
          </div>

          <ClaimButton listingType="professional" listingId={p.id} listingName={p.name} />
        </main>
      </div>
    </>
  );
}
