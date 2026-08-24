import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, session_id, listing_type, step_id, step_index, total_steps, draft, completed, contacted, created_at, updated_at
    FROM match_progress
    WHERE contacted = 0
    ORDER BY updated_at DESC
    LIMIT 200
  `).all();
  return NextResponse.json({ rows });
}
