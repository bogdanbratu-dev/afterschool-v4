import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

const LISTING_TABLES: Record<string, string> = {
  afterschool: 'afterschools',
  club: 'clubs',
};

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM contact_crawl_suggestions
    WHERE status = 'pending'
    ORDER BY created_at DESC
  `).all();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { action } = await request.json().catch(() => ({ action: null }));
  if (action !== 'approve_all') return NextResponse.json({ error: 'Actiune necunoscuta' }, { status: 400 });

  const db = getDb();
  const pending = db.prepare(`SELECT * FROM contact_crawl_suggestions WHERE status = 'pending'`).all() as any[];
  const updateStatus = db.prepare(`UPDATE contact_crawl_suggestions SET status = 'approved', reviewed_at = ? WHERE id = ?`);
  const now = Date.now();

  let applied = 0;
  for (const s of pending) {
    const table = LISTING_TABLES[s.listing_type];
    if (table && (s.field === 'email' || s.field === 'phone')) {
      db.prepare(`UPDATE ${table} SET ${s.field} = ? WHERE id = ?`).run(s.new_value, s.listing_id);
      applied++;
    }
    updateStatus.run(now, s.id);
  }

  return NextResponse.json({ ok: true, applied, total: pending.length });
}
