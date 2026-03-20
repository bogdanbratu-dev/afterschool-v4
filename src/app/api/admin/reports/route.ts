import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  const reports = db.prepare(`
    SELECT * FROM verification_reports
    ORDER BY timestamp DESC
    LIMIT 50
  `).all();

  return NextResponse.json(reports);
}
