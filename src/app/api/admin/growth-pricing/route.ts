import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { getEffectiveGrowthPricing, GROWTH_PRICING_SETTINGS_KEY, type GrowthPricingTier } from '@/lib/growthPricing';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  return NextResponse.json(getEffectiveGrowthPricing(db));
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  if (!Array.isArray(body.tiers) || body.tiers.length === 0) {
    return NextResponse.json({ error: 'Tiers invalide' }, { status: 400 });
  }

  const tiers: GrowthPricingTier[] = [];
  for (const t of body.tiers as unknown[]) {
    const tier = t as Record<string, unknown>;
    const key = typeof tier.key === 'string' ? tier.key.slice(0, 40) : '';
    const label = typeof tier.label === 'string' ? tier.label.slice(0, 60) : '';
    const budgetLei = Number(tier.budgetLei);
    if (!key || !label || !Number.isFinite(budgetLei) || budgetLei <= 0) {
      return NextResponse.json({ error: 'Tier invalid: ' + JSON.stringify(tier) }, { status: 400 });
    }
    tiers.push({ key, label, budgetLei });
  }

  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    GROWTH_PRICING_SETTINGS_KEY,
    JSON.stringify({ tiers })
  );

  return NextResponse.json({ ok: true, tiers });
}
