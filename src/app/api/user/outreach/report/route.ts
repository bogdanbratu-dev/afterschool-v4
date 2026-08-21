import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/userAuth';
import { getDb } from '@/lib/db';

const CHECK_LIMIT = 40;    // max cate emailuri interogam la Resend intr-un singur GET (evita request-uri prea multe)
const CONCURRENCY = 5;

interface ResendEmailStatus { last_event?: string }

function mapDeliveryStatus(lastEvent: string | undefined): 'delivered' | 'bounced' | 'complained' | 'pending' {
  if (lastEvent === 'delivered' || lastEvent === 'opened' || lastEvent === 'clicked') return 'delivered';
  if (lastEvent === 'bounced') return 'bounced';
  if (lastEvent === 'complained') return 'complained';
  return 'pending';
}

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const ms = db.prepare('SELECT * FROM microsites WHERE owner_user_id = ? AND outreach_enabled = 1 LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (!ms) return NextResponse.json({ error: 'Outreach indisponibil' }, { status: 403 });

  const apiKey = ms.resend_api_key as string | null;

  if (apiKey) {
    const toCheck = db.prepare(
      `SELECT id, resend_email_id FROM outreach_contacts
       WHERE partner_ms_id = ? AND email_sent_at IS NOT NULL AND resend_email_id IS NOT NULL
         AND (delivery_status IS NULL OR delivery_status = 'pending')
       ORDER BY email_sent_at DESC LIMIT ?`
    ).all(ms.id, CHECK_LIMIT) as Array<{ id: number; resend_email_id: string }>;

    for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
      const slice = toCheck.slice(i, i + CONCURRENCY);
      await Promise.all(slice.map(async (row) => {
        try {
          const res = await fetch(`https://api.resend.com/emails/${row.resend_email_id}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!res.ok) return;
          const data = await res.json() as ResendEmailStatus;
          const status = mapDeliveryStatus(data.last_event);
          db.prepare('UPDATE outreach_contacts SET delivery_status = ?, delivery_checked_at = ? WHERE id = ?')
            .run(status, Date.now(), row.id);
        } catch { /* retry la urmatorul refresh */ }
      }));
    }
  }

  const counts = db.prepare(
    `SELECT
       COUNT(*) as totalSent,
       SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
       SUM(CASE WHEN delivery_status IN ('bounced','complained') THEN 1 ELSE 0 END) as bounced
     FROM outreach_contacts WHERE partner_ms_id = ? AND email_sent_at IS NOT NULL`
  ).get(ms.id) as { totalSent: number; delivered: number | null; bounced: number | null };

  const totalSent = counts.totalSent || 0;
  const delivered = counts.delivered || 0;
  const bounced = counts.bounced || 0;
  const pending = Math.max(0, totalSent - delivered - bounced);

  return NextResponse.json({ totalSent, delivered, bounced, pending, checkedAt: Date.now() });
}
