import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { query, source, lat, lng, sector, resolved } = await request.json();
    if (!query) return NextResponse.json({ ok: true });
    const db = getDb();
    db.prepare(
      'INSERT INTO searches (query, timestamp, source, lat, lng, sector, resolved) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      String(query).slice(0, 300),
      Date.now(),
      typeof source === 'string' ? source.slice(0, 50) : null,
      typeof lat === 'number' ? lat : null,
      typeof lng === 'number' ? lng : null,
      typeof sector === 'number' ? sector : null,
      resolved === false ? 0 : 1
    );
  } catch {}
  return NextResponse.json({ ok: true });
}
