import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const claims = db.prepare(`
    SELECT cr.*, u.name as user_name, u.email as user_email
    FROM claim_requests cr
    JOIN users u ON u.id = cr.user_id
    ORDER BY cr.submitted_at DESC
  `).all();
  return NextResponse.json(claims);
}
