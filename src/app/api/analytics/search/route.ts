import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    if (!query) return NextResponse.json({ ok: true });
    const db = getDb();
    db.prepare('INSERT INTO searches (query, timestamp) VALUES (?, ?)').run(query, Date.now());
  } catch {}
  return NextResponse.json({ ok: true });
}
