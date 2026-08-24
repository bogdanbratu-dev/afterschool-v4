'use client';
import { useState, useEffect, useRef } from 'react';
import { PROFESSIONAL_CATEGORY_LABELS, PROFESSIONAL_CATEGORY_ORDER } from '@/lib/professionals';
import { TUTOR_SUBJECT_LABELS, TUTOR_SUBJECT_ORDER } from '@/lib/tutors';
import FacebookFollow from '@/components/FacebookFollow';
import PageviewTracker from '@/components/PageviewTracker';
import ZoneInsights from '@/components/ZoneInsights';

const CLUB_CATEGORIES = [
  { value: 'inot', label: 'Inot' },
  { value: 'fotbal', label: 'Fotbal' },
  { value: 'dansuri', label: 'Dansuri' },
  { value: 'arte_martiale', label: 'Arte Martiale' },
  { value: 'gimnastica', label: 'Gimnastica' },
  { value: 'limbi_straine', label: 'Limbi Straine' },
  { value: 'robotica', label: 'Robotica / Programare' },
  { value: 'muzica', label: 'Muzica' },
  { value: 'arte_creative', label: 'Arte Creative' },
  { value: 'alte_activitati', label: 'Alte Activitati' },
];

const KINDERGARTEN_TYPES = [
  { value: 'gradinita', label: 'Gradinita' },
  { value: 'cresa', label: 'Cresa' },
];

const MAIN_TYPES = [
  { value: 'afterschool', label: '🏫 After School' },
  { value: 'club', label: '🎯 Activitate / Club' },
  { value: 'professional', label: '🧑‍🏫 Colaborator' },
  { value: 'kindergarten', label: '👶 Gradinita / Cresa' },
  { value: 'tutor', label: '📚 Meditatii' },
  { value: 'caterer', label: '🍽️ Catering' },
];

const CATEGORY_LISTING_TYPES = ['club', 'professional', 'tutor', 'kindergarten'];

type ListingType = 'afterschool' | 'club' | 'professional' | 'kindergarten' | 'tutor' | 'caterer';

const TYPE_ICON: Record<ListingType, string> = {
  afterschool: '🏫', club: '🎯', professional: '🧑‍🏫', kindergarten: '👶', tutor: '📚', caterer: '🍽️',
};

const TYPE_API: Record<ListingType, string> = {
  afterschool: '/api/afterschools', club: '/api/clubs', professional: '/api/professionals',
  kindergarten: '/api/kindergartens', tutor: '/api/tutors', caterer: '/api/caterers',
};

const PREMIUM_WA_LINK = 'https://wa.me/40747646543?text=' + encodeURIComponent('Bună ziua! Aș dori să iau și eu pachetul Premium.');
const GROWTH_WA_LINK = 'https://wa.me/40747646543?text=' + encodeURIComponent('Bună ziua! Aș dori detalii despre trafic plătit (promovare Growth).');
const LISTING_HELP_WA_LINK = 'https://wa.me/40747646543?text=' + encodeURIComponent('Bună ziua! Nu am timp să completez formularul, m-ați putea ajuta cu listarea?');

// Centre aproximative de sector, folosite ca fallback cand nu avem geocodare exacta a adresei
// (acelasi principiu ca la restul bazei de date - vezi CLAUDE.md, sectiunea "Key schema notes").
const SECTOR_CENTROIDS: Record<number, { lat: number; lng: number }> = {
  1: { lat: 44.4468, lng: 26.0693 },
  2: { lat: 44.4380, lng: 26.1200 },
  3: { lat: 44.4270, lng: 26.1370 },
  4: { lat: 44.3980, lng: 26.1170 },
  5: { lat: 44.4050, lng: 26.0700 },
  6: { lat: 44.4350, lng: 26.0330 },
};

type Section = 'none' | 'claim' | 'new';
interface Listing { id: number; name: string; address: string; type: ListingType; }

export default function PromovarePage({ afterschoolCount }: { afterschoolCount?: number }) {
  const afterschoolCountLabel = afterschoolCount ? `peste ${afterschoolCount}` : 'peste 400';
  const [section, setSection] = useState<Section>('none');
  const addListingRef = useRef<HTMLDivElement>(null);

  const goToAddListing = () => {
    setSection('new');
    requestAnimationFrame(() => addListingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const [claimSearch, setClaimSearch] = useState('');
  const [claimResults, setClaimResults] = useState<Listing[]>([]);
  const [claimSelected, setClaimSelected] = useState<Listing | null>(null);
  const [claimSearching, setClaimSearching] = useState(false);
  const [claimForm, setClaimForm] = useState({ first_name: '', last_name: '', email: '', phone: '', website: '' });
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimDone, setClaimDone] = useState(false);
  const [claimLink, setClaimLink] = useState('');
  const [claimError, setClaimError] = useState('');
  const [claimCopied, setClaimCopied] = useState(false);

  const [newForm, setNewForm] = useState({
    type: 'afterschool', category: 'inot', listing_name: '', address: '', sector: '1',
    price_min: '', price_max: '', age_min: '', age_max: '', website: '',
    owner_name: '', email: '', phone: '', agreedToTerms: false,
  });
  const [newLoading, setNewLoading] = useState(false);
  const [newDone, setNewDone] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [newError, setNewError] = useState('');
  const [newCopied, setNewCopied] = useState(false);

  useEffect(() => {
    if (claimSearch.length < 2) { setClaimResults([]); return; }
    const t = setTimeout(async () => {
      setClaimSearching(true);
      const types = Object.keys(TYPE_API) as ListingType[];
      const results = await Promise.all(
        types.map(t => fetch(TYPE_API[t] + '?name=' + encodeURIComponent(claimSearch)).then(r => r.json()))
      );
      setClaimResults(
        types.flatMap((t, i) => (Array.isArray(results[i]) ? results[i] : [])
          .map((x: any) => ({ id: x.id, name: x.name, address: x.address, type: t })))
      );
      setClaimSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [claimSearch]);

  const submitClaim = async () => {
    if (!claimSelected || !claimForm.first_name || !claimForm.last_name || !claimForm.email) {
      setClaimError('Prenumele, numele si email-ul sunt obligatorii.'); return;
    }
    setClaimLoading(true); setClaimError('');
    const res = await fetch('/api/user/claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: claimSelected.type, listing_id: claimSelected.id,
        listing_name: claimSelected.name, company_name: claimSelected.name, ...claimForm }),
    });
    const data = await res.json();
    setClaimLoading(false);
    if (!res.ok) { setClaimError(data.error || 'A aparut o eroare.'); return; }
    setClaimLink(data.link || ''); setClaimDone(true);
  };

  const submitNew = async () => {
    if (!newForm.listing_name || !newForm.address || !newForm.owner_name || !newForm.email || !newForm.phone) {
      setNewError('Completeaza toate campurile obligatorii.'); return;
    }
    if (!newForm.agreedToTerms) {
      setNewError('Trebuie sa fii de acord cu Termenii si Conditiile.'); return;
    }
    setNewLoading(true); setNewError('');
    const regRes = await fetch('/api/user/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newForm.email, name: newForm.owner_name, phone: newForm.phone }),
    });
    const regData = await regRes.json();
    if (!regRes.ok) { setNewLoading(false); setNewError(regData.error || 'Eroare la crearea contului.'); return; }

    const centroid = SECTOR_CENTROIDS[Number(newForm.sector)] || SECTOR_CENTROIDS[1];
    const listRes = await fetch('/api/user/listings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_type: newForm.type,
        name: newForm.listing_name,
        address: newForm.address,
        lat: centroid.lat, lng: centroid.lng,
        sector: Number(newForm.sector),
        category: CATEGORY_LISTING_TYPES.includes(newForm.type) ? newForm.category : undefined,
        price_min: newForm.price_min ? parseInt(newForm.price_min, 10) : undefined,
        price_max: newForm.price_max ? parseInt(newForm.price_max, 10) : undefined,
        age_min: newForm.age_min ? parseInt(newForm.age_min, 10) : undefined,
        age_max: newForm.age_max ? parseInt(newForm.age_max, 10) : undefined,
        phone: newForm.phone,
        email: newForm.email,
        website: newForm.website || undefined,
      }),
    });
    const listData = await listRes.json();
    setNewLoading(false);
    if (!listRes.ok) { setNewError(listData.error || 'Eroare la trimiterea listarii.'); return; }
    if (typeof window !== 'undefined' && (window as any).fbq) { (window as any).fbq('track', 'Lead'); }
    setNewLink(regData.link || ''); setNewDone(true);
  };

  const setCF = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) => setClaimForm(p => ({ ...p, [f]: e.target.value }));
  const setNF = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setNewForm(p => ({ ...p, [f]: e.target.value }));

  const renderLink = (link: string, copied: boolean, onCopy: () => void, title: string, sub: string) => (
    <div className="text-center py-2">
      <div className="text-4xl mb-3">✅</div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-sm text-[var(--color-text-light)] mb-4">{sub}</p>
      {link && <>
        <div className="bg-[var(--color-bg)] rounded-xl border-2 border-[var(--color-primary)] p-4 mb-3 text-left">
          <p className="text-xs text-[var(--color-text-light)] mb-2 font-medium uppercase tracking-wide">Link acces dashboard</p>
          <p className="text-xs break-all text-[var(--color-primary)] font-mono select-all leading-relaxed">{link}</p>
        </div>
        <button onClick={onCopy}
          className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-xl transition-colors mb-3">
          {copied ? '✓ Copiat!' : 'Copiaza link-ul'}
        </button>
        <a href={link} className="block w-full py-3 text-center border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-bold rounded-xl hover:bg-[var(--color-primary)] hover:text-white transition-colors">
          Acceseaza dashboardul acum
        </a>
      </>}
      <p className="text-xs text-[var(--color-text-light)] mt-4">Salveaza link-ul — este singurul mod de acces la cont.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PageviewTracker page="/promovare" />
      <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
          <div className="flex gap-2">
            <a href="/" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text)] px-3 py-1.5">Acasa</a>
            <a href="/register" className="text-sm bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg">Inregistrare</a>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-12 px-4 text-center">
        <h1 className="text-2xl sm:text-4xl font-bold mb-3">Promoveaza-ti afacerea pe ActivKids</h1>
        <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto">
          Ajungi in fata miilor de parinti din Bucuresti care cauta activitati pentru copiii lor.
        </p>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <ZoneInsights onWantPremium={goToAddListing} />

        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6">
          <h2 className="font-bold text-center mb-5">Planuri disponibile</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold text-lg">Free</p>
              <p className="text-2xl font-bold text-[var(--color-primary)] mb-3">0 RON</p>
              {['✓ Listare in director', '✓ Pagina proprie', '✓ Poti modifica orice detalii (program, preturi, poze)', '✗ Parinti te contacteaza direct', '✗ Pozitie prioritara', '✗ Badge Premium', '✗ Carusel foto in rezultate', '✗ Acces la catalogul de colaboratori'].map(t => (
                <p key={t} className={'text-xs py-0.5 ' + (t.startsWith('✗') ? 'text-[var(--color-text-light)] opacity-50' : 'text-[var(--color-text-light)]')}>{t}</p>
              ))}
            </div>
            <div>
              <p className="font-bold text-lg text-[var(--color-primary)]">Premium</p>
              <p className="text-2xl font-bold text-[var(--color-primary)] mb-3">100 RON<span className="text-sm font-normal">/3 luni</span></p>
              {['✓ Tot ce include Free', '✓ Parinti te contacteaza direct', '✓ Pozitie prioritara', '✓ Badge Premium', '✓ Carusel foto vizibil direct in rezultate (mai proeminent)', '✓ Statistici vizite', '✓ Suport prioritar', '✓ Acces la catalogul de colaboratori (logopezi, psihologi, meditatori etc.)'].map(t => (
                <p key={t} className="text-xs py-0.5 text-[var(--color-text)]">{t}</p>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-center text-[var(--color-text-light)] mt-4">
            Free și Premium îți dau o poziție mai bună <em>în</em> ActivKids. Pentru a aduce părinți noi din afara site-ului, vezi mai jos <strong>trafic plătit</strong>.
          </p>
        </div>

        <div className="bg-[var(--color-card)] rounded-2xl border-2 border-[var(--color-primary)] p-6">
          <div className="flex items-center gap-2 justify-center mb-1">
            <span className="text-lg" aria-hidden="true">🚀</span>
            <h2 className="font-bold text-center">Trafic plătit <span className="text-[var(--color-text-light)] font-normal">(promovare Growth)</span></h2>
          </div>
          <p className="text-xs text-center text-[var(--color-text-light)] mb-4">
            Diferit de Free/Premium: în loc de o poziție mai bună printre listările existente, cumperi vizite noi — părinți din zona ta care încă nu știu de tine, aduși printr-o campanie de promovare online (Meta Ads — Facebook și Instagram). Estimarea de mai sus (secțiunea &bdquo;Potențialul zonei&rdquo;) arată exact la ce trafic te poți aștepta pentru un buget ales.
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs text-center mb-4">
            {[{ l: 'Start', p: '300' }, { l: 'Growth', p: '500' }, { l: 'Boost', p: '1000' }].map(t => (
              <div key={t.l} className="bg-[var(--color-bg)] rounded-xl p-3">
                <p className="font-semibold text-[var(--color-text-main)]">{t.l}</p>
                <p className="font-bold text-[var(--color-primary)]">{t.p} lei<span className="font-normal text-[var(--color-text-light)]">/lună</span></p>
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-[var(--color-text-light)] mb-2">
            Pe lângă bugetul de reclamă de mai sus, se percepe o <strong>taxă de gestionare a campaniei de 150 lei/lună</strong> (100 lei/lună pentru listările Premium).
          </p>
          <p className="text-[11px] text-center text-[var(--color-text-light)] mb-2">
            Tu alegi bugetul lunar, noi configurăm și gestionăm campania — la fel ca la Premium, fără nimic de făcut din partea ta după ce trimiți cererea. Solicitarea se face din contul tău (tab-ul &bdquo;🚀 Promovare&rdquo; din dashboard), după ce ai o listare pe ActivKids — funcționează și pentru listările Free, nu doar Premium.
          </p>
          <p className="text-[11px] text-center text-[var(--color-text-light)] mb-4">
            🔍 Vrei o dovadă clară că traficul e real? La cerere, pentru intervalul ales, îți trimitem și datele din Google Analytics — nu doar cifrele noastre, ca să vezi transparent că nu sunt boți sau clickuri artificiale.
          </p>
          <a
            href={GROWTH_WA_LINK} target="_blank" rel="noopener noreferrer"
            className="block w-full text-center py-3 rounded-xl text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', boxShadow: 'var(--shadow-brand)' }}
          >
            Întreabă despre trafic plătit →
          </a>
        </div>

        <p className="text-xs text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          🎯 Un profil complet (activități, preț, vârstă, program) crește șansele să apari în recomandările din <a href="/potrivire" className="underline font-semibold">Potrivire</a>, unde părinții primesc sugestii personalizate.
        </p>

        <div ref={addListingRef} className="bg-[var(--color-card)] rounded-2xl overflow-hidden border-2 border-[var(--color-primary)] shadow-lg shadow-blue-500/10">
          <button onClick={() => setSection(s => s === 'none' ? 'new' : 'none')}
            className="w-full flex items-center gap-4 p-6 text-left bg-gradient-to-r from-[var(--color-primary)] to-blue-500 hover:brightness-110 transition-all">
            <span className="text-4xl flex-shrink-0">✨</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">Adauga listarea ta</h2>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/25 text-white">Gratuit · 2 min</span>
              </div>
              <p className="text-sm mt-1 text-blue-50">Apasa aici si completeaza formularul</p>
            </div>
            <span className={'flex-shrink-0 text-white text-2xl ' + (section === 'none' ? 'animate-bounce' : '')}>
              {section === 'none' ? '▼' : '▲'}
            </span>
          </button>
          {section !== 'none' && (
            <div className="border-t border-[var(--color-border)] p-6 space-y-4">
              {section === 'claim' ? (
                claimDone ? renderLink(claimLink, claimCopied, () => { navigator.clipboard.writeText(claimLink); setClaimCopied(true); setTimeout(() => setClaimCopied(false), 2000); }, 'Listare adaugata!', 'Ai acces instant la ea din dashboard.') : (
                  <>
                    {!claimSelected ? (
                      <div>
                        <label className="block text-sm font-semibold mb-2">Cauta afacerea ta</label>
                        <div className="relative">
                          <input value={claimSearch} onChange={e => setClaimSearch(e.target.value)}
                            placeholder="Scrie numele afacerii tale..."
                            className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                          {claimSearching && <span className="absolute right-3 top-3.5 text-xs text-[var(--color-text-light)]">Se cauta...</span>}
                        </div>
                        {claimResults.length > 0 && (
                          <div className="mt-2 border border-[var(--color-border)] rounded-xl overflow-hidden">
                            {claimResults.map(r => (
                              <button key={r.type + '-' + r.id} onClick={() => { setClaimSelected(r); setClaimSearch(''); setClaimResults([]); }}
                                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-bg)] text-left border-b border-[var(--color-border)] last:border-0 transition-colors">
                                <span className="text-lg">{TYPE_ICON[r.type]}</span>
                                <div><p className="text-sm font-semibold">{r.name}</p><p className="text-xs text-[var(--color-text-light)]">{r.address}</p></div>
                              </button>
                            ))}
                          </div>
                        )}
                        {claimSearch.length >= 2 && !claimSearching && claimResults.length === 0 && (
                          <p className="text-sm text-[var(--color-text-light)] mt-2">Niciun rezultat.{' '}
                            <button onClick={() => { setSection('new'); setClaimSearch(''); }} className="text-[var(--color-primary)] underline">Adaug-o de la zero</button></p>
                        )}
                        <p className="text-xs text-[var(--color-text-light)] mt-3">Stii sigur ca nu apare inca?{' '}
                          <button onClick={() => setSection('new')} className="text-[var(--color-primary)] underline">Adaug-o de la zero</button></p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                          <span className="text-xl">{TYPE_ICON[claimSelected.type]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{claimSelected.name}</p>
                            <p className="text-xs text-[var(--color-text-light)] truncate">{claimSelected.address}</p>
                          </div>
                          <button onClick={() => setClaimSelected(null)} className="text-xs text-red-500">Schimba</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Prenume *</label>
                            <input value={claimForm.first_name} onChange={setCF('first_name')} placeholder="Ion"
                              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Nume *</label>
                            <input value={claimForm.last_name} onChange={setCF('last_name')} placeholder="Popescu"
                              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                          </div>
                        </div>
                        {[{ l: 'Email *', f: 'email', t: 'email', p: 'ion@exemplu.ro' }, { l: 'Telefon', f: 'phone', t: 'tel', p: '07xx xxx xxx' }, { l: 'Website', f: 'website', t: 'url', p: 'https://...' }].map(({ l, f, t, p }) => (
                          <div key={f}>
                            <label className="block text-xs font-medium mb-1">{l}</label>
                            <input type={t} value={(claimForm as any)[f]} onChange={setCF(f)} placeholder={p}
                              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                          </div>
                        ))}
                        {claimError && <p className="text-sm text-red-600">{claimError}</p>}
                        <button onClick={submitClaim} disabled={claimLoading}
                          className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
                          {claimLoading ? 'Se trimite...' : 'Adauga → primesti link de acces instant'}
                        </button>
                      </>
                    )}
                  </>
                )
              ) : (
                newDone ? renderLink(newLink, newCopied, () => { navigator.clipboard.writeText(newLink); setNewCopied(true); setTimeout(() => setNewCopied(false), 2000); }, 'Listare trimisa!', 'Listarea ta a fost trimisa spre verificare si va aparea pe site dupa aprobare. Poti urmari statusul din dashboard.') : (
                  <>
                    <p className="text-xs text-[var(--color-text-light)]">Ai deja o listare pe ActivKids?{' '}
                      <button onClick={() => setSection('claim')} className="text-[var(--color-primary)] underline">Cauta si revendic-o →</button></p>
                    <div>
                      <label className="block text-xs font-medium mb-2">Tipul afacerii</label>
                      <div className="grid grid-cols-2 gap-2">
                        {MAIN_TYPES.map(({ value: v, label: l }) => (
                          <button key={v} onClick={() => setNewForm(f => ({
                            ...f,
                            type: v,
                            category: v === 'professional' ? 'invatatori'
                              : v === 'tutor' ? 'matematica'
                              : v === 'kindergarten' ? 'gradinita'
                              : v === 'club' ? 'inot'
                              : f.category,
                          }))}
                            className={'py-2.5 rounded-xl text-sm font-medium border transition-colors ' + (newForm.type === v ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-light)]')}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    {newForm.type === 'club' && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Categorie</label>
                        <select value={newForm.category} onChange={setNF('category')}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none">
                          {CLUB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                    )}
                    {newForm.type === 'professional' && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Domeniu colaborator</label>
                        <select value={newForm.category} onChange={setNF('category')}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none">
                          {PROFESSIONAL_CATEGORY_ORDER.map(c => <option key={c} value={c}>{PROFESSIONAL_CATEGORY_LABELS[c]}</option>)}
                        </select>
                      </div>
                    )}
                    {newForm.type === 'tutor' && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Materie</label>
                        <select value={newForm.category} onChange={setNF('category')}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none">
                          {TUTOR_SUBJECT_ORDER.map(s => <option key={s} value={s}>{TUTOR_SUBJECT_LABELS[s]}</option>)}
                        </select>
                      </div>
                    )}
                    {newForm.type === 'kindergarten' && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Tip unitate</label>
                        <select value={newForm.category} onChange={setNF('category')}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none">
                          {KINDERGARTEN_TYPES.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                        </select>
                      </div>
                    )}
                    {[{ l: 'Numele afacerii *', f: 'listing_name', t: 'text', p: 'ex: After School Panda' }].map(({ l, f, t, p }) => (
                      <div key={f}>
                        <label className="block text-xs font-medium mb-1">{l}</label>
                        <input type={t} value={(newForm as any)[f]} onChange={setNF(f)} placeholder={p}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-medium mb-1">Adresa *</label>
                      <input type="text" value={newForm.address} onChange={setNF('address')} placeholder="Str. Exemplu nr. 10, Bucuresti"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Sector *</label>
                      <select value={newForm.sector} onChange={setNF('sector')}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none">
                        {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Sector {s}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Pret minim (RON/luna)</label>
                        <input type="number" value={newForm.price_min} onChange={setNF('price_min')} placeholder="ex: 500"
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Pret maxim (RON/luna)</label>
                        <input type="number" value={newForm.price_max} onChange={setNF('price_max')} placeholder="ex: 900"
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Varsta minima</label>
                        <input type="number" value={newForm.age_min} onChange={setNF('age_min')} placeholder="ex: 3"
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Varsta maxima</label>
                        <input type="number" value={newForm.age_max} onChange={setNF('age_max')} placeholder="ex: 14"
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                    </div>
                    {[{ l: 'Numele tau *', f: 'owner_name', t: 'text', p: 'Ion Popescu' }, { l: 'Email *', f: 'email', t: 'email', p: 'tu@exemplu.ro' }, { l: 'Telefon *', f: 'phone', t: 'tel', p: '07xx xxx xxx' }, { l: 'Website', f: 'website', t: 'url', p: 'https://...' }].map(({ l, f, t, p }) => (
                      <div key={f}>
                        <label className="block text-xs font-medium mb-1">{l}</label>
                        <input type={t} value={(newForm as any)[f]} onChange={setNF(f)} placeholder={p}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                    ))}
                    <label className="flex items-start gap-2 text-xs text-[var(--color-text-light)]">
                      <input type="checkbox" checked={newForm.agreedToTerms}
                        onChange={e => setNewForm(f => ({ ...f, agreedToTerms: e.target.checked }))}
                        className="mt-0.5 flex-shrink-0" />
                      <span>Sunt de acord cu <a href="/termeni" target="_blank" className="text-[var(--color-primary)] underline">Termenii si Conditiile</a> si <a href="/confidentialitate" target="_blank" className="text-[var(--color-primary)] underline">Politica de confidentialitate</a> ActivKids. *</span>
                    </label>
                    {newError && <p className="text-sm text-red-600">{newError}</p>}
                    <button onClick={submitNew} disabled={newLoading}
                      className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
                      {newLoading ? 'Se trimite...' : 'Trimite listarea gratuit'}
                    </button>
                    <div className="pt-4 border-t border-[var(--color-border)] text-center">
                      <p className="text-xs text-[var(--color-text-light)] mb-2">Vrei sa apari primul de la inceput?</p>
                      <a href={PREMIUM_WA_LINK} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                        Vreau Premium →
                      </a>
                      <p className="text-xs text-[var(--color-text-light)] mt-2">Se deschide WhatsApp cu mesajul completat, il trimiti tu si iti raspundem in cateva minute.</p>
                    </div>
                  </>
                )
              )}
            </div>
          )}
        </div>

        <div className="text-center">
          <a href={LISTING_HELP_WA_LINK} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--color-card)] hover:bg-green-50 border-[1.5px] border-green-500 text-green-700 rounded-xl text-sm font-bold transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0 fill-green-500">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.428a.5.5 0 00.611.61l5.79-1.516A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.52-5.16-1.427l-.36-.214-3.795.994.994-3.696-.235-.38A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            Nu ai timp de formular? Scrie-mi pe WhatsApp
          </a>
          <p className="text-xs text-[var(--color-text-light)] mt-2">Mă ocup eu de listare, gratuit, dacă vrei.</p>
        </div>

        <div className="bg-[var(--color-card)] rounded-2xl border-2 border-[var(--color-primary)] p-6 mt-6">
          <p className="inline-block text-xs font-bold uppercase tracking-wide text-white bg-[var(--color-primary)] rounded-full px-3 py-1 mb-3">
            🧑‍🏫 Doar pentru colaboratori, profesori de meditații, antrenori și catering/petreceri
          </p>
          <h2 className="font-bold text-lg mb-1">Pachet Introducere Directă</h2>
          <p className="text-2xl font-bold text-[var(--color-primary)] mb-3">150 RON<span className="text-sm font-normal"> (o singură dată)</span></p>
          <p className="text-sm text-[var(--color-text-light)] mb-3">
            Te prezentăm personal, prin email, la toate cele {afterschoolCountLabel} afterschool-uri din baza noastră de date din București (număr în continuă creștere) — ca să te contacteze direct cine are nevoie de tine.
          </p>
          <div className="space-y-1 mb-4">
            {[
              'Email de prezentare trimis către toate afterschool-urile din baza noastră',
              'Prezentare personalizată cu specializarea și tarifele tale',
              'Contactul rămâne direct la tine, fără comision pe colaborări',
              'Plată unică — nu e abonament',
            ].map(t => (
              <p key={t} className="text-xs py-0.5 text-[var(--color-text)]">✓ {t}</p>
            ))}
          </div>
          <a href="/plata?product=outreach"
            className="inline-block text-sm font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-4 py-2 rounded-xl transition-colors">
            Vreau Pachetul Introducere Directă →
          </a>
          <p className="text-xs text-[var(--color-text-light)] mt-2">
            Disponibil din dashboard, după ce ai un cont de colaborator, meditator/profesor sau catering pe ActivKids.
          </p>
        </div>

      </div>

      <footer className="bg-[var(--color-card)] border-t border-[var(--color-border)] mt-8 py-5">
        <div className="max-w-4xl mx-auto px-4">
          <FacebookFollow />
          <div className="text-center text-xs text-[var(--color-text-light)]">
            ActivKids · Activitati pentru copii in Bucuresti
          </div>
        </div>
      </footer>
    </div>
  );
}
