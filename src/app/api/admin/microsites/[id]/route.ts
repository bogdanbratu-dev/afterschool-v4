import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };
const ALLOWED = new Set([
  'subdomain', 'owner_user_id', 'is_active', 'theme_color', 'tagline', 'about_long',
  'booking_enabled', 'booking_label', 'instagram_url', 'tiktok_url', 'youtube_url', 'whatsapp',
  'outreach_enabled', 'resend_api_key', 'outreach_from_email',
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const changes = await request.json();

  if (changes.subdomain !== undefined) {
    const sub = String(changes.subdomain).toLowerCase().trim();
    if (!/^[a-z0-9-]{2,40}$/.test(sub)) return NextResponse.json({ error: 'Subdomeniu invalid' }, { status: 400 });
    const dup = db.prepare('SELECT id FROM microsites WHERE subdomain = ? AND id != ?').get(sub, id);
    if (dup) return NextResponse.json({ error: 'Subdomeniu deja folosit' }, { status: 409 });
    changes.subdomain = sub;
  }

  const keys = Object.keys(changes).filter(k => ALLOWED.has(k));
  if (keys.length === 0) return NextResponse.json({ ok: true });

  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => {
    if (k === 'is_active' || k === 'booking_enabled' || k === 'outreach_enabled') return changes[k] ? 1 : 0;
    if (k === 'owner_user_id') return changes[k] ? Number(changes[k]) : null;
    return changes[k];
  });
  values.push(id);
  db.prepare(`UPDATE microsites SET ${setClause} WHERE id = ?`).run(...values);

  // Daca s-a schimbat proprietarul, sincronizeaza owner_user_id pe listare
  if (keys.includes('owner_user_id')) {
    const ms = db.prepare('SELECT listing_type, listing_id FROM microsites WHERE id = ?').get(id) as { listing_type: string; listing_id: number } | undefined;
    if (ms) {
      const table = TABLE[ms.listing_type];
      if (table) db.prepare(`UPDATE ${table} SET owner_user_id = ? WHERE id = ?`).run(changes.owner_user_id ? Number(changes.owner_user_id) : null, ms.listing_id);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM microsites WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
