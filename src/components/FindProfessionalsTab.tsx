"use client";
import { useState, useEffect, useCallback } from "react";
import ProfessionalCard from "@/components/ProfessionalCard";
import CatererCard from "@/components/CatererCard";
import { PROFESSIONAL_GROUP_ORDER, PROFESSIONAL_GROUPS, PROFESSIONAL_CATEGORY_LABELS, type ProfessionalGroup, type ProfessionalCategory, type CollaboratorKind } from "@/lib/professionals";

interface ProfessionalItem {
  id: number; name: string; category: ProfessionalCategory; kind?: CollaboratorKind;
  address: string | null; sector: number | null; coverage_area: string | null;
  phone: string | null; email: string | null; website: string | null; facebook_url: string | null;
  price_min: number | null; price_max: number | null;
  description: string | null; editorial_summary: string | null;
  availability: 'available' | 'full' | 'unknown';
  online_available?: number; home_service?: number;
  is_premium: number; is_featured?: number; contacts_hidden: number;
  banner_url?: string | null; photo_urls?: string | null;
  distance?: number; rating?: number | null; reviews_count?: number | null; maps_url?: string | null;
}

interface CatererItem {
  id: number; name: string;
  address: string; sector: number; coverage_area: string | null;
  phone: string | null; email: string | null; website: string | null; facebook_url: string | null;
  price_min: number | null; price_max: number | null;
  description: string | null; editorial_summary: string | null;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number; is_featured?: number; contacts_hidden: number;
  banner_url?: string | null; photo_urls?: string | null;
  distance?: number; rating?: number | null; reviews_count?: number | null; maps_url?: string | null;
}

function isCaterer(x: ProfessionalItem | CatererItem): x is CatererItem {
  return !('category' in x);
}

function isProfessionalGroup(g: ProfessionalGroup | 'catering' | 'toate'): g is ProfessionalGroup {
  return g !== 'toate' && g !== 'catering';
}

function pillClass(active: boolean, size: 'md' | 'sm' = 'md') {
  const base = size === 'md' ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]";
  return base + " font-semibold rounded-full transition-colors " + (active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200");
}

interface GroupsResponse {
  groups: Record<ProfessionalGroup, { label: string; items: ProfessionalItem[] }>;
  caterers: { label: string; items: CatererItem[] };
  total: number;
}

function RequestButton({ toType, targetId }: { toType: 'professional' | 'caterer'; targetId: number }) {
  const [state, setState] = useState<'idle' | 'composing' | 'sending' | 'sent' | 'already' | 'error'>('idle');
  const [message, setMessage] = useState('Bună ziua, am fi interesați de o colaborare cu dumneavoastră.');

  const send = async () => {
    setState('sending');
    const res = await fetch('/api/user/collaborations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_type: toType, to_id: targetId, message }),
    });
    if (res.ok) setState('sent');
    else if (res.status === 409) setState('already');
    else setState('error');
  };

  if (state === 'sent') return <div className="mt-2 text-center text-sm font-medium text-green-700 bg-green-50 rounded-lg py-2">Cerere trimisă</div>;
  if (state === 'already') return <div className="mt-2 text-center text-sm font-medium text-amber-700 bg-amber-50 rounded-lg py-2">Cerere deja trimisă</div>;

  if (state === 'composing' || state === 'sending') {
    const sending = state === 'sending';
    return (
      <div className="mt-2 space-y-2">
        <textarea value={message} onChange={e => setMessage(e.target.value)} disabled={sending} rows={3}
          className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none disabled:opacity-60" />
        <div className="flex gap-2">
          <button onClick={send} disabled={sending || !message.trim()}
            className="flex-1 text-center text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg py-2 transition-colors">
            {sending ? 'Se trimite...' : 'Trimite'}
          </button>
          {!sending && (
            <button onClick={() => setState('idle')}
              className="px-4 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg py-2 transition-colors">
              Anulează
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <button onClick={() => setState('composing')}
        className="mt-2 w-full text-center text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg py-2 transition-colors">
        Eroare, încearcă din nou
      </button>
    );
  }

  return (
    <button onClick={() => setState('composing')}
      className="mt-2 w-full text-center text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg py-2 transition-colors">
      Trimite cerere de colaborare
    </button>
  );
}

const UPSELL_TEXT: Record<string, string> = {
  afterschool: 'Vezi colaboratori lângă tine, segmentați pe categorii și sortați după distanță — disponibil cu Premium.',
  kindergarten: 'Vezi colaboratori lângă grădiniță, segmentați pe categorii și sortați după distanță — disponibil cu Premium.',
};

export default function FindProfessionalsTab({ listing, listingType }: { listing: { is_premium: number }; listingType: string }) {
  const [data, setData] = useState<GroupsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<ProfessionalGroup | 'catering' | 'toate'>('toate');
  const [category, setCategory] = useState<ProfessionalCategory | ''>('');

  const selectGroup = (g: ProfessionalGroup | 'catering' | 'toate') => {
    setGroup(g);
    setCategory('');
  };

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/user/collaborators');
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (listing.is_premium === 1) load();
  }, [listing.is_premium, load]);

  if (listing.is_premium !== 1) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-800 mb-1">Promovează-te Premium</h3>
          <p className="text-sm text-amber-700 mb-3">{UPSELL_TEXT[listingType] || UPSELL_TEXT.afterschool}</p>
          <div className="flex gap-2 flex-wrap">
            <a href="/plata" className="inline-block text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-xl transition-colors">Activează Premium →</a>
            <a href="/promovare" className="inline-block text-sm font-bold text-amber-800 bg-amber-200 hover:bg-amber-300 px-4 py-2 rounded-xl transition-colors">Află mai multe</a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-sm text-gray-500 py-6 text-center">Nu s-au putut încărca colaboratorii.</p>;

  const groupItems: (ProfessionalItem | CatererItem)[] = group === 'toate'
    ? [...PROFESSIONAL_GROUP_ORDER.flatMap(g => data.groups[g].items), ...data.caterers.items]
    : group === 'catering'
      ? data.caterers.items
      : data.groups[group].items;

  const items = category
    ? groupItems.filter(p => !isCaterer(p) && p.category === category)
    : groupItems;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => selectGroup('toate')} className={pillClass(group === 'toate')}>
          Toate ({data.total})
        </button>
        {PROFESSIONAL_GROUP_ORDER.map(g => (
          <button key={g} onClick={() => selectGroup(g)} className={pillClass(group === g)}>
            {data.groups[g].label} ({data.groups[g].items.length})
          </button>
        ))}
        <button onClick={() => selectGroup('catering')} className={pillClass(group === 'catering')}>
          {data.caterers.label} ({data.caterers.items.length})
        </button>
      </div>

      {isProfessionalGroup(group) && (
        <div className="flex gap-1 flex-wrap pl-2 border-l-2 border-indigo-100">
          <button onClick={() => setCategory('')} className={pillClass(category === '', 'sm')}>
            Toate ({data.groups[group].items.length})
          </button>
          {PROFESSIONAL_GROUPS[group].map(cat => {
            const count = data.groups[group].items.filter(p => p.category === cat).length;
            if (count === 0) return null;
            return (
              <button key={cat} onClick={() => setCategory(cat)} className={pillClass(category === cat, 'sm')}>
                {PROFESSIONAL_CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center bg-gray-50 rounded-xl">Niciun colaborator în această categorie.</p>
      ) : (
        <div className="space-y-4">
          {items.map(p => (
            <div key={p.id}>
              {isCaterer(p) ? <CatererCard data={p} businessMode /> : <ProfessionalCard data={p} businessMode />}
              <RequestButton toType={isCaterer(p) ? 'caterer' : 'professional'} targetId={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
