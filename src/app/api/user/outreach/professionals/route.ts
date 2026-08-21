import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/userAuth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const ms = db.prepare('SELECT * FROM microsites WHERE owner_user_id = ? AND outreach_enabled = 1 LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (!ms) return NextResponse.json({ error: 'Outreach indisponibil' }, { status: 403 });

  const professionals = db.prepare(`
    SELECT p.id, p.name, p.category, p.sector, p.email, p.phone,
           oc.status as outreach_status, oc.email_sent_at
    FROM professionals p
    LEFT JOIN outreach_contacts oc ON oc.listing_type = 'professional' AND oc.listing_id = p.id AND oc.partner_ms_id = ?
    WHERE p.kind = 'independent' AND p.email IS NOT NULL AND p.email != ''
    ORDER BY p.category, p.name
  `).all(ms.id) as Array<{ id: number; name: string; category: string; sector: number | null; email: string; phone: string | null; outreach_status: string | null; email_sent_at: number | null }>;

  const categories: Record<string, { count: number; items: typeof professionals }> = {};
  for (const p of professionals) {
    const c = p.category || 'altele';
    if (!categories[c]) categories[c] = { count: 0, items: [] };
    categories[c].count++;
    categories[c].items.push(p);
  }

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  let dailySent = 0;
  try {
    dailySent = (db.prepare(
      "SELECT COUNT(*) as cnt FROM outreach_contacts WHERE partner_ms_id = ? AND email_sent_at >= ?"
    ).get(ms.id, startOfDay.getTime()) as { cnt: number }).cnt;
  } catch { dailySent = 0; }

  return NextResponse.json({ categories, dailySent, dailyLimit: 100, ms: { id: ms.id, subdomain: ms.subdomain, outreach_from_email: ms.outreach_from_email } });
}
