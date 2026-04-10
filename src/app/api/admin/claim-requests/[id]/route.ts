import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  const { action } = await request.json();
  const db = getDb();

  const claim = db.prepare('SELECT * FROM claim_requests WHERE id = ?').get(parseInt(id)) as any;
  if (!claim) return NextResponse.json({ error: 'Negasit' }, { status: 404 });

  db.prepare('UPDATE claim_requests SET status = ?, reviewed_at = ? WHERE id = ?')
    .run(action === 'approve' ? 'approved' : 'rejected', Date.now(), parseInt(id));

  if (action === 'approve') {
    // Asociaza listarea cu userul si seteaza is_premium
    const table = claim.listing_type === 'afterschool' ? 'afterschools' : 'clubs';
    db.prepare(`UPDATE ${table} SET owner_user_id = ?, is_premium = 1 WHERE id = ?`)
      .run(claim.user_id, claim.listing_id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  getDb().prepare('DELETE FROM claim_requests WHERE id = ?').run(parseInt(id));
  return NextResponse.json({ ok: true });
}
