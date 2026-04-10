'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserData { id: number; name: string; email: string; is_premium: number; premium_pending: number; }
interface Listing {
  id: number; name: string; address: string; phone: string | null; email: string | null;
  website: string | null; description: string | null; price_min: number | null; price_max: number | null;
  age_min: number | null; age_max: number | null; availability: string;
  photo_urls: string | null; video_urls: string | null; reviews_url: string | null;
  schedule?: string | null; pickup_time?: string | null; end_time?: string | null;
  is_premium: number;
}

const AVAILABILITY_LABELS: Record<string, string> = {
  available: 'Locuri disponibile', full: 'Locuri indisponibile', unknown: 'Necunoscut',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [listingType, setListingType] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [showPayModal, setShowPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payDone, setPayDone] = useState(false);
  const [form, setForm] = useState<Partial<Listing>>({});

  useEffect(() => {
    fetch('/api/user/me').then(r => r.json()).then(data => {
      if (!data.authenticated) { router.push('/login'); return; }
      setUser(data);
    });
    fetch('/api/user/my-listing').then(r => r.json()).then(data => {
      setListing(data.listing || null);
      setListingType(data.type || '');
      if (data.listing) setForm(data.listing);
      setLoading(false);
    });
  }, []);

  const logout = async () => {
    await fetch('/api/user/logout', { method: 'POST' });
    router.push('/');
  };

  const submitEdit = async () => {
    if (!listing) return;
    if (!user || user.is_premium === 0) {
      setShowPayModal(true);
      return;
    }
    setSaving(true);
    await fetch('/api/user/my-listing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: listingType, listing_id: listing.id, changes: form }),
    });
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const getPhotos = (): string[] => form.photo_urls ? JSON.parse(form.photo_urls) : [];
  const getVideos = (): string[] => form.video_urls ? JSON.parse(form.video_urls) : [];

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingPhoto(true);
    const urls: string[] = [...getPhotos()];
    for (const file of files) {
      if (urls.length >= 20) break;
      const fd = new FormData(); fd.append('file', file); fd.append('type', 'photo');
      const res = await fetch('/api/user/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) urls.push(data.url);
    }
    setForm(f => ({ ...f, photo_urls: JSON.stringify(urls) }));
    setUploadingPhoto(false);
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    const photos = getPhotos().filter((_, i) => i !== idx);
    setForm(f => ({ ...f, photo_urls: JSON.stringify(photos) }));
  };

  const uploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    const fd = new FormData(); fd.append('file', file); fd.append('type', 'video');
    const res = await fetch('/api/user/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) {
      const videos = [...getVideos(), data.url].slice(0, 5);
      setForm(f => ({ ...f, video_urls: JSON.stringify(videos) }));
    }
    setUploadingVideo(false);
    e.target.value = '';
  };

  const addYtVideo = () => {
    const url = ytUrl.trim();
    if (!url) return;
    const videos = [...getVideos(), url].slice(0, 5);
    setForm(f => ({ ...f, video_urls: JSON.stringify(videos) }));
    setYtUrl('');
  };

  const removeVideo = (idx: number) => {
    const videos = getVideos().filter((_, i) => i !== idx);
    setForm(f => ({ ...f, video_urls: JSON.stringify(videos) }));
  };

  const downloadReport = () => window.open(`/api/user/report?month=${reportMonth}`, '_blank');

  const sendPaymentRequest = async () => {
    setPayLoading(true);
    await fetch('/api/user/payment-request', { method: 'POST' });
    setPayLoading(false);
    setPayDone(true);
    setUser(u => u ? { ...u, premium_pending: 1 } : u);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="bg-[var(--color-card)] border-b border-[var(--color-border)] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
            {user.is_premium === 1 && (
              <span className="bg-amber-400 text-white px-2 py-0.5 rounded-full text-xs font-bold">★ Premium</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-light)] hidden sm:block">{user.name}</span>
            <button onClick={logout} className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">Iesi</button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {!listing ? (
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
            <p className="text-[var(--color-text-light)] mb-2">Nu ai nicio listare revendicata inca.</p>
            <p className="text-sm text-[var(--color-text-light)]">Cererea ta este in curs de verificare.</p>
          </div>
        ) : (
          <>
            {/* Listing card */}
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
              <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold">{listing.name}</h1>
                  <p className="text-sm text-[var(--color-text-light)]">{listing.address}</p>
                </div>
                {listing.is_premium === 1 && (
                  <span className="bg-amber-400 text-white px-3 py-1 rounded-full text-xs font-bold flex-shrink-0">★ Premium</span>
                )}
              </div>

              {!editing ? (
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {listing.phone && <div><span className="text-[var(--color-text-light)] text-xs">Telefon</span><p>{listing.phone}</p></div>}
                    {listing.email && <div><span className="text-[var(--color-text-light)] text-xs">Email</span><p>{listing.email}</p></div>}
                    {listing.website && <div><span className="text-[var(--color-text-light)] text-xs">Website</span><p className="truncate">{listing.website}</p></div>}
                    {listing.price_min !== null && <div><span className="text-[var(--color-text-light)] text-xs">Pret</span><p>{listing.price_min}-{listing.price_max} lei</p></div>}
                    {listing.age_min !== null && <div><span className="text-[var(--color-text-light)] text-xs">Varsta</span><p>{listing.age_min}-{listing.age_max} ani</p></div>}
                    <div><span className="text-[var(--color-text-light)] text-xs">Locuri</span><p>{AVAILABILITY_LABELS[listing.availability] || listing.availability}</p></div>
                  </div>
                  {listing.description && <p className="text-sm text-[var(--color-text-light)]">{listing.description}</p>}
                  <button onClick={() => setEditing(true)}
                    className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold transition-colors">
                    ✏️ Editeaza informatiile
                  </button>
                </div>
              ) : (
                <div className="p-5 space-y-3">
                  {user.is_premium === 0 && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">★</span>
                      <p className="text-xs text-amber-700">
                        Completează datele, apoi vei fi redirecționat spre activarea <strong>Premium (50 RON/lună)</strong> pentru a publica modificările.
                      </p>
                    </div>
                  )}
                  {user.is_premium === 1 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      Modificarile vor fi verificate de admin inainte de a fi publicate.
                    </p>
                  )}
                  {[
                    { label: 'Telefon', field: 'phone', type: 'tel' },
                    { label: 'Email', field: 'email', type: 'email' },
                    { label: 'Website', field: 'website', type: 'url' },
                    { label: 'Pret minim (lei)', field: 'price_min', type: 'number' },
                    { label: 'Pret maxim (lei)', field: 'price_max', type: 'number' },
                    { label: 'Varsta minima', field: 'age_min', type: 'number' },
                    { label: 'Varsta maxima', field: 'age_max', type: 'number' },
                    { label: 'URL Recenzii', field: 'reviews_url', type: 'url' },
                  ].map(({ label, field, type }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium mb-1">{label}</label>
                      <input type={type} value={(form as any)[field] || ''} onChange={set(field)}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium mb-1">Disponibilitate locuri</label>
                    <select value={form.availability || 'unknown'} onChange={set('availability')}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none">
                      <option value="available">Locuri disponibile</option>
                      <option value="full">Locuri indisponibile</option>
                      <option value="unknown">Necunoscut</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Descriere</label>
                    <textarea value={form.description || ''} onChange={set('description')} rows={4}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none" />
                  </div>

                  {/* Poze */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium">Poze ({getPhotos().length}/20)</label>
                      <label className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${uploadingPhoto ? 'bg-gray-200 text-gray-400' : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]'}`}>
                        {uploadingPhoto ? 'Se incarca...' : '+ Adauga poze'}
                        <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingPhoto || getPhotos().length >= 20} onChange={uploadPhoto} />
                      </label>
                    </div>
                    {getPhotos().length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {getPhotos().map((url, i) => (
                          <div key={i} className="relative group">
                            <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-[var(--color-border)]" />
                            <button onClick={() => removePhoto(i)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {getPhotos().length === 0 && <p className="text-xs text-[var(--color-text-light)]">Nicio poza adaugata inca.</p>}
                  </div>

                  {/* Videoclipuri */}
                  <div>
                    <label className="text-xs font-medium block mb-2">Videoclipuri ({getVideos().length}/5)</label>
                    {getVideos().length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {getVideos().map((url, i) => (
                          <div key={i} className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2">
                            <span className="text-xs truncate flex-1">{url.includes('youtube') || url.includes('youtu.be') ? '▶ YouTube: ' : '🎬 '}{url}</span>
                            <button onClick={() => removeVideo(i)} className="text-red-500 text-sm font-bold flex-shrink-0">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {getVideos().length < 5 && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="Link YouTube (https://youtube.com/...)"
                            className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                          <button onClick={addYtVideo} disabled={!ytUrl.trim()}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40">
                            ▶ Adauga
                          </button>
                        </div>
                        <label className={`flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-[var(--color-border)] rounded-xl text-sm cursor-pointer hover:border-[var(--color-primary)] transition-colors ${uploadingVideo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          {uploadingVideo ? 'Se incarca...' : '📱 Upload video de pe telefon / PC'}
                          <input type="file" accept="video/*" className="hidden" disabled={uploadingVideo} onChange={uploadVideo} />
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={submitEdit} disabled={saving}
                      className="flex-1 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                      {saving ? 'Se trimite...' : 'Trimite spre aprobare'}
                    </button>
                    <button onClick={() => { setEditing(false); setForm(listing); }}
                      className="px-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm">
                      Anuleaza
                    </button>
                  </div>
                </div>
              )}
            </div>

            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                ✅ Modificarile au fost trimise spre aprobare. Le vei vedea publicate dupa verificare.
              </div>
            )}

            {/* Raport premium */}
            {user.is_premium === 1 && (
              <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5">
                <h2 className="font-bold mb-3">📊 Raport clickuri</h2>
                <div className="flex gap-3">
                  <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
                    className="px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-white text-gray-900 focus:outline-none" />
                  <button onClick={downloadReport}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors">
                    ⬇️ Descarca raport
                  </button>
                </div>
              </div>
            )}

            {/* Sectiune Premium */}
            {user.is_premium === 0 && (
              <div className="rounded-2xl overflow-hidden border border-amber-300 shadow-sm">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-0.5">Listare Premium</p>
                      <h2 className="text-xl font-bold">Devino Premium ★</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">50 RON</p>
                      <p className="text-xs opacity-80">pe lună</p>
                    </div>
                  </div>
                </div>

                {/* Beneficii */}
                <div className="bg-white px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ce primești</p>
                  <ul className="space-y-2.5 mb-5">
                    {[
                      { icon: '✏️', text: 'Editare și actualizare informații oricând', highlight: true },
                      { icon: '📸', text: 'Până la 20 de poze în caruselul listării' },
                      { icon: '🎬', text: 'Până la 5 videoclipuri (YouTube sau upload direct)' },
                      { icon: '📊', text: 'Raport lunar de clickuri și statistici' },
                      { icon: '⭐', text: 'Badge Premium vizibil pe card și pagina listării' },
                      { icon: '🔝', text: 'Vizibilitate prioritară față de listările gratuite' },
                    ].map(({ icon, text, highlight }) => (
                      <li key={text} className="flex items-start gap-2.5">
                        <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
                        <span className={`text-sm ${highlight ? 'font-semibold text-amber-700' : 'text-gray-700'}`}>{text}</span>
                      </li>
                    ))}
                  </ul>

                  {user.premium_pending === 1 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                      <span>⏳</span>
                      <span>Cererea ta a fost trimisă. Vei fi activat după ce confirmăm plata (de obicei în câteva ore).</span>
                    </div>
                  ) : (
                    <button onClick={() => setShowPayModal(true)}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm">
                      Activează Premium — 50 RON/lună
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal plata */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-card)] rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold mb-1">Abonament Premium necesar</h2>
            <p className="text-sm text-[var(--color-text-light)] mb-2">Ca să poți edita și actualiza informațiile listării tale, ai nevoie de un abonament Premium.</p>
            <p className="text-sm font-semibold text-amber-600 mb-5">50 RON / lună · activare în câteva ore</p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 space-y-3">
              <p className="text-sm font-semibold text-amber-800">Cum funcționează:</p>
              <ol className="text-sm text-amber-700 space-y-1.5 list-decimal list-inside">
                <li>Trimite <strong>50 RON</strong> pe Revolut la <strong>@bogdanmxn</strong></li>
                <li>Adaugă mesajul: <strong>Premium {user?.name}</strong></li>
                <li>Apasă "Am plătit" mai jos — te activăm în câteva ore</li>
              </ol>
            </div>

            <a
              href="https://revolut.me/bogdanmxn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#191C1F] hover:bg-black text-white rounded-xl text-sm font-semibold mb-3 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M14.04 0H3v24h4.5V14.5h5.1l4.9 9.5H22l-5.1-9.8C19.5 13 21 10.8 21 8c0-4.4-3.1-8-6.96-8zm.46 10.5H7.5V4h6.5c1.9 0 3 1.2 3 3.2s-1 3.3-2.5 3.3z"/></svg>
              Deschide Revolut
            </a>

            {payDone ? (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 text-center">
                ✅ Mulțumim! Vei fi activat Premium în câteva ore.
              </div>
            ) : (
              <button onClick={sendPaymentRequest} disabled={payLoading}
                className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                {payLoading ? 'Se trimite...' : '✓ Am plătit pe Revolut'}
              </button>
            )}

            <button onClick={() => setShowPayModal(false)}
              className="w-full mt-2 py-2 text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">
              Închide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
