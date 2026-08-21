import type Database from 'better-sqlite3';
import { getEffectiveBenchmarks, type AdBenchmarks, type CalibratedBenchmarks, CALIBRATION_SETTINGS_KEY } from './adBenchmarks';

// Agrega randurile din ad_campaign_imports (vezi src/lib/adCsvParser.ts + admin/ad-calibration/*)
// in noi intervale de benchmark. Foloseste EXCLUSIV randuri etichetate manual cu objective='trafic':
// o campanie cu alt obiectiv (ex. followers, engagement) masoara alt tip de cost si nu e un proxy
// valid pentru CPC/CPM de trafic pe site (vezi comentariul din adBenchmarks.ts si discutia care a
// stabilit aceasta constrangere).

export interface AdCampaignImportRow {
  id: number;
  batch_id: string;
  campaign_name: string | null;
  ad_set_name: string | null;
  date_start: string | null;
  date_stop: string | null;
  amount_spent_lei: number | null;
  impressions: number | null;
  reach: number | null;
  link_clicks: number | null;
  ctr_pct: number | null;
  cpc_lei: number | null;
  cpm_lei: number | null;
  results: number | null;
  cost_per_result_lei: number | null;
  objective: string | null;
  category: string | null;
  imported_at: number;
}

const MIN_SAMPLE_SIZE = 3;

function percentileRange(values: number[], loPct: number, hiPct: number): [number, number] | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pick = (p: number) => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  if (sorted.length < MIN_SAMPLE_SIZE) return [sorted[0], sorted[sorted.length - 1]];
  return [pick(loPct), pick(hiPct)];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface RecalibrationResult {
  ok: boolean;
  error?: string;
  benchmarks?: AdBenchmarks;
  sampleSize?: number;
}

// Recalculeaza benchmark-urile din randurile objective='trafic' si le salveaza in settings, luand
// locul constantelor statice oriunde estimateBudget(budgetLei, db) e apelat cu db prezent. Fiecare
// din cele 3 metrici (cpc, cpm, rata lead) se recalibreaza independent - daca una nu are destule
// date valide, ramane la valoarea curenta (statica sau deja calibrata anterior) in loc sa blocheze
// tot procesul sau sa scrie un interval fabricat dintr-un esantion insuficient.
export function recalibrateFromImports(db: Database.Database): RecalibrationResult {
  const rows = db
    .prepare(`SELECT * FROM ad_campaign_imports WHERE objective = 'trafic'`)
    .all() as AdCampaignImportRow[];

  const cpcValues: number[] = [];
  const cpmValues: number[] = [];
  const leadPctValues: number[] = [];

  for (const r of rows) {
    if (r.amount_spent_lei != null && r.amount_spent_lei > 0 && r.link_clicks != null && r.link_clicks > 0) {
      cpcValues.push(r.amount_spent_lei / r.link_clicks);
      if (r.results != null && r.results > 0 && r.results <= r.link_clicks) {
        leadPctValues.push((r.results / r.link_clicks) * 100);
      }
    }
    if (r.amount_spent_lei != null && r.amount_spent_lei > 0 && r.impressions != null && r.impressions > 0) {
      cpmValues.push((r.amount_spent_lei / r.impressions) * 1000);
    }
  }

  if (cpcValues.length < MIN_SAMPLE_SIZE) {
    return {
      ok: false,
      error: `Esantion prea mic: doar ${cpcValues.length} randuri objective='trafic' cu cost si clickuri valide (minim ${MIN_SAMPLE_SIZE}). Importa mai multe campanii sau eticheteaza mai multe randuri inainte de a recalibra.`,
    };
  }

  const current: CalibratedBenchmarks = getEffectiveBenchmarks(db);

  const cpcRange = percentileRange(cpcValues, 0.25, 0.75);
  const cpmRange = percentileRange(cpmValues, 0.25, 0.75);
  const leadRange = percentileRange(leadPctValues, 0.25, 0.75);

  const benchmarks: AdBenchmarks = {
    cpcLei: cpcRange ? [round2(cpcRange[0]), round2(cpcRange[1])] : current.benchmarks.cpcLei,
    cpmLei: cpmRange ? [round2(cpmRange[0]), round2(cpmRange[1])] : current.benchmarks.cpmLei,
    landingToLeadPct: leadRange ? [round2(leadRange[0]), round2(leadRange[1])] : current.benchmarks.landingToLeadPct,
  };

  const payload: CalibratedBenchmarks = {
    benchmarks,
    calibratedAt: new Date().toISOString().slice(0, 10),
    source: `recalibrat din ${cpcValues.length} campanii proprii importate (objective=trafic)`,
    sampleSize: cpcValues.length,
  };

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    CALIBRATION_SETTINGS_KEY,
    JSON.stringify(payload)
  );

  return { ok: true, benchmarks, sampleSize: cpcValues.length };
}
