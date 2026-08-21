'use client';

import { formatDistance } from '@/lib/distance';
import PhotoCarousel from '@/components/PhotoCarousel';
import { toSlug, cleanAddressDisplay } from '@/lib/slug';
import LockedContactButton from '@/components/LockedContactButton';
import RevealPhoneButton from '@/components/RevealPhoneButton';

interface CatererData {
  id: number;
  name: string;
  address: string;
  sector: number;
  coverage_area: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook_url: string | null;
  price_min: number | null;
  price_max: number | null;
  description: string | null;
  editorial_summary?: string | null;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number;
  is_featured?: number;
  is_spotlight?: boolean;
  contacts_hidden: number;
  contacts_masked?: boolean;
  has_phone?: boolean;
  has_email?: boolean;
  banner_url?: string | null;
  photo_urls?: string | null;
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

interface CatererCardProps {
  data: CatererData;
  businessMode?: boolean;
}

export default function CatererCard({ data, businessMode }: CatererCardProps) {
  const contactHidden = !!data.contacts_masked;
  const isSpotlight = !!data.is_spotlight;

  const trackUrl = (lt: string, dest: string) =>
    `/api/track?type=caterer&id=${data.id}&name=${encodeURIComponent(data.name)}&lt=${lt}&url=${encodeURIComponent(dest)}`;

  return (
    <div className={`bg-[var(--color-card)] rounded-xl border overflow-hidden transition-shadow ${isSpotlight ? 'border-amber-400 shadow-lg ring-2 ring-amber-300/70' : 'border-[var(--color-border)] shadow-sm hover:shadow-md'}`}>
      {isSpotlight && data.photo_urls && (
        <PhotoCarousel photos={JSON.parse(data.photo_urls)} name={data.name} compact />
      )}
      {!(isSpotlight && data.photo_urls) && businessMode && data.banner_url && (
        <img src={data.banner_url} alt={`Banner ${data.name}`} className="w-full h-24 sm:h-32 object-cover" />
      )}
      <div className="p-3 sm:p-3.5">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base sm:text-lg text-[var(--color-text-main)] leading-tight">
                <a href={`/catering/${toSlug(data.name, data.id)}`} className="hover:text-teal-600 transition-colors">{data.name}</a>
              </h3>
              {data.is_featured === 1 && (
                <span className="inline-flex items-center gap-1 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">✦ Recomandat</span>
              )}
              {data.is_premium === 1 && isSpotlight && (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-400 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">🏆 Top partener</span>
              )}
              {data.is_premium === 1 && !isSpotlight && (
                <span className="inline-flex items-center gap-1 bg-amber-400 text-white px-2 py-0.5 rounded-full text-xs font-bold">★ Premium</span>
              )}
            </div>
            {data.rating && data.reviews_count ? (
              <div className="mt-0.5 mb-0.5"><StarRating rating={data.rating} count={data.reviews_count} mapsUrl={data.maps_url} /></div>
            ) : null}
            <p className="text-xs sm:text-sm text-[var(--color-text-light)] flex items-start gap-1 mt-0.5">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="break-words">{cleanAddressDisplay(data.address)}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
            {data.distance !== undefined && (
              <div className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold">{formatDistance(data.distance)}</div>
            )}
            <span className="text-lg" title="Catering">🍽️</span>
          </div>
        </div>

        {/* Coverage area */}
        {data.coverage_area && (
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-full text-xs font-semibold">
              Deserveste: {data.coverage_area}
            </span>
          </div>
        )}

        {(data.editorial_summary || data.description) && (
          <p className="text-sm text-[var(--color-text-light)] mb-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: data.editorial_summary || data.description || '' }} />
        )}

        {data.price_min !== null && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
            <div className="bg-green-50 rounded-lg p-1.5 text-center">
              <div className="text-xs text-[var(--color-text-light)]">Pret</div>
              <div className="font-semibold text-sm text-[var(--color-success)]">
                {data.price_min === data.price_max ? `${data.price_min} lei` : `${data.price_min}-${data.price_max} lei`}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-[var(--color-border)]">
          <div className="flex flex-wrap gap-2.5">
            {(data.phone || data.has_phone) && (
              contactHidden ? (
                <LockedContactButton label="Telefonul" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                  {data.phone || 'Telefon'}
                </LockedContactButton>
              ) : (
              <RevealPhoneButton phone={data.phone || ''} trackHref={trackUrl('phone', `tel:${data.phone}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors" />
              )
            )}
            {(data.email || data.has_email) && (
              contactHidden ? (
                <LockedContactButton label="Emailul" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                  Email
                </LockedContactButton>
              ) : (
              <a href={trackUrl('email', `mailto:${data.email}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                Email
              </a>
              )
            )}
            {data.website && (
              <a href={trackUrl('website', data.website)} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
                Website
              </a>
            )}
            {data.facebook_url && (
              <a href={trackUrl('facebook', data.facebook_url)} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1877F2] hover:bg-[#0f63d2] text-white text-sm font-semibold rounded-lg transition-colors">
                Facebook
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
