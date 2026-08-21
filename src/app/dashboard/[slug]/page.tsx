'use client';
import { useState, useEffect, useCallback } from 'react';
import OutreachTab from '@/components/DashboardOutreachTab';
import CollaborationsTab from '@/components/CollaborationsTab';
import FindProfessionalsTab from '@/components/FindProfessionalsTab';
import { useRouter, useParams } from 'next/navigation';

interface Listing {
  id: number; name: string; address: string;
  phone: string | null; email: string | null; website: string | null;
  facebook_url: string | null; description: string | null;
  price_min: number | null; price_max: number | null;
  age_min: number | null; age_max: number | null;
  availability: string; photo_urls: string | null; video_urls: string | null;
  reviews_url: string | null; schedule: string | null;
  pickup_time: string | null; end_time: string | null; is_premium: number;
  logo_url: string | null;
}

interface Microsite {
  id: number; subdomain: string; theme_color: string | null; tagline: string | null;
  about_long: string | null; instagram_url: string | null; tiktok_url: string | null;
  youtube_url: string | null; whatsapp: string | null; booking_enabled: number; booking_label: string | null;
  outreach_enabled: number | null;
}

type Tab = 'listare' | 'site' | 'statistici' | 'contacte' | 'outreach' | 'colaborari' | 'colaboratori';

function toSimpleSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i')
    .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

function parsePhotos(s: string | null | undefined): string[] {
  if (!s) return [];
  try { const a = JSON.parse(s); if (Array.isArray(a)) return a as string[]; } catch {}
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

const THEME_OPTIONS = [
  { key: 'teal', label: 'Teal', sw: 'bg-teal-600' },
  { key: 'blue', label: 'Albastru', sw: 'bg-blue-600' },
  { key: 'purple', label: 'Mov', sw: 'bg-purple-600' },
  { key: 'rose', label: 'Roz', sw: 'bg-rose-500' },
  { key: 'amber', label: 'Chihlimbar', sw: 'bg-amber-500' },
  { key: 'emerald', label: 'Verde', sw: 'bg-emerald-600' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { slug: urlSlug } = useParams() as { slug: string };
  const [listing, setListing] = useState<Listing | null>(null);
  const [listingType, setListingType] = useState<'afterschool' | 'club' | 'caterer' | 'professional' | 'kindergarten' | null>(null);
  const [microsite, setMicrosite] = useState<Microsite | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('listare');
  const [catererTarget, setCatererTarget] = useState<'afterschool' | 'kindergarten'>('afterschool');

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Microsite editor state
  const [msForm, setMsForm] = useState<Record<string, unknown>>({});
  const [msSaving, setMsSaving] = useState(false);
  const [msSaved, setMsSaved] = useState(false);

  // Stats + contacts
  const [stats, setStats] = useState<any>(null);
  const [contacts, setContacts] = useState<{ leads: any[]; bookings: any[] } | null>(null);

  useEffect(() => {
    fetch('/api/user/me').then(r => r.json()).then(d => {
      if (!d.authenticated) { router.push('/login'); return; }
      fetch('/api/user/my-listing').then(r => r.json()).then(data => {
        if (!data.listing) { router.push('/login'); return; }
        setListing(data.listing);
        setListingType(data.type);
        setForm(data.listing);
        setLoading(false);
      });
      fetch('/api/user/microsite').then(r => r.json()).then(d2 => {
        if (d2.microsite) { setMicrosite(d2.microsite); setMsForm(d2.microsite); }
      });
    });
  }, [router]);

  useEffect(() => {
    if (!urlSlug || !listing) return;
    const expected = toSimpleSlug(listing.name);
    if (urlSlug !== expected) router.replace('/dashboard/' + expected);
  }, [urlSlug, listing, router]);

  const loadStats = useCallback(() => {
    fetch('/api/user/stats').then(r => r.json()).then(setStats);
  }, []);
  const loadContacts = useCallback(() => {
    fetch('/api/user/contacts').then(r => r.json()).then(setContacts);
  }, []);

  useEffect(() => { if (tab === 'statistici' && !stats) loadStats(); }, [tab, stats, loadStats]);
  useEffect(() => { if (tab === 'contacte' && !contacts) loadContacts(); }, [tab, contacts, loadContacts]);

  const save = async () => {
    if (!listing || !listingType) return;
    setSaving(true);
    const changes: Record<string, unknown> = {};
    Object.keys(form).forEach(k => {
      if ((form as any)[k] !== (listing as any)[k]) changes[k] = (form as any)[k];
    });
    const res = await fetch('/api/user/my-listing', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: listingType, listing_id: listing.id, changes }),
    });
    const data = await res.json();
    setSaving(false); setSaved(true); setEditing(false);
    if (data.live) setListing({ ...listing, ...(changes as any) });
    setTimeout(() => setSaved(false), 3000);
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !listing || !listingType) return;
    setUploadingPhoto(true);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/user/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploadingPhoto(false);
    if (data.url) {
      const photos = parsePhotos(listing.photo_urls);
      const newPhotos = JSON.stringify([...photos, data.url]);
      const patchRes = await fetch('/api/user/my-listing', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_type: listingType, listing_id: listing.id, changes: { photo_urls: newPhotos } }),
      });
      const patchData = await patchRes.json();
      if (patchData.live) {
        setListing({ ...listing, photo_urls: newPhotos });
        setForm(f => ({ ...f, photo_urls: newPhotos }));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const removePhoto = async (url: string) => {
    if (!listing || !listingType) return;
    const photos = parsePhotos(listing.photo_urls).filter(p => p !== url);
    const newPhotos = photos.length ? JSON.stringify(photos) : null;
    const res = await fetch('/api/user/my-listing', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: listingType, listing_id: listing.id, changes: { photo_urls: newPhotos } }),
    });
    const data = await res.json();
    if (data.live) {
      setListing({ ...listing, photo_urls: newPhotos });
      setForm(f => ({ ...f, photo_urls: newPhotos }));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !listing || !listingType) return;
    setUploadingLogo(true);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/user/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploadingLogo(false);
    if (data.url) {
      const patchRes = await fetch('/api/user/my-listing', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_type: listingType, listing_id: listing.id, changes: { logo_url: data.url } }),
      });
      const patchData = await patchRes.json();
      if (patchData.live) {
        setListing({ ...listing, logo_url: data.url });
        setForm(f => ({ ...f, logo_url: data.url }));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const removeLogo = async () => {
    if (!listing || !listingType) return;
    const res = await fetch('/api/user/my-listing', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: listingType, listing_id: listing.id, changes: { logo_url: null } }),
    });
    const data = await res.json();
    if (data.live) {
      setListing({ ...listing, logo_url: null });
      setForm(f => ({ ...f, logo_url: null }));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const saveMicrosite = async () => {
    if (!microsite) return;
    setMsSaving(true);
    const changes: Record<string, unknown> = {};
    ['theme_color', 'tagline', 'about_long', 'instagram_url', 'tiktok_url', 'youtube_url', 'whatsapp', 'booking_enabled', 'booking_label'].forEach(k => {
      if ((msForm as any)[k] !== (microsite as any)[k]) changes[k] = (msForm as any)[k];
    });
    await fetch('/api/user/microsite', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    setMsSaving(false); setMsSaved(true);
    setMicrosite({ ...microsite, ...(changes as any) });
    setTimeout(() => setMsSaved(false), 3000);
  };

  const logout = async () => {
    await fetch('/api/user/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!listing) return null;

  const photos = parsePhotos(listing.photo_urls);
  const tabs: { key: Tab; label: string }[] = [
    { key: 'listare', label: 'Listare' },
    { key: 'site', label: 'Site-ul meu' },
    { key: 'statistici', label: 'Statistici' },
    { key: 'contacte', label: 'Contacte' },
    ...(microsite?.outreach_enabled === 1 ? [{ key: 'outreach' as Tab, label: listingType === 'professional' ? 'Abordează parteneri' : listingType === 'afterschool' ? 'Găsește colaboratori' : listingType === 'caterer' ? 'Abordează parteneri' : 'Outreach' }] : []),
    ...((listingType === 'afterschool' || listingType === 'kindergarten') ? [{ key: 'colaboratori' as Tab, label: 'Colaboratori' }] : []),
    ...((listingType === 'afterschool' || listingType === 'professional' || listingType === 'kindergarten') ? [{ key: 'colaborari' as Tab, label: 'Colaborări' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="bg-[var(--color-card)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-primary)] font-bold text-lg">ActivKids</span>
          {listing.is_premium === 1 && (
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Premium</span>
          )}
        </div>
        <button onClick={logout} className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text)] transition-colors">Deconectare</button>
      </div>

      {/* Tab bar */}
      <div className="bg-[var(--color-card)] border-b border-[var(--color-border)] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-2 flex overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{listing.name}</h1>
          <p className="text-sm text-[var(--color-text-light)] mt-0.5">
            {listingType === 'afterschool' ? 'After School' : listingType === 'caterer' ? 'Catering' : listingType === 'professional' ? 'Colaborator' : listingType === 'kindergarten' ? 'Gradinita / Cresa' : 'Club / Activitate'}
          </p>
        </div>

        {/* ===== TAB: LISTARE ===== */}
        {tab === 'listare' && (
          <>
            {saved && (
              <div className="bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
                {microsite ? 'Modificările au fost salvate.' : 'Modificările au fost trimise spre aprobare. Le vei vedea în 1-2 zile lucrătoare.'}
              </div>
            )}

            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[var(--color-text)]">Informații generale</h2>
                {!editing && <button onClick={() => setEditing(true)} className="text-sm text-[var(--color-primary)] font-medium hover:underline">Editează</button>}
              </div>
              {editing ? (
                <div className="space-y-3">
                  <Field label="Adresa" value={(form.address as string) || ''} onChange={v => setForm(f => ({ ...f, address: v }))} />
                  <Field label="Telefon" value={(form.phone as string) || ''} onChange={v => setForm(f => ({ ...f, phone: v }))} />
                  <Field label="Email" value={(form.email as string) || ''} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
                  <Field label="Website" value={(form.website as string) || ''} onChange={v => setForm(f => ({ ...f, website: v }))} />
                  <Field label="Facebook" value={(form.facebook_url as string) || ''} onChange={v => setForm(f => ({ ...f, facebook_url: v }))} />
                  <Field label="Link recenzii Google" value={(form.reviews_url as string) || ''} onChange={v => setForm(f => ({ ...f, reviews_url: v }))} />
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-light)] mb-1">Descriere</label>
                    <textarea value={(form.description as string) || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                  </div>
                </div>
              ) : (
                <dl className="space-y-2">
                  <InfoRow label="Adresa" value={listing.address} />
                  <InfoRow label="Telefon" value={listing.phone} />
                  <InfoRow label="Email" value={listing.email} />
                  <InfoRow label="Website" value={listing.website} />
                  <InfoRow label="Facebook" value={listing.facebook_url} />
                  {listing.description && (
                    <div><dt className="text-xs text-[var(--color-text-light)]">Descriere</dt><dd className="text-sm mt-0.5">{listing.description}</dd></div>
                  )}
                </dl>
              )}
            </div>

            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
              <h2 className="font-semibold text-[var(--color-text)]">Program & Prețuri</h2>
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Preț minim (lei/lună)" value={(form.price_min as number)?.toString() || ''} onChange={v => setForm(f => ({ ...f, price_min: v ? Number(v) : null }))} type="number" />
                    <Field label="Preț maxim (lei/lună)" value={(form.price_max as number)?.toString() || ''} onChange={v => setForm(f => ({ ...f, price_max: v ? Number(v) : null }))} type="number" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Vârsta minimă" value={(form.age_min as number)?.toString() || ''} onChange={v => setForm(f => ({ ...f, age_min: v ? Number(v) : null }))} type="number" />
                    <Field label="Vârsta maximă" value={(form.age_max as number)?.toString() || ''} onChange={v => setForm(f => ({ ...f, age_max: v ? Number(v) : null }))} type="number" />
                  </div>
                  <Field label="Ora preluare" value={(form.pickup_time as string) || ''} onChange={v => setForm(f => ({ ...f, pickup_time: v }))} placeholder="ex: 13:00" />
                  <Field label="Program până la" value={(form.end_time as string) || ''} onChange={v => setForm(f => ({ ...f, end_time: v }))} placeholder="ex: 18:00" />
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-light)] mb-1">Program (zile)</label>
                    <textarea value={(form.schedule as string) || ''} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} rows={2} placeholder="ex: Luni-Vineri 08:00-18:00"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                  </div>
                </div>
              ) : (
                <dl className="space-y-2">
                  {(listing.price_min !== null || listing.price_max !== null) && (
                    <InfoRow label="Preț" value={listing.price_min === listing.price_max ? `${listing.price_min} lei/lună` : `${listing.price_min || '?'} - ${listing.price_max || '?'} lei/lună`} />
                  )}
                  <InfoRow label="Vârsta" value={listing.age_min !== null ? `${listing.age_min} - ${listing.age_max} ani` : null} />
                  <InfoRow label="Preluare" value={listing.pickup_time} />
                  <InfoRow label="Program până la" value={listing.end_time} />
                  <InfoRow label="Program" value={listing.schedule} />
                </dl>
              )}
            </div>

            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
              <h2 className="font-semibold text-[var(--color-text)]">Fotografii</h2>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((url: string, i: number) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(url)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80">×</button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploadingPhoto} />
                <span className="text-sm px-4 py-2 border-2 border-dashed border-[var(--color-border)] rounded-xl text-[var(--color-text-light)] hover:border-[var(--color-primary)] transition-colors">
                  {uploadingPhoto ? 'Se încarcă...' : '+ Adaugă fotografie'}
                </span>
              </label>
            </div>

            {listing.is_premium === 1 && (
              <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
                <h2 className="font-semibold text-[var(--color-text)]">Logo</h2>
                <div className="flex items-center gap-3">
                  {listing.logo_url && (
                    <img src={listing.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-lg border border-[var(--color-border)] bg-white" />
                  )}
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} disabled={uploadingLogo} />
                      <span className="text-sm px-4 py-2 border-2 border-dashed border-[var(--color-border)] rounded-xl text-[var(--color-text-light)] hover:border-[var(--color-primary)] transition-colors inline-block">
                        {uploadingLogo ? 'Se încarcă...' : (listing.logo_url ? 'Schimbă logo' : '+ Adaugă logo')}
                      </span>
                    </label>
                    {listing.logo_url && (
                      <button onClick={removeLogo} className="text-xs text-gray-400 hover:text-red-500">✕ Șterge</button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {editing && (
              <div className="flex gap-3">
                <button onClick={save} disabled={saving} className="flex-1 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                  {saving ? 'Se salvează...' : microsite ? 'Salvează' : 'Trimite spre aprobare'}
                </button>
                <button onClick={() => { setEditing(false); setForm(listing as any); }} className="px-6 py-3 border border-[var(--color-border)] rounded-xl text-sm hover:bg-[var(--color-bg)] transition-colors">Anulează</button>
              </div>
            )}
          </>
        )}

        {/* ===== TAB: SITE ===== */}
        {tab === 'site' && (
          <>
            {!microsite ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <h3 className="font-semibold text-amber-800 mb-1">Nu ai încă un site de prezentare</h3>
                <p className="text-sm text-amber-700">Contactează-ne pentru a activa pachetul de site de prezentare la adresa <strong>nume.activkids.ro</strong>.</p>
                <a href="/promovare" className="inline-block mt-3 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-xl transition-colors">Află mai multe →</a>
              </div>
            ) : (
              <>
                {msSaved && <div className="bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">Site-ul a fost actualizat.</div>}
                <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 space-y-1">
                  <p className="text-xs text-[var(--color-text-light)]">Adresa site-ului tău</p>
                  <a href={`https://${microsite.subdomain}.activkids.ro`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] font-semibold hover:underline break-all">
                    {microsite.subdomain}.activkids.ro →
                  </a>
                </div>

                <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 space-y-4">
                  <h2 className="font-semibold text-[var(--color-text)]">Aspect & conținut</h2>
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-light)] mb-1.5">Culoare temă</label>
                    <div className="flex flex-wrap gap-2">
                      {THEME_OPTIONS.map(t => (
                        <button key={t.key} onClick={() => setMsForm(f => ({ ...f, theme_color: t.key }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${msForm.theme_color === t.key ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30' : 'border-[var(--color-border)]'}`}>
                          <span className={`w-4 h-4 rounded-full ${t.sw}`} />{t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field label="Slogan (subtitlu)" value={(msForm.tagline as string) || ''} onChange={v => setMsForm(f => ({ ...f, tagline: v }))} placeholder="ex: Afterschool și grădiniță în Pipera" />
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-light)] mb-1">Despre noi (text lung, acceptă HTML)</label>
                    <textarea value={(msForm.about_long as string) || ''} onChange={e => setMsForm(f => ({ ...f, about_long: e.target.value }))} rows={6}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                  </div>
                </div>

                <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
                  <h2 className="font-semibold text-[var(--color-text)]">Rețele sociale</h2>
                  <Field label="Instagram" value={(msForm.instagram_url as string) || ''} onChange={v => setMsForm(f => ({ ...f, instagram_url: v }))} placeholder="https://instagram.com/..." />
                  <Field label="TikTok" value={(msForm.tiktok_url as string) || ''} onChange={v => setMsForm(f => ({ ...f, tiktok_url: v }))} placeholder="https://tiktok.com/@..." />
                  <Field label="YouTube" value={(msForm.youtube_url as string) || ''} onChange={v => setMsForm(f => ({ ...f, youtube_url: v }))} placeholder="https://youtube.com/@..." />
                  <Field label="WhatsApp (număr)" value={(msForm.whatsapp as string) || ''} onChange={v => setMsForm(f => ({ ...f, whatsapp: v }))} placeholder="ex: 0722000000" />
                </div>

                <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
                  <h2 className="font-semibold text-[var(--color-text)]">Programare</h2>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!msForm.booking_enabled} onChange={e => setMsForm(f => ({ ...f, booking_enabled: e.target.checked ? 1 : 0 }))} />
                    Afișează formularul de programare/probă
                  </label>
                  <Field label="Text buton programare" value={(msForm.booking_label as string) || ''} onChange={v => setMsForm(f => ({ ...f, booking_label: v }))} placeholder="ex: Programează o vizionare" />
                </div>

                <button onClick={saveMicrosite} disabled={msSaving} className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                  {msSaving ? 'Se salvează...' : 'Salvează site-ul'}
                </button>
                <p className="text-xs text-center text-[var(--color-text-light)]">Modificările apar instant pe site-ul tău.</p>
              </>
            )}
          </>
        )}

        {/* ===== TAB: STATISTICI ===== */}
        {tab === 'statistici' && (
          <>
            {!stats ? (
              <div className="py-10 text-center text-[var(--color-text-light)]">Se încarcă...</div>
            ) : !stats.builtin ? (
              <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 text-sm text-[var(--color-text-light)]">
                Statisticile vor apărea după ce site-ul tău primește vizite.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Azi" value={stats.builtin.today} />
                  <StatCard label="7 zile" value={stats.builtin.last7} />
                  <StatCard label="30 zile" value={stats.builtin.last30} />
                  <StatCard label="Total" value={stats.builtin.total} />
                </div>

                {stats.builtin.sources?.length > 0 && (
                  <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5">
                    <h2 className="font-semibold text-[var(--color-text)] mb-3">Surse de trafic (30 zile)</h2>
                    <div className="space-y-1.5">
                      {stats.builtin.sources.map((s: any) => (
                        <div key={s.source} className="flex justify-between text-sm"><span className="capitalize text-[var(--color-text-light)]">{s.source}</span><span className="font-medium">{s.n}</span></div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.ga && (
                  <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
                    <h2 className="font-semibold text-[var(--color-text)]">Detalii avansate (Google Analytics, 30 zile)</h2>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div><p className="text-xl font-bold">{stats.ga.sessions}</p><p className="text-xs text-[var(--color-text-light)]">Sesiuni</p></div>
                      <div><p className="text-xl font-bold">{stats.ga.users}</p><p className="text-xs text-[var(--color-text-light)]">Vizitatori</p></div>
                      <div><p className="text-xl font-bold">{Math.round(stats.ga.avgDuration)}s</p><p className="text-xs text-[var(--color-text-light)]">Durată medie</p></div>
                    </div>
                    {stats.ga.cities?.length > 0 && (
                      <div className="pt-2 border-t border-[var(--color-border)]">
                        <p className="text-xs text-[var(--color-text-light)] mb-1.5">Orașe</p>
                        {stats.ga.cities.map((c: any) => (
                          <div key={c.city} className="flex justify-between text-sm"><span>{c.city}</span><span className="font-medium">{c.users}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== TAB: CONTACTE ===== */}
        {tab === 'contacte' && (
          <>
            {!contacts ? (
              <div className="py-10 text-center text-[var(--color-text-light)]">Se încarcă...</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--color-text-light)]">
                    {contacts.leads.length + contacts.bookings.length} contacte
                  </p>
                  {(contacts.leads.length + contacts.bookings.length) > 0 && (
                    <a href="/api/user/contacts?format=csv" className="text-sm font-medium text-[var(--color-primary)] hover:underline">Export CSV ↓</a>
                  )}
                </div>

                {contacts.bookings.length === 0 && contacts.leads.length === 0 && (
                  <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 text-sm text-[var(--color-text-light)] text-center">
                    Încă nu ai primit contacte. Vor apărea aici când cineva completează formularul de pe site-ul tău.
                  </div>
                )}

                {contacts.bookings.map((b: any) => (
                  <div key={'b' + b.id} className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[var(--color-text)]">{b.name}</span>
                      <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">{b.kind === 'trial' ? 'Probă' : 'Vizionare'}</span>
                    </div>
                    <p className="text-sm text-[var(--color-text-light)]">📞 {b.phone}{b.email ? ` · ${b.email}` : ''}</p>
                    {(b.preferred_date || b.preferred_slot) && <p className="text-sm text-[var(--color-text-light)]">📅 {b.preferred_date || ''} {b.preferred_slot || ''}</p>}
                    {b.message && <p className="text-sm mt-1">{b.message}</p>}
                    <p className="text-xs text-[var(--color-text-light)] mt-1">{new Date(b.created_at).toLocaleString('ro-RO')}</p>
                  </div>
                ))}

                {contacts.leads.map((l: any) => (
                  <div key={'l' + l.id} className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[var(--color-text)]">{l.parent_name}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">Mesaj</span>
                    </div>
                    <p className="text-sm text-[var(--color-text-light)]">📞 {l.parent_phone}</p>
                    {l.message && <p className="text-sm mt-1">{l.message}</p>}
                    <p className="text-xs text-[var(--color-text-light)] mt-1">{new Date(l.created_at).toLocaleString('ro-RO')}</p>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'outreach' && microsite?.outreach_enabled === 1 && (
          <>
            {(listingType === 'caterer' || listingType === 'club' || listingType === 'professional') && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setCatererTarget('afterschool')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${catererTarget === 'afterschool' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-[var(--color-card)] border-[var(--color-border)]'}`}
                >
                  Afterschool-uri
                </button>
                <button
                  onClick={() => setCatererTarget('kindergarten')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${catererTarget === 'kindergarten' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-[var(--color-card)] border-[var(--color-border)]'}`}
                >
                  Grădinițe private
                </button>
              </div>
            )}
            <OutreachTab targetType={listingType === 'afterschool' ? 'professional' : (listingType === 'caterer' || listingType === 'club' || listingType === 'professional') ? catererTarget : 'afterschool'} allowRequests={listingType === 'afterschool' || listingType === 'professional'} />
          </>
        )}

        {tab === 'colaboratori' && (listingType === 'afterschool' || listingType === 'kindergarten') && (
          <FindProfessionalsTab listing={listing} listingType={listingType} />
        )}

        {tab === 'colaborari' && (listingType === 'afterschool' || listingType === 'professional' || listingType === 'kindergarten') && (
          <CollaborationsTab />
        )}

        {listing.is_premium !== 1 && tab === 'listare' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-semibold text-amber-800 mb-1">Promovează-te Premium</h3>
            <p className="text-sm text-amber-700 mb-3">
              Apari în primele rezultate, primești insigna Premium și mai mulți părinți te contactează.
              {(listingType === 'afterschool' || listingType === 'kindergarten') && (
                <> Ai și acces la catalogul de colaboratori (logopezi, psihologi, meditatori și alți specialiști pentru copii).</>
              )}
            </p>
            <div className="flex gap-2 flex-wrap items-center">
              <a href={'https://wa.me/40747646543?text=' + encodeURIComponent(`Bună ziua! Aș dori să iau și eu pachetul Premium pentru ${listing.name}.`)}
                target="_blank" rel="noopener noreferrer"
                className="inline-block text-sm font-bold text-white bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl transition-colors">
                Vreau Premium →
              </a>
              <a href="/plata" className="inline-block text-sm font-bold text-amber-800 bg-amber-200 hover:bg-amber-300 px-4 py-2 rounded-xl transition-colors">Plătesc direct</a>
              <a href="/promovare" className="inline-block text-sm font-bold text-amber-700 hover:text-amber-900 px-2 py-2 transition-colors">Află mai multe</a>
            </div>
            <p className="text-xs text-amber-700 mt-2">Se deschide WhatsApp cu mesajul completat, il trimiti tu si iti raspundem in cateva minute.</p>
            <p className="text-xs text-amber-700 mt-1">Nu ai WhatsApp? Suna sau scrie la <a href="tel:0747646543" className="underline font-semibold">0747 646 543</a>.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-text-light)] mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div><dt className="text-xs text-[var(--color-text-light)]">{label}</dt><dd className="text-sm font-medium">{value}</dd></div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 text-center">
      <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
      <p className="text-xs text-[var(--color-text-light)] mt-0.5">{label}</p>
    </div>
  );
}
