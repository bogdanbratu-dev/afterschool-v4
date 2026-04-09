'use client';
import { useState } from 'react';

interface Props {
  listingType: 'afterschool' | 'club';
  listingId: number;
  listingName: string;
}

export default function ClaimButton({ listingType, listingId, listingName }: Props) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  const submit = async () => {
    setLoading(true); setError('');
    const res = await fetch('/api/user/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: listingType, listing_id: listingId, listing_name: listingName, message }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.status === 401) { setNotLoggedIn(true); return; }
    if (!res.ok) { setError(data.error); return; }
    setDone(true);
  };

  if (done) return (
    <div className="mt-8 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
      ✅ Cererea ta a fost trimisa! Te vom contacta in curand.
    </div>
  );

  return (
    <div className="mt-8 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🏢</span>
        <h3 className="font-bold text-[var(--color-text-main)]">Esti proprietarul acestei companii?</h3>
      </div>
      <p className="text-sm text-[var(--color-text-light)] mb-4">
        Revendica listarea pentru a o actualiza si a accesa optiunile de promovare Premium.
      </p>

      {notLoggedIn ? (
        <div className="text-sm">
          <p className="text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
            Trebuie sa ai cont pentru a revendica o listare.
          </p>
          <div className="flex gap-3">
            <a href={`/login?next=/${listingType === 'afterschool' ? 'afterschool' : 'activitati'}/${listingId}`}
              className="flex-1 text-center py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
              Conecteaza-te
            </a>
            <a href="/register"
              className="flex-1 text-center py-2 border border-[var(--color-border)] rounded-xl text-sm font-semibold">
              Creeaza cont
            </a>
          </div>
        </div>
      ) : (
        <>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Optional: descrie pe scurt cum poti dovedi ca esti proprietarul (site oficial, CUI firma etc.)"
            rows={3}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none mb-3"
          />
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={submit} disabled={loading}
              className="flex-1 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
              {loading ? 'Se trimite...' : 'Trimite cererea de revendicare'}
            </button>
            <button disabled
              title="In curand"
              className="flex-1 py-2.5 bg-amber-400 text-white rounded-xl text-sm font-semibold opacity-50 cursor-not-allowed">
              ★ Upgrade la Premium — plateste
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-light)] mt-2">Toate campurile sunt optionale. Cererea va fi revizuita manual.</p>
        </>
      )}
    </div>
  );
}
