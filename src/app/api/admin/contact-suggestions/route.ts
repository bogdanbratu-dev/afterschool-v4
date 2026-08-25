import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM contact_crawl_suggestions
    WHERE status = 'pending'
    ORDER BY created_at DESC
  `).all();
  return NextResponse.json(rows);
}
