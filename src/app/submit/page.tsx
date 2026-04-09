'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CLUB_CATEGORIES = [
  { value: 'inot', label: '🏊 Înot' },
  { value: 'fotbal', label: '⚽ Fotbal' },
  { value: 'dansuri', label: '💃 Dansuri' },
  { value: 'arte_martiale', label: '🥋 Arte Marțiale' },
  { value: 'gimnastica', label: '🤸 Gimnastică' },
  { value: 'limbi_straine', label: '🌍 Limbi Străine' },
  { value: 'robotica', label: '🤖 Robotică / Programare' },
  { value: 'muzica', label: '🎵 Muzică' },
  { value: 'arte_creative', label: '🎨 Arte Creative' },
];

declare global {
  interface Window { google: any; initGoogleMaps: () => void; }
}

export default function SubmitPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; is_premium: number } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [step, setStep] = useState(1); // 1=basic, 2=premium, 3=done
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const [form, setForm] = useState({
    listing_type: 'afterschool',
    name: '',
    address: '',
    lat: 0,
    lng: 0,
    sector: 0,
    category: 'inot',
    price_min: '',
    price_max: '',
    age_min: '',
    age_max: '',
    availability: 'unknown' as 'available' | 'full' | 'unknown',
    // Premium
    phone: '',
    email: '',
    website: '',
    description: '',
    photo_urls: [] as string[],
    video_urls: [] as string[],
    reviews_url: '',
    newPhotoUrl: '',
    newVideoUrl: '',
  });

  useEffect(() => {
    fetch('/api/user/me').then(r => r.json()).then(data => {
      if (!data.authenticated) { router.push('/login?next=/submit'); return; }
      setUser(data);
      setCheckingAuth(false);
    });
  }, []);

  // Initializeaza Google Maps Autocomplete
  useEffect(() => {
    if (checkingAuth || !addressInputRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return;

    const initAutocomplete = () => {
      if (!window.google || !addressInputRef.current) return;
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        componentRestrictions: { country: 'ro' },
        fields: ['formatted_address', 'geometry', 'address_components'],
      });
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (!place.geometry) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        // Extrage sectorul din adresa
        let sector = 0;
        for (const comp of (place.address_components || [])) {
          const name = comp.long_name.toLowerCase();
          const match = name.match(/sector\s*(\d)/);
          if (match) { sector = parseInt(match[1]); break; }
        }
        setForm(f => ({ ...f, address: place.formatted_address, lat, lng, sector }));
      });
    };

    if (window.google) {
      initAutocomplete();
    } else {
      window.initGoogleMaps = initAutocomplete;
      if (!document.querySelector('#google-maps-script')) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, [checkingAuth]);

  const addPhoto = () => {
    if (!form.newPhotoUrl.trim()) return;
    if (form.photo_urls.length >= 20) { setError('Maxim 20 de poze'); return; }
    setForm(f => ({ ...f, photo_urls: [...f.photo_urls, f.newPhotoUrl.trim()], newPhotoUrl: '' }));
  };

  const addVideo = () => {
    if (!form.newVideoUrl.trim()) return;
    if (form.video_urls.length >= 5) { setError('Maxim 5 video-uri'); return; }
    setForm(f => ({ ...f, video_urls: [...f.video_urls, f.newVideoUrl.trim()], newVideoUrl: '' }));
  };

  const submit = async () => {
    if (!form.name || !form.address || !form.lat) {
      setError('Completeaza numele si adresa'); return;
    }
    setLoading(true); setError('');
    const res = await fetch('/api/user/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_type: form.listing_type,
        name: form.name,
        address: form.address,
        lat: form.lat,
        lng: form.lng,
        sector: form.sector || null,
        category: form.listing_type !== 'afterschool' ? form.category : null,
        price_min: form.price_min ? parseInt(form.price_min) : null,
        price_max: form.price_max ? parseInt(form.price_max) : null,
        age_min: form.age_min ? parseInt(form.age_min) : null,
        age_max: form.age_max ? parseInt(form.age_max) : null,
        availability: form.availability,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        description: form.description || null,
        photo_urls: form.photo_urls.length > 0 ? form.photo_urls : null,
        video_urls: form.video_urls.length > 0 ? form.video_urls : null,
        reviews_url: form.reviews_url || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setStep(3);
  };

  if (checkingAuth) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (step === 3) return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-[var(--color-primary)] mb-2">Listare trimisa!</h1>
        <p className="text-sm text-[var(--color-text-light)] mb-6">
          Listarea ta a fost trimisa si va fi revizuita de echipa noastra. Vei fi notificat prin email.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
            Dashboard
          </Link>
          <Link href="/" className="px-4 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm font-semibold">
            Acasa
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="bg-[var(--color-card)] border-b border-[var(--color-border)] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-[var(--color-primary)] font-bold">ActivKids</Link>
          <Link href="/dashboard" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">← Dashboard</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-2">Adauga listare</h1>
        <p className="text-sm text-[var(--color-text-light)] mb-6">Listarea va fi verificata si publicata in maxim 24-48 ore.</p>

        {/* Tip listare */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6 mb-4">
          <h2 className="font-bold mb-4">📌 Tip listare</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'afterschool', label: '🏫 After School' },
              ...CLUB_CATEGORIES.map(c => ({ value: c.value, label: c.label })),
            ].map(opt => (
              <button key={opt.value}
                onClick={() => setForm(f => ({ ...f, listing_type: opt.value === 'afterschool' ? 'afterschool' : 'club', category: opt.value !== 'afterschool' ? opt.value : f.category }))}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                  (opt.value === 'afterschool' && form.listing_type === 'afterschool') ||
                  (opt.value !== 'afterschool' && form.listing_type === 'club' && form.category === opt.value)
                    ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Informatii de baza */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6 mb-4">
          <h2 className="font-bold mb-4">ℹ️ Informatii de baza <span className="text-xs font-normal text-[var(--color-text-light)]">(gratuit)</span></h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Numele companiei *</label>
              <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ex: After School Luminis"
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adresa *</label>
              <input ref={addressInputRef} type="text" required
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value, lat: 0, lng: 0 }))}
                placeholder="Cauta adresa..."
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              {form.lat !== 0 && (
                <p className="text-xs text-green-600 mt-1">✓ Locatie confirmata pe harta</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Pret minim (lei/luna)</label>
                <input type="number" value={form.price_min} onChange={e => setForm(f => ({ ...f, price_min: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pret maxim (lei/luna)</label>
                <input type="number" value={form.price_max} onChange={e => setForm(f => ({ ...f, price_max: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Varsta minima (ani)</label>
                <input type="number" value={form.age_min} onChange={e => setForm(f => ({ ...f, age_min: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Varsta maxima (ani)</label>
                <input type="number" value={form.age_max} onChange={e => setForm(f => ({ ...f, age_max: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Locuri disponibile</label>
              <div className="flex gap-3">
                {[
                  { value: 'available', label: '✅ Da, avem locuri' },
                  { value: 'full', label: '❌ Nu, suntem plini' },
                  { value: 'unknown', label: '❓ Nu stiu' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setForm(f => ({ ...f, availability: opt.value as any }))}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                      form.availability === opt.value
                        ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)]'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sectiunea Premium */}
        <div className="bg-[var(--color-card)] rounded-2xl border-2 border-amber-300 p-6 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold">★ Informatii Premium</h2>
            <span className="text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full font-bold">PREMIUM</span>
          </div>
          <p className="text-xs text-[var(--color-text-light)] mb-4">Completeaza acum - va fi activat dupa upgrade la Premium</p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Telefon</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email contact</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website / Facebook / Instagram</label>
              <input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://"
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descriere</label>
              <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descrie ce oferiti, program, facilitati..."
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Link recenzii Google Maps / Facebook</label>
              <input type="url" value={form.reviews_url} onChange={e => setForm(f => ({ ...f, reviews_url: e.target.value }))}
                placeholder="https://maps.google.com/..."
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <p className="text-xs text-[var(--color-text-light)] mt-1">Stelele si numarul de recenzii vor aparea pe listare</p>
            </div>
            {/* Poze */}
            <div>
              <label className="block text-sm font-medium mb-1">Poze carusel (max 20 URL-uri)</label>
              <div className="flex gap-2 mb-2">
                <input type="url" value={form.newPhotoUrl} onChange={e => setForm(f => ({ ...f, newPhotoUrl: e.target.value }))}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <button onClick={addPhoto} className="px-3 py-2 bg-amber-400 text-white rounded-xl text-sm font-semibold">+ Adauga</button>
              </div>
              {form.photo_urls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.photo_urls.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                      <button onClick={() => setForm(f => ({ ...f, photo_urls: f.photo_urls.filter((_, j) => j !== i) }))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Video-uri */}
            <div>
              <label className="block text-sm font-medium mb-1">Video-uri YouTube (max 5)</label>
              <div className="flex gap-2 mb-2">
                <input type="url" value={form.newVideoUrl} onChange={e => setForm(f => ({ ...f, newVideoUrl: e.target.value }))}
                  placeholder="https://youtube.com/..."
                  className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <button onClick={addVideo} className="px-3 py-2 bg-amber-400 text-white rounded-xl text-sm font-semibold">+ Adauga</button>
              </div>
              {form.video_urls.map((url, i) => (
                <div key={i} className="flex items-center gap-2 mb-1 text-sm bg-[var(--color-bg)] px-3 py-1.5 rounded-lg border">
                  <span className="flex-1 truncate text-[var(--color-text-light)]">{url}</span>
                  <button onClick={() => setForm(f => ({ ...f, video_urls: f.video_urls.filter((_, j) => j !== i) }))}
                    className="text-red-500 flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>}

        <button onClick={submit} disabled={loading}
          className="w-full py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-base">
          {loading ? 'Se trimite...' : 'Trimite listarea pentru aprobare'}
        </button>
        <p className="text-center text-xs text-[var(--color-text-light)] mt-3">
          Listarea va fi verificata si publicata in maxim 24-48 ore
        </p>
      </div>
    </div>
  );
}
