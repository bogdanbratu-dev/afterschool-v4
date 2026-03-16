import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const db = getDb();
  const clubs = db.prepare('SELECT * FROM clubs ORDER BY name').all();
  return NextResponse.json(clubs);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const db = getDb();
  const body = await request.json();

  db.prepare(`
    INSERT INTO clubs (name, address, sector, lat, lng, phone, email, website,
      price_min, price_max, schedule, age_min, age_max, description, category,
      availability, is_premium, contacts_hidden)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name, body.address, body.sector || null, body.lat || 0, body.lng || 0,
    body.phone || null, body.email || null, body.website || null,
    body.price_min || null, body.price_max || null,
    body.schedule || null, body.age_min || null, body.age_max || null,
    body.description || null, body.category || 'inot',
    body.availability || 'unknown', 0, 0
  );

  return NextResponse.json({ success: true });
}
