'use client';

import { useEffect, useRef, useState } from 'react';
import { ZONE_CENTROIDS } from '@/lib/zones';
import { CLUB_CATEGORY_LABELS, type ClubCategory } from '@/lib/clubs';
import { stripDiacritics } from '@/lib/slug';
import { logSearch } from '@/lib/logSearch';

// Widget public "Potentialul zonei" pe /promovare - vezi planul din
// C:\Users\bogda\.claude\plans\modular-wondering-crane.md pentru context complet. NU importa nimic
// din src/lib/zoneInsights.ts (are better-sqlite3 la nivel de modul, ar sparge bundle-ul de client) -
// tipurile de mai jos oglindesc manual forma raspunsului din /api/zone-insights.
//
// Redesign 2026-08-18: mod implicit "cartier" (in loc de "adresa"), buton-select cartier inlocuit cu
// camp de text cu auto-sugestii live (filtrare client-side pe cele ~43 de zone, fara cerere de retea),
// butoane de mod mai mari/proeminente, si explicatii vizibile in pagina pentru procentele din scor
// (userul final nu are context de chat, deci explicatia trebuie sa traiasca in UI).

type BusinessType = 'afterschool' | 'kindergarten' | 'club';
const BUSINESS_META: Record<BusinessType, { label: string; icon: string; color: string }> = {
  afterschool: { label: 'Afterschool', icon: '🏫', color: 'var(--color-after)' },
  kindergarten: { label: 'Grădiniță', icon: '🌱', color: 'var(--color-gradi)' },
  club: { label: 'Club de activități', icon: '⚽', color: 'var(--color-activ)' },
};
interface ZoneInsightsReport {
  zoneLabel: string;
  radiusKm: number;
  businessLabel: string;
  competition: {
    count: number; premiumCount: number; densityPerKm2: number;
    avgRating: number | null; ratedCount: number;
    priceMidAvg: number | null; priceSampleN: number;
    schoolsInRadius: number; kindergartensInRadius: number;
    ssdSchoolsInRadius: number; avgMediaEn: number | null;
  };
  demand: { clicks90d: number; pageviews90d: number; searches: number | null };
  premiumSlots: { sector: number; total: number; occupied: number; slots: number; free: number };
  budgetEstimate: {
    budgetLei: number; clicksRange: [number, number]; reachRange: [number, number];
    leadsRange: [number, number]; calibratedAt: string; source: string;
  } | null;
  score: { score: number; demandPct: number; catchmentPct: number; competitionPct: number; premiumSlotsPct: number };
  narrative: string;
}

interface Match { circSchoolId: number; schoolName: string; sector: number | null; streetRaw: string; }
type Location = { kind: 'zone'; zone: string } | { kind: 'circSchoolId'; id: number };

function scoreColor(score: number): string {
  if (score >= 70) return 'var(--color-green)';
  if (score >= 40) return 'var(--color-accent)';
  return 'var(--color-text-light)';
}
function scoreLabel(score: number): string {
  if (score >= 70) return 'Zonă cu potențial ridicat';
  if (score >= 40) return 'Zonă echilibrată';
  return 'Zonă saturată';
}

function ScoreGauge({ score }: { score: number }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color = scoreColor(score);
  return (
    <div className="relative w-36 h-36 flex-shrink-0">
      <div
        className="absolute inset-2 rounded-full blur-2xl opacity-25"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <svg viewBox="0 0 120 120" className="relative w-36 h-36 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .5s ease, stroke .5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-bold text-[var(--color-text-main)]">{score}</span>
        <span className="text-[10px] text-[var(--color-text-light)]">din 100</span>
      </div>
    </div>
  );
}

const FACTOR_META: Record<string, { icon: string; label: string; info: string }> = {
  demand: {
    icon: '🔥', label: 'Cerere observată',
    info: 'Câte click-uri pe telefon/site și câte vizualizări de pagină au avut listările din zonă în ultimele 90 de zile, comparat cu toate cartierele Bucureștiului. Procent mare înseamnă interes mare din partea părinților.',
  },
  catchment: {
    icon: '👨‍👩‍👧', label: 'Școli și grădinițe apropiate',
    info: 'Câte școli și grădinițe sunt în raza aleasă, comparat cu toate cartierele (nu avem date despre numărul exact de copii din ele). Procent mare înseamnă un bazin mai mare de familii cu copii aproape de tine.',
  },
  competition: {
    icon: '🛡️', label: 'Concurență redusă',
    info: 'Cât de puțină concurență directă există în zonă, comparat cu toate cartierele. Atenție: e deja inversat, procent mare = puțini concurenți, deci e bine pentru tine (nu invers).',
  },
  premium: {
    icon: '⭐', label: 'Sloturi Premium libere',
    info: 'Câte locuri de promovare Premium mai sunt libere în zonă, comparat cu toate cartierele. Procent mare înseamnă că e mai ușor să fii vizibil printre primii chiar acum.',
  },
};

function FactorRow({
  id, pct, expanded, onToggle,
}: { id: keyof typeof FACTOR_META; pct: number; expanded: boolean; onToggle: () => void }) {
  const meta = FACTOR_META[id];
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 group text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-main)] font-medium">
          <span aria-hidden="true">{meta.icon}</span>
          <span>{meta.label}</span>
          <span className="w-3.5 h-3.5 rounded-full border border-[var(--color-text-light)] text-[var(--color-text-light)] flex items-center justify-center text-[9px] leading-none opacity-60 group-hover:opacity-100 transition-opacity">
            i
          </span>
        </span>
        <span className="tabular-nums text-xs font-bold" style={{ color: scoreColor(pct) }}>{pct}%</span>
      </button>
      <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden mt-1">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: scoreColor(pct), transition: 'width .5s ease' }}
        />
      </div>
      {expanded && (
        <p className="text-[11px] text-[var(--color-text-light)] leading-relaxed mt-1.5 pl-0.5">
          {meta.info}
        </p>
      )}
    </div>
  );
}

export default function ZoneInsights({ onWantPremium }: { onWantPremium?: () => void }) {
  const [businessType, setBusinessType] = useState<BusinessType>('afterschool');
  const [clubCategory, setClubCategory] = useState<ClubCategory>('inot');
  const [radiusKm, setRadiusKm] = useState(3);

  const [mode, setMode] = useState<'address' | 'zone'>('zone');
  const [addressInput, setAddressInput] = useState('');
  const [zoneQuery, setZoneQuery] = useState('');
  const [zoneOpen, setZoneOpen] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [budget, setBudget] = useState('');
  const [report, setReport] = useState<ZoneInsightsReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  const [narrative, setNarrative] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiGenerated, setAiGenerated] = useState(false);

  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

  const mountedOnce = useRef(false);
  const zoneBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildParams(extra: Record<string, string> = {}) {
    const params = new URLSearchParams({ type: businessType, radiusKm: String(radiusKm), ...extra });
    if (businessType === 'club') params.set('clubCategory', clubCategory);
    if (budget) params.set('budget', budget);
    return params;
  }

  async function fetchReportFor(loc: Location) {
    setReportLoading(true);
    setReportError('');
    const params = buildParams(loc.kind === 'zone' ? { zone: loc.zone } : { circSchoolId: String(loc.id) });
    try {
      const res = await fetch(`/api/zone-insights?${params.toString()}`);
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setNarrative(data.report.narrative);
        setAiGenerated(false);
        setAiError('');
      } else {
        setReportError(data.error || 'Nu am putut calcula raportul pentru această zonă.');
        setReport(null);
      }
    } catch {
      setReportError('Eroare de rețea. Încearcă din nou.');
      setReport(null);
    }
    setReportLoading(false);
  }

  // Rezolvarea adresei, debounced 250ms, dupa acelasi tipar ca CircSearch.tsx. Raspunsul poate fi
  // deja raportul complet (adresa unica -> o singura scoala de circumscriptie), o lista de potriviri
  // ambigue (userul alege), sau sugestii fuzzy (nicio potrivire exacta).
  useEffect(() => {
    if (mode !== 'address') return;
    if (addressInput.trim().length < 3) { setMatches([]); setSuggestions([]); return; }
    setAddressLoading(true);
    const timer = setTimeout(async () => {
      const params = buildParams({ address: addressInput.trim() });
      try {
        const res = await fetch(`/api/zone-insights?${params.toString()}`);
        const data = await res.json();
        if (data.report) {
          setLocation({ kind: 'circSchoolId', id: data.circSchoolId });
          setReport(data.report);
          setNarrative(data.report.narrative);
          setAiGenerated(false);
          setAiError('');
          setMatches([]);
          setSuggestions([]);
          logSearch({
            query: addressInput.trim(), source: 'zone_insights_address',
            sector: data.report.premiumSlots?.sector ?? null, resolved: true,
          });
        } else if (data.matches && data.matches.length > 0) {
          setMatches(data.matches);
          setSuggestions([]);
          setReport(null);
          setLocation(null);
          logSearch({ query: addressInput.trim(), source: 'zone_insights_address', resolved: false });
        } else {
          setSuggestions(data.suggestions || []);
          setMatches([]);
          setReport(null);
          setLocation(null);
          logSearch({ query: addressInput.trim(), source: 'zone_insights_address', resolved: false });
        }
      } catch {
        setReportError('Eroare de rețea. Încearcă din nou.');
      }
      setAddressLoading(false);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressInput, mode]);

  // Cand tipul de afacere, categoria de club sau raza se schimba DUPA ce o locatie e deja aleasa,
  // recalculam raportul pentru aceeasi locatie. Nu ruleaza la montare (nu exista inca locatie).
  useEffect(() => {
    if (!mountedOnce.current) { mountedOnce.current = true; return; }
    if (!location) return;
    fetchReportFor(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessType, radiusKm, clubCategory]);

  // Bugetul se recalculeaza separat, cu propriul debounce, ca sa nu tragem cerere la fiecare cifra tastata.
  useEffect(() => {
    if (!location) return;
    const timer = setTimeout(() => fetchReportFor(location), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget]);

  function pickZone(zone: string) {
    setZoneQuery(zone);
    setZoneOpen(false);
    setMatches([]);
    setSuggestions([]);
    if (!zone) { setReport(null); setLocation(null); return; }
    const loc: Location = { kind: 'zone', zone };
    setLocation(loc);
    fetchReportFor(loc);
    const centroid = ZONE_CENTROIDS.find(([name]) => name === zone);
    logSearch({
      query: zone, source: 'zone_insights_zone',
      lat: centroid?.[1] ?? null, lng: centroid?.[2] ?? null, resolved: true,
    });
  }

  function pickMatch(m: Match) {
    setMatches([]);
    const loc: Location = { kind: 'circSchoolId', id: m.circSchoolId };
    setLocation(loc);
    fetchReportFor(loc);
    logSearch({ query: m.schoolName, source: 'zone_insights_match', sector: m.sector, resolved: true });
  }

  const zoneMatches = (() => {
    const q = stripDiacritics(zoneQuery.trim());
    if (!q) return ZONE_CENTROIDS;
    return ZONE_CENTROIDS.filter(([name]) => stripDiacritics(name).includes(q));
  })();

  async function generateAiNarrative() {
    if (!location) return;
    setAiLoading(true);
    setAiError('');
    const body: Record<string, unknown> = { type: businessType, radiusKm };
    if (businessType === 'club') body.clubCategory = clubCategory;
    if (budget) body.budget = parseFloat(budget);
    if (location.kind === 'zone') body.zone = location.zone;
    else body.circSchoolId = location.id;
    try {
      const res = await fetch('/api/zone-insights/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setNarrative(data.narrative);
        setAiGenerated(!!data.aiGenerated);
      } else {
        setAiError(data.error || 'Interpretarea AI nu e disponibilă momentan.');
      }
    } catch {
      setAiError('Eroare de rețea. Textul de mai jos rămâne valabil.');
    }
    setAiLoading(false);
  }

  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6" style={{ background: 'var(--hero-grad)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-white/70 border border-white"
            aria-hidden="true"
          >
            📍
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--color-text-main)]">Potențialul zonei</h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-light)]">Cerere reală, concurență și cost estimat de trafic, calculate din datele ActivKids</p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Tip afacere */}
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-light)] mb-2">Ce tip de afacere ai?</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(BUSINESS_META) as BusinessType[]).map((t) => {
              const meta = BUSINESS_META[t];
              const active = businessType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBusinessType(t)}
                  className="py-2.5 px-1 rounded-xl text-xs sm:text-sm font-semibold border-2 transition-all flex flex-col items-center gap-1"
                  style={active
                    ? { borderColor: meta.color, color: meta.color, backgroundColor: `color-mix(in srgb, ${meta.color} 10%, transparent)` }
                    : { borderColor: 'var(--color-border)', color: 'var(--color-text-light)' }}
                >
                  <span className="text-base leading-none" aria-hidden="true">{meta.icon}</span>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {businessType === 'club' && (
          <select
            value={clubCategory}
            onChange={(e) => setClubCategory(e.target.value as ClubCategory)}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none"
          >
            {Object.entries(CLUB_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        )}

        {/* Raza */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[var(--color-text-light)]">Rază de căutare</p>
            <p className="text-sm font-bold text-[var(--color-primary)] tabular-nums">{radiusKm} km</p>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-[var(--color-primary)]"
            aria-label="Raza de cautare in kilometri"
          />
          <div className="flex justify-between text-[10px] text-[var(--color-text-light)] px-0.5">
            <span>1 km</span>
            <span>2 km</span>
            <span>3 km</span>
            <span>4 km</span>
            <span>5 km</span>
          </div>
        </div>

        {/* Locatie: cartier (implicit) sau adresa */}
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-light)] mb-2">Unde cauți?</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMode('zone')}
              className="py-3.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2"
              style={mode === 'zone'
                ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }
                : { borderColor: 'var(--color-border)', color: 'var(--color-text-light)' }}
            >
              <span aria-hidden="true">🧭</span> Cartier
            </button>
            <button
              type="button"
              onClick={() => setMode('address')}
              className="py-3.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2"
              style={mode === 'address'
                ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }
                : { borderColor: 'var(--color-border)', color: 'var(--color-text-light)' }}
            >
              <span aria-hidden="true">🏠</span> Stradă / adresă
            </button>
          </div>

          {mode === 'zone' ? (
            <div className="relative">
              <input
                type="text"
                value={zoneQuery}
                onChange={(e) => { setZoneQuery(e.target.value); setZoneOpen(true); if (!e.target.value) { setLocation(null); setReport(null); } }}
                onFocus={() => setZoneOpen(true)}
                onBlur={() => { zoneBlurTimer.current = setTimeout(() => setZoneOpen(false), 150); }}
                placeholder="Scrie un cartier: Militari, Titan, Drumul Taberei..."
                className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                autoComplete="off"
                aria-label="Nume cartier"
              />
              {zoneOpen && (
                <div className="absolute z-10 mt-1.5 w-full max-h-56 overflow-y-auto bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-md py-1">
                  {zoneMatches.length > 0 ? zoneMatches.map(([name]) => (
                    <button
                      key={name}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); if (zoneBlurTimer.current) clearTimeout(zoneBlurTimer.current); pickZone(name); }}
                      className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-bg)] transition-colors"
                    >
                      {name}
                    </button>
                  )) : (
                    <p className="px-4 py-2 text-xs text-[var(--color-text-light)]">Niciun cartier găsit.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Ex: Șos. Pantelimon 260"
              className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          )}

          {mode === 'address' && addressLoading && (
            <p className="text-xs text-[var(--color-text-light)] mt-2">Se caută...</p>
          )}
          {mode === 'address' && !addressLoading && matches.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-[var(--color-text-light)]">Strada este împărțită între mai multe școli, alege intervalul tău:</p>
              {matches.map((m) => (
                <button
                  key={m.circSchoolId}
                  type="button"
                  onClick={() => pickMatch(m)}
                  className="w-full text-left px-3 py-2 border border-[var(--color-border)] rounded-xl text-xs hover:border-[var(--color-primary)] transition-colors"
                >
                  <span className="font-semibold text-[var(--color-text-main)]">{m.schoolName}</span>
                  <span className="text-[var(--color-text-light)]"> · {m.streetRaw}</span>
                </button>
              ))}
            </div>
          )}
          {mode === 'address' && !addressLoading && matches.length === 0 && suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-[var(--color-text-light)] mb-1.5">Nu am găsit exact această stradă. Poate ai vrut:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAddressInput(s)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buget optional */}
        <div>
          <label className="text-xs font-semibold text-[var(--color-text-light)] mb-2 block">
            Buget lunar de reclamă (opțional, lei)
          </label>
          <input
            type="number"
            min="0"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Ex: 500"
            className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {reportError && (
          <p className="text-sm text-[var(--color-danger)]">{reportError}</p>
        )}
        {reportLoading && (
          <p className="text-sm text-[var(--color-text-light)]">Se calculează raportul...</p>
        )}

        {report && !reportLoading && (
          <div className="border-t border-[var(--color-border)] pt-6 space-y-6">
            {/* Scor */}
            <div>
              <div className="flex items-center gap-5">
                <ScoreGauge score={report.score.score} />
                <div className="flex-1 space-y-3">
                  <span
                    className="inline-block text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ color: scoreColor(report.score.score), backgroundColor: `color-mix(in srgb, ${scoreColor(report.score.score)} 14%, transparent)` }}
                  >
                    {scoreLabel(report.score.score)}
                  </span>
                  <FactorRow id="demand" pct={report.score.demandPct} expanded={expandedFactor === 'demand'} onToggle={() => setExpandedFactor(expandedFactor === 'demand' ? null : 'demand')} />
                  <FactorRow id="catchment" pct={report.score.catchmentPct} expanded={expandedFactor === 'catchment'} onToggle={() => setExpandedFactor(expandedFactor === 'catchment' ? null : 'catchment')} />
                  <FactorRow id="competition" pct={report.score.competitionPct} expanded={expandedFactor === 'competition'} onToggle={() => setExpandedFactor(expandedFactor === 'competition' ? null : 'competition')} />
                  <FactorRow id="premium" pct={report.score.premiumSlotsPct} expanded={expandedFactor === 'premium'} onToggle={() => setExpandedFactor(expandedFactor === 'premium' ? null : 'premium')} />
                </div>
              </div>
              <p className="text-[11px] text-[var(--color-text-light)] leading-relaxed mt-3">
                Fiecare procent arată cum stă zona ta față de toate cele ~43 de cartiere ale Bucureștiului la acel factor (100% = cea mai bună zonă din oraș). Atinge un factor pentru detalii.
              </p>
            </div>

            {/* Concurenta */}
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-2 flex items-center gap-1.5">
                <span aria-hidden="true">🏆</span> Concurență în {report.radiusKm} km, {report.zoneLabel}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[var(--color-bg)] rounded-xl p-3">
                  <p className="text-[var(--color-text-light)] text-xs">{report.businessLabel}</p>
                  <p className="font-bold text-[var(--color-text-main)] text-lg tabular-nums">{report.competition.count}</p>
                  <p className="text-[10px] text-[var(--color-text-light)]">din care {report.competition.premiumCount} Premium</p>
                </div>
                <div className="bg-[var(--color-bg)] rounded-xl p-3">
                  <p className="text-[var(--color-text-light)] text-xs">Densitate</p>
                  <p className="font-bold text-[var(--color-text-main)] text-lg tabular-nums">{report.competition.densityPerKm2.toFixed(1)}</p>
                  <p className="text-[10px] text-[var(--color-text-light)]">listări / km²</p>
                </div>
                <div className="bg-[var(--color-bg)] rounded-xl p-3">
                  <p className="text-[var(--color-text-light)] text-xs">Școli & grădinițe</p>
                  <p className="font-bold text-[var(--color-text-main)] text-lg tabular-nums">
                    {businessType === 'kindergarten'
                      ? report.competition.kindergartensInRadius
                      : report.competition.schoolsInRadius + report.competition.kindergartensInRadius}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-light)]">
                    {businessType === 'kindergarten'
                      ? 'grădinițe în apropiere'
                      : `${report.competition.schoolsInRadius} școli, ${report.competition.kindergartensInRadius} grădinițe`}
                  </p>
                </div>
                {report.competition.priceSampleN >= 3 && report.competition.priceMidAvg != null && (
                  <div className="bg-[var(--color-bg)] rounded-xl p-3">
                    <p className="text-[var(--color-text-light)] text-xs">Preț mediu observat</p>
                    <p className="font-bold text-[var(--color-text-main)] text-lg tabular-nums">{Math.round(report.competition.priceMidAvg)} lei</p>
                    <p className="text-[10px] text-[var(--color-text-light)]">eșantion {report.competition.priceSampleN} listări</p>
                  </div>
                )}
              </div>
              {businessType === 'afterschool' && report.competition.ssdSchoolsInRadius > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                  {report.competition.ssdSchoolsInRadius} {report.competition.ssdSchoolsInRadius === 1 ? 'școală are' : 'școli au'} deja program propriu de tip Școală după școală în zonă (concurență directă).
                </p>
              )}
            </div>

            {/* Cerere */}
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-2 flex items-center gap-1.5">
                <span aria-hidden="true">🔥</span> Cerere observată pe ActivKids (ultimele 90 de zile)
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[var(--color-bg)] rounded-xl p-3">
                  <p className="text-[var(--color-text-light)] text-xs">Clickuri (telefon/site/hartă)</p>
                  <p className="font-bold text-[var(--color-text-main)] text-lg tabular-nums">{report.demand.clicks90d}</p>
                </div>
                <div className="bg-[var(--color-bg)] rounded-xl p-3">
                  <p className="text-[var(--color-text-light)] text-xs">Vizualizări pagini</p>
                  <p className="font-bold text-[var(--color-text-main)] text-lg tabular-nums">{report.demand.pageviews90d}</p>
                </div>
              </div>
            </div>

            {/* Premium slots */}
            <div className="rounded-xl p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
              <p className="text-sm text-[var(--color-text-main)]">
                În Sectorul {report.premiumSlots.sector} sunt <strong>{report.premiumSlots.total}</strong> {report.businessLabel.toLowerCase()},
                cu <strong>{report.premiumSlots.slots}</strong> sloturi de promovare, din care <strong>{report.premiumSlots.occupied}</strong> ocupate.
              </p>
              <p className="text-sm font-semibold text-[var(--color-primary)] mt-1">
                {report.premiumSlots.free > 0
                  ? `${report.premiumSlots.free} ${report.premiumSlots.free === 1 ? 'slot liber' : 'sloturi libere'} chiar acum.`
                  : 'Toate sloturile sunt ocupate momentan, dar rotația periodică îți poate aduce vizibilitate.'}
              </p>
            </div>

            {/* Buget estimat */}
            {report.budgetEstimate && (
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-1 flex items-center gap-1.5">
                  <span aria-hidden="true">💰</span> Cât te costă să aduci trafic pe site din Facebook
                </h3>
                <p className="text-xs text-[var(--color-text-light)] mb-2">
                  Cu un buget de {report.budgetEstimate.budgetLei} lei cheltuit pe reclame Facebook care trimit vizitatori pe site-ul tău, estimăm:
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-[var(--color-bg)] rounded-xl p-3 text-center">
                    <p className="font-bold text-[var(--color-text-main)] tabular-nums">{report.budgetEstimate.clicksRange[0]}-{report.budgetEstimate.clicksRange[1]}</p>
                    <p className="text-[10px] text-[var(--color-text-light)]">vizite pe site</p>
                  </div>
                  <div className="bg-[var(--color-bg)] rounded-xl p-3 text-center">
                    <p className="font-bold text-[var(--color-text-main)] tabular-nums">{report.budgetEstimate.reachRange[0]}-{report.budgetEstimate.reachRange[1]}</p>
                    <p className="text-[10px] text-[var(--color-text-light)]">persoane atinse</p>
                  </div>
                  <div className="bg-[var(--color-bg)] rounded-xl p-3 text-center">
                    <p className="font-bold text-[var(--color-text-main)] tabular-nums">{report.budgetEstimate.leadsRange[0]}-{report.budgetEstimate.leadsRange[1]}</p>
                    <p className="text-[10px] text-[var(--color-text-light)]">contacte potențiale</p>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--color-text-light)] mt-2">
                  Estimare orientativă din campaniile proprii ActivKids, nu date live Meta. Calibrată ultima dată: {report.budgetEstimate.calibratedAt} ({report.budgetEstimate.source}). Cifrele nu variază pe cartier, doar pe buget.
                </p>
              </div>
            )}

            {/* Interpretare */}
            <div className="bg-[var(--color-bg)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[var(--color-text-light)]">
                  {aiGenerated ? 'Interpretare (Claude)' : 'Interpretare'}
                </p>
                <button
                  type="button"
                  onClick={generateAiNarrative}
                  disabled={aiLoading}
                  className="text-xs font-semibold text-[var(--color-primary)] disabled:opacity-50"
                >
                  {aiLoading ? 'Se generează...' : '✨ Regenerează cu AI'}
                </button>
              </div>
              <p className="text-sm text-[var(--color-text-main)]">{narrative}</p>
              {aiError && <p className="text-xs text-[var(--color-danger)] mt-2">{aiError}</p>}
            </div>

            {/* CTA Premium */}
            <button
              type="button"
              onClick={onWantPremium}
              className="w-full py-3.5 text-white rounded-xl text-sm font-bold transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', boxShadow: 'var(--shadow-brand)' }}
            >
              Vreau vizibilitate Premium în {report.zoneLabel} <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
