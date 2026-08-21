import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };

const EDITABLE = new Set([
  'theme_color', 'tagline', 'about_long',
  'instagram_url', 'tiktok_url', 'youtube_url', 'whatsapp',
  'booking_enabled', 'booking_label',
]);

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const ms = db.prepare('SELECT * FROM microsites WHERE owner_user_id = ? LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (!ms) return NextResponse.json({ microsite: null });

  const table = TABLE[ms.listing_type as string];
  const listing = table ? db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(ms.listing_id as number) : null;
  return NextResponse.json({ microsite: ms, listing });
}

export async function PATCH(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const ms = db.prepare('SELECT * FROM microsites WHERE owner_user_id = ? LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (!ms) return NextResponse.json({ error: 'Nu ai un micro-site' }, { status: 404 });

  const changes = await request.json();
  const keys = Object.keys(changes).filter(k => EDITABLE.has(k));
  if (keys.length === 0) return NextResponse.json({ ok: true });

  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => {
    if (k === 'booking_enabled') return changes[k] ? 1 : 0;
    return changes[k];
  });
  values.push(ms.id as number);

  db.prepare(`UPDATE microsites SET ${setClause} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}
