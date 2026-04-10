'use client';
import { useState, useEffect } from 'react';

interface PendingListing {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  listing_type: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  sector: number;
  category: string | null;
  price_min: number | null;
  price_max: number | null;
  age_min: number | null;
  age_max: number | null;
  availability: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  photo_urls: string | null;
  video_urls: string | null;
  reviews_url: string | null;
  status: string;
  submitted_at: number;
  admin_note: string | null;
}

interface ClaimRequest {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  listing_type: string;
  listing_id: number;
  listing_name: string;
  first_name: string | null;
  last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_website: string | null;
  message: string | null;
  status: string;
  submitted_at: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function AdminListings() {
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [acting, setActing] = useState<number | null>(null);

  const load = async () => {
    const [l, c] = await Promise.all([
      fetch('/api/admin/pending-listings').then(r => r.json()),
      fetch('/api/admin/claim-requests').then(r => r.json()),
    ]);
    setListings(Array.isArray(l) ? l : []);
    setClaims(Array.isArray(c) ? c : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const actOnListing = async (id: number, action: 'approve' | 'reject') => {
    setActing(id);
    await fetch(`/api/admin/pending-listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, admin_note: adminNote }),
    });
    setActing(null);
    setExpanded(null);
    setAdminNote('');
    load();
  };

  const actOnClaim = async (id: number, action: 'approve' | 'reject') => {
    setActing(id);
    await fetch(`/api/admin/claim-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setActing(null);
    load();
  };

  const pending = listings.filter(l => l.status === 'pending');
  const pendingClaims = claims.filter(c => c.status === 'pending');

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Badge-uri pendinge */}
      {(pending.length > 0 || pendingClaims.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {pending.length > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
              <span className="w-6 h-6 bg-yellow-400 text-white rounded-full text-xs font-bold flex items-center justify-center">{pending.length}</span>
              <span className="text-sm font-medium text-yellow-800">Listari de aprobat</span>
            </div>
          )}
          {pendingClaims.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold flex items-center justify-center">{pendingClaims.length}</span>
              <span className="text-sm font-medium text-blue-800">Cereri de revendicare</span>
            </div>
          )}
        </div>
      )}

      {/* Listari trimise */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold mb-4">📋 Listari trimise ({listings.length})</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-[var(--color-text-light)]">Nicio listare inca.</p>
        ) : (
          <div className="space-y-3">
            {listings.map(l => (
              <div key={l.id} className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-[var(--color-bg)]"
                  onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{l.name}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{l.listing_type === 'afterschool' ? 'After School' : l.category || 'Club'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-light)] mt-0.5">{l.user_name} · {l.user_email}</p>
                    <p className="text-xs text-[var(--color-text-light)]">{l.address}</p>
                  </div>
                  <span className="text-[var(--color-text-light)] text-sm flex-shrink-0">{expanded === l.id ? '▲' : '▼'}</span>
                </div>

                {expanded === l.id && (
                  <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-bg)] space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {l.price_min && <span><strong>Pret:</strong> {l.price_min}-{l.price_max} lei</span>}
                      {l.age_min && <span><strong>Varsta:</strong> {l.age_min}-{l.age_max} ani</span>}
                      <span><strong>Locuri:</strong> {l.availability}</span>
                      {l.phone && <span><strong>Tel:</strong> {l.phone}</span>}
                      {l.email && <span><strong>Email:</strong> {l.email}</span>}
                      {l.website && <span><strong>Site:</strong> <a href={l.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">{l.website}</a></span>}
                      {l.reviews_url && <span><strong>Recenzii:</strong> <a href={l.reviews_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">link</a></span>}
                    </div>
                    {l.description && <p className="text-xs text-[var(--color-text-light)]">{l.description}</p>}
                    {l.photo_urls && (
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(l.photo_urls).map((url: string, i: number) => (
                          <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                        ))}
                      </div>
                    )}
                    {l.admin_note && <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">Nota anterioara: {l.admin_note}</p>}

                    {l.status === 'pending' && (
                      <>
                        <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                          placeholder="Nota pentru user (optional, apare daca respingi)"
                          rows={2}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900 focus:outline-none" />
                        <div className="flex gap-3">
                          <button onClick={() => actOnListing(l.id, 'approve')} disabled={acting === l.id}
                            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold disabled:opacity-50">
                            ✅ Aproba si publica
                          </button>
                          <button onClick={() => actOnListing(l.id, 'reject')} disabled={acting === l.id}
                            className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">
                            ❌ Respinge
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cereri revendicare */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold mb-4">🔑 Cereri de revendicare ({claims.length})</h2>
        {claims.length === 0 ? (
          <p className="text-sm text-[var(--color-text-light)]">Nicio cerere inca.</p>
        ) : (
          <div className="space-y-3">
            {claims.map(c => (
              <div key={c.id} className="flex items-start justify-between gap-3 p-4 border border-[var(--color-border)] rounded-xl">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{c.listing_name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">#{c.listing_id} · {c.listing_type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-light)] mt-0.5 font-medium">
                    {c.first_name || c.last_name ? `${c.first_name} ${c.last_name}` : c.user_name}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {(c.contact_email || c.user_email) && (
                      <a href={`mailto:${c.contact_email || c.user_email}`} className="text-xs text-[var(--color-primary)] hover:underline">
                        ✉ {c.contact_email || c.user_email}
                      </a>
                    )}
                    {c.contact_phone && (
                      <a href={`tel:${c.contact_phone}`} className="text-xs text-[var(--color-primary)] hover:underline">
                        📞 {c.contact_phone}
                      </a>
                    )}
                    {c.contact_website && (
                      <a href={c.contact_website} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-primary)] hover:underline">
                        🌐 {c.contact_website}
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-light)] mt-1">{new Date(c.submitted_at).toLocaleDateString('ro-RO')}</p>
                </div>
                {c.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => actOnClaim(c.id, 'approve')} disabled={acting === c.id}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                      ✅
                    </button>
                    <button onClick={() => actOnClaim(c.id, 'reject')} disabled={acting === c.id}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                      ❌
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
