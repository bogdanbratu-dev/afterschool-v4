import type Database from 'better-sqlite3';
import { TABLE_FOR_TYPE, PAGE_PREFIX, type BusinessType } from './zoneInsights';

// ActivKids Growth acopera doar cele 3 tipuri suportate de motorul de estimare (zoneInsights.ts) -
// vezi fazarea din brief-ul MVP. Alte categorii (meditatii, colaboratori, catering) raman in afara
// scopului pana cand calculatorul de potential le suporta si pe ele.
const GROWTH_LISTING_TYPES: BusinessType[] = ['afterschool', 'kindergarten', 'club'];

export interface OwnGrowthListing {
  type: BusinessType;
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string | null;
}

// Gaseste listarea proprie a userului din sesiune, printre cele 3 tipuri suportate de Growth -
// aceeasi idee ca bucla din api/user/my-listing/route.ts, dar restransa la afterschool/kindergarten/club.
export function resolveOwnGrowthListing(db: Database.Database, userId: number): OwnGrowthListing | null {
  for (const type of GROWTH_LISTING_TYPES) {
    const table = TABLE_FOR_TYPE[type];
    const cols = type === 'club' ? 'id, name, lat, lng, category' : 'id, name, lat, lng';
    const row = db.prepare(`SELECT ${cols} FROM ${table} WHERE owner_user_id = ?`).get(userId) as
      | { id: number; name: string; lat: number; lng: number; category?: string }
      | undefined;
    if (row) return { type, id: row.id, name: row.name, lat: row.lat, lng: row.lng, category: row.category ?? null };
  }
  return null;
}

// Vizite (pageviews pe pagina publica a listarii) + leaduri, calculate la citire pentru fereastra
// campaniei - nu se stocheaza, ca sa nu poata diverge fata de sursa reala de adevar (pageviews/leads).
export function computeCampaignVisitsLeads(
  db: Database.Database,
  listingType: string,
  listingId: number,
  windowStart: number,
  windowEnd: number
): { visits: number; leads: number } {
  const prefixRe = PAGE_PREFIX[listingType as BusinessType];
  let visits = 0;
  if (prefixRe) {
    const pvRows = db.prepare('SELECT page FROM pageviews WHERE timestamp >= ? AND timestamp <= ?').all(windowStart, windowEnd) as {
      page: string;
    }[];
    for (const pv of pvRows) {
      const m = pv.page.match(prefixRe);
      if (m && parseInt(m[1], 10) === listingId) visits++;
    }
  }
  const leadsRow = db
    .prepare('SELECT COUNT(*) as c FROM leads WHERE listing_type = ? AND listing_id = ? AND created_at >= ? AND created_at <= ?')
    .get(listingType, listingId, windowStart, windowEnd) as { c: number };
  return { visits, leads: leadsRow.c };
}

export interface GrowthCampaignRow {
  id: number;
  user_id: number;
  listing_type: string;
  listing_id: number;
  listing_name: string;
  radius_km: number;
  budget_tier: string | null;
  budget_lei: number;
  currency: string;
  objective: string | null;
  offer_text: string | null;
  period_desired: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  est_reach_min: number | null;
  est_reach_max: number | null;
  est_clicks_min: number | null;
  est_clicks_max: number | null;
  est_leads_min: number | null;
  est_leads_max: number | null;
  status: 'pending' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';
  spend_actual_lei: number | null;
  impressions_actual: number | null;
  clicks_actual: number | null;
  campaign_start: number | null;
  campaign_end: number | null;
  admin_note: string | null;
  created_at: number;
  reviewed_at: number | null;
}

// Adauga visits/leads calculate doar pentru campaniile active/incheiate (pentru celelalte statusuri
// nu exista inca o fereastra de campanie reala, deci nu are sens si evita un scan per rand in plus).
export function withComputedMetrics<T extends GrowthCampaignRow>(db: Database.Database, row: T): T & { visits: number | null; leads: number | null } {
  if (row.status === 'active' || row.status === 'completed') {
    const { visits, leads } = computeCampaignVisitsLeads(
      db,
      row.listing_type,
      row.listing_id,
      row.campaign_start || row.created_at,
      row.campaign_end || Date.now()
    );
    return { ...row, visits, leads };
  }
  return { ...row, visits: null, leads: null };
}
