import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const db = getDb();
  const groups = db.prepare('SELECT * FROM fb_groups ORDER BY last_posted_at ASC NULLS FIRST, name ASC').all();
  return NextResponse.json(groups);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const db = getDb();
  const body = await request.json();

  db.prepare(`
    INSERT INTO fb_groups (name, url, category, member_count, notes, active)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    body.name, body.url, body.category || 'general',
    body.member_count || null, body.notes || null, body.active ?? 1
  );

  return NextResponse.json({ success: true });
}
