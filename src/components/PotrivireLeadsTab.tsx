'use client';
import { useState, useEffect } from 'react';
import LeadCard, { type Lead } from './LeadCard';
import { BUDGET_BUCKETS } from '@/lib/matchConstants';
import { CLUB_BUDGET_BUCKETS } from '@/lib/clubMatchConstants';
import { CLUB_CATEGORY_LABELS, type ClubCategory } from '@/lib/clubs';

interface MatchContext {
  listingType?: 'afterschool' | 'kindergarten' | 'club' | string;
  locationLabel?: string;
  schoolName?: string;
  age?: number | null;
  budget?: number | null;
  budgetRequired?: boolean;
  scheduleTime?: string | null;
  scheduleRequired?: boolean;
  desiredActivities?: string[];
  requiredActivities?: string[];
  category?: ClubCategory;
  energy?: string;
  social?: string;
  goal?: string;
  competition?: string;
}

function parseContext(raw: string | null): MatchContext | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function budgetLabel(budget: number | null | undefined, isClub: boolean): string | null {
  if (budget == null) return null;
  const bucket = (isClub ? CLUB_BUDGET_BUCKETS : BUDGET_BUCKETS).find(b => b.value === budget);
  return bucket ? bucket.label : `până în ${budget} lei`;
}

interface MatchProgressRow {
  id: number;
  session_id: string;
  listing_type: string | null;
  step_id: string;
  step_index: number;
  total_steps: number;
  draft: string | null;
  completed: number;
  contacted: number;
  created_at: number;
  updated_at: number;
}

const STEP_LABELS: Record<string, string> = {
  listingType: 'ce tip de listare caută',
  location: 'locație',
  age: 'vârsta copilului',
  budget: 'buget',
  schedule: 'program',
  priorities: 'priorități',
  category: 'categoria activității',
  energy: 'nivelul de energie',
  social: 'cât de sociabil e copilul',
  goal: 'obiectivul urmărit',
  competition: 'nivelul de competitivitate',
};

function stepLabel(stepId: string): string {
  return STEP_LABELS[stepId] || stepId;
}

function FunnelContext({ ctx }: { ctx: MatchContext }) {
  const isKindergarten = ctx.listingType === 'kindergarten';
  const isClub = ctx.listingType === 'club';
  const place = ctx.schoolName || ctx.locationLabel;
  const budget = budgetLabel(ctx.budget, isClub);
  const activities = (ctx.desiredActivities || []).map(a => ctx.requiredActivities?.includes(a) ? `${a} (obligatoriu)` : a);
  const categoryLabel = ctx.category ? CLUB_CATEGORY_LABELS[ctx.category] : null;

  const kindLabel = isClub ? 'activitate' : isKindergarten ? 'grădiniță' : 'afterschool';

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-2 text-xs text-[var(--color-text-main)]">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>🎯 Caută <strong>{kindLabel}</strong></span>
        {categoryLabel && <span>🏆 categorie <strong>{categoryLabel}</strong></span>}
        {place && <span>📍 {isKindergarten || isClub ? 'lângă' : 'lângă școala'} <strong>{place}</strong></span>}
        {ctx.age != null && <span>🎂 vârstă <strong>{ctx.age}</strong></span>}
        {budget && <span>💰 buget <strong>{budget}</strong>{ctx.budgetRequired ? ' (obligatoriu)' : ''}</span>}
        {ctx.scheduleTime && <span>🕓 program până la <strong>{ctx.scheduleTime}</strong>{ctx.scheduleRequired ? ' (obligatoriu)' : ''}</span>}
        {activities.length > 0 && <span>📚 activități: <strong>{activities.join(', ')}</strong></span>}
      </div>
    </div>
  );
}

export default function PotrivireLeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [progress, setProgress] = useState<MatchProgressRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [leadsRes, progressRes] = await Promise.all([
      fetch('/api/admin/leads'),
      fetch('/api/admin/match-progress'),
    ]);
    const data = await leadsRes.json();
    setLeads(Array.isArray(data) ? data.filter((l: Lead) => l.source === 'match') : []);
    const progressData = await progressRes.json();
    setProgress(Array.isArray(progressData.rows) ? progressData.rows : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markSeen = async (id: number) => {
    await fetch('/api/admin/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'seen' }) });
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: 'seen' } : l));
  };

  const deleteLead = async (id: number) => {
    if (!confirm('Ștergi acest lead?')) return;
    await fetch('/api/admin/leads', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setLeads(prev => prev.filter(l => l.id !== id));
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const deleteProgress = async (id: number) => {
    if (!confirm('Ștergi această înregistrare din funnel?')) return;
    await fetch('/api/admin/match-progress', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setProgress(prev => prev.filter(p => p.id !== id));
  };

  const forwardEmail = async (id: number) => {
    const res = await fetch('/api/admin/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: id }) });
    const data = await res.json();
    if (res.ok) {
      alert('Email trimis cu succes!');
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: 'forwarded' } : l));
    } else {
      alert(data.error || 'Eroare la trimitere.');
    }
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map(l => l.id)));
  };

  const bulkMarkSeen = async () => {
    setBulkLoading(true);
    await fetch('/api/admin/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected], status: 'seen' }) });
    setLeads(prev => prev.map(l => selected.has(l.id) ? { ...l, status: 'seen' } : l));
    setSelected(new Set());
    setBulkLoading(false);
  };

  const bulkDelete = async () => {
    if (!confirm(`Ștergi ${selected.size} lead-uri?`)) return;
    setBulkLoading(true);
    await fetch('/api/admin/leads', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected] }) });
    setLeads(prev => prev.filter(l => !selected.has(l.id)));
    setSelected(new Set());
    setBulkLoading(false);
  };

  const newCount = leads.filter(l => l.status === 'new').length;
  const finishedNotContacted = progress.filter(p => p.completed === 1);
  const abandoned = progress.filter(p => p.completed === 0);

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold">
          🎯 Potrivire – leaduri complete ({leads.length})
          {newCount > 0 && <span className="ml-2 inline-flex items-center justify-center w-6 h-6 bg-purple-600 text-white rounded-full text-xs font-bold align-middle">{newCount}</span>}
        </h2>
        {leads.length > 0 && (
          <label className="flex items-center gap-2 text-sm cursor-pointer text-[var(--color-text-light)]">
            <input type="checkbox" checked={selected.size === leads.length && leads.length > 0} onChange={selectAll} />
            Selectează toate ({leads.length})
          </label>
        )}
      </div>
      <p className="text-xs text-[var(--color-text-light)] mb-4">
        Funnel-ul complet: ce a căutat părintele în chestionar → ce listare a contactat. Leadurile de aici nu mai apar și în tabul „Listings".
      </p>
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl items-center">
          <span className="text-sm font-semibold text-purple-800">{selected.size} selectate</span>
          <button onClick={bulkMarkSeen} disabled={bulkLoading} className="text-xs px-3 py-1.5 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50">
            Marchează văzute
          </button>
          <button onClick={bulkDelete} disabled={bulkLoading} className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
            Șterge selectate
          </button>
        </div>
      )}
      {leads.length === 0 ? (
        <p className="text-sm text-[var(--color-text-light)]">Niciun lead din Potrivire încă.</p>
      ) : (
        <div className="space-y-4">
          {leads.map(lead => {
            const ctx = parseContext(lead.match_context);
            return (
              <div key={lead.id}>
                {ctx && <FunnelContext ctx={ctx} />}
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-light)] mb-2 pl-1">
                  <span>↓ a solicitat informații de la</span>
                </div>
                <LeadCard
                  lead={lead}
                  selected={selected.has(lead.id)}
                  onToggleSelect={toggleSelect}
                  onMarkSeen={markSeen}
                  onForwardEmail={forwardEmail}
                  onDelete={deleteLead}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
        <h3 className="text-sm font-bold mb-1">
          👀 A văzut recomandările, nu a contactat încă ({finishedNotContacted.length})
        </h3>
        <p className="text-xs text-[var(--color-text-light)] mb-3">
          Au terminat chestionarul și au ajuns la listă, dar n-au trimis nicio cerere de contact.
        </p>
        {finishedNotContacted.length === 0 ? (
          <p className="text-sm text-[var(--color-text-light)]">Niciunul momentan.</p>
        ) : (
          <div className="space-y-3">
            {finishedNotContacted.map(p => {
              const ctx = parseContext(p.draft);
              const ctxWithType = ctx ? { ...ctx, listingType: p.listing_type ?? ctx.listingType } : null;
              return (
                <div key={p.session_id}>
                  {ctxWithType && <FunnelContext ctx={ctxWithType} />}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--color-text-light)] pl-1">
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                      A văzut recomandările, nu a contactat
                    </span>
                    <span>{new Date(p.updated_at).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <button onClick={() => deleteProgress(p.id)} className="ml-auto text-red-600 hover:underline font-semibold">Șterge</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
        <h3 className="text-sm font-bold mb-1">
          🚪 S-au oprit în chestionar ({abandoned.length})
        </h3>
        <p className="text-xs text-[var(--color-text-light)] mb-3">
          Au început chestionarul Potrivire dar nu l-au terminat.
        </p>
        {abandoned.length === 0 ? (
          <p className="text-sm text-[var(--color-text-light)]">Niciunul momentan.</p>
        ) : (
          <div className="space-y-3">
            {abandoned.map(p => {
              const ctx = parseContext(p.draft);
              const ctxWithType = ctx ? { ...ctx, listingType: p.listing_type ?? ctx.listingType } : null;
              return (
                <div key={p.session_id}>
                  {ctxWithType && <FunnelContext ctx={ctxWithType} />}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--color-text-light)] pl-1">
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                      S-a oprit la: {stepLabel(p.step_id)} (pasul {p.step_index + 1}/{p.total_steps})
                    </span>
                    <span>{new Date(p.updated_at).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <button onClick={() => deleteProgress(p.id)} className="ml-auto text-red-600 hover:underline font-semibold">Șterge</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
