'use client';
import { useState } from 'react';

interface Props {
  listingType: 'afterschool' | 'club' | 'caterer' | 'professional' | 'kindergarten';
  listingId: number;
  listingName: string;
}

export default function ClaimButton({ listingType, listingId, listingName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  const submit = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Introdu o adresa de email valida.');
      return;
    }
    setLoading(true); setError('');
    const res = await fetch('/api/public/claim-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: listingType, listing_id: listingId, email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'A aparut o eroare.'); return; }
    setDone(true);
  };

  return (
    <>
      {/* Buton */}
      <div className="mt-8 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🏢</span>
          <h3 className="font-bold text-[var(--color-text-main)]">Esti proprietarul acestei companii?</h3>
        </div>
        <p className="text-sm text-[var(--color-text-light)] mb-4">
          Revendica listarea pentru a o actualiza si a accesa optiunile de{' '}
          <span
            className="relative inline-block"
            onMouseEnter={() => setTooltip(true)}
            onMouseLeave={() => setTooltip(false)}
            onTouchStart={() => setTooltip(t => !t)}
          >
            <span className="text-amber-500 font-semibold underline decoration-dotted cursor-help">promovare Premium</span>
            {tooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-[var(--color-text-main)]">Premium</p>
                  <span className="text-sm font-bold text-amber-500">100 RON / 3 luni</span>
                </div>
                <ul className="space-y-1.5">
                  {[
                    { icon: '✏️', text: 'Editare informații oricând' },
                    { icon: '📸', text: 'Până la 20 de poze în carusel' },
                    { icon: '🎬', text: 'Până la 5 videoclipuri' },
                    { icon: '📊', text: 'Raport lunar de clickuri' },
                    { icon: '⭐', text: 'Badge Premium vizibil' },
                    { icon: '🔝', text: 'Afișare prioritară' },
                    { icon: '💬', text: 'Primești leads direct de la părinți interesați' },
                  ].map(({ icon, text }) => (
                    <li key={text} className="flex items-center gap-2 text-xs text-[var(--color-text-main)]">
                      <span>{icon}</span><span>{text}</span>
                    </li>
                  ))}
                </ul>
                {/* sageata tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[var(--color-border)]" />
              </div>
            )}
          </span>.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Revendica aceasta listare
        </button>
        <p className="text-xs text-[var(--color-text-light)] mt-2 text-center">
          Datele sunt incorecte sau vreti eliminarea listarii? Scrieti-ne la{' '}
          <a href="mailto:activkidsromania@gmail.com?subject=Corectare%20listare" className="underline">activkidsromania@gmail.com</a>.
        </p>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="bg-[var(--color-card)] rounded-2xl shadow-2xl w-full max-w-md p-6">
            {done ? (
              <div className="py-2">
                <div className="text-3xl mb-3 text-center">📩</div>
                <h3 className="font-bold text-lg mb-3 text-center">Ti-am trimis linkul!</h3>

                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-sm text-blue-800">
                  Verifica emailul <strong>{email}</strong> (si folderul Spam). Linkul primit te duce direct
                  la editarea listarii <strong>{listingName}</strong>, fara parola si fara cont.
                </div>

                <p className="text-xs text-[var(--color-text-light)] text-center mb-4">
                  Nu a ajuns in cateva minute? Suna sau scrie la{' '}
                  <a href="tel:0747646543" className="font-semibold underline">0747 646 543</a>.
                </p>

                <button onClick={() => { setOpen(false); setDone(false); setEmail(''); }}
                  className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold transition-colors">
                  Am inteles
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg">Revendica listarea</h3>
                  <button onClick={() => setOpen(false)} className="text-[var(--color-text-light)] hover:text-[var(--color-text-main)] text-xl leading-none">×</button>
                </div>

                <p className="text-sm text-[var(--color-text-light)] mb-4">
                  Introdu emailul tau si iti trimitem pe loc un link securizat cu care poti edita direct
                  informatiile listarii <strong>{listingName}</strong>, fara parola si fara cont.
                </p>

                <div>
                  <label className="block text-xs font-medium mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ion@exemplu.ro"
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>

                {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                <div className="flex gap-3 mt-4">
                  <button onClick={submit} disabled={loading}
                    className="flex-1 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                    {loading ? 'Se trimite...' : 'Trimite linkul'}
                  </button>
                  <button disabled title="In curand"
                    className="flex-1 py-2.5 bg-amber-400 text-white rounded-xl text-sm font-semibold opacity-50 cursor-not-allowed">
                    ★ Plateste Premium
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
