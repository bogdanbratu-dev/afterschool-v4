'use client';

import { useEffect, useState } from 'react';

interface PricingTier {
  key: string;
  label: string;
  budgetLei: number;
}

interface BudgetEstimate {
  budgetLei: number;
  clicksRange: [number, number];
  reachRange: [number, number];
  leadsRange: [number, number];
  calibratedAt: string;
  source: string;
}

interface PotentialResponse {
  radiusKm: number;
  competition: { count: number; densityPerKm2: number; schoolsInRadius: number; kindergartensInRadius: number };
  budgetEstimate: BudgetEstimate | null;
  pricing: { tiers: PricingTier[] };
}

interface Campaign {
  id: number;
  radius_km: number;
  budget_tier: string | null;
  budget_lei: number;
  objective: string | null;
  offer_text: string | null;
  period_desired: string | null;
  est_reach_min: number | null; est_reach_max: number | null;
  est_clicks_min: number | null; est_clicks_max: number | null;
  est_leads_min: number | null; est_leads_max: number | null;
  status: 'pending' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';
  spend_actual_lei: number | null;
  impressions_actual: number | null;
  clicks_actual: number | null;
  admin_note: string | null;
  created_at: number;
  visits: number | null;
  leads: number | null;
}

const STATUS_META: Record<Campaign['status'], { label: string; color: string }> = {
  pending: { label: 'Solicitată', color: 'var(--color-accent)' },
  approved: { label: 'În pregătire', color: 'var(--color-primary)' },
  active: { label: 'Activă', color: 'var(--color-green)' },
  paused: { label: 'În pauză', color: 'var(--color-text-light)' },
  completed: { label: 'Încheiată', color: 'var(--color-text-light)' },
  rejected: { label: 'Respinsă', color: 'var(--color-danger)' },
};

export default function GrowthTab() {
  const [radiusKm, setRadiusKm] = useState(3);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [customBudget, setCustomBudget] = useState('');
  const [estimate, setEstimate] = useState<BudgetEstimate | null>(null);
  const [context, setContext] = useState<{ count: number; schoolsInRadius: number; kindergartensInRadius: number } | null>(null);
  const [notEligible, setNotEligible] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [objective, setObjective] = useState('');
  const [offerText, setOfferText] = useState('');
  const [periodDesired, setPeriodDesired] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const budgetLei = selectedTier
    ? tiers.find((t) => t.key === selectedTier)?.budgetLei ?? 0
    : Number(customBudget) || 0;

  async function loadCampaigns() {
    try {
      const res = await fetch('/api/user/growth-campaigns');
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns || []);
    } catch {}
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ radiusKm: String(radiusKm) });
    if (budgetLei > 0) params.set('budget', String(budgetLei));
    fetch(`/api/user/growth-potential?${params.toString()}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) { setNotEligible(true); setLoading(false); return; }
        setNotEligible(false);
        setEstimate(data.budgetEstimate);
        if (data.competition) setContext(data.competition);
        if (data.pricing?.tiers?.length) {
          setTiers(data.pricing.tiers);
          setSelectedTier((prev) => prev ?? data.pricing.tiers[0].key);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm, budgetLei]);

  async function submitRequest() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/user/growth-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          radiusKm,
          budgetLei,
          budgetTier: selectedTier ? tiers.find((t) => t.key === selectedTier)?.label : 'Custom',
          objective, offerText, periodDesired,
          contactName: contactName || undefined,
          contactPhone: contactPhone || undefined,
          contactEmail: contactEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'A apărut o eroare. Încearcă din nou.');
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      setShowForm(false);
      setObjective(''); setOfferText(''); setPeriodDesired('');
      loadCampaigns();
    } catch {
      setSubmitError('Eroare de rețea. Încearcă din nou.');
    }
    setSubmitting(false);
  }

  if (notEligible) {
    return (
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5">
        <p className="text-sm text-[var(--color-text-light)]">
          Promovarea Growth este disponibilă momentan pentru afterschool, grădiniță și club de activități.
        </p>
      </div>
    );
  }

  const hasPendingOrActive = campaigns.some((c) => c.status === 'pending' || c.status === 'approved' || c.status === 'active' || c.status === 'paused');

  return (
    <div className="space-y-4">
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6" style={{ background: 'var(--hero-grad)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-white/70 border border-white" aria-hidden="true">🚀</div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--color-text-main)]">Promovare Growth</h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-light)]">Campanie Facebook Ads gestionată de echipa ActivKids, pe raza ta</p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[var(--color-text-light)]">Rază de promovare</p>
              <p className="text-sm font-bold text-[var(--color-primary)] tabular-nums">{radiusKm} km</p>
            </div>
            <input
              type="range" min={1} max={5} step={1} value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
              aria-label="Raza de promovare in kilometri"
            />
            {context && (
              <p className="text-[11px] text-[var(--color-text-light)] mt-1.5">
                În raza de {radiusKm} km: {context.count} concurenți, {context.schoolsInRadius} școli, {context.kindergartensInRadius} grădinițe.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--color-text-light)] mb-2">Buget lunar</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {tiers.map((t) => {
                const active = selectedTier === t.key;
                return (
                  <button
                    key={t.key} type="button"
                    onClick={() => { setSelectedTier(t.key); setCustomBudget(''); }}
                    className="py-2.5 px-1 rounded-xl text-xs sm:text-sm font-semibold border-2 transition-all flex flex-col items-center gap-0.5"
                    style={active
                      ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }
                      : { borderColor: 'var(--color-border)', color: 'var(--color-text-light)' }}
                  >
                    <span>{t.label}</span>
                    <span className="tabular-nums">{t.budgetLei} lei</span>
                  </button>
                );
              })}
            </div>
            <input
              type="number" min="0" value={customBudget}
              onChange={(e) => { setCustomBudget(e.target.value); setSelectedTier(null); }}
              placeholder="Sau introdu un buget personalizat (lei)"
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {loading && <p className="text-sm text-[var(--color-text-light)]">Se calculează estimarea...</p>}

          {!loading && estimate && (
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-2 flex items-center gap-1.5">
                <span aria-hidden="true">💰</span> Cu {estimate.budgetLei} lei, estimăm
              </h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-[var(--color-bg)] rounded-xl p-3 text-center">
                  <p className="font-bold text-[var(--color-text-main)] tabular-nums">{estimate.clicksRange[0]}-{estimate.clicksRange[1]}</p>
                  <p className="text-[10px] text-[var(--color-text-light)]">vizite pe site</p>
                </div>
                <div className="bg-[var(--color-bg)] rounded-xl p-3 text-center">
                  <p className="font-bold text-[var(--color-text-main)] tabular-nums">{estimate.reachRange[0]}-{estimate.reachRange[1]}</p>
                  <p className="text-[10px] text-[var(--color-text-light)]">persoane atinse</p>
                </div>
                <div className="bg-[var(--color-bg)] rounded-xl p-3 text-center">
                  <p className="font-bold text-[var(--color-text-main)] tabular-nums">{estimate.leadsRange[0]}-{estimate.leadsRange[1]}</p>
                  <p className="text-[10px] text-[var(--color-text-light)]">contacte potențiale</p>
                </div>
              </div>
              <p className="text-[11px] text-[var(--color-text-light)] mt-2">Estimare orientativă, nu date live Meta.</p>
              <p className="text-[11px] text-[var(--color-text-light)] mt-1">Bugetul stabilește câte vizite/contacte estimăm — nu bugetul crește cu raza. Raza stabilește cui ajunge reclama (vezi mai sus câți concurenți/școli/grădinițe sunt incluse).</p>
            </div>
          )}

          {hasPendingOrActive && (
            <p className="text-sm text-[var(--color-text-light)] bg-[var(--color-bg)] rounded-xl p-3">
              Ai deja o cerere Growth activă sau în așteptare — vezi mai jos statusul ei.
            </p>
          )}

          {!hasPendingOrActive && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              disabled={budgetLei <= 0}
              className="w-full py-3.5 text-white rounded-xl text-sm font-bold transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', boxShadow: 'var(--shadow-brand)' }}
            >
              Vreau să pornesc promovarea <span aria-hidden="true">→</span>
            </button>
          )}

          {!hasPendingOrActive && showForm && (
            <div className="space-y-3 border-t border-[var(--color-border)] pt-5">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-light)] mb-1 block">Obiectiv principal</label>
                <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex: mai multe înscrieri pentru anul școlar 2026-2027"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-light)] mb-1 block">Ce ofertă promovezi (opțional)</label>
                <input value={offerText} onChange={(e) => setOfferText(e.target.value)} placeholder="Ex: 10% reducere la înscriere până pe 1 septembrie"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-light)] mb-1 block">Perioadă dorită (opțional)</label>
                <input value={periodDesired} onChange={(e) => setPeriodDesired(e.target.value)} placeholder="Ex: septembrie - octombrie 2026"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nume contact (opțional)"
                  className="px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none" />
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Telefon (opțional)"
                  className="px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none" />
                <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email (opțional)"
                  className="px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none" />
              </div>
              {submitError && <p className="text-sm text-[var(--color-danger)]">{submitError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[var(--color-border)] text-[var(--color-text-light)]">
                  Renunță
                </button>
                <button
                  type="button" onClick={submitRequest} disabled={submitting}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}
                >
                  {submitting ? 'Se trimite...' : 'Trimite cererea'}
                </button>
              </div>
            </div>
          )}

          {submitted && (
            <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
              Cererea a fost trimisă. Echipa ActivKids o va analiza și te va contacta.
            </p>
          )}
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text-main)]">Cererile tale Growth</h3>
          {campaigns.map((c) => {
            const meta = STATUS_META[c.status];
            return (
              <div key={c.id} className="border border-[var(--color-border)] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--color-text-main)]">{c.budget_lei} lei · {c.radius_km} km</p>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: meta.color, backgroundColor: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}>
                    {meta.label}
                  </span>
                </div>
                {(c.status === 'pending' || c.status === 'approved') && (c.est_leads_min != null) && (
                  <p className="text-xs text-[var(--color-text-light)]">
                    Estimare la momentul cererii: {c.est_clicks_min}-{c.est_clicks_max} vizite, {c.est_leads_min}-{c.est_leads_max} contacte potențiale.
                  </p>
                )}
                {(c.status === 'active' || c.status === 'completed') && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                    <div className="bg-[var(--color-bg)] rounded-lg p-2 text-center">
                      <p className="font-bold text-[var(--color-text-main)] tabular-nums">{c.spend_actual_lei ?? '-'}</p>
                      <p className="text-[10px] text-[var(--color-text-light)]">lei cheltuiți</p>
                    </div>
                    <div className="bg-[var(--color-bg)] rounded-lg p-2 text-center">
                      <p className="font-bold text-[var(--color-text-main)] tabular-nums">{c.impressions_actual ?? '-'}</p>
                      <p className="text-[10px] text-[var(--color-text-light)]">afișări</p>
                    </div>
                    <div className="bg-[var(--color-bg)] rounded-lg p-2 text-center">
                      <p className="font-bold text-[var(--color-text-main)] tabular-nums">{c.visits ?? '-'}</p>
                      <p className="text-[10px] text-[var(--color-text-light)]">vizite site</p>
                    </div>
                    <div className="bg-[var(--color-bg)] rounded-lg p-2 text-center">
                      <p className="font-bold text-[var(--color-text-main)] tabular-nums">
                        {c.spend_actual_lei && c.visits ? (c.spend_actual_lei / c.visits).toFixed(1) : '-'}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-light)]">lei / vizită</p>
                    </div>
                    <div className="bg-[var(--color-bg)] rounded-lg p-2 text-center">
                      <p className="font-bold text-[var(--color-text-main)] tabular-nums">{c.leads ?? '-'}</p>
                      <p className="text-[10px] text-[var(--color-text-light)]">leaduri</p>
                    </div>
                  </div>
                )}
                {c.admin_note && (
                  <p className="text-xs text-[var(--color-text-light)] bg-[var(--color-bg)] rounded-lg p-2">{c.admin_note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
