import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  const db = getDb();
  const { business_mode } = await request.json();
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('business_mode', ?)").run(
    business_mode ? 'true' : 'false'
  );
  return NextResponse.json({ ok: true });
}
