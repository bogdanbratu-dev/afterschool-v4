import type Database from 'better-sqlite3';

// Tiers de buget pentru ActivKids Growth (campanii Meta Ads gestionate manual). Acelasi model
// get-effective-cu-override-din-settings-si-fallback-static ca adBenchmarks.ts. Valorile de mai
// jos sunt un punct de plecare declarat orientativ - editabile din admin (tab Growth) fara deploy.

export interface GrowthPricingTier {
  key: string;
  label: string;
  budgetLei: number;
}

export interface GrowthPricing {
  tiers: GrowthPricingTier[];
  managementFeeLei: number;
  managementFeePremiumLei: number;
  managementFeePeriodMonths: number;
}

export const GROWTH_PRICING_DEFAULT: GrowthPricing = {
  tiers: [
    { key: 'start', label: 'Start', budgetLei: 300 },
    { key: 'growth', label: 'Growth', budgetLei: 500 },
    { key: 'boost', label: 'Boost', budgetLei: 1000 },
  ],
  managementFeeLei: 150,
  managementFeePremiumLei: 100,
  managementFeePeriodMonths: 3,
};

export const GROWTH_PRICING_SETTINGS_KEY = 'growth_pricing_override';

export function getEffectiveGrowthPricing(db?: Database.Database): GrowthPricing {
  if (db) {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(GROWTH_PRICING_SETTINGS_KEY) as
        | { value: string }
        | undefined;
      if (row?.value) {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed?.tiers) && parsed.tiers.length > 0) {
          return {
            tiers: parsed.tiers,
            managementFeeLei: Number.isFinite(parsed.managementFeeLei) ? parsed.managementFeeLei : GROWTH_PRICING_DEFAULT.managementFeeLei,
            managementFeePremiumLei: Number.isFinite(parsed.managementFeePremiumLei) ? parsed.managementFeePremiumLei : GROWTH_PRICING_DEFAULT.managementFeePremiumLei,
            managementFeePeriodMonths: Number.isFinite(parsed.managementFeePeriodMonths) ? parsed.managementFeePeriodMonths : GROWTH_PRICING_DEFAULT.managementFeePeriodMonths,
          };
        }
      }
    } catch {}
  }
  return GROWTH_PRICING_DEFAULT;
}
