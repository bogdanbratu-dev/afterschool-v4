import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTemplate, saveTemplate, saveAttachment, OUTREACH_TPL_TYPES, type OutreachTplType } from '@/lib/adminOutreachTemplates';

function isValidType(t: string | null): t is OutreachTplType {
  return !!t && (OUTREACH_TPL_TYPES as string[]).includes(t);
}

export async function GET(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const type = req.nextUrl.searchParams.get('type');
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'type invalid' }, { status: 400 });
  }
  const db = getDb();
  return NextResponse.json(getTemplate(db, type));
}

export async function PUT(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json() as {
    type?: string; subject?: string; message?: string;
    attachmentUrl?: string | null; attachmentName?: string | null;
  };
  if (!isValidType(body.type || null)) {
    return NextResponse.json({ error: 'type invalid' }, { status: 400 });
  }
  const db = getDb();
  const type = body.type as OutreachTplType;

  // Subiect/mesaj si atasament se actualizeaza independent - un upload/stergere de atasament nu
  // trebuie sa reseteze textul sablonului (si invers).
  if ('subject' in body || 'message' in body) {
    saveTemplate(db, type, (body.subject || '').slice(0, 200), (body.message || '').slice(0, 4000));
  }
  if ('attachmentUrl' in body) {
    saveAttachment(db, type, body.attachmentUrl || null, body.attachmentUrl ? (body.attachmentName || null) : null);
  }

  return NextResponse.json({ success: true, ...getTemplate(db, type) });
}
