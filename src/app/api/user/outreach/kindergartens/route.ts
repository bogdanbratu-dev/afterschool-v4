import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/userAuth';
import { getDb } from '@/lib/db';
import { buildGroups, getOwnLocation, getSavedBatches } from '@/lib/outreachBatches';

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const ms = db.prepare('SELECT * FROM microsites WHERE owner_user_id = ? AND outreach_enabled = 1 LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (!ms) return NextResponse.json({ error: 'Outreach indisponibil' }, { status: 403 });

  const kindergartens = db.prepare(`
    SELECT k.id, k.name, k.sector, k.neighborhood, k.email, k.phone,
           oc.status as outreach_status, oc.email_sent_at
    FROM kindergartens k
    LEFT JOIN outreach_contacts oc ON oc.listing_type = 'kindergarten' AND oc.listing_id = k.id AND oc.partner_ms_id = ?
    WHERE k.email IS NOT NULL AND k.email != ''
    ORDER BY k.sector, k.name
  `).all(ms.id) as Array<{ id: number; name: string; sector: number; neighborhood: string | null; email: string; phone: string | null; outreach_status: string | null; email_sent_at: number | null }>;

  const sectors = buildGroups(kindergartens, (k) => String(k.sector || 0));
  const neighborhoods = buildGroups(kindergartens, (k) => k.neighborhood || 'necunoscut');
  const ownLocation = getOwnLocation(db, ms);
  const batches = getSavedBatches(db, ms.id as number, 'kindergarten', kindergartens, (k) => String(k.sector || 0), (k) => k.neighborhood);

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  let dailySent = 0;
  try {
    dailySent = (db.prepare(
      "SELECT COUNT(*) as cnt FROM outreach_contacts WHERE partner_ms_id = ? AND email_sent_at >= ?"
    ).get(ms.id, startOfDay.getTime()) as { cnt: number }).cnt;
  } catch { dailySent = 0; }

  return NextResponse.json({
    sectors, neighborhoods, batches, ownLocation,
    dailySent, dailyLimit: 100,
    ms: { id: ms.id, subdomain: ms.subdomain, outreach_from_email: ms.outreach_from_email },
  });
}
