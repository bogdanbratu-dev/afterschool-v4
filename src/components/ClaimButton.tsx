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
  const [tooltip, setTooltip] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '', company_name: '', email: '', phone: '', website: '',
    password: '', confirm_password: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setError('Numele, emailul si parola sunt obligatorii.');
      return;
    }
    if (form.password.length < 6) {
      setError('Parola trebuie sa aiba minim 6 caractere.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Parolele nu coincid.');
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
                  <span className="text-sm font-bold text-amber-500">50 RON/lună</span>
                </div>
                <ul className="space-y-1.5">
                  {[
                    { icon: '✏️', text: 'Editare informații oricând' },
                    { icon: '📸', text: 'Până la 20 de poze în carusel' },
                    { icon: '🎬', text: 'Până la 5 videoclipuri' },
                    { icon: '📊', text: 'Raport lunar de clickuri' },
                    { icon: '⭐', text: 'Badge Premium vizibil' },
                    { icon: '🔝', text: 'Afișare prioritară' },
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
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="bg-[var(--color-card)] rounded-2xl shadow-2xl w-full max-w-md p-6">
            {done ? (
              <div className="py-2">
                <div className="text-3xl mb-3 text-center">✅</div>
                <h3 className="font-bold text-lg mb-3 text-center">Înregistrare trimisă!</h3>

                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3 text-sm text-blue-800">
                  Înregistrarea ta va fi validată în <strong>câteva ore</strong>. Vei putea accesa toate funcționalitățile după validare.
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-800">
                  <p className="font-semibold mb-1">Vrei validare imediată?</p>
                  <p className="mb-3">Sună sau trimite un mesaj la <a href="tel:0747646543" className="font-bold underline">0747 646 543</a> și un administrator va revizui cererea pe loc.</p>
                  <a
                    href="https://wa.me/40747646543"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Scrie pe WhatsApp
                  </a>
                </div>

                <a href="/dashboard"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold transition-colors">
                  Mergi la Dashboard →
                </a>
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Parola <span className="text-red-500">*</span></label>
                      <input type="password" value={form.password} onChange={set('password')} placeholder="min. 6 caractere"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Confirma parola <span className="text-red-500">*</span></label>
                      <input type="password" value={form.confirm_password} onChange={set('confirm_password')} placeholder="repeta parola"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                    </div>
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
