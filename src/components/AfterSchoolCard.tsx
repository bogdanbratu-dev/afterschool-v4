'use client';

import { formatDistance } from '@/lib/distance';

interface AfterSchoolData {
  id: number;
  name: string;
  address: string;
  sector: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  price_min: number | null;
  price_max: number | null;
  pickup_time: string | null;
  end_time: string | null;
  age_min: number | null;
  age_max: number | null;
  description: string | null;
  activities: string | null;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number;
  contacts_hidden: number;
  banner_url?: string | null;
  distance?: number;
}

interface AfterSchoolCardProps {
  data: AfterSchoolData;
  rank?: number;
  businessMode?: boolean;
}

export default function AfterSchoolCard({ data, rank, businessMode }: AfterSchoolCardProps) {
  const activities = data.activities?.split(',').map(a => a.trim()) || [];
  const contactHidden = businessMode && !data.is_premium;

  const trackClick = () => {
    fetch('/api/analytics/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'afterschool', item_id: data.id, item_name: data.name }),
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden hover:shadow-md transition-shadow">
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
                <h3 className="font-bold text-base sm:text-lg text-[var(--color-text-main)] leading-tight">{data.name}</h3>
                {data.is_premium === 1 && (
                  <span className="inline-flex items-center gap-1 bg-amber-400 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                    ★ Premium
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-light)] flex items-start gap-1 mt-0.5">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="break-words">{data.address}</span>
              </p>
            </div>
          </div>
          {data.distance !== undefined && (
            <div className="flex-shrink-0 bg-blue-50 text-[var(--color-primary)] px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold ml-2">
              {formatDistance(data.distance)}
            </div>
          )}
        </div>

        {/* Availability badge — rand separat, vizibil clar pe mobil */}
        <div className="mb-3">
          {data.availability === 'available' && (
            <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-semibold">
              <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Locuri disponibile
            </div>
          )}
          {data.availability === 'unknown' && !contactHidden && (
            <a
              href={data.phone ? `tel:${data.phone}` : (data.website ?? '#')}
              onClick={(e) => { if (!data.phone && !data.website) e.preventDefault(); }}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-1 rounded-full text-xs font-semibold transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Verifica locuri disponibile
            </a>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {data.price_min !== null && (
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-xs text-[var(--color-text-light)]">Pret</div>
              <div className="font-semibold text-sm text-[var(--color-success)]">
                {data.price_min === data.price_max
                  ? `${data.price_min} lei`
                  : `${data.price_min}-${data.price_max} lei`
                }
              </div>
            </div>
          )}
          {data.pickup_time && (
            <div className="bg-amber-50 rounded-lg p-2 text-center">
              <div className="text-xs text-[var(--color-text-light)]">Preluare</div>
              <div className="font-semibold text-sm text-[var(--color-accent)]">{data.pickup_time}</div>
            </div>
          )}
          {data.end_time && (
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <div className="text-xs text-[var(--color-text-light)]">Program pana la</div>
              <div className="font-semibold text-sm text-purple-600">{data.end_time}</div>
            </div>
          )}
          {data.age_min !== null && (
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-xs text-[var(--color-text-light)]">Varsta</div>
              <div className="font-semibold text-sm text-[var(--color-primary)]">{data.age_min}-{data.age_max} ani</div>
            </div>
          )}
        </div>

        {/* Activities */}
        {activities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {activities.map((activity, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-gray-100 text-[var(--color-text-light)] rounded-full text-xs"
              >
                {activity}
              </span>
            ))}
          </div>
        )}

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
              <button className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors">
                Premium
              </button>
            </div>
          ) : (
            <>
              {/* Butoane mari pe mobil */}
              <div className="flex sm:hidden gap-2 mb-2">
                {data.phone && (
                  <a
                    href={`tel:${data.phone}`}
                    onClick={trackClick}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold active:bg-[var(--color-primary-dark)] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Suna
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Cum ajung aici
                </a>
              </div>
              {/* Linkuri desktop + secundare */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Cum ajung aici
                </a>
                {data.phone && (
                  <a href={`tel:${data.phone}`} onClick={trackClick} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {data.phone}
                  </a>
                )}
                {data.email && (
                  <a href={`mailto:${data.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </a>
                )}
                {data.website && (
                  <a href={data.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
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
