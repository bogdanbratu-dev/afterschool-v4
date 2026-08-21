import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { readSpotlightConfig, readZoneSpotlightConfig, spotlightCount } from '@/lib/premiumRanking';
import { getZone } from '@/lib/zones';

const TABLES: { table: string; label: string }[] = [
  { table: 'afterschools', label: 'Afterschool' },
  { table: 'clubs', label: 'Activitati' },
  { table: 'kindergartens', label: 'Gradinite' },
  { table: 'professionals', label: 'Colaboratori' },
  { table: 'tutors', label: 'Meditatii' },
  { table: 'caterers', label: 'Catering' },
];

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const globalCfg = readSpotlightConfig(db);

  type Row = {
    table: string; label: string; sector: number | null;
    total: number; premium: number; k: number; occupiedSlots: number;
    occupancy: number; untilHalf: number; alertLevel: 'ok' | 'near' | 'over';
    hasOverride: boolean;
  };
  type ZoneRow = {
    table: string; label: string; zone: string;
    total: number; premium: number; k: number; occupiedSlots: number;
    occupancy: number; untilHalf: number; alertLevel: 'ok' | 'near' | 'over';
  };

  const rows: Row[] = [];
  const zoneRows: ZoneRow[] = [];
  const rank = (l: string) => (l === 'over' ? 2 : l === 'near' ? 1 : 0);

  for (const { table, label } of TABLES) {
    try {
      // sector-level
      const agg = db.prepare(
        `SELECT sector, COUNT(*) AS total, SUM(CASE WHEN is_premium = 1 THEN 1 ELSE 0 END) AS premium
         FROM ${table} GROUP BY sector`
      ).all() as { sector: number | null; total: number; premium: number }[];

      for (const a of agg) {
        const total = a.total;
        const premium = a.premium || 0;
        const cfg = readZoneSpotlightConfig(db, table, a.sector);
        const hasOverride = JSON.stringify(cfg) !== JSON.stringify(globalCfg);
        const k = spotlightCount(total, premium, cfg);
        const alertCount = Math.floor(total * cfg.alertRatio) + 1;
        const untilHalf = alertCount - premium;
        const MIN_ZONE = 4;
        const alertLevel: Row['alertLevel'] =
          total < MIN_ZONE ? 'ok' : untilHalf <= 0 ? 'over' : untilHalf === 1 ? 'near' : 'ok';
        rows.push({
          table, label, sector: a.sector,
          total, premium, k,
          occupiedSlots: Math.min(premium, k),
          occupancy: total ? premium / total : 0,
          untilHalf: Math.max(0, untilHalf),
          alertLevel, hasOverride,
        });
      }

      // zone (cartier) level
      const businesses = db.prepare(
        `SELECT lat, lng, is_premium FROM ${table} WHERE lat IS NOT NULL AND lng IS NOT NULL AND lat != 0 AND lng != 0`
      ).all() as { lat: number; lng: number; is_premium: number }[];

      const zoneMap = new Map<string, { total: number; premium: number }>();
      for (const b of businesses) {
        const zone = getZone(b.lat, b.lng);
        const cur = zoneMap.get(zone) ?? { total: 0, premium: 0 };
        cur.total++;
        if (b.is_premium) cur.premium++;
        zoneMap.set(zone, cur);
      }

      for (const [zone, { total, premium }] of zoneMap) {
        if (total < 2) continue;
        const k = spotlightCount(total, premium, globalCfg);
        const alertCount = Math.floor(total * globalCfg.alertRatio) + 1;
        const untilHalf = alertCount - premium;
        const MIN_ZONE = 3;
        const alertLevel: ZoneRow['alertLevel'] =
          total < MIN_ZONE ? 'ok' : untilHalf <= 0 ? 'over' : untilHalf === 1 ? 'near' : 'ok';
        zoneRows.push({
          table, label, zone,
          total, premium, k,
          occupiedSlots: Math.min(premium, k),
          occupancy: total ? premium / total : 0,
          untilHalf: Math.max(0, untilHalf),
          alertLevel,
        });
      }
    } catch { /* table without required columns */ }
  }

  rows.sort((x, y) =>
    rank(y.alertLevel) - rank(x.alertLevel) ||
    y.occupancy - x.occupancy ||
    x.label.localeCompare(y.label) ||
    (x.sector ?? 99) - (y.sector ?? 99)
  );
  zoneRows.sort((x, y) =>
    rank(y.alertLevel) - rank(x.alertLevel) ||
    y.occupancy - x.occupancy ||
    x.label.localeCompare(y.label) ||
    x.zone.localeCompare(y.zone)
  );

  return NextResponse.json({ config: globalCfg, rows, zoneRows });
}
