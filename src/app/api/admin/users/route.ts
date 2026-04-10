import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const users = db.prepare(
    'SELECT id, name, email, phone, is_premium, premium_pending, created_at FROM users ORDER BY created_at DESC'
  ).all() as any[];

  // Ataseaza listing info pentru fiecare user
  const result = users.map(u => {
    const as = db.prepare('SELECT id, name FROM afterschools WHERE owner_user_id = ?').get(u.id) as { id: number; name: string } | undefined;
    if (as) return { ...u, listing_type: 'afterschool', listing_id: as.id, listing_name: as.name };
    const club = db.prepare('SELECT id, name FROM clubs WHERE owner_user_id = ?').get(u.id) as { id: number; name: string } | undefined;
    if (club) return { ...u, listing_type: 'club', listing_id: club.id, listing_name: club.name };
    return { ...u, listing_type: null, listing_id: null, listing_name: null };
  });

  return NextResponse.json(result);
}
