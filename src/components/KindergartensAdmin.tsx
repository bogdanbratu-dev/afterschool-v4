'use client';

import { useState, useEffect, useCallback } from 'react';

interface Kindergarten {
  id: number;
  name: string;
  type: 'gradinita' | 'cresa';
  address: string;
  sector: number | null;
  lat: number;
  lng: number;
  program: string | null;
  age_min: number | null;
  age_max: number | null;
  activities: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook_url: string | null;
  price_min: number | null;
  price_max: number | null;
  description: string | null;
  editorial_summary: string | null;
  photo_urls: string | null;
  video_urls: string | null;
  reviews_url: string | null;
  banner_url: string | null;
  availability: string;
  is_premium: number;
  premium_expires_at: string | null;
  leads_enabled: number | null;
  is_featured: number;
  contacts_hidden: number;
}

type FormState = Partial<Kindergarten>;

const EMPTY: FormState = {
  name: '', type: 'gradinita', address: '', sector: 1, lat: 0, lng: 0, program: '', age_min: 3, age_max: 6, activities: '',
  phone: '', email: '', website: '', facebook_url: '',
  price_min: null, price_max: null, description: '', editorial_summary: '',
  photo_urls: null, video_urls: null, reviews_url: '', banner_url: null,
  availability: 'unknown', is_premium: 0, premium_expires_at: null, is_featured: 0, contacts_hidden: 0,
};

export default function KindergartensAdmin() {
  const [kindergartens, setKindergartens] = useState<Kindergarten[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Kindergarten | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [msResult, setMsResult] = useState<{ microsite_url: string; magic_link: string } | null>(null);
  const [editMicrosite, setEditMicrosite] = useState<{ id: number; outreach_enabled: number; resend_api_key: string; outreach_from_email: string } | null>(null);
  const [msCreating, setMsCreating] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/kindergartens');
    if (res.ok) setKindergartens(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = async (c: Kindergarten) => {
    setEditing(c); setForm({ ...c });
    try {
      const mr = await fetch(`/api/admin/microsites?listing_type=kindergarten&listing_id=${c.id}`);
      const md = await mr.json();
      if (md && md.id) setEditMicrosite({ id: md.id, outreach_enabled: md.outreach_enabled ?? 0, resend_api_key: md.resend_api_key ?? '', outreach_from_email: md.outreach_from_email ?? '' });
      else setEditMicrosite(null);
    } catch { setEditMicrosite(null); }
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `/api/admin/kindergartens/${editing.id}` : '/api/admin/kindergartens';
    const method = editing ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) {
      if (editMicrosite?.id) {
        await fetch(`/api/admin/microsites/${editMicrosite.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outreach_enabled: editMicrosite.outreach_enabled, resend_api_key: editMicrosite.resend_api_key, outreach_from_email: editMicrosite.outreach_from_email }),
        });
      }
      setShowForm(false); setEditMicrosite(null); load();
    } else alert('Eroare la salvare');
  };

  const remove = async (id: number) => {
    if (!confirm('Stergi aceasta gradinita?')) return;
    await fetch(`/api/admin/kindergartens/${id}`, { method: 'DELETE' });
    load();
  };

  const togglePremium = async (c: Kindergarten) => {
    if (!c.is_premium && c.sector != null) {
      const satRes = await fetch('/api/admin/saturation');
      const satData = await satRes.json();
      const row = (satData.rows || []).find((r: any) => r.table === 'kindergartens' && r.sector === c.sector);
      if (row && row.untilHalf <= 1 && row.total >= 4) {
        const newPremium = row.premium + 1;
        const pct = Math.round(newPremium / row.total * 100);
        const msg = row.untilHalf <= 0
          ? `Atentie: Sector ${c.sector} este deja la ${row.premium} din ${row.total} gradinite premium (${pct}%). Zona e deja depasita.\n\nContinui totusi?`
          : `Atentie: aceasta vanzare va pune Sector ${c.sector} la ${newPremium} din ${row.total} gradinite premium (${pct}%), depasind pragul.\n\nContinui totusi?`;
        if (!window.confirm(msg)) return;
      }
    }
    await fetch(`/api/admin/kindergartens/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, is_premium: c.is_premium ? 0 : 1 }) });
    load();
  }
  const toggleFeatured = async (c: Kindergarten) => {
    await fetch(`/api/admin/kindergartens/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, is_featured: c.is_featured ? 0 : 1 }) });
    load();
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload-banner', { method: 'POST', body: fd });
    setUploading(false);
    if (res.ok) return (await res.json()).url;
    alert('Eroare la incarcare imagine');
    return null;
  };

  const photos: string[] = form.photo_urls ? JSON.parse(form.photo_urls) : [];

  const filtered = kindergartens.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.address.toLowerCase().includes(search.toLowerCase()) ||
    (c.address || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)));
  };
  const bulkSetContactsHidden = async (hidden: boolean) => {
    setBulkLoading(true);
    await fetch('/api/admin/kindergartens', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selectedIds], contacts_hidden: hidden }) });
    setSelectedIds(new Set());
    await load();
    setBulkLoading(false);
  };

  const inputCls = 'w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text-main)]';

  const quickCreateMicrosite = async (id: number) => {
    setMsCreating(id);
    const res = await fetch('/api/admin/microsites/quick-create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: 'kindergarten', listing_id: id }),
    });
    const data = await res.json();
    setMsCreating(null);
    if (res.ok) setMsResult(data);
    else alert(data.error || 'Eroare la creare microsite');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-[var(--color-text-main)]">
          🧸 Grădinițe <span className="text-sm font-normal text-[var(--color-text-light)]">({filtered.length}{search ? ` din ${kindergartens.length}` : ''})</span>
        </h2>
        <div className="flex gap-3">
          <input type="search" placeholder="Caută..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)] text-[var(--color-text-main)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          <button onClick={openAdd} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">+ Adaugă</button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg">
          <span className="text-sm font-semibold text-purple-800">{selectedIds.size} selectate</span>
          <button onClick={() => bulkSetContactsHidden(true)} disabled={bulkLoading} className="text-xs px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50">
            🔒 Ascunde contact (selectate)
          </button>
          <button onClick={() => bulkSetContactsHidden(false)} disabled={bulkLoading} className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50">
            ✓ Arata contact (selectate)
          </button>
        </div>
      )}

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg)] text-[var(--color-text-light)]">
            <tr>
              <th className="px-4 py-3 text-left"><input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={selectAll} /></th>
              <th className="px-4 py-3 text-left">Nume</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Tip</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Contact</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-light)]">Nicio grădiniță. Apasa „+ Adauga".</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="text-[var(--color-text-main)] hover:bg-[var(--color-bg)]">
                <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                <td className="px-4 py-3">
                  <a href={`/gradinite/${c.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${c.id}`} target="_blank" rel="noopener" className="font-medium hover:text-teal-600">{c.name}</a>
                  <div className="text-xs text-[var(--color-text-light)]">{c.address}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-[var(--color-text-light)]">{c.type === 'cresa' ? 'Cresa' : 'Gradinita'}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-xs text-[var(--color-text-light)]">{c.phone || c.email || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => togglePremium(c)} title="Premium" className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.is_premium ? 'bg-amber-400 text-white' : 'bg-[var(--color-bg)] text-[var(--color-text-light)] border border-[var(--color-border)]'}`}>★</button>
                    {c.is_premium === 1 && (c as any).premium_expires_at && (() => {
                      const days = Math.ceil((new Date((c as any).premium_expires_at).getTime() - Date.now()) / 86400000);
                      return <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${days < 0 ? 'bg-red-100 text-red-700' : days <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{days < 0 ? `exp.-${Math.abs(days)}z` : `${days}z`}</span>;
                    })()}
                    <button onClick={() => toggleFeatured(c)} title="Recomandat" className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.is_featured ? 'bg-emerald-500 text-white' : 'bg-[var(--color-bg)] text-[var(--color-text-light)] border border-[var(--color-border)]'}`}>✦</button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(c)} className="text-[var(--color-primary)] hover:underline mr-3">Editează</button>
                  <button onClick={() => quickCreateMicrosite(c.id)} disabled={msCreating === c.id}
                    title="Creează / actualizează microsite"
                    className="text-teal-600 hover:text-teal-700 mr-3 disabled:opacity-50">
                    {msCreating === c.id ? '...' : '🌐 Microsite'}
                  </button>
                  <button onClick={() => remove(c.id)} className="text-[var(--color-danger)] hover:underline">Șterge</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-[var(--color-card)] rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4 text-[var(--color-text-main)]">{editing ? 'Editează grădinița' : 'Adaugă grădiniță'}</h3>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Nume *</label>
                  <input required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Adresa *</label>
                  <input required value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tip *</label>
                  <select value={form.type || 'gradinita'} onChange={e => setForm({ ...form, type: e.target.value as 'gradinita' | 'cresa' })} className={inputCls}>
                    <option value="gradinita">Grădiniță</option>
                    <option value="cresa">Creșă</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Program (ex: 8:00-18:00)</label>
                  <input value={form.program || ''} onChange={e => setForm({ ...form, program: e.target.value })} placeholder="8:00-18:00" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Vârstă min</label>
                    <input type="number" value={form.age_min ?? ''} onChange={e => setForm({ ...form, age_min: e.target.value ? parseInt(e.target.value) : null })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Vârstă max</label>
                    <input type="number" value={form.age_max ?? ''} onChange={e => setForm({ ...form, age_max: e.target.value ? parseInt(e.target.value) : null })} className={inputCls} />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Activități (separate prin virgulă)</label>
                  <input value={form.activities || ''} onChange={e => setForm({ ...form, activities: e.target.value })} placeholder="Engleza, Pictura, Muzica, Dans" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sector (sediu)</label>
                  <select value={form.sector ?? 1} onChange={e => setForm({ ...form, sector: parseInt(e.target.value) })} className={inputCls}>
                    {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Sector {s}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Lat</label>
                    <input type="number" step="0.0001" value={form.lat ?? 0} onChange={e => setForm({ ...form, lat: parseFloat(e.target.value) })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Lng</label>
                    <input type="number" step="0.0001" value={form.lng ?? 0} onChange={e => setForm({ ...form, lng: parseFloat(e.target.value) })} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefon</label>
                  <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Website</label>
                  <input value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Facebook URL</label>
                  <input value={form.facebook_url || ''} onChange={e => setForm({ ...form, facebook_url: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pret minim (lei/luna)</label>
                  <input type="number" value={form.price_min ?? ''} onChange={e => setForm({ ...form, price_min: e.target.value ? parseInt(e.target.value) : null })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pret maxim (lei/luna)</label>
                  <input type="number" value={form.price_max ?? ''} onChange={e => setForm({ ...form, price_max: e.target.value ? parseInt(e.target.value) : null })} className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Descriere</label>
                  <textarea rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls + ' resize-none'} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Banner (header pagina)</label>
                  {form.banner_url && (
                    <div className="relative mb-2">
                      <img src={form.banner_url} alt="Banner" className="w-full h-28 object-cover rounded-lg border border-[var(--color-border)]" />
                      <button type="button" onClick={() => setForm(f => ({ ...f, banner_url: null }))} className="absolute top-1 right-1 bg-white/80 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow">✕</button>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const url = await uploadImage(f); if (url) setForm(s => ({ ...s, banner_url: url })); } e.target.value = ''; }}
                    className="w-full text-sm text-[var(--color-text-light)] file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-lg file:bg-[var(--color-primary)] file:text-white file:text-sm file:cursor-pointer" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Poze galerie (max 5)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {photos.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt={`Foto ${i+1}`} className="w-20 h-16 object-cover rounded border border-[var(--color-border)]" />
                        <button type="button" onClick={() => { const arr = photos.filter((_, j) => j !== i); setForm(f => ({ ...f, photo_urls: arr.length ? JSON.stringify(arr) : null })); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">✕</button>
                      </div>
                    ))}
                  </div>
                  {photos.length < 5 && (
                    <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const url = await uploadImage(f); if (url) setForm(s => ({ ...s, photo_urls: JSON.stringify([...photos, url]) })); } e.target.value = ''; }}
                      className="w-full text-sm text-[var(--color-text-light)] file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-lg file:bg-teal-600 file:text-white file:text-sm file:cursor-pointer" />
                  )}
                  {uploading && <p className="text-xs text-[var(--color-text-light)] mt-1">Se încarcă...</p>}
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_premium} onChange={e => setForm({ ...form, is_premium: e.target.checked ? 1 : 0 } as any)} /> Premium ★</label>
              {!!form.is_premium && (
                <div className="ml-6 mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-[var(--color-text-light)] text-xs">Expiră la:</span>
                  <input
                    type="date"
                    value={(form as any).premium_expires_at || ''}
                    onChange={e => setForm({ ...form, premium_expires_at: e.target.value } as any)}
                    className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5 text-[var(--color-text-main)] text-xs"
                  />
                  {([['1L',1],['3L',3],['6L',6],['1A',12]] as [string,number][]).map(([lbl, mo]) => (
                    <button key={lbl} type="button"
                      onClick={() => { const d=new Date(); d.setMonth(d.getMonth()+mo); setForm({...form, premium_expires_at: d.toISOString().split('T')[0]} as any); }}
                      className="text-xs px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded border border-amber-300">
                      +{lbl}
                    </button>
                  ))}
                </div>
              )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">💬 Solicită Info:</span>
                    <select value={form.leads_enabled ?? ''} onChange={e => setForm({ ...form, leads_enabled: e.target.value === '' ? null : Number(e.target.value) })}
                      className="border rounded px-2 py-1 text-xs">
                      <option value="">Auto (după Premium)</option>
                      <option value="1">Mereu activ</option>
                      <option value="0">Mereu inactiv</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked ? 1 : 0 })} /> Recomandat ✦</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.contacts_hidden} onChange={e => setForm({ ...form, contacts_hidden: e.target.checked ? 1 : 0 })} /> Ascunde contact (mod business)</label>
                </div>
              </div>
              {editing && editMicrosite && (
                <div className="mt-2 border border-teal-200 rounded-xl p-4 bg-teal-50/40 space-y-3">
                  <p className="text-sm font-semibold text-teal-800">Outreach gradinita</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editMicrosite.outreach_enabled === 1} onChange={e => setEditMicrosite(m => m ? { ...m, outreach_enabled: e.target.checked ? 1 : 0 } : m)}
                      className="w-4 h-4 text-teal-600 rounded" />
                    <span className="text-sm font-medium text-teal-800">Activat</span>
                  </label>
                  {editMicrosite.outreach_enabled === 1 && <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Resend API Key</label>
                      <input type="password" value={editMicrosite.resend_api_key} onChange={e => setEditMicrosite(m => m ? { ...m, resend_api_key: e.target.value } : m)}
                        placeholder="re_..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email expeditor (From)</label>
                      <input type="email" value={editMicrosite.outreach_from_email} onChange={e => setEditMicrosite(m => m ? { ...m, outreach_from_email: e.target.value } : m)}
                        placeholder="contact@expertcatering.ro" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    </div>
                  </>}
                </div>
              )}
              {editing && !editMicrosite && (
                <p className="text-xs text-gray-400 italic mt-1">Creeaza mai intai un microsite pentru a configura outreach-ul.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">{editing ? 'Salvează' : 'Adaugă'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-[var(--color-border)] rounded-lg hover:bg-gray-50 text-[var(--color-text-main)]">Anulează</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {msResult && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setMsResult(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">🌐 Microsite creat!</h3>
              <button onClick={() => setMsResult(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Link site public</p>
                <div className="flex items-center gap-2">
                  <a href={msResult.microsite_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-sm text-teal-600 font-medium bg-teal-50 px-3 py-2 rounded-lg truncate hover:underline">
                    {msResult.microsite_url}
                  </a>
                  <button onClick={() => navigator.clipboard.writeText(msResult.microsite_url)}
                    className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs">📋</button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Link securizat dashboard (trimite clientului)</p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg truncate font-mono">
                    {msResult.magic_link}
                  </span>
                  <button onClick={() => navigator.clipboard.writeText(msResult.magic_link)}
                    className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs">📋</button>
                </div>
              </div>
            </div>
            <button onClick={() => setMsResult(null)} className="mt-4 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold">
              Închide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
