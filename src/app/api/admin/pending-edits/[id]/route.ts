import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };
const PROTECTED = new Set(['id', 'owner_user_id', 'is_premium', 'is_featured', 'contacts_hidden', 'lat', 'lng']);

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  const { action } = await request.json();
  const db = getDb();

  const edit = db.prepare("SELECT * FROM pending_edits WHERE id = ?").get(parseInt(id)) as any;
  if (!edit) return NextResponse.json({ error: 'Negasit' }, { status: 404 });
  if (edit.status !== 'pending') return NextResponse.json({ error: 'Deja procesata' }, { status: 400 });

  if (action === 'approve') {
    const table = TABLE[edit.listing_type];
    if (!table) return NextResponse.json({ error: 'Tip de listare invalid' }, { status: 400 });

    const listing = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(edit.listing_id);
    if (!listing) return NextResponse.json({ error: 'Listarea asociata nu mai exista' }, { status: 404 });

    const changes = JSON.parse(edit.changes);
    const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);
    const keys = Object.keys(changes).filter(k => cols.includes(k) && !PROTECTED.has(k));

    if (keys.length > 0) {
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => changes[k]);
      values.push(edit.listing_id);
      db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values);
    }
  }

  db.prepare("UPDATE pending_edits SET status = ?, reviewed_at = ? WHERE id = ?")
    .run(action === 'approve' ? 'approved' : 'rejected', Date.now(), parseInt(id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  getDb().prepare('DELETE FROM pending_edits WHERE id = ?').run(parseInt(id));
  return NextResponse.json({ ok: true });
}
