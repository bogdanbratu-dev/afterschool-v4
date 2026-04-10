'use client';
import { useState } from 'react';

interface Props {
  listingType: 'afterschool' | 'club';
  listingId: number;
  listingName: string;
}

export default function ClaimButton({ listingType, listingId, listingName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '', company_name: '', email: '', phone: '', website: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      setError('Numele si emailul sunt obligatorii.');
      return;
    }
    setLoading(true); setError('');
    const res = await fetch('/api/user/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: listingType, listing_id: listingId, listing_name: listingName, ...form }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'A aparut o eroare.'); return; }
    setDone(true);
    setAccountCreated(data.accountCreated);
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
          Revendica listarea pentru a o actualiza si a accesa optiunile de promovare Premium.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Revendica aceasta listare
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="bg-[var(--color-card)] rounded-2xl shadow-2xl w-full max-w-md p-6">
            {done ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="font-bold text-lg mb-2">Cerere trimisa!</h3>
                <p className="text-sm text-[var(--color-text-light)] mb-2">
                  Te vom contacta in curand pentru verificare.
                </p>
                {accountCreated && (
                  <p className="text-sm bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-blue-800 mt-3">
                    Un cont a fost creat automat pe emailul tau. Vei primi datele de acces pe email.
                  </p>
                )}
                <button onClick={() => setOpen(false)} className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
                  Inchide
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg">Revendica listarea</h3>
                  <button onClick={() => setOpen(false)} className="text-[var(--color-text-light)] hover:text-[var(--color-text-main)] text-xl leading-none">×</button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Nume <span className="text-red-500">*</span></label>
                      <input value={form.first_name} onChange={set('first_name')} placeholder="Ion"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Prenume <span className="text-red-500">*</span></label>
                      <input value={form.last_name} onChange={set('last_name')} placeholder="Popescu"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Nume firma / afterschool</label>
                    <input value={form.company_name} onChange={set('company_name')} placeholder={listingName}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={form.email} onChange={set('email')} placeholder="ion@exemplu.ro"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Numar telefon</label>
                    <input type="tel" value={form.phone} onChange={set('phone')} placeholder="07xx xxx xxx"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Website</label>
                    <input type="url" value={form.website} onChange={set('website')} placeholder="https://..."
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                <div className="flex gap-3 mt-5">
                  <button onClick={submit} disabled={loading}
                    className="flex-1 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                    {loading ? 'Se trimite...' : 'Trimite cererea'}
                  </button>
                  <button disabled title="In curand"
                    className="flex-1 py-2.5 bg-amber-400 text-white rounded-xl text-sm font-semibold opacity-50 cursor-not-allowed">
                    ★ Plateste Premium
                  </button>
                </div>
                <p className="text-xs text-[var(--color-text-light)] mt-2 text-center">
                  Cererea va fi revizuita manual. Te vom contacta in curand.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
