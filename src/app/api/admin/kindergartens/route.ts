import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  return NextResponse.json(db.prepare('SELECT * FROM kindergartens ORDER BY name').all());
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const b = await request.json();
  const info = db.prepare(`
    INSERT INTO kindergartens (name, type, address, sector, lat, lng, phone, email, website, facebook_url,
      price_min, price_max, program, age_min, age_max, description, editorial_summary, activities,
      photo_urls, video_urls, reviews_url, banner_url, availability, is_premium, is_featured, contacts_hidden)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.name, b.type || 'gradinita', b.address || '', b.sector || null, b.lat || 0, b.lng || 0,
    b.phone || null, b.email || null, b.website || null, b.facebook_url || null,
    b.price_min || null, b.price_max || null, b.program || null, b.age_min || null, b.age_max || null,
    b.description || null, b.editorial_summary || null, b.activities || null,
    b.photo_urls || null, b.video_urls || null, b.reviews_url || null, b.banner_url || null,
    b.availability || 'unknown', b.is_premium ? 1 : 0, b.is_featured ? 1 : 0, b.contacts_hidden ? 1 : 0
  );
  return NextResponse.json({ success: true, id: info.lastInsertRowid });
}

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { ids, contacts_hidden } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids lipsa' }, { status: 400 });
  }
  const db = getDb();
  const stmt = db.prepare('UPDATE kindergartens SET contacts_hidden = ? WHERE id = ?');
  const value = contacts_hidden ? 1 : 0;
  ids.forEach((i: number) => stmt.run(value, i));
  return NextResponse.json({ ok: true });
}
