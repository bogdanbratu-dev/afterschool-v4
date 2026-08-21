import type Database from 'better-sqlite3';

// Benchmark-uri pentru estimarea de trafic/lead-uri dintr-un buget Facebook Ads, folosite de
// widgetul public "Potentialul zonei" (src/lib/zoneInsights.ts, /promovare). Deliberat NU sunt
// obtinute printr-un apel live catre Meta Marketing API: contul Meta care administreaza Pagina
// ActivKids a trecut printr-o restrictie de securitate, iar afisarea publica a estimarilor de
// audienta/reach ale unui singur ad account catre zeci de afaceri terte intra in zona pe care
// Platform Terms o restrictioneaza (redistribuire de Platform Data catre non-utilizatori ai
// contului). In loc de asta, valorile de mai jos sunt calibrate manual, periodic, din rezultatele
// campaniilor PROPRII rulate de ActivKids pe publicul de parinti din Bucuresti (niciun apel Meta
// nu porneste din acest site). Data ultimei calibrari se afiseaza in widget, ca sa fie clar ca sunt
// estimari orientative, nu date live.
//
// Cum se recalibreaza: dupa o campanie Facebook noua, se ia din Ads Manager CPC-ul si CPM-ul mediu
// obtinut pe audienta relevanta (parinti Bucuresti/Ilfov), se actualizeaza intervalele de mai jos
// si se schimba CALIBRATED_AT. Rata de conversie landing->lead se ia din numarul real de formulare/
// WhatsApp-uri primite in acea perioada raportat la clickurile din campanie.
//
// Alternativ, exista si o cale automata: admin-ul importa CSV-uri exportate din Meta Ads Manager
// (tab "Calibrare reclame" din /admin, vezi src/lib/adCsvParser.ts + ad_campaign_imports in db.ts),
// eticheteaza manual randurile relevante cu objective='trafic' (o campanie cu alt obiectiv, ex.
// followers, masoara alt tip de cost si nu e proxy valid), apoi apasa recalibrare. Rezultatul se
// salveaza in settings sub cheia ad_benchmarks_override si ia locul constantelor de mai jos oriunde
// se cheama estimateBudget(budgetLei, db) cu db prezent - vezi getEffectiveBenchmarks().

export const CALIBRATED_AT = '2026-08-17';
export const CALIBRATION_SOURCE = 'estimare orientativa (necalibrata inca din campanie reala)';

export interface AdBenchmarks {
  cpcLei: [number, number];       // cost per click, lei
  cpmLei: [number, number];       // cost per 1000 afisari, lei
  landingToLeadPct: [number, number]; // % din clickuri care devin lead (telefon/formular)
}

export const AD_BENCHMARKS: AdBenchmarks = {
  cpcLei: [1.5, 3.2],
  cpmLei: [18, 32],
  landingToLeadPct: [3, 8],
};

export interface BudgetEstimate {
  budgetLei: number;
  clicksRange: [number, number];
  reachRange: [number, number];
  leadsRange: [number, number];
  calibratedAt: string;
  source: string;
}

export const CALIBRATION_SETTINGS_KEY = 'ad_benchmarks_override';

export interface CalibratedBenchmarks {
  benchmarks: AdBenchmarks;
  calibratedAt: string;
  source: string;
  sampleSize?: number;
}

// Citeste override-ul salvat de recalibrarea din CSV (settings.ad_benchmarks_override), daca exista
// si e valid; altfel cade pe constantele statice de mai sus. db e optional ca sa nu strice apelurile
// existente care nu au nevoie de recalibrare (nicio alta suprafata din site nu foloseste asta inca).
export function getEffectiveBenchmarks(db?: Database.Database): CalibratedBenchmarks {
  if (db) {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(CALIBRATION_SETTINGS_KEY) as
        | { value: string }
        | undefined;
      if (row?.value) {
        const parsed = JSON.parse(row.value);
        if (parsed?.benchmarks?.cpcLei && parsed?.benchmarks?.cpmLei && parsed?.benchmarks?.landingToLeadPct) {
          return {
            benchmarks: parsed.benchmarks,
            calibratedAt: parsed.calibratedAt || CALIBRATED_AT,
            source: parsed.source || CALIBRATION_SOURCE,
            sampleSize: parsed.sampleSize,
          };
        }
      }
    } catch {}
  }
  return { benchmarks: AD_BENCHMARKS, calibratedAt: CALIBRATED_AT, source: CALIBRATION_SOURCE };
}

export function estimateBudget(budgetLei: number, db?: Database.Database): BudgetEstimate | null {
  if (!Number.isFinite(budgetLei) || budgetLei <= 0) return null;
  const { benchmarks, calibratedAt, source } = getEffectiveBenchmarks(db);
  const { cpcLei, cpmLei, landingToLeadPct } = benchmarks;

  // buget mai mic imparte la CPC mai mare (limita superioara de cost) -> limita inferioara de clickuri
  const clicksMin = Math.round(budgetLei / cpcLei[1]);
  const clicksMax = Math.round(budgetLei / cpcLei[0]);
  const reachMin = Math.round((budgetLei / cpmLei[1]) * 1000);
  const reachMax = Math.round((budgetLei / cpmLei[0]) * 1000);
  const leadsMin = Math.max(0, Math.round(clicksMin * (landingToLeadPct[0] / 100)));
  const leadsMax = Math.max(leadsMin, Math.round(clicksMax * (landingToLeadPct[1] / 100)));

  return {
    budgetLei,
    clicksRange: [clicksMin, clicksMax],
    reachRange: [reachMin, reachMax],
    leadsRange: [leadsMin, leadsMax],
    calibratedAt,
    source,
  };
}
