import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getDb } from '@/lib/db';
import { isBotUserAgent } from '@/lib/botDetection';

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const ua = headersList.get('user-agent') || '';
    if (isBotUserAgent(ua)) return NextResponse.json({ ok: true });

    const { type, item_id, item_name, link_type } = await request.json();
    const db = getDb();
    db.prepare('INSERT INTO result_clicks (type, item_id, item_name, link_type, timestamp) VALUES (?, ?, ?, ?, ?)').run(
      type, item_id ?? 0, item_name ?? '', link_type ?? null, Date.now()
    );
  } catch {}
  return NextResponse.json({ ok: true });
}
