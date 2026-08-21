import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTemplate, renderSubject, renderHtml, type OutreachTplType } from '@/lib/adminOutreachTemplates';

const FROM = 'Bogdan - ActivKids.ro <bogdan@activkids.ro>';

function getDailySent(db: ReturnType<typeof getDb>): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const row = db.prepare(
    'SELECT COUNT(*) as cnt FROM outreach_contacts WHERE email_sent_at >= ?'
  ).get(startOfDay.getTime()) as { cnt: number };
  return row.cnt;
}

function isOptedOut(db: ReturnType<typeof getDb>, type: string, id: number): boolean {
  const row = db.prepare(
    'SELECT opted_out FROM outreach_contacts WHERE listing_type = ? AND listing_id = ?'
  ).get(type, id) as { opted_out: number } | undefined;
  return !!row?.opted_out;
}

// Reia tokenul de confirmare existent daca listarea a mai fost contactata (link-ul trimis
// anterior ramane valabil), altfel genereaza unul nou - acelasi format ca access_tokens.id.
function getOrCreateConfirmToken(db: ReturnType<typeof getDb>, type: string, id: number): string {
  const row = db.prepare(
    'SELECT confirm_token FROM outreach_contacts WHERE listing_type = ? AND listing_id = ?'
  ).get(type, id) as { confirm_token: string | null } | undefined;
  return row?.confirm_token || crypto.randomBytes(32).toString('hex');
}

export async function GET() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getDb();
  return NextResponse.json({ dailySent: getDailySent(db), dailyLimit: 100 });
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY_ACTIVKIDS;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY_ACTIVKIDS not set' }, { status: 500 });
  }

  const { listings, customSubject } = await req.json();
  const db = getDb();
  const results: { name: string; success: boolean; error?: string }[] = [];

  for (const listing of listings) {
    const { id, type, name, email, clicks, category } = listing as { id: number; type: OutreachTplType; name: string; email: string; clicks?: number; category?: string };

    if (isOptedOut(db, type, id)) {
      results.push({ name, success: false, error: 'Dezabonat' });
      continue;
    }

    const tpl = getTemplate(db, type);
    const subject = customSubject || renderSubject(type, tpl.subject, name);
    const unsubscribeUrl = `https://activkids.ro/api/outreach/unsubscribe?type=${type}&id=${id}`;
    const confirmToken = getOrCreateConfirmToken(db, type, id);
    const confirmUrl = `https://activkids.ro/confirma/${confirmToken}`;
    const removeUrl = `https://activkids.ro/api/outreach/remove/${confirmToken}`;
    const html = renderHtml(type, tpl.message, name, clicks || 0, unsubscribeUrl, confirmUrl, category, removeUrl);
    const attachments = tpl.attachmentUrl
      ? [{ filename: tpl.attachmentName || tpl.attachmentUrl.split('/').pop() || 'atasament', path: `https://activkids.ro${tpl.attachmentUrl}` }]
      : undefined;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM, to: email, subject, html, reply_to: 'activkidsromania@gmail.com', ...(attachments ? { attachments } : {}) }),
      });

      if (res.ok) {
        const now = Date.now();
        db.prepare(
          `INSERT INTO outreach_contacts (listing_type, listing_id, status, contacted_at, email_sent_at, confirm_token)
           VALUES (?, ?, 'contacted', ?, ?, ?)
           ON CONFLICT(listing_type, listing_id) DO UPDATE SET status='contacted', contacted_at=excluded.contacted_at, email_sent_at=excluded.email_sent_at,
             confirm_token=COALESCE(outreach_contacts.confirm_token, excluded.confirm_token)`
        ).run(type, id, now, now, confirmToken);
        results.push({ name, success: true });
      } else {
        const err = await res.json().catch(() => ({})) as any;
        results.push({ name, success: false, error: err.message || `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ name, success: false, error: e.message || String(e) });
    }
  }

  return NextResponse.json({
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
    dailySent: getDailySent(db),
    dailyLimit: 100,
  });
}
