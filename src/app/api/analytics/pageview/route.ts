import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { page, device } = await request.json();
    const db = getDb();
    db.prepare('INSERT INTO pageviews (page, device, timestamp) VALUES (?, ?, ?)').run(
      page || '/', device || 'desktop', Date.now()
    );
  } catch {}
  return NextResponse.json({ ok: true });
}
