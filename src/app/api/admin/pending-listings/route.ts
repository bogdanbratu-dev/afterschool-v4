import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const listings = db.prepare(`
    SELECT pl.*, u.name as user_name, u.email as user_email
    FROM pending_listings pl
    JOIN users u ON u.id = pl.user_id
    ORDER BY pl.submitted_at DESC
  `).all();
  return NextResponse.json(listings);
}
