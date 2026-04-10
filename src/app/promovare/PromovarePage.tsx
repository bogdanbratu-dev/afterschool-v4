'use client';
import { useState, useEffect, useRef } from 'react';

const CLUB_CATEGORIES = [
  { value: 'inot', label: '🏊 Înot' },
  { value: 'fotbal', label: '⚽ Fotbal' },
  { value: 'dansuri', label: '💃 Dansuri' },
  { value: 'arte_martiale', label: '🥋 Arte Marțiale' },
  { value: 'gimnastica', label: '🤸 Gimnastică' },
  { value: 'robotica', label: '🤖 Robotică / Programare' },
  { value: 'muzica', label: '🎵 Muzică' },
  { value: 'arte_creative', label: '🎨 Arte Creative' },
  { value: 'limbi_straine', label: '🌍 Limbi Străine' },
];

const PREMIUM_BENEFITS = [
  { icon: '✏️', text: 'Editare și actualizare informații oricând', bold: true },
  { icon: '📸', text: 'Până la 20 de poze în caruselul listării' },
  { icon: '🎬', text: 'Până la 5 videoclipuri (YouTube sau upload)' },
  { icon: '📊', text: 'Raport lunar de clickuri și statistici' },
  { icon: '⭐', text: 'Badge Premium vizibil pe card și pagina listării' },
  { icon: '🔝', text: 'Afișare prioritară față de listările gratuite' },
];

declare global { interface Window { google: any; initGoogleMaps: () => void; } }

type Section = 'none' | 'claim' | 'free' | 'premium';

interface Listing { id: number; name: string; address: string; type: 'afterschool' | 'club'; }

export default function PromovarePage() {
  const [section, setSection] = useState<Section>('none');

  // Claim state
  const [claimSearch, setClaimSearch] = useState('');
  const [claimResults, setClaimResults] = useState<Listing[]>([]);
  const [claimSelected, setClaimSelected] = useState<Listing | null>(null);
  const [claimSearching, setClaimSearching] = useState(false);
  const [claimForm, setClaimForm] = useState({ first_name: '', last_name: '', email: '', phone: '', website: '', password: '', confirm_password: '' });
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimDone, setClaimDone] = useState(false);
  const [claimError, setClaimError] = useState('');

  // New listing state
  const [listingType, setListingType] = useState<'free' | 'premium'>('free');
  const [form, setForm] = useState({
    type: 'afterschool',
    category: 'inot',
    name: '', address: '', lat: 0, lng: 0, sector: 0,
    phone: '', email: '', website: '',
    price_min: '', price_max: '', age_min: '', age_max: '',
    description: '', availability: 'unknown',
    password: '', confirm_password: '',
    account_email: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const addressRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  // Google Maps autocomplete
  useEffect(() => {
    if (section !== 'free' && section !== 'premium') return;
    const init = () => {
      if (!addressRef.current || autocompleteRef.current) return;
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressRef.current, {
        componentRestrictions: { country: 'ro' },
        fields: ['formatted_address', 'geometry', 'address_components'],
      });
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (!place.geometry) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        let sector = 0;
        for (const comp of place.address_components || []) {
          const name = comp.long_name.toLowerCase();
          const m = name.match(/sector\s*(\d)/);
          if (m) { sector = parseInt(m[1]); break; }
        }
        setForm(f => ({ ...f, address: place.formatted_address, lat, lng, sector }));
      });
    };
    if (window.google?.maps) { init(); return; }
    window.initGoogleMaps = init;
    if (!document.getElementById('gmaps-script')) {
      const s = document.createElement('script');
      s.id = 'gmaps-script';
      s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places&callback=initGoogleMaps`;
      s.async = true;
      document.head.appendChild(s);
    }
  }, [section]);

  // Claim search
  useEffect(() => {
    if (claimSearch.length < 2) { setClaimResults([]); return; }
    const t = setTimeout(async () => {
      setClaimSearching(true);
      const [as, clubs] = await Promise.all([
        fetch(`/api/afterschools?name=${encodeURIComponent(claimSearch)}`).then(r => r.json()),
        fetch(`/api/clubs?name=${encodeURIComponent(claimSearch)}`).then(r => r.json()),
      ]);
      const results: Listing[] = [
        ...(Array.isArray(as) ? as : []).map((x: any) => ({ id: x.id, name: x.name, address: x.address, type: 'afterschool' as const })),
        ...(Array.isArray(clubs) ? clubs : []).map((x: any) => ({ id: x.id, name: x.name, address: x.address, type: 'club' as const })),
      ];
      setClaimResults(results);
      setClaimSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [claimSearch]);

  const submitClaim = async () => {
    if (!claimSelected) return;
    if (!claimForm.first_name || !claimForm.last_name || !claimForm.email || !claimForm.password) {
      setClaimError('Toate câmpurile marcate cu * sunt obligatorii.'); return;
    }
    if (claimForm.password.length < 6) { setClaimError('Parola trebuie să aibă minim 6 caractere.'); return; }
    if (claimForm.password !== claimForm.confirm_password) { setClaimError('Parolele nu coincid.'); return; }
    setClaimLoading(true); setClaimError('');
    const res = await fetch('/api/user/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_type: claimSelected.type, listing_id: claimSelected.id,
        listing_name: claimSelected.name, ...claimForm,
        company_name: claimSelected.name,
      }),
    });
    const data = await res.json();
    setClaimLoading(false);
    if (!res.ok) { setClaimError(data.error || 'A apărut o eroare.'); return; }
    setClaimDone(true);
  };

  const submitListing = async () => {
    if (!form.name || !form.address || !form.lat) { setSubmitError('Numele și adresa sunt obligatorii.'); return; }
    if (!form.account_email || !form.password) { setSubmitError('Email-ul și parola contului sunt obligatorii.'); return; }
    if (form.password.length < 6) { setSubmitError('Parola trebuie să aibă minim 6 caractere.'); return; }
    if (form.password !== form.confirm_password) { setSubmitError('Parolele nu coincid.'); return; }
    setSubmitLoading(true); setSubmitError('');

    // Creaza cont sau autentifica
    const authRes = await fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.account_email, password: form.password, name: form.name }),
    });
    if (!authRes.ok) {
      const d = await authRes.json();
      setSubmitError(d.error || 'Eroare la crearea contului.');
      setSubmitLoading(false); return;
    }

    const res = await fetch('/api/user/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_type: form.type, name: form.name, address: form.address,
        lat: form.lat, lng: form.lng, sector: form.sector,
        category: form.type === 'afterschool' ? null : form.category,
        price_min: form.price_min || null, price_max: form.price_max || null,
        age_min: form.age_min || null, age_max: form.age_max || null,
        availability: form.availability,
        phone: listingType === 'premium' ? form.phone || null : null,
        email: listingType === 'premium' ? form.email || null : null,
        website: listingType === 'premium' ? form.website || null : null,
        description: listingType === 'premium' ? form.description || null : null,
      }),
    });
    const data = await res.json();
    setSubmitLoading(false);
    if (!res.ok) { setSubmitError(data.error || 'A apărut o eroare.'); return; }
    setSubmitDone(true);
  };

  const setF = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));
  const setCF = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setClaimForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
          <div className="flex gap-2">
            <a href="/" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)] px-3 py-1.5">Acasă</a>
            <a href="/login" className="text-sm bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg">Contul meu</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-12 px-4 text-center">
        <h1 className="text-2xl sm:text-4xl font-bold mb-3">Promovează-ți afacerea pe ActivKids</h1>
        <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto">
          Ajungi în fața miilor de părinți din București care caută activități pentru copiii lor.
        </p>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* === SECTIUNEA 1: REVENDICA === */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <button
            onClick={() => setSection(s => s === 'claim' ? 'none' : 'claim')}
            className="w-full flex items-start gap-4 p-6 text-left hover:bg-[var(--color-bg)] transition-colors"
          >
            <span className="text-3xl flex-shrink-0">🔍</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-[var(--color-text-main)]">Revendică o listare existentă</h2>
              <p className="text-sm text-[var(--color-text-light)] mt-1">
                Afacerea ta apare deja pe platformă? Revendic-o pentru a o actualiza și a accesa promovarea Premium.
              </p>
            </div>
            <span className="text-[var(--color-text-light)] mt-1 flex-shrink-0">{section === 'claim' ? '▲' : '▼'}</span>
          </button>

          {section === 'claim' && (
            <div className="border-t border-[var(--color-border)] p-6 space-y-5">
              {claimDone ? (
                <div className="text-center py-2">
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="font-bold text-lg mb-2">Cerere trimisă!</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3 text-sm text-blue-800">
                    Înregistrarea ta va fi validată în <strong>câteva ore</strong>.
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-800">
                    <p className="font-semibold mb-1">Vrei validare imediată?</p>
                    <p>Sună sau trimite mesaj la <a href="tel:0747646543" className="font-bold underline">0747 646 543</a></p>
                  </div>
                  <a href="/dashboard" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
                    Mergi la Dashboard →
                  </a>
                </div>
              ) : (
                <>
                  {/* Search */}
                  {!claimSelected ? (
                    <div>
                      <label className="block text-sm font-semibold mb-2">Caută afacerea ta</label>
                      <div className="relative">
                        <input
                          value={claimSearch}
                          onChange={e => setClaimSearch(e.target.value)}
                          placeholder="Scrie numele after school-ului sau clubului..."
                          className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                        {claimSearching && <span className="absolute right-3 top-3 text-xs text-[var(--color-text-light)]">Se caută...</span>}
                      </div>
                      {claimResults.length > 0 && (
                        <div className="mt-2 border border-[var(--color-border)] rounded-xl overflow-hidden">
                          {claimResults.map(r => (
                            <button key={`${r.type}-${r.id}`} onClick={() => { setClaimSelected(r); setClaimSearch(''); setClaimResults([]); }}
                              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-bg)] text-left border-b border-[var(--color-border)] last:border-0 transition-colors">
                              <span className="text-lg flex-shrink-0">{r.type === 'afterschool' ? '🏫' : '🎯'}</span>
                              <div>
                                <p className="text-sm font-semibold">{r.name}</p>
                                <p className="text-xs text-[var(--color-text-light)]">{r.address}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {claimSearch.length >= 2 && !claimSearching && claimResults.length === 0 && (
                        <p className="text-sm text-[var(--color-text-light)] mt-2">Niciun rezultat. <button onClick={() => { setSection('free'); setClaimSearch(''); }} className="text-[var(--color-primary)] underline">Adaugă o listare nouă</button></p>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Listare selectata */}
                      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                        <span className="text-xl">{claimSelected.type === 'afterschool' ? '🏫' : '🎯'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{claimSelected.name}</p>
                          <p className="text-xs text-[var(--color-text-light)] truncate">{claimSelected.address}</p>
                        </div>
                        <button onClick={() => setClaimSelected(null)} className="text-xs text-[var(--color-danger)] flex-shrink-0">Schimbă</button>
                      </div>

                      {/* Beneficii premium */}
                      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl p-4 text-white">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-bold">Ce primești cu Premium</p>
                          <span className="font-bold text-lg">50 RON/lună</span>
                        </div>
                        <ul className="space-y-1.5">
                          {PREMIUM_BENEFITS.map(b => (
                            <li key={b.text} className="flex items-center gap-2 text-sm">
                              <span>{b.icon}</span>
                              <span className={b.bold ? 'font-semibold' : ''}>{b.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Form contact */}
                      <div className="space-y-3">
                        <p className="text-sm font-semibold">Datele tale de contact</p>
                        <div className="grid grid-cols-2 gap-3">
                          {[{ label: 'Prenume *', field: 'first_name', placeholder: 'Ion' }, { label: 'Nume *', field: 'last_name', placeholder: 'Popescu' }].map(({ label, field, placeholder }) => (
                            <div key={field}>
                              <label className="block text-xs font-medium mb-1">{label}</label>
                              <input value={(claimForm as any)[field]} onChange={setCF(field)} placeholder={placeholder}
                                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                            </div>
                          ))}
                        </div>
                        {[
                          { label: 'Email *', field: 'email', type: 'email', placeholder: 'ion@exemplu.ro' },
                          { label: 'Telefon', field: 'phone', type: 'tel', placeholder: '07xx xxx xxx' },
                          { label: 'Website', field: 'website', type: 'url', placeholder: 'https://...' },
                          { label: 'Parolă cont *', field: 'password', type: 'password', placeholder: 'min. 6 caractere' },
                          { label: 'Confirmă parola *', field: 'confirm_password', type: 'password', placeholder: 'repetă parola' },
                        ].map(({ label, field, type, placeholder }) => (
                          <div key={field}>
                            <label className="block text-xs font-medium mb-1">{label}</label>
                            <input type={type} value={(claimForm as any)[field]} onChange={setCF(field)} placeholder={placeholder}
                              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                          </div>
                        ))}
                      </div>
                      {claimError && <p className="text-sm text-red-600">{claimError}</p>}
                      <button onClick={submitClaim} disabled={claimLoading}
                        className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
                        {claimLoading ? 'Se trimite...' : 'Trimite cererea de revendicare'}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* === SECTIUNEA 2: LISTARE NOUA === */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <button
            onClick={() => setSection(s => (s === 'free' || s === 'premium') ? 'none' : 'free')}
            className="w-full flex items-start gap-4 p-6 text-left hover:bg-[var(--color-bg)] transition-colors"
          >
            <span className="text-3xl flex-shrink-0">➕</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-[var(--color-text-main)]">Adaugă o listare nouă</h2>
              <p className="text-sm text-[var(--color-text-light)] mt-1">
                Afacerea ta nu apare încă pe platformă? Adaug-o gratuit sau direct cu pachetul Premium.
              </p>
            </div>
            <span className="text-[var(--color-text-light)] mt-1 flex-shrink-0">{(section === 'free' || section === 'premium') ? '▲' : '▼'}</span>
          </button>

          {(section === 'free' || section === 'premium') && (
            <div className="border-t border-[var(--color-border)] p-6 space-y-5">
              {submitDone ? (
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="font-bold text-lg mb-2">Listare trimisă spre aprobare!</h3>
                  <p className="text-sm text-[var(--color-text-light)] mb-4">Va fi publicată după verificare, de obicei în câteva ore.</p>
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-800">
                    <p className="font-semibold mb-1">Vrei aprobare imediată?</p>
                    <p>Sună la <a href="tel:0747646543" className="font-bold underline">0747 646 543</a></p>
                  </div>
                  <a href="/dashboard" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
                    Mergi la Dashboard →
                  </a>
                </div>
              ) : (
                <>
                  {/* Toggle free/premium */}
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setListingType('free')}
                      className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${listingType === 'free' ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-light)]'}`}>
                      Listare gratuită
                    </button>
                    <button onClick={() => setListingType('premium')}
                      className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${listingType === 'premium' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-[var(--color-border)] text-[var(--color-text-light)]'}`}>
                      ★ Premium — 50 RON/lună
                    </button>
                  </div>

                  {listingType === 'premium' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-amber-700 mb-2">Beneficii Premium incluse:</p>
                      <ul className="space-y-1">
                        {PREMIUM_BENEFITS.map(b => (
                          <li key={b.text} className="flex items-center gap-2 text-xs text-amber-800">
                            <span>{b.icon}</span><span>{b.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {listingType === 'free' && (
                    <div className="bg-gray-50 border border-[var(--color-border)] rounded-xl p-4 text-xs text-[var(--color-text-light)]">
                      Listarea gratuită include: <strong>nume, adresă, sector, categorie</strong>. Poți trece oricând la Premium din contul tău.
                    </div>
                  )}

                  {/* Tip listare */}
                  <div>
                    <label className="block text-xs font-medium mb-2">Tipul afacerii</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ value: 'afterschool', label: '🏫 After School' }, { value: 'club', label: '🎯 Activitate / Club' }].map(opt => (
                        <button key={opt.value} onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${form.type === opt.value ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-light)]'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.type === 'club' && (
                    <div>
                      <label className="block text-xs font-medium mb-1">Categorie</label>
                      <select value={form.category} onChange={setF('category')}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none">
                        {CLUB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Câmpuri de baza */}
                  <div>
                    <label className="block text-xs font-medium mb-1">Numele afacerii *</label>
                    <input value={form.name} onChange={setF('name')} placeholder="ex: After School Panda"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Adresă *</label>
                    <input ref={addressRef} value={form.address} onChange={setF('address')} placeholder="Caută adresa..."
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                    {!window?.google?.maps && <p className="text-xs text-[var(--color-text-light)] mt-1">Introdu adresa completă cu stradă și număr.</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Preț minim (lei)</label>
                      <input type="number" value={form.price_min} onChange={setF('price_min')} placeholder="400"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Preț maxim (lei)</label>
                      <input type="number" value={form.price_max} onChange={setF('price_max')} placeholder="800"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Vârstă minimă</label>
                      <input type="number" value={form.age_min} onChange={setF('age_min')} placeholder="5"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Vârstă maximă</label>
                      <input type="number" value={form.age_max} onChange={setF('age_max')} placeholder="14"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none" />
                    </div>
                  </div>

                  {/* Câmpuri premium */}
                  {listingType === 'premium' && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-amber-700">Informații de contact (Premium)</p>
                      {[
                        { label: 'Telefon', field: 'phone', type: 'tel', placeholder: '07xx xxx xxx' },
                        { label: 'Email', field: 'email', type: 'email', placeholder: 'contact@afterschool.ro' },
                        { label: 'Website', field: 'website', type: 'url', placeholder: 'https://...' },
                      ].map(({ label, field, type, placeholder }) => (
                        <div key={field}>
                          <label className="block text-xs font-medium mb-1">{label}</label>
                          <input type={type} value={(form as any)[field]} onChange={setF(field)} placeholder={placeholder}
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-medium mb-1">Descriere</label>
                        <textarea value={form.description} onChange={setF('description')} rows={3} placeholder="Descrie pe scurt serviciile oferite..."
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none" />
                      </div>
                    </div>
                  )}

                  {/* Cont */}
                  <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
                    <p className="text-sm font-semibold">Creează contul tău</p>
                    <p className="text-xs text-[var(--color-text-light)]">Vei folosi aceste date pentru a te loga și gestiona listarea.</p>
                    {[
                      { label: 'Email cont *', field: 'account_email', type: 'email', placeholder: 'tu@exemplu.ro' },
                      { label: 'Parolă *', field: 'password', type: 'password', placeholder: 'min. 6 caractere' },
                      { label: 'Confirmă parola *', field: 'confirm_password', type: 'password', placeholder: 'repetă parola' },
                    ].map(({ label, field, type, placeholder }) => (
                      <div key={field}>
                        <label className="block text-xs font-medium mb-1">{label}</label>
                        <input type={type} value={(form as any)[field]} onChange={setF(field)} placeholder={placeholder}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                    ))}
                  </div>

                  {submitError && <p className="text-sm text-red-600">{submitError}</p>}

                  <button onClick={submitListing} disabled={submitLoading}
                    className={`w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors text-white ${listingType === 'premium' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600' : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]'}`}>
                    {submitLoading ? 'Se trimite...' : listingType === 'premium' ? '★ Trimite listarea Premium' : 'Trimite listarea gratuită'}
                  </button>
                  <p className="text-xs text-center text-[var(--color-text-light)]">
                    Va fi publicată după verificare · <a href="tel:0747646543" className="hover:underline">0747 646 543</a> pentru aprobare imediată
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="bg-[var(--color-card)] border-t border-[var(--color-border)] mt-8 py-5">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-[var(--color-text-light)]">
          ActivKids · Activități pentru copii în București
        </div>
      </footer>
    </div>
  );
}
