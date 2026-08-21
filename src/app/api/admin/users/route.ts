import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

const LISTING_TABLES: { type: string; table: string }[] = [
  { type: 'afterschool', table: 'afterschools' },
  { type: 'club', table: 'clubs' },
  { type: 'kindergarten', table: 'kindergartens' },
  { type: 'caterer', table: 'caterers' },
  { type: 'professional', table: 'professionals' },
  { type: 'tutor', table: 'tutors' },
];

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const users = db.prepare(
    'SELECT id, name, email, phone, is_premium, premium_pending, created_at FROM users ORDER BY created_at DESC'
  ).all() as any[];

  // Ataseaza TOATE listarile detinute de fiecare user, nu doar prima gasita - un user poate detine
  // mai multe listari (ex. acelasi operator cu mai multe bazine de inot), iar varianta veche cu
  // .get() pe afterschools/clubs afisa o singura listare per user si ignora complet kindergarten/
  // caterer/professional/tutor.
  const result = users.map(u => {
    const listings: { type: string; id: number; name: string }[] = [];
    for (const { type, table } of LISTING_TABLES) {
      const rows = db.prepare(`SELECT id, name FROM ${table} WHERE owner_user_id = ?`).all(u.id) as { id: number; name: string }[];
      for (const r of rows) listings.push({ type, id: r.id, name: r.name });
    }
    return { ...u, listings };
  });

  return NextResponse.json(result);
}
