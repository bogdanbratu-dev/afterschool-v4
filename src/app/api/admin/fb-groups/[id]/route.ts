import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const { id } = await params;
  const db = getDb();
  const body = await request.json();

  db.prepare(`
    UPDATE fb_groups SET
      name = ?, url = ?, category = ?, member_count = ?, notes = ?, active = ?
    WHERE id = ?
  `).run(
    body.name, body.url, body.category || 'general',
    body.member_count || null, body.notes || null, body.active ?? 1,
    id
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM fb_groups WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
