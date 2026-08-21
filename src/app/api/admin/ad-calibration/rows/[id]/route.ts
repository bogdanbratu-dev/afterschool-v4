import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

// PATCH - etichetare pe un singur rand: { objective?: string|null, category?: string|null }.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'JSON invalid.' }, { status: 400 });
  }

  const db = getDb();
  db.prepare(`UPDATE ad_campaign_imports SET objective = ?, category = ? WHERE id = ?`).run(
    body.objective || null, body.category || null, id
  );

  const updated = db.prepare('SELECT * FROM ad_campaign_imports WHERE id = ?').get(id);
  if (!updated) {
    return NextResponse.json({ error: 'Rand negasit.' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

// DELETE - un rand gresit importat (ex. dublura, rand corupt din CSV).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM ad_campaign_imports WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
