import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();

  const rows = db.prepare(`
    SELECT pe.*, u.name as user_name, u.email as user_email
    FROM pending_edits pe
    JOIN users u ON u.id = pe.user_id
    ORDER BY pe.submitted_at ASC
  `).all() as any[];

  const result = rows.map(r => {
    const table = TABLE[r.listing_type];
    const listing = table ? db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(r.listing_id) as Record<string, unknown> | undefined : undefined;
    return {
      ...r,
      changes: JSON.parse(r.changes),
      listing_name: listing?.name ?? null,
      current: listing ?? null,
    };
  });

  return NextResponse.json(result);
}
