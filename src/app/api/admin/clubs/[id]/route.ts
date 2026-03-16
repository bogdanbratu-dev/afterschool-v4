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
    UPDATE clubs SET
      name = ?, address = ?, sector = ?, lat = ?, lng = ?,
      phone = ?, email = ?, website = ?,
      price_min = ?, price_max = ?,
      schedule = ?, age_min = ?, age_max = ?,
      description = ?, category = ?,
      availability = ?, is_premium = ?, contacts_hidden = ?,
      banner_url = ?
    WHERE id = ?
  `).run(
    body.name, body.address, body.sector || null, body.lat || 0, body.lng || 0,
    body.phone || null, body.email || null, body.website || null,
    body.price_min || null, body.price_max || null,
    body.schedule || null, body.age_min || null, body.age_max || null,
    body.description || null, body.category || 'inot',
    body.availability || 'unknown',
    body.is_premium ?? 0, body.contacts_hidden ?? 0,
    body.banner_url || null,
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
  db.prepare('DELETE FROM clubs WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
