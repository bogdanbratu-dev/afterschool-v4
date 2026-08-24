import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';
import { computeZoneInsights, clampRadiusKm } from '@/lib/zoneInsights';
import { resolveOwnGrowthListing } from '@/lib/growthCampaigns';
import { getEffectiveGrowthPricing } from '@/lib/growthPricing';

export async function GET(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const own = resolveOwnGrowthListing(db, user.id);
  if (!own) {
    return NextResponse.json(
      { error: 'Growth este disponibil momentan doar pentru afterschool, gradinita sau club.' },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const radiusKm = clampRadiusKm(searchParams.get('radiusKm'));
  const budgetLei = Number(searchParams.get('budget'));

  const report = computeZoneInsights(db, {
    lat: own.lat,
    lng: own.lng,
    zoneLabel: own.name,
    radiusKm,
    businessType: own.type,
    clubCategory: own.type === 'club' ? own.category : null,
    budgetLei: Number.isFinite(budgetLei) && budgetLei > 0 ? budgetLei : null,
  });

  return NextResponse.json({
    radiusKm,
    competition: {
      count: report.competition.count,
      densityPerKm2: report.competition.densityPerKm2,
      schoolsInRadius: report.competition.schoolsInRadius,
      kindergartensInRadius: report.competition.kindergartensInRadius,
    },
    budgetEstimate: report.budgetEstimate,
    pricing: getEffectiveGrowthPricing(db),
  });
}
