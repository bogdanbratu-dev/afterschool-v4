import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { type, item_id, item_name } = await request.json();
    const db = getDb();
    db.prepare('INSERT INTO result_clicks (type, item_id, item_name, timestamp) VALUES (?, ?, ?, ?)').run(
      type, item_id, item_name, Date.now()
    );
  } catch {}
  return NextResponse.json({ ok: true });
}
