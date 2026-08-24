import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { withComputedMetrics, type GrowthCampaignRow } from '@/lib/growthCampaigns';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });

  const db = getDb();
  const rows = db.prepare('SELECT * FROM growth_campaigns ORDER BY created_at DESC').all() as GrowthCampaignRow[];
  return NextResponse.json(rows.map((r) => withComputedMetrics(db, r)));
}
