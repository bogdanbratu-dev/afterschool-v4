'use client';
import { useState } from 'react';

interface Props {
  listingType: 'afterschool' | 'club';
  listingId: number;
  listingName: string;
}

export default function ClaimButton({ listingType, listingId, listingName }: Props) {
  const [open, setOpen] = useState(false);
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
    <div className="mt-8 border-t border-[var(--color-border)] pt-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-light)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
        >
          🏢 Esti proprietarul acestei companii? Apasa pentru optiuni de promovare
        </button>
      ) : (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
          <h3 className="font-bold mb-1">Revendica aceasta listare</h3>
          <p className="text-sm text-[var(--color-text-light)] mb-4">
            Dupa verificare, vei putea actualiza informatiile si accesa optiunile Premium.
          </p>

          {notLoggedIn ? (
            <div className="text-sm">
              <p className="text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                Trebuie sa ai cont pentru a revendica o listare.
              </p>
              <div className="flex gap-3">
                <a href={`/login?next=/afterschool/${listingId}`}
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
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none mb-3"
              />
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              <div className="flex gap-3">
                <button onClick={submit} disabled={loading}
                  className="flex-1 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {loading ? 'Se trimite...' : 'Trimite cererea'}
                </button>
                <button onClick={() => setOpen(false)}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-xl text-sm">
                  Anuleaza
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
