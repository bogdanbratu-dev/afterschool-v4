import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  if (!type || !id) return NextResponse.json({ error: 'Parametri lipsa' }, { status: 400 });

  const db = getDb();
  const table = type === 'afterschool' ? 'afterschools' : 'clubs';
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(parseInt(id));
  if (!row) return NextResponse.json({ error: 'Negasit' }, { status: 404 });
  return NextResponse.json(row);
}
