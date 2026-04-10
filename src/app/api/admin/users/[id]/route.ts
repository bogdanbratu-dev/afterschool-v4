import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(parseInt(id));
  db.prepare('DELETE FROM claim_requests WHERE user_id = ?').run(parseInt(id));
  db.prepare('DELETE FROM pending_listings WHERE user_id = ?').run(parseInt(id));
  db.prepare('DELETE FROM users WHERE id = ?').run(parseInt(id));
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  const { is_premium } = await request.json();
  getDb().prepare('UPDATE users SET is_premium = ? WHERE id = ?').run(is_premium ? 1 : 0, parseInt(id));
  return NextResponse.json({ ok: true });
}
