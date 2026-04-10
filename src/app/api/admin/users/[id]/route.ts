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
  const body = await request.json();
  const db = getDb();

  if (body.action === 'approve_premium') {
    const thirtyDays = Date.now() + 30 * 24 * 60 * 60 * 1000;
    db.prepare('UPDATE users SET is_premium = 1, premium_pending = 0, premium_until = ? WHERE id = ?').run(thirtyDays, parseInt(id));
    // Activeaza premium si pe listarea proprietarului
    const listing_as = db.prepare('SELECT id FROM afterschools WHERE owner_user_id = ?').get(parseInt(id)) as { id: number } | undefined;
    if (listing_as) db.prepare('UPDATE afterschools SET is_premium = 1 WHERE id = ?').run(listing_as.id);
    const listing_club = db.prepare('SELECT id FROM clubs WHERE owner_user_id = ?').get(parseInt(id)) as { id: number } | undefined;
    if (listing_club) db.prepare('UPDATE clubs SET is_premium = 1 WHERE id = ?').run(listing_club.id);
  } else {
    db.prepare('UPDATE users SET is_premium = ? WHERE id = ?').run(body.is_premium ? 1 : 0, parseInt(id));
  }

  return NextResponse.json({ ok: true });
}
