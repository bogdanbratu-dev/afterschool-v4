import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const as = db.prepare('SELECT * FROM afterschools WHERE owner_user_id = ? LIMIT 1').get(user.id) as any;
  if (as) return NextResponse.json({ listing: as, type: 'afterschool' });

  const club = db.prepare('SELECT * FROM clubs WHERE owner_user_id = ? LIMIT 1').get(user.id) as any;
  if (club) return NextResponse.json({ listing: club, type: 'club' });

  return NextResponse.json({ listing: null });
}

export async function PATCH(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const body = await request.json();
  const { listing_type, listing_id, changes } = body;

  // Verifica ca userul detine listarea
  const table = listing_type === 'afterschool' ? 'afterschools' : 'clubs';
  const listing = db.prepare(`SELECT id FROM ${table} WHERE id = ? AND owner_user_id = ?`).get(listing_id, user.id);
  if (!listing) return NextResponse.json({ error: 'Nu ai acces la aceasta listare' }, { status: 403 });

  db.prepare(
    'INSERT INTO pending_edits (user_id, listing_type, listing_id, changes) VALUES (?, ?, ?, ?)'
  ).run(user.id, listing_type, listing_id, JSON.stringify(changes));

  return NextResponse.json({ ok: true });
}
