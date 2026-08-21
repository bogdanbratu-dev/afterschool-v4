'use client';

import { useState, useEffect, useCallback } from 'react';

interface Microsite {
  id: number; subdomain: string; listing_type: string; listing_id: number;
  owner_user_id: number | null; theme_color: string | null; tagline: string | null;
  booking_enabled: number; is_active: number;
  listing_name: string | null; owner_email: string | null; owner_name: string | null;
}

interface Opt { id: number; name: string; }
interface UserOpt { id: number; name: string; email: string; }

export default function MicrositesAdmin() {
  const [items, setItems] = useState<Microsite[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [afterschools, setAfterschools] = useState<Opt[]>([]);
  const [clubs, setClubs] = useState<Opt[]>([]);
  const [caterers, setCaterers] = useState<Opt[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [error, setError] = useState('');

  const [subdomain, setSubdomain] = useState('');
  const [listingType, setListingType] = useState<'afterschool' | 'club' | 'caterer' | 'professional' | 'kindergarten'>('afterschool');
  const [listingId, setListingId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [tagline, setTagline] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/microsites');
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    load();
    fetch('/api/admin/afterschools').then(r => r.json()).then(d => setAfterschools(Array.isArray(d) ? d : (d.afterschools || [])));
    fetch('/api/admin/clubs').then(r => r.json()).then(d => setClubs(Array.isArray(d) ? d : (d.clubs || [])));
    fetch('/api/admin/caterers').then(r => r.json()).then(d => setCaterers(Array.isArray(d) ? d : []));
    fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
  }, [load]);

  const listingOptions = listingType === 'afterschool' ? afterschools : listingType === 'club' ? clubs : caterers;

  const create = async () => {
    setError('');
    const res = await fetch('/api/admin/microsites', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subdomain, listing_type: listingType, listing_id: Number(listingId), owner_user_id: ownerId ? Number(ownerId) : null, tagline }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Eroare'); return; }
    setShowForm(false); setSubdomain(''); setListingId(''); setOwnerId(''); setTagline('');
    load();
  };

  const toggleActive = async (m: Microsite) => {
    await fetch(`/api/admin/microsites/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: m.is_active ? 0 : 1 }) });
    load();
  };

  const assignOwner = async (m: Microsite, uid: string) => {
    await fetch(`/api/admin/microsites/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner_user_id: uid ? Number(uid) : null }) });
    load();
  };

  const remove = async (m: Microsite) => {
    if (!confirm(`Ștergi micro-site-ul ${m.subdomain}.activkids.ro?`)) return;
    await fetch(`/api/admin/microsites/${m.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Micro-site-uri ({items.length})</h2>
        <button onClick={() => setShowForm(s => !s)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg">
          {showForm ? 'Anulează' : '+ Micro-site nou'}
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Subdomeniu</label>
              <div className="flex items-center">
                <input value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase())} placeholder="nume-afacere"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-l-lg text-sm text-white" />
                <span className="px-2 py-2 bg-slate-700 text-slate-300 text-sm rounded-r-lg">.activkids.ro</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tip listare</label>
              <select value={listingType} onChange={e => { setListingType(e.target.value as any); setListingId(''); }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
                <option value="afterschool">After School</option>
                <option value="club">Club / Activitate</option>
                <option value="caterer">Catering</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Listare</label>
              <select value={listingId} onChange={e => setListingId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
                <option value="">Alege...</option>
                {listingOptions.map(o => <option key={o.id} value={o.id}>{o.name} (#{o.id})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Proprietar (cont)</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
                <option value="">Fără cont încă</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Slogan (opțional)</label>
            <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="ex: Afterschool și grădiniță în Pipera"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button onClick={create} disabled={!subdomain || !listingId} className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            Creează micro-site
          </button>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-400">Niciun micro-site încă.</p>}
        {items.map(m => (
          <div key={m.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <a href={`https://${m.subdomain}.activkids.ro`} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold hover:underline break-all">
                  {m.subdomain}.activkids.ro
                </a>
                <p className="text-sm text-slate-300 mt-0.5">{m.listing_name || '(listare ștearsă)'} · <span className="text-slate-500">{m.listing_type}</span></p>
                {m.tagline && <p className="text-xs text-slate-400 mt-0.5">{m.tagline}</p>}
                <p className="text-xs text-slate-500 mt-1">Proprietar: {m.owner_email || '— neasignat —'}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full ${m.is_active ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'}`}>
                  {m.is_active ? 'Activ' : 'Inactiv'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <select value={m.owner_user_id || ''} onChange={e => assignOwner(m, e.target.value)}
                className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white">
                <option value="">Asignează proprietar...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
              <button onClick={() => toggleActive(m)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg">
                {m.is_active ? 'Dezactivează' : 'Activează'}
              </button>
              <button onClick={() => remove(m)} className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-200 text-xs rounded-lg">Șterge</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
