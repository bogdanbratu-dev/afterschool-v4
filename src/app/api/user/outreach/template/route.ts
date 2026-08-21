import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/userAuth';
import { getDb } from '@/lib/db';
import { getSenderInfo, defaultMessage, defaultSubject } from '@/lib/outreachSender';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function firstSentences(text: string, n: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, n).join(' ').trim();
}

function getMicrosite(db: ReturnType<typeof getDb>, userId: number) {
  return db.prepare('SELECT * FROM microsites WHERE owner_user_id = ? AND outreach_enabled = 1 LIMIT 1').get(userId) as Record<string, unknown> | undefined;
}

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const ms = getMicrosite(db, user.id);
  if (!ms) return NextResponse.json({ error: 'Outreach indisponibil' }, { status: 403 });

  const sender = getSenderInfo(db, ms);
  const desc = firstSentences(stripHtml(sender.desc || ''), 2);
  const subject = (ms.outreach_email_subject as string) || defaultSubject(sender);
  const message = (ms.outreach_email_message as string) || defaultMessage(sender, desc, '{nume}');
  const isCustom = !!(ms.outreach_email_subject || ms.outreach_email_message);

  return NextResponse.json({
    subject, message, isCustom, senderName: sender.name, contactName: sender.contactName || null,
    attachmentUrl: (ms.outreach_attachment_url as string) || null,
    attachmentName: (ms.outreach_attachment_name as string) || null,
  });
}

export async function PUT(req: NextRequest) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const ms = getMicrosite(db, user.id);
  if (!ms) return NextResponse.json({ error: 'Outreach indisponibil' }, { status: 403 });

  const body = await req.json() as {
    subject?: string; message?: string;
    attachmentUrl?: string | null; attachmentName?: string | null;
  };

  // Subiect/mesaj si atasament se actualizeaza independent - un upload/stergere de atasament nu
  // trebuie sa atinga sablonul de text (si invers), altfel un PUT de atasament ar "inghieta" ca
  // sablon custom textul auto-generat afisat in acel moment in formular.
  if ('subject' in body || 'message' in body) {
    const subject = (body.subject || '').trim().slice(0, 200);
    const message = (body.message || '').trim().slice(0, 4000);
    // Sir gol => revenire la sablonul implicit generat automat (stocam NULL, nu string gol).
    db.prepare('UPDATE microsites SET outreach_email_subject = ?, outreach_email_message = ? WHERE id = ?')
      .run(subject || null, message || null, ms.id);
  }

  if ('attachmentUrl' in body) {
    db.prepare('UPDATE microsites SET outreach_attachment_url = ?, outreach_attachment_name = ? WHERE id = ?')
      .run(body.attachmentUrl || null, body.attachmentUrl ? (body.attachmentName || null) : null, ms.id);
  }

  return NextResponse.json({ success: true });
}
