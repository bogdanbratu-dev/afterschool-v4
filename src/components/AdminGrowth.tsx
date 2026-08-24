'use client';
import { useState, useEffect } from 'react';

interface GrowthCampaign {
  id: number;
  user_id: number;
  listing_type: string;
  listing_id: number;
  listing_name: string;
  radius_km: number;
  budget_tier: string | null;
  budget_lei: number;
  objective: string | null;
  offer_text: string | null;
  period_desired: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  est_reach_min: number | null; est_reach_max: number | null;
  est_clicks_min: number | null; est_clicks_max: number | null;
  est_leads_min: number | null; est_leads_max: number | null;
  status: 'pending' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';
  spend_actual_lei: number | null;
  impressions_actual: number | null;
  clicks_actual: number | null;
  campaign_start: number | null;
  campaign_end: number | null;
  admin_note: string | null;
  created_at: number;
  visits: number | null;
  leads: number | null;
}

interface PricingTier { key: string; label: string; budgetLei: number; }

const STATUS_META: Record<GrowthCampaign['status'], { label: string; color: string }> = {
  pending: { label: 'În așteptare', color: 'var(--color-accent)' },
  approved: { label: 'Aprobată', color: 'var(--color-primary)' },
  active: { label: 'Activă', color: 'var(--color-green)' },
  paused: { label: 'În pauză', color: 'var(--color-text-light)' },
  completed: { label: 'Încheiată', color: 'var(--color-text-light)' },
  rejected: { label: 'Respinsă', color: 'var(--color-danger)' },
};

const LISTING_TYPE_LABEL: Record<string, string> = {
  afterschool: 'After School', kindergarten: 'Grădiniță', club: 'Club',
};

function todayDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function ActualsEditor({ campaign, onSave }: { campaign: GrowthCampaign; onSave: (patch: Record<string, unknown>) => Promise<void> }) {
  const [spend, setSpend] = useState(campaign.spend_actual_lei != null ? String(campaign.spend_actual_lei) : '');
  const [impressions, setImpressions] = useState(campaign.impressions_actual != null ? String(campaign.impressions_actual) : '');
  const [clicks, setClicks] = useState(campaign.clicks_actual != null ? String(campaign.clicks_actual) : '');
  const [note, setNote] = useState(campaign.admin_note || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave({
      spend_actual_lei: spend === '' ? null : Number(spend),
      impressions_actual: impressions === '' ? null : Number(impressions),
      clicks_actual: clicks === '' ? null : Number(clicks),
      admin_note: note || null,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[var(--color-text-light)]">Cifre reale (din Meta Ads Manager)</p>
      <div className="grid grid-cols-3 gap-2">
        <input value={spend} onChange={(e) => setSpend(e.target.value)} type="number" placeholder="Cheltuit (lei)"
          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)]" />
        <input value={impressions} onChange={(e) => setImpressions(e.target.value)} type="number" placeholder="Afișări"
          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)]" />
        <input value={clicks} onChange={(e) => setClicks(e.target.value)} type="number" placeholder="Clickuri"
          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)]" />
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notă internă (opțional)" rows={2}
        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)]" />
      <button onClick={save} disabled={saving} className="text-xs px-3 py-1.5 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg disabled:opacity-50">
        {saving ? 'Se salvează...' : 'Salvează cifrele'}
      </button>
      {(campaign.status === 'active' || campaign.status === 'completed') && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border)]">
          <div className="bg-[var(--color-bg)] rounded-lg p-2 text-center">
            <p className="font-bold text-[var(--color-text-main)] tabular-nums">{campaign.visits ?? '-'}</p>
            <p className="text-[10px] text-[var(--color-text-light)]">vizite pe site (calculat)</p>
          </div>
          <div className="bg-[var(--color-bg)] rounded-lg p-2 text-center">
            <p className="font-bold text-[var(--color-text-main)] tabular-nums">{campaign.leads ?? '-'}</p>
            <p className="text-[10px] text-[var(--color-text-light)]">leaduri (calculat)</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignRow({ campaign, expanded, onToggle, onPatch }: {
  campaign: GrowthCampaign;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (id: number, patch: Record<string, unknown>) => Promise<void>;
}) {
  const [startDate, setStartDate] = useState(todayDateValue());
  const [endDate, setEndDate] = useState(todayDateValue());
  const [actionLoading, setActionLoading] = useState(false);
  const meta = STATUS_META[campaign.status];

  const doAction = async (patch: Record<string, unknown>) => {
    setActionLoading(true);
    await onPatch(campaign.id, patch);
    setActionLoading(false);
  };

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[var(--color-bg)] transition-colors">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-main)]">
            {campaign.listing_name} <span className="text-[var(--color-text-light)] font-normal">· {LISTING_TYPE_LABEL[campaign.listing_type] || campaign.listing_type}</span>
          </p>
          <p className="text-xs text-[var(--color-text-light)]">{campaign.budget_lei} lei · {campaign.radius_km} km · {new Date(campaign.created_at).toLocaleDateString('ro-RO')}</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ color: meta.color, backgroundColor: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}>
          {meta.label}
        </span>
      </button>

      {expanded && (
        <div className="px-4 py-4 border-t border-[var(--color-border)] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[var(--color-text-light)] mb-1">Obiectiv</p>
              <p className="text-[var(--color-text-main)]">{campaign.objective || '-'}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-light)] mb-1">Ofertă</p>
              <p className="text-[var(--color-text-main)]">{campaign.offer_text || '-'}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-light)] mb-1">Perioadă dorită</p>
              <p className="text-[var(--color-text-main)]">{campaign.period_desired || '-'}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-light)] mb-1">Contact</p>
              <p className="text-[var(--color-text-main)]">{campaign.contact_name || '-'} · {campaign.contact_phone || '-'} · {campaign.contact_email || '-'}</p>
            </div>
          </div>

          {campaign.est_leads_min != null && (
            <p className="text-xs text-[var(--color-text-light)] bg-[var(--color-bg)] rounded-lg p-2">
              Estimare la momentul cererii: {campaign.est_clicks_min}-{campaign.est_clicks_max} vizite, {campaign.est_reach_min}-{campaign.est_reach_max} persoane atinse, {campaign.est_leads_min}-{campaign.est_leads_max} contacte potențiale.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {campaign.status === 'pending' && (
              <>
                <button disabled={actionLoading} onClick={() => doAction({ status: 'approved' })} className="text-xs px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg disabled:opacity-50">Aprobă</button>
                <button disabled={actionLoading} onClick={() => doAction({ status: 'rejected' })} className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg disabled:opacity-50">Respinge</button>
              </>
            )}
            {campaign.status === 'approved' && (
              <>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs px-2 py-1.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)]" />
                <button disabled={actionLoading} onClick={() => doAction({ status: 'active', campaign_start: new Date(startDate).getTime() })} className="text-xs px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg disabled:opacity-50">Activează</button>
              </>
            )}
            {campaign.status === 'active' && (
              <>
                <button disabled={actionLoading} onClick={() => doAction({ status: 'paused' })} className="text-xs px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-text-main)] rounded-lg disabled:opacity-50">Pune pauză</button>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs px-2 py-1.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)]" />
                <button disabled={actionLoading} onClick={() => doAction({ status: 'completed', campaign_end: new Date(endDate).getTime() })} className="text-xs px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg disabled:opacity-50">Finalizează</button>
              </>
            )}
            {campaign.status === 'paused' && (
              <>
                <button disabled={actionLoading} onClick={() => doAction({ status: 'active' })} className="text-xs px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg disabled:opacity-50">Reactivează</button>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs px-2 py-1.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)]" />
                <button disabled={actionLoading} onClick={() => doAction({ status: 'completed', campaign_end: new Date(endDate).getTime() })} className="text-xs px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-text-main)] rounded-lg disabled:opacity-50">Finalizează</button>
              </>
            )}
          </div>

          {(campaign.status === 'active' || campaign.status === 'paused' || campaign.status === 'completed') && (
            <ActualsEditor campaign={campaign} onSave={(patch) => onPatch(campaign.id, patch)} />
          )}
        </div>
      )}
    </div>
  );
}

function PricingEditor() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/growth-pricing').then((r) => r.json()).then((d) => { setTiers(d.tiers || []); setLoading(false); });
  }, []);

  const updateTier = (i: number, patch: Partial<PricingTier>) => {
    setTiers((prev) => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  };

  const addTier = () => setTiers((prev) => [...prev, { key: `tier${prev.length + 1}`, label: 'Nou', budgetLei: 300 }]);
  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/admin/growth-pricing', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tiers }),
    });
    if (res.ok) setSaved(true);
    setSaving(false);
  };

  if (loading) return null;

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-5 space-y-3">
      <h3 className="text-sm font-bold text-[var(--color-text-main)]">Tarife Growth (afișate proprietarilor)</h3>
      <div className="space-y-2">
        {tiers.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={t.label} onChange={(e) => updateTier(i, { label: e.target.value })} placeholder="Etichetă"
              className="flex-1 px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)]" />
            <input value={t.budgetLei} onChange={(e) => updateTier(i, { budgetLei: Number(e.target.value) })} type="number"
              className="w-28 px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)]" />
            <span className="text-xs text-[var(--color-text-light)]">lei</span>
            <button onClick={() => removeTier(i)} className="text-xs px-2 py-1 text-red-600">Șterge</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={addTier} className="text-xs px-3 py-1.5 border border-[var(--color-border)] rounded-lg">+ Adaugă tier</button>
        <button onClick={save} disabled={saving} className="text-xs px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg disabled:opacity-50">
          {saving ? 'Se salvează...' : 'Salvează tarifele'}
        </button>
        {saved && <span className="text-xs text-green-700">Salvat.</span>}
      </div>
    </div>
  );
}

export default function AdminGrowth() {
  const [campaigns, setCampaigns] = useState<GrowthCampaign[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch('/api/admin/growth-campaigns');
    const data = await res.json();
    if (Array.isArray(data)) setCampaigns(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const patch = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/growth-campaigns/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (res.ok) await load();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Eroare la actualizare.');
    }
  };

  const pendingCount = campaigns.filter((c) => c.status === 'pending').length;

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <PricingEditor />
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold mb-4">
          🚀 Growth – cereri de promovare ({campaigns.length})
          {pendingCount > 0 && <span className="ml-2 inline-flex items-center justify-center w-6 h-6 bg-purple-600 text-white rounded-full text-xs font-bold align-middle">{pendingCount}</span>}
        </h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-[var(--color-text-light)]">Nicio cerere Growth încă.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <CampaignRow key={c.id} campaign={c} expanded={expanded.has(c.id)} onToggle={() => toggle(c.id)} onPatch={patch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
