import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  return NextResponse.json(getDb().prepare('SELECT * FROM tutors ORDER BY name').all());
}
export async function POST(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb(); const b = await request.json();
  const info = db.prepare(`INSERT INTO tutors (name, subject, kind, address, sector, lat, lng, coverage_area, phone, email, website, facebook_url, price_min, price_max, description, editorial_summary, photo_urls, online_available, home_service, is_premium, is_featured, contacts_hidden) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    b.name, b.subject || 'altele', b.kind || 'independent', b.address || null, b.sector || null, b.lat || 0, b.lng || 0,
    b.coverage_area || null, b.phone || null, b.email || null, b.website || null, b.facebook_url || null,
    b.price_min || null, b.price_max || null, b.description || null, b.editorial_summary || null, b.photo_urls || null,
    b.online_available ? 1 : 0, b.home_service ? 1 : 0, b.is_premium ? 1 : 0, b.is_featured ? 1 : 0, b.contacts_hidden ? 1 : 0);
  return NextResponse.json({ success: true, id: info.lastInsertRowid });
}

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { ids, contacts_hidden } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids lipsa' }, { status: 400 });
  }
  const db = getDb();
  const stmt = db.prepare('UPDATE tutors SET contacts_hidden = ? WHERE id = ?');
  const value = contacts_hidden ? 1 : 0;
  ids.forEach((i: number) => stmt.run(value, i));
  return NextResponse.json({ ok: true });
}
