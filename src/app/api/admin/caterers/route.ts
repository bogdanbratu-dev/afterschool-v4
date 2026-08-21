import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const db = getDb();
  const caterers = db.prepare('SELECT * FROM caterers ORDER BY name').all();
  return NextResponse.json(caterers);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const db = getDb();
  const b = await request.json();

  const info = db.prepare(`
    INSERT INTO caterers (name, address, sector, lat, lng, coverage_area, phone, email,
      website, facebook_url, price_min, price_max, description, editorial_summary,
      photo_urls, video_urls, reviews_url, banner_url, availability,
      is_premium, is_featured, contacts_hidden)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.name, b.address, b.sector || null, b.lat || 0, b.lng || 0,
    b.coverage_area || null, b.phone || null, b.email || null,
    b.website || null, b.facebook_url || null,
    b.price_min || null, b.price_max || null,
    b.description || null, b.editorial_summary || null,
    b.photo_urls || null, b.video_urls || null, b.reviews_url || null,
    b.banner_url || null, b.availability || 'unknown',
    b.is_premium ? 1 : 0, b.is_featured ? 1 : 0, b.contacts_hidden ? 1 : 0
  );

  return NextResponse.json({ success: true, id: info.lastInsertRowid });
}

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const { ids, contacts_hidden } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids lipsa' }, { status: 400 });
  }
  const db = getDb();
  const stmt = db.prepare('UPDATE caterers SET contacts_hidden = ? WHERE id = ?');
  const value = contacts_hidden ? 1 : 0;
  ids.forEach((i: number) => stmt.run(value, i));
  return NextResponse.json({ ok: true });
}
