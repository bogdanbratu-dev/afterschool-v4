import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';
import { sendAdminNotification } from '@/lib/email';
import { computeZoneInsights, clampRadiusKm } from '@/lib/zoneInsights';
import { resolveOwnGrowthListing, withComputedMetrics, type GrowthCampaignRow } from '@/lib/growthCampaigns';

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM growth_campaigns WHERE user_id = ? ORDER BY created_at DESC')
    .all(user.id) as GrowthCampaignRow[];

  return NextResponse.json({ campaigns: rows.map((r) => withComputedMetrics(db, r)) });
}

export async function POST(request: Request) {
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

  const existing = db
    .prepare("SELECT id FROM growth_campaigns WHERE listing_type = ? AND listing_id = ? AND status = 'pending'")
    .get(own.type, own.id);
  if (existing) {
    return NextResponse.json({ error: 'Ai deja o cerere Growth in asteptare pentru aceasta listare.' }, { status: 409 });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const radiusKm = clampRadiusKm(body.radiusKm);
  const budgetLei = Number(body.budgetLei);
  if (!Number.isFinite(budgetLei) || budgetLei <= 0) {
    return NextResponse.json({ error: 'Buget invalid' }, { status: 400 });
  }
  const budgetTier = typeof body.budgetTier === 'string' ? body.budgetTier.slice(0, 40) : null;

  const report = computeZoneInsights(db, {
    lat: own.lat,
    lng: own.lng,
    zoneLabel: own.name,
    radiusKm,
    businessType: own.type,
    clubCategory: own.type === 'club' ? own.category : null,
    budgetLei,
  });
  const est = report.budgetEstimate;

  const u = db.prepare('SELECT name, email, phone FROM users WHERE id = ?').get(user.id) as {
    name: string;
    email: string;
    phone: string | null;
  };
  const contactName = typeof body.contactName === 'string' && body.contactName.trim() ? body.contactName.trim() : u.name;
  const contactPhone =
    typeof body.contactPhone === 'string' && body.contactPhone.trim() ? body.contactPhone.trim() : u.phone || null;
  const contactEmail =
    typeof body.contactEmail === 'string' && body.contactEmail.trim() ? body.contactEmail.trim() : u.email;
  const objective = typeof body.objective === 'string' ? body.objective.slice(0, 500) : null;
  const offerText = typeof body.offerText === 'string' ? body.offerText.slice(0, 1000) : null;
  const periodDesired = typeof body.periodDesired === 'string' ? body.periodDesired.slice(0, 200) : null;

  let info;
  try {
    info = db
      .prepare(
        `INSERT INTO growth_campaigns (
          user_id, listing_type, listing_id, listing_name, radius_km, budget_tier, budget_lei,
          objective, offer_text, period_desired, contact_name, contact_phone, contact_email,
          est_reach_min, est_reach_max, est_clicks_min, est_clicks_max, est_leads_min, est_leads_max
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        user.id, own.type, own.id, own.name, radiusKm, budgetTier, budgetLei,
        objective, offerText, periodDesired, contactName, contactPhone, contactEmail,
        est?.reachRange[0] ?? null, est?.reachRange[1] ?? null,
        est?.clicksRange[0] ?? null, est?.clicksRange[1] ?? null,
        est?.leadsRange[0] ?? null, est?.leadsRange[1] ?? null
      );
  } catch {
    return NextResponse.json({ error: 'Ai deja o cerere Growth in asteptare pentru aceasta listare.' }, { status: 409 });
  }

  void sendAdminNotification(
    'Cerere Growth: ' + own.name,
    `${contactName} (${contactEmail}, ${contactPhone || '-'}) a solicitat o campanie de promovare Growth.
Listare: ${own.name} (${own.type} #${own.id})
Raza: ${radiusKm} km, Buget: ${budgetLei} lei${budgetTier ? ' (' + budgetTier + ')' : ''}
Obiectiv: ${objective || '-'}
Oferta: ${offerText || '-'}
Perioada dorita: ${periodDesired || '-'}

Vezi si aproba in /admin, tab Growth.`
  );

  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}
