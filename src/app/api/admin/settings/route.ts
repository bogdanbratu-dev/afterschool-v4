import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const set = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  if ('business_mode' in body) {
    set.run('business_mode', body.business_mode ? 'true' : 'false');
  }

  // Config spotlight premium (procent, podea, plafon, fereastra rotatie)
  const spot = body.spotlight;
  if (spot && typeof spot === 'object') {
    const num = (v: unknown, min: number, max: number) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      if (!Number.isFinite(n)) return null;
      return Math.min(max, Math.max(min, n));
    };
    const map: Record<string, number | null> = {
      premium_spotlight_ratio: num(spot.ratio, 0, 1),
      premium_spotlight_min: num(spot.min, 0, 50),
      premium_spotlight_max: num(spot.max, 1, 100),
      premium_rotation_window_min: num(spot.windowMin, 1, 1440),
      premium_zone_alert_ratio: num(spot.alertRatio, 0, 1),
    };
    for (const [k, v] of Object.entries(map)) {
      if (v !== null) set.run(k, String(v));
    }
  }

  return NextResponse.json({ ok: true });
}