'use client';

import { formatDistance } from '@/lib/distance';
import { toSlug } from '@/lib/slug';
import { CLUB_CATEGORY_LABELS } from '@/lib/clubs';
import type { ClubCategory } from '@/lib/clubs';

const CATEGORY_ICONS: Record<ClubCategory, string> = {
  inot: '🏊',
  fotbal: '⚽',
  dansuri: '💃',
  arte_martiale: '🥋',
  gimnastica: '🤸',
  limbi_straine: '🌍',
  robotica: '🤖',
  muzica: '🎵',
  arte_creative: '🎨',
};

interface ClubData {
  id: number;
  name: string;
  address: string;
  sector: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  price_min: number | null;
  price_max: number | null;
  schedule: string | null;
  age_min: number | null;
  age_max: number | null;
  description: string | null;
  category: ClubCategory;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number;
  contacts_hidden: number;
  banner_url?: string | null;
  distance?: number;
  rating?: number | null;
  reviews_count?: number | null;
  maps_url?: string | null;
}

function StarRating({ rating, count, mapsUrl }: { rating: number; count: number; mapsUrl?: string | null }) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const fill = Math.min(Math.max(rating - i, 0), 1);
    return fill >= 0.75 ? 'full' : fill >= 0.25 ? 'half' : 'empty';
  });
  const content = (
    <span className="inline-flex items-center gap-1">
      <span className="flex">
        {stars.map((s, i) => (
          <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 20 20">
            {s === 'full' && <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#FBBF24" />}
            {s === 'half' && (
              <>
                <defs><linearGradient id={`h${i}`}><stop offset="50%" stopColor="#FBBF24"/><stop offset="50%" stopColor="#D1D5DB"/></linearGradient></defs>
                <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill={`url(#h${i})`} />
              </>
            )}
            {s === 'empty' && <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#D1D5DB" />}
          </svg>
        ))}
      </span>
      <span className="text-xs font-semibold text-gray-700">{rating.toFixed(1)}</span>
      <span className="text-xs text-gray-400">({count})</span>
    </span>
  );
  if (mapsUrl) {
    return <a href={mapsUrl} target="_blank" rel="noopener noreferrer nofollow" className="hover:opacity-80 transition-opacity">{content}</a>;
  }
  return <>{content}</>;
}

interface ClubCardProps {
  data: ClubData;
  rank?: number;
  businessMode?: boolean;
}

export default function ClubCard({ data, rank, businessMode }: ClubCardProps) {
  const contactHidden = businessMode && !data.is_premium && data.contacts_hidden;

  const trackClick = (link_type: string) => {
    fetch('/api/analytics/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'club', item_id: data.id, item_name: data.name, link_type }),
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden hover:shadow-md transition-shadow">
      {businessMode && data.banner_url && (
        <img
          src={data.banner_url}
          alt={`Banner ${data.name}`}
          className="w-full h-28 sm:h-36 object-cover"
        />
      )}
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            {rank && (
              <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs sm:text-sm font-bold">
                {rank}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-[var(--color-text-main)] leading-tight">
                  <a href={`/activitati/${toSlug(data.name, data.id)}`} className="hover:text-[var(--color-primary)] transition-colors">{data.name}</a>
                </h3>
                {data.is_premium === 1 && (
                  <span className="inline-flex items-center gap-1 bg-amber-400 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                    ★ Premium
                  </span>
                )}
              </div>
              {data.rating && data.reviews_count ? (
                <div className="mt-0.5 mb-0.5">
                  <StarRating rating={data.rating} count={data.reviews_count} mapsUrl={data.maps_url} />
                </div>
              ) : null}
              <p className="text-xs sm:text-sm text-[var(--color-text-light)] flex items-start gap-1 mt-0.5">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="break-words">{data.address}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
            {data.distance !== undefined && (
              <div className="bg-blue-50 text-[var(--color-primary)] px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold">
                {formatDistance(data.distance)}
              </div>
            )}
            <span className="text-lg" title={CLUB_CATEGORY_LABELS[data.category]}>
              {CATEGORY_ICONS[data.category]}
            </span>
          </div>
        </div>

        {/* Category badge + Availability */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center gap-1 bg-blue-50 text-[var(--color-primary)] border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold">
            {CATEGORY_ICONS[data.category]} {CLUB_CATEGORY_LABELS[data.category]}
          </span>

          {data.availability === 'available' && (
            <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-semibold">
              <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Locuri disponibile
            </div>
          )}
          {data.availability === 'full' && (
            <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-semibold">
              <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Locuri indisponibile
            </div>
          )}
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-sm text-[var(--color-text-light)] mb-3 line-clamp-2">{data.description}</p>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {data.price_min !== null && (
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-xs text-[var(--color-text-light)]">Pret</div>
              <div className="font-semibold text-sm text-[var(--color-success)]">
                {data.price_min === data.price_max
                  ? `${data.price_min} lei`
                  : `${data.price_min}-${data.price_max} lei`}
              </div>
            </div>
          )}
          {data.schedule && (
            <div className="bg-amber-50 rounded-lg p-2 text-center">
              <div className="text-xs text-[var(--color-text-light)]">Program</div>
              <div className="font-semibold text-xs text-[var(--color-accent)]">{data.schedule}</div>
            </div>
          )}
          {data.age_min !== null && (
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-xs text-[var(--color-text-light)]">Varsta</div>
              <div className="font-semibold text-sm text-[var(--color-primary)]">{data.age_min}-{data.age_max} ani</div>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="pt-3 border-t border-[var(--color-border)]">
          {contactHidden ? (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-800">Date de contact indisponibile</p>
                <p className="text-xs text-amber-700">Upgrade la Premium pentru a vedea telefonul si website-ul</p>
              </div>
              <button className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors">
                Premium
              </button>
            </div>
          ) : (
            <>
              <div className="flex sm:hidden gap-2 mb-2">
                {data.phone && (
                  <a
                    href={`tel:${data.phone}`}
                    onClick={() => trackClick('phone')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold active:bg-[var(--color-primary-dark)] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Suna
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(data.address + ', Bucuresti')}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={() => trackClick('maps')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Cum ajung aici
                </a>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(data.address + ', Bucuresti')}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={() => trackClick('maps')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Cum ajung aici
                </a>
                {data.phone && (
                  <a href={`tel:${data.phone}`} onClick={() => trackClick('phone')} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {data.phone}
                  </a>
                )}
                {data.email && (
                  <a href={`mailto:${data.email}`} onClick={() => trackClick('email')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </a>
                )}
                {data.website && (
                  <a href={data.website} target="_blank" rel="noopener noreferrer nofollow" onClick={() => trackClick('website')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Website
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
