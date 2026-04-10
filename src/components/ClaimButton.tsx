'use client';
import { useState } from 'react';

interface Props {
  listingType: 'afterschool' | 'club';
  listingId: number;
  listingName: string;
}

export default function ClaimButton({ listingType, listingId, listingName }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
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
      <div className="mt-8 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        {/* Rand compact */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-bg)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🏢</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-[var(--color-text-main)]">Ești proprietarul acestei afaceri?</p>
              <p className="text-xs text-[var(--color-text-light)]">Revendică listarea · Premium de la 50 RON/lună</p>
            </div>
          </div>
          <span className="text-[var(--color-text-light)] text-sm">{expanded ? '▲' : '▼'}</span>
        </button>

        {/* Detalii expandabile */}
        {expanded && (
          <div className="border-t border-[var(--color-border)] px-5 py-4 bg-[var(--color-bg)]">
            <p className="text-xs font-semibold text-[var(--color-text-light)] uppercase tracking-wide mb-3">Ce primești cu Premium — 50 RON/lună</p>
            <ul className="space-y-2 mb-4">
              {[
                { icon: '✏️', text: 'Editare și actualizare informații oricând', bold: true },
                { icon: '📸', text: 'Până la 20 de poze în carusel' },
                { icon: '🎬', text: 'Până la 5 videoclipuri (YouTube sau upload)' },
                { icon: '📊', text: 'Raport lunar de clickuri și statistici' },
                { icon: '⭐', text: 'Badge Premium vizibil pe card și pagina listării' },
                { icon: '🔝', text: 'Afișare prioritară față de listările gratuite' },
              ].map(({ icon, text, bold }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm">
                  <span className="flex-shrink-0">{icon}</span>
                  <span className={bold ? 'font-semibold text-amber-600' : 'text-[var(--color-text-main)]'}>{text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setOpen(true)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              Revendică această listare
            </button>
            <p className="text-xs text-center text-[var(--color-text-light)] mt-2">
              Validare în câteva ore · <a href="tel:0747646543" className="hover:underline">0747 646 543</a> pentru aprobare imediată
            </p>
          </div>
        )}
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
                  <p>Sună sau trimite un mesaj la <a href="tel:0747646543" className="font-bold underline">0747 646 543</a> și un administrator va revizui cererea pe loc.</p>
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
