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

interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_premium: number;
  premium_pending: number;
  created_at: number;
  listing_type: string | null;
  listing_id: number | null;
  listing_name: string | null;
  premium_until: number | null;
}

interface Payment {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  amount: number;
  currency: string;
  status: string;
  period_start: number;
  period_end: number;
  created_at: number;
  notes: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function AdminListings() {
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [acting, setActing] = useState<number | null>(null);

  const load = async () => {
    const [l, c, u, p] = await Promise.all([
      fetch('/api/admin/pending-listings').then(r => r.json()),
      fetch('/api/admin/claim-requests').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/payments').then(r => r.json()),
    ]);
    setListings(Array.isArray(l) ? l : []);
    setClaims(Array.isArray(c) ? c : []);
    setUsers(Array.isArray(u) ? u : []);
    setPayments(Array.isArray(p) ? p : []);
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
    setActing(null); setExpanded(null); setAdminNote('');
    load();
  };

  const deleteListing = async (id: number) => {
    if (!confirm('Stergi aceasta listare?')) return;
    setActing(id);
    await fetch(`/api/admin/pending-listings/${id}`, { method: 'DELETE' });
    setActing(null);
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

  const deleteClaim = async (id: number) => {
    if (!confirm('Stergi aceasta cerere?')) return;
    setActing(id);
    await fetch(`/api/admin/claim-requests/${id}`, { method: 'DELETE' });
    setActing(null);
    load();
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Stergi acest cont si toate datele asociate?')) return;
    setActing(id);
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    setActing(null);
    load();
  };

  const togglePremium = async (id: number, current: number) => {
    setActing(id);
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_premium: current ? 0 : 1 }),
    });
    setActing(null);
    load();
  };

  const approvePremium = async (id: number) => {
    setActing(id);
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_premium' }),
    });
    setActing(null);
    load();
  };

  const [editModal, setEditModal] = useState<{ type: string; id: number; data: any } | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = async (u: User) => {
    if (!u.listing_type || !u.listing_id) return;
    const res = await fetch(`/api/admin/listing?type=${u.listing_type}&id=${u.listing_id}`);
    const data = await res.json();
    setEditForm(data);
    setEditModal({ type: u.listing_type, id: u.listing_id, data });
  };

  const saveEdit = async () => {
    if (!editModal) return;
    setEditSaving(true);
    const endpoint = editModal.type === 'afterschool' ? 'afterschools' : 'clubs';
    await fetch(`/api/admin/${endpoint}/${editModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditSaving(false);
    setEditModal(null);
    load();
  };

  const setEF = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEditForm((f: any) => ({ ...f, [field]: e.target.value }));

  const pendingPayments = users.filter(u => u.premium_pending === 1 && u.is_premium === 0);

  const pending = listings.filter(l => l.status === 'pending');
  const pendingClaims = claims.filter(c => c.status === 'pending');
  const pendingPay = users.filter(u => u.premium_pending === 1 && u.is_premium === 0);
  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  const expiringUsers = users.filter(u => u.is_premium === 1 && u.premium_until && u.premium_until > now && u.premium_until <= now + threeDays);
  const userPayments = (userId: number) => payments.filter(p => p.user_id === userId);

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Badge-uri pendinge */}
      {(pending.length > 0 || pendingClaims.length > 0 || pendingPay.length > 0) && (
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
          {pendingPay.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              <span className="w-6 h-6 bg-amber-500 text-white rounded-full text-xs font-bold flex items-center justify-center">{pendingPay.length}</span>
              <span className="text-sm font-medium text-amber-800">Plăți Premium de confirmat</span>
            </div>
          )}
          {expiringUsers.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              <span className="w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center">{expiringUsers.length}</span>
              <span className="text-sm font-medium text-red-800">Abonamente expiră în 3 zile</span>
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
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{l.name}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{l.listing_type === 'afterschool' ? 'After School' : l.category || 'Club'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-light)] mt-0.5">{l.user_name} · {l.user_email}</p>
                    <p className="text-xs text-[var(--color-text-light)]">{l.address}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => deleteListing(l.id)} disabled={acting === l.id}
                      className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold disabled:opacity-50">
                      🗑
                    </button>
                    <span className="text-[var(--color-text-light)] text-sm cursor-pointer" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                      {expanded === l.id ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {expanded === l.id && (
                  <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-bg)] space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {l.price_min && <span><strong>Pret:</strong> {l.price_min}-{l.price_max} lei</span>}
                      {l.age_min && <span><strong>Varsta:</strong> {l.age_min}-{l.age_max} ani</span>}
                      <span><strong>Locuri:</strong> {l.availability}</span>
                      {l.phone && <span><strong>Tel:</strong> {l.phone}</span>}
                      {l.email && <span><strong>Email:</strong> {l.email}</span>}
                      {l.website && <span><strong>Site:</strong> <a href={l.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{l.website}</a></span>}
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
                <div className="min-w-0 flex-1">
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
                <div className="flex gap-2 flex-shrink-0">
                  {c.status === 'pending' && (
                    <>
                      <button onClick={() => actOnClaim(c.id, 'approve')} disabled={acting === c.id}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                        ✅
                      </button>
                      <button onClick={() => actOnClaim(c.id, 'reject')} disabled={acting === c.id}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                        ❌
                      </button>
                    </>
                  )}
                  <button onClick={() => deleteClaim(c.id)} disabled={acting === c.id}
                    className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold disabled:opacity-50">
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plati Premium in asteptare */}
      {pendingPayments.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <h2 className="text-lg font-bold mb-4 text-amber-800">💰 Plăți Premium de confirmat ({pendingPayments.length})</h2>
          <p className="text-xs text-amber-700 mb-3">Verifică în Revolut (@bogdanmxn) că a venit plata de 50 RON, apoi aprobă.</p>
          <div className="space-y-2">
            {pendingPayments.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-3 p-3 bg-white border border-amber-200 rounded-xl">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-sm">{u.name}</span>
                  <div className="flex gap-3 mt-0.5">
                    <a href={`mailto:${u.email}`} className="text-xs text-[var(--color-primary)] hover:underline">✉ {u.email}</a>
                    {u.phone && <span className="text-xs text-[var(--color-text-light)]">📞 {u.phone}</span>}
                  </div>
                  <p className="text-xs text-amber-600 font-medium mt-0.5">Mesaj Revolut așteptat: "Premium {u.name}"</p>
                </div>
                <button onClick={() => approvePremium(u.id)} disabled={acting === u.id}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex-shrink-0">
                  {acting === u.id ? '...' : '★ Activează Premium'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Abonamente care expira curand */}
      {expiringUsers.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h2 className="text-lg font-bold mb-3 text-red-800">⏰ Abonamente ce expiră în 3 zile ({expiringUsers.length})</h2>
          <div className="space-y-2">
            {expiringUsers.map(u => {
              const daysLeft = Math.ceil(((u.premium_until ?? 0) - now) / (24 * 60 * 60 * 1000));
              return (
                <div key={u.id} className="flex items-center justify-between gap-3 p-3 bg-white border border-red-200 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-sm">{u.name}</span>
                    {u.listing_name && <span className="ml-2 text-xs text-gray-500">· {u.listing_name}</span>}
                    <div className="flex gap-3 mt-0.5">
                      <a href={`mailto:${u.email}`} className="text-xs text-[var(--color-primary)] hover:underline">✉ {u.email}</a>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-600 flex-shrink-0">
                    {daysLeft === 0 ? 'Expiră azi' : `${daysLeft} zi${daysLeft > 1 ? 'le' : ''}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conturi utilizatori */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold mb-4">👤 Conturi utilizatori ({users.length})</h2>
        {users.length === 0 ? (
          <p className="text-sm text-[var(--color-text-light)]">Niciun cont inca.</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => {
              const uPayments = userPayments(u.id);
              const isExpanded = expandedUser === u.id;
              return (
                <div key={u.id} className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{u.name}</span>
                        {u.is_premium === 1 && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">★ Premium</span>
                        )}
                        {u.listing_name && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{u.listing_name}</span>
                        )}
                        {u.premium_until && u.premium_until > now && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.premium_until <= now + threeDays ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            exp. {new Date(u.premium_until).toLocaleDateString('ro-RO')}
                          </span>
                        )}
                        {uPayments.length > 0 && (
                          <span className="text-xs text-[var(--color-text-light)]">{uPayments.length} plăți</span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5">
                        <a href={`mailto:${u.email}`} onClick={e => e.stopPropagation()} className="text-xs text-[var(--color-primary)] hover:underline">✉ {u.email}</a>
                        {u.phone && <span className="text-xs text-[var(--color-text-light)]">📞 {u.phone}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {u.listing_id && (
                        <button onClick={() => openEdit(u)} disabled={acting === u.id}
                          className="px-2 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold disabled:opacity-50">
                          ✏️
                        </button>
                      )}
                      <button onClick={() => togglePremium(u.id, u.is_premium)} disabled={acting === u.id}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 ${u.is_premium ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                        {u.is_premium ? '★ Premium' : '☆ Free'}
                      </button>
                      <button onClick={() => deleteUser(u.id)} disabled={acting === u.id}
                        className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold disabled:opacity-50">
                        🗑
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                      <p className="text-xs font-semibold text-[var(--color-text-light)] mb-2">Istoric plăți</p>
                      {uPayments.length === 0 ? (
                        <p className="text-xs text-[var(--color-text-light)]">Nicio plată înregistrată.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {uPayments.map(p => (
                            <div key={p.id} className="flex items-center justify-between text-xs bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-3 py-2">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-green-700">{p.amount} {p.currency}</span>
                                <span className="text-[var(--color-text-light)]">
                                  {new Date(p.period_start).toLocaleDateString('ro-RO')} → {new Date(p.period_end).toLocaleDateString('ro-RO')}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full font-medium ${p.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {p.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal editare listare */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
          <div className="bg-[var(--color-card)] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--color-card)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-lg">✏️ Editează listarea</h2>
              <button onClick={() => setEditModal(null)} className="text-[var(--color-text-light)] hover:text-[var(--color-text-main)] text-xl">×</button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Nume', field: 'name' },
                { label: 'Adresă', field: 'address' },
                { label: 'Telefon', field: 'phone' },
                { label: 'Email', field: 'email' },
                { label: 'Website', field: 'website' },
                { label: 'Preț minim (lei)', field: 'price_min' },
                { label: 'Preț maxim (lei)', field: 'price_max' },
                { label: 'Vârstă minimă', field: 'age_min' },
                { label: 'Vârstă maximă', field: 'age_max' },
                ...(editModal.type === 'afterschool'
                  ? [{ label: 'Oră preluare', field: 'pickup_time' }, { label: 'Oră terminare', field: 'end_time' }, { label: 'Activități', field: 'activities' }]
                  : [{ label: 'Program', field: 'schedule' }]),
                { label: 'URL Recenzii', field: 'reviews_url' },
                { label: 'Banner URL', field: 'banner_url' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium mb-1">{label}</label>
                  <input value={editForm[field] ?? ''} onChange={setEF(field)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1">Descriere</label>
                <textarea value={editForm.description ?? ''} onChange={setEF('description')} rows={4}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Rezumat editorial</label>
                <textarea value={editForm.editorial_summary ?? ''} onChange={setEF('editorial_summary')} rows={3}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Disponibilitate</label>
                <select value={editForm.availability ?? 'unknown'} onChange={setEF('availability')}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none">
                  <option value="available">Locuri disponibile</option>
                  <option value="full">Locuri indisponibile</option>
                  <option value="unknown">Necunoscut</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!editForm.is_premium} onChange={e => setEditForm((f: any) => ({ ...f, is_premium: e.target.checked ? 1 : 0 }))} />
                  Premium
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!editForm.contacts_hidden} onChange={e => setEditForm((f: any) => ({ ...f, contacts_hidden: e.target.checked ? 1 : 0 }))} />
                  Contacte ascunse
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-[var(--color-card)] border-t border-[var(--color-border)] px-6 py-4 flex gap-3">
              <button onClick={saveEdit} disabled={editSaving}
                className="flex-1 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {editSaving ? 'Se salvează...' : 'Salvează modificările'}
              </button>
              <button onClick={() => setEditModal(null)}
                className="px-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm">
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
