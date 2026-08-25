import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

const LISTING_TABLES: Record<string, string> = {
  afterschool: 'afterschools',
  club: 'clubs',
};

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  const { action } = await request.json();
  const db = getDb();

  const suggestion = db.prepare('SELECT * FROM contact_crawl_suggestions WHERE id = ?').get(parseInt(id)) as any;
  if (!suggestion) return NextResponse.json({ error: 'Negasit' }, { status: 404 });

  db.prepare('UPDATE contact_crawl_suggestions SET status = ?, reviewed_at = ? WHERE id = ?')
    .run(action === 'approve' ? 'approved' : 'rejected', Date.now(), parseInt(id));

  if (action === 'approve') {
    const table = LISTING_TABLES[suggestion.listing_type];
    if (table && (suggestion.field === 'email' || suggestion.field === 'phone')) {
      db.prepare(`UPDATE ${table} SET ${suggestion.field} = ? WHERE id = ?`).run(suggestion.new_value, suggestion.listing_id);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  getDb().prepare('DELETE FROM contact_crawl_suggestions WHERE id = ?').run(parseInt(id));
  return NextResponse.json({ ok: true });
}
