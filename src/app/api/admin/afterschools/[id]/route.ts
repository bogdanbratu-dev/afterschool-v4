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
    UPDATE afterschools SET
      name = ?, address = ?, sector = ?, lat = ?, lng = ?,
      phone = ?, email = ?, website = ?,
      price_min = ?, price_max = ?,
      pickup_time = ?, end_time = ?,
      age_min = ?, age_max = ?,
      description = ?, activities = ?,
      is_premium = ?, contacts_hidden = ?,
      banner_url = ?,
      editorial_summary = ?, photo_urls = ?
    WHERE id = ?
  `).run(
    body.name, body.address, body.sector || null, body.lat || 0, body.lng || 0,
    body.phone || null, body.email || null, body.website || null,
    body.price_min || null, body.price_max || null,
    body.pickup_time || null, body.end_time || null,
    body.age_min || null, body.age_max || null,
    body.description || null, body.activities || null,
    body.is_premium ?? 0, body.contacts_hidden ?? 0,
    body.banner_url || null,
    body.editorial_summary || null, body.photo_urls || null,
    id
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const listing = db.prepare('SELECT owner_user_id FROM afterschools WHERE id = ?').get(parseInt(id)) as { owner_user_id: number | null } | undefined;
  db.prepare('DELETE FROM afterschools WHERE id = ?').run(id);

  // Daca userul nu mai are nicio listare, reseteaza premium
  if (listing?.owner_user_id) {
    const remaining = (db.prepare('SELECT COUNT(*) as c FROM afterschools WHERE owner_user_id = ?').get(listing.owner_user_id) as { c: number }).c
      + (db.prepare('SELECT COUNT(*) as c FROM clubs WHERE owner_user_id = ?').get(listing.owner_user_id) as { c: number }).c;
    if (remaining === 0) {
      db.prepare('UPDATE users SET is_premium = 0 WHERE id = ?').run(listing.owner_user_id);
    }
  }

  return NextResponse.json({ success: true });
}
