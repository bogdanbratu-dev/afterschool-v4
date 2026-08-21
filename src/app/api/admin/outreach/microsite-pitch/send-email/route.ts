import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTemplate, renderSubject, renderHtml } from '@/lib/adminOutreachTemplates';

// Clona lui /api/admin/outreach/send-email/route.ts pentru campania separata "pachet site de
// prezentare" (50 lei) - singura diferenta reala e ca scrie doar microsite_pitch_email_sent_at,
// niciodata status/contacted_at/email_sent_at (acelea raman exclusiv ale campaniei generale de
// listare gratuita, ca sa nu se confunde starea celor doua campanii pentru aceeasi listare).
const FROM = 'Bogdan - ActivKids.ro <bogdan@activkids.ro>';
const TYPE = 'microsite_pitch' as const;

function getDailySent(db: ReturnType<typeof getDb>): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const row = db.prepare(
    'SELECT COUNT(*) as cnt FROM outreach_contacts WHERE (email_sent_at >= ? OR microsite_pitch_email_sent_at >= ?)'
  ).get(startOfDay.getTime(), startOfDay.getTime()) as { cnt: number };
  return row.cnt;
}

function isOptedOut(db: ReturnType<typeof getDb>, type: string, id: number): boolean {
  const row = db.prepare(
    'SELECT opted_out FROM outreach_contacts WHERE listing_type = ? AND listing_id = ?'
  ).get(type, id) as { opted_out: number } | undefined;
  return !!row?.opted_out;
}

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
    const { id, type, name, email, clicks, category } = listing as { id: number; type: string; name: string; email: string; clicks?: number; category?: string };

    if (isOptedOut(db, type, id)) {
      results.push({ name, success: false, error: 'Dezabonat' });
      continue;
    }

    const tpl = getTemplate(db, TYPE);
    const subject = customSubject || renderSubject(TYPE, tpl.subject, name);
    const unsubscribeUrl = `https://activkids.ro/api/outreach/unsubscribe?type=${type}&id=${id}`;
    const confirmToken = getOrCreateConfirmToken(db, type, id);
    const confirmUrl = `https://activkids.ro/confirma/${confirmToken}`;
    const removeUrl = `https://activkids.ro/api/outreach/remove/${confirmToken}`;
    const html = renderHtml(TYPE, tpl.message, name, clicks || 0, unsubscribeUrl, confirmUrl, category, removeUrl);

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM, to: email, subject, html, reply_to: 'activkidsromania@gmail.com' }),
      });

      if (res.ok) {
        const now = Date.now();
        db.prepare(
          `INSERT INTO outreach_contacts (listing_type, listing_id, microsite_pitch_email_sent_at, confirm_token)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(listing_type, listing_id) DO UPDATE SET microsite_pitch_email_sent_at=excluded.microsite_pitch_email_sent_at,
             confirm_token=COALESCE(outreach_contacts.confirm_token, excluded.confirm_token)`
        ).run(type, id, now, confirmToken);
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
