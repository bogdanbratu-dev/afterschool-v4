import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  return NextResponse.json(leads);
}

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await request.json();
  const db = getDb();
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
  return NextResponse.json({ ok: true });
}
