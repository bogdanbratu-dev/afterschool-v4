import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { seedDatabase } from '@/lib/seed';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  seedDatabase();
  const db = getDb();
  const afterschools = db.prepare('SELECT * FROM afterschools ORDER BY name').all();
  return NextResponse.json(afterschools);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  seedDatabase();
  const db = getDb();
  const body = await request.json();

  const result = db.prepare(`
    INSERT INTO afterschools (name, address, sector, lat, lng, phone, email, website, price_min, price_max, pickup_time, end_time, age_min, age_max, description, activities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name, body.address, body.sector || null, body.lat || 0, body.lng || 0,
    body.phone || null, body.email || null, body.website || null,
    body.price_min || null, body.price_max || null,
    body.pickup_time || null, body.end_time || null,
    body.age_min || null, body.age_max || null,
    body.description || null, body.activities || null
  );

  return NextResponse.json({ id: result.lastInsertRowid, ...body });
}
