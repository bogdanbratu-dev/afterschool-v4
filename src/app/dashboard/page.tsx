'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserData {
  id: number;
  name: string;
  email: string;
  is_premium: number;
}

interface PendingListing {
  id: number;
  listing_type: string;
  name: string;
  address: string;
  status: string;
  submitted_at: number;
  admin_note: string | null;
}

interface ClaimRequest {
  id: number;
  listing_type: string;
  listing_name: string;
  status: string;
  submitted_at: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'In asteptare', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprobat', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Respins', color: 'bg-red-100 text-red-800' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetch('/api/user/me').then(r => r.json()).then(data => {
      if (!data.authenticated) { router.push('/login'); return; }
      setUser(data);
      loadMyData();
    });
  }, []);

  const loadMyData = async () => {
    const res = await fetch('/api/user/listings');
    if (res.ok) {
      const data = await res.json();
      setListings(data.listings || []);
      setClaims(data.claims || []);
    }
    setLoading(false);
  };

  const logout = async () => {
    await fetch('/api/user/logout', { method: 'POST' });
    router.push('/');
  };

  const downloadReport = () => {
    window.open(`/api/user/report?month=${reportMonth}`, '_blank');
  };

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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</Link>
            <span className="text-[var(--color-text-light)] text-sm ml-2">/ Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {user.is_premium === 1 && (
              <span className="bg-amber-400 text-white px-3 py-1 rounded-full text-xs font-bold">★ Premium</span>
            )}
            <span className="text-sm text-[var(--color-text-light)] hidden sm:block">{user.name}</span>
            <button onClick={logout} className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">Iesi</button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Bun venit */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
          <h1 className="text-xl font-bold text-[var(--color-primary)]">Buna ziua, {user.name}!</h1>
          <p className="text-sm text-[var(--color-text-light)] mt-1">
            {user.is_premium === 1
              ? 'Cont Premium activ — ai acces la toate functiile de promovare.'
              : 'Cont gratuit — upgrade la Premium pentru vizibilitate maxima.'}
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white font-semibold rounded-xl text-sm hover:bg-[var(--color-primary-dark)] transition-colors">
              + Adauga listare noua
            </Link>
            {user.is_premium === 1 && (
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={reportMonth}
                  onChange={e => setReportMonth(e.target.value)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-white text-gray-900 focus:outline-none"
                />
                <button onClick={downloadReport}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-xl text-sm hover:bg-green-700 transition-colors">
                  ⬇️ Raport click-uri
                </button>
              </div>
            )}
            {user.is_premium === 0 && (
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-semibold rounded-xl text-sm hover:bg-amber-600 transition-colors">
                ★ Upgrade la Premium
              </button>
            )}
          </div>
        </div>

        {/* Listari trimise */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-bold mb-4">📋 Listari trimise</h2>
          {listings.length === 0 ? (
            <p className="text-sm text-[var(--color-text-light)]">Nu ai trimis nicio listare inca.{' '}
              <Link href="/submit" className="text-[var(--color-primary)] hover:underline">Adauga prima ta listare</Link>
            </p>
          ) : (
            <div className="space-y-3">
              {listings.map(l => (
                <div key={l.id} className="flex items-start justify-between gap-3 p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{l.name}</p>
                    <p className="text-xs text-[var(--color-text-light)] mt-0.5">{l.address}</p>
                    {l.admin_note && <p className="text-xs text-red-600 mt-1">Nota admin: {l.admin_note}</p>}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABELS[l.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[l.status]?.label || l.status}
                    </span>
                    <p className="text-xs text-[var(--color-text-light)] mt-1">{new Date(l.submitted_at).toLocaleDateString('ro-RO')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cereri de revendicare */}
        {claims.length > 0 && (
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6">
            <h2 className="text-lg font-bold mb-4">🔑 Cereri de revendicare</h2>
            <div className="space-y-3">
              {claims.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
                  <div>
                    <p className="font-semibold text-sm">{c.listing_name}</p>
                    <p className="text-xs text-[var(--color-text-light)]">{c.listing_type === 'afterschool' ? 'After School' : 'Activitate'}</p>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABELS[c.status]?.color || 'bg-gray-100'}`}>
                    {STATUS_LABELS[c.status]?.label || c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
