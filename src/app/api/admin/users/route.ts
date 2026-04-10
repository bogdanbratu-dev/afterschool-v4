import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const users = getDb().prepare(
    'SELECT id, name, email, phone, is_premium, created_at FROM users ORDER BY created_at DESC'
  ).all();
  return NextResponse.json(users);
}
