'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserData { id: number; name: string; email: string; is_premium: number; }
interface Listing {
  id: number; name: string; address: string; phone: string | null; email: string | null;
  website: string | null; description: string | null; price_min: number | null; price_max: number | null;
  age_min: number | null; age_max: number | null; availability: string;
  photo_urls: string | null; video_urls: string | null; reviews_url: string | null;
  schedule?: string | null; pickup_time?: string | null; end_time?: string | null;
  is_premium: number;
}

const AVAILABILITY_LABELS: Record<string, string> = {
  available: 'Locuri disponibile', full: 'Locuri indisponibile', unknown: 'Necunoscut',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [listingType, setListingType] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState<Partial<Listing>>({});

  useEffect(() => {
    fetch('/api/user/me').then(r => r.json()).then(data => {
      if (!data.authenticated) { router.push('/login'); return; }
      setUser(data);
    });
    fetch('/api/user/my-listing').then(r => r.json()).then(data => {
      setListing(data.listing || null);
      setListingType(data.type || '');
      if (data.listing) setForm(data.listing);
      setLoading(false);
    });
  }, []);

  const logout = async () => {
    await fetch('/api/user/logout', { method: 'POST' });
    router.push('/');
  };

  const submitEdit = async () => {
    if (!listing) return;
    setSaving(true);
    await fetch('/api/user/my-listing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: listingType, listing_id: listing.id, changes: form }),
    });
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const downloadReport = () => window.open(`/api/user/report?month=${reportMonth}`, '_blank');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="bg-[var(--color-card)] border-b border-[var(--color-border)] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
            {user.is_premium === 1 && (
              <span className="bg-amber-400 text-white px-2 py-0.5 rounded-full text-xs font-bold">★ Premium</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-light)] hidden sm:block">{user.name}</span>
            <button onClick={logout} className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">Iesi</button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {!listing ? (
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
            <p className="text-[var(--color-text-light)] mb-2">Nu ai nicio listare revendicata inca.</p>
            <p className="text-sm text-[var(--color-text-light)]">Cererea ta este in curs de verificare.</p>
          </div>
        ) : (
          <>
            {/* Listing card */}
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
              <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold">{listing.name}</h1>
                  <p className="text-sm text-[var(--color-text-light)]">{listing.address}</p>
                </div>
                {listing.is_premium === 1 && (
                  <span className="bg-amber-400 text-white px-3 py-1 rounded-full text-xs font-bold flex-shrink-0">★ Premium</span>
                )}
              </div>

              {!editing ? (
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {listing.phone && <div><span className="text-[var(--color-text-light)] text-xs">Telefon</span><p>{listing.phone}</p></div>}
                    {listing.email && <div><span className="text-[var(--color-text-light)] text-xs">Email</span><p>{listing.email}</p></div>}
                    {listing.website && <div><span className="text-[var(--color-text-light)] text-xs">Website</span><p className="truncate">{listing.website}</p></div>}
                    {listing.price_min !== null && <div><span className="text-[var(--color-text-light)] text-xs">Pret</span><p>{listing.price_min}-{listing.price_max} lei</p></div>}
                    {listing.age_min !== null && <div><span className="text-[var(--color-text-light)] text-xs">Varsta</span><p>{listing.age_min}-{listing.age_max} ani</p></div>}
                    <div><span className="text-[var(--color-text-light)] text-xs">Locuri</span><p>{AVAILABILITY_LABELS[listing.availability] || listing.availability}</p></div>
                  </div>
                  {listing.description && <p className="text-sm text-[var(--color-text-light)]">{listing.description}</p>}
                  <button onClick={() => setEditing(true)}
                    className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold transition-colors">
                    ✏️ Editeaza informatiile
                  </button>
                </div>
              ) : (
                <div className="p-5 space-y-3">
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    Modificarile vor fi verificate de admin inainte de a fi publicate.
                  </p>
                  {[
                    { label: 'Telefon', field: 'phone', type: 'tel' },
                    { label: 'Email', field: 'email', type: 'email' },
                    { label: 'Website', field: 'website', type: 'url' },
                    { label: 'Pret minim (lei)', field: 'price_min', type: 'number' },
                    { label: 'Pret maxim (lei)', field: 'price_max', type: 'number' },
                    { label: 'Varsta minima', field: 'age_min', type: 'number' },
                    { label: 'Varsta maxima', field: 'age_max', type: 'number' },
                    { label: 'URL Recenzii', field: 'reviews_url', type: 'url' },
                  ].map(({ label, field, type }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium mb-1">{label}</label>
                      <input type={type} value={(form as any)[field] || ''} onChange={set(field)}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium mb-1">Disponibilitate locuri</label>
                    <select value={form.availability || 'unknown'} onChange={set('availability')}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none">
                      <option value="available">Locuri disponibile</option>
                      <option value="full">Locuri indisponibile</option>
                      <option value="unknown">Necunoscut</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Descriere</label>
                    <textarea value={form.description || ''} onChange={set('description')} rows={4}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Poze (URL-uri, unul pe linie, max 20)</label>
                    <textarea
                      rows={5}
                      placeholder={"https://exemplu.ro/poza1.jpg\nhttps://exemplu.ro/poza2.jpg"}
                      value={form.photo_urls ? JSON.parse(form.photo_urls).join('\n') : ''}
                      onChange={e => setForm(f => ({ ...f, photo_urls: JSON.stringify(e.target.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 20)) }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Videoclipuri YouTube (URL-uri, unul pe linie, max 5)</label>
                    <textarea
                      rows={3}
                      placeholder={"https://www.youtube.com/watch?v=...\nhttps://youtu.be/..."}
                      value={form.video_urls ? JSON.parse(form.video_urls).join('\n') : ''}
                      onChange={e => setForm(f => ({ ...f, video_urls: JSON.stringify(e.target.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 5)) }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none font-mono"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={submitEdit} disabled={saving}
                      className="flex-1 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                      {saving ? 'Se trimite...' : 'Trimite spre aprobare'}
                    </button>
                    <button onClick={() => { setEditing(false); setForm(listing); }}
                      className="px-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm">
                      Anuleaza
                    </button>
                  </div>
                </div>
              )}
            </div>

            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                ✅ Modificarile au fost trimise spre aprobare. Le vei vedea publicate dupa verificare.
              </div>
            )}

            {/* Raport premium */}
            {user.is_premium === 1 && (
              <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5">
                <h2 className="font-bold mb-3">📊 Raport clickuri</h2>
                <div className="flex gap-3">
                  <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
                    className="px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-white text-gray-900 focus:outline-none" />
                  <button onClick={downloadReport}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors">
                    ⬇️ Descarca raport
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
