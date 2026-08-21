import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };
const RESERVED = new Set(['www', 'app', 'admin', 'api', 'mail', 'ftp']);

export async function GET(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const url = new URL(request.url);
  const lt = url.searchParams.get('listing_type');
  const lid = url.searchParams.get('listing_id');
  if (lt && lid) {
    const row = db.prepare('SELECT * FROM microsites WHERE listing_type = ? AND listing_id = ?').get(lt, Number(lid)) as Record<string, unknown> | undefined;
    return NextResponse.json(row || null);
  }
  const rows = db.prepare('SELECT * FROM microsites ORDER BY created_at DESC').all() as Record<string, unknown>[];
  const result = rows.map(m => {
    const table = TABLE[m.listing_type as string];
    const listing = table ? db.prepare(`SELECT name FROM ${table} WHERE id = ?`).get(m.listing_id as number) as { name: string } | undefined : undefined;
    const owner = m.owner_user_id ? db.prepare('SELECT email, name FROM users WHERE id = ?').get(m.owner_user_id as number) as { email: string; name: string } | undefined : undefined;
    return { ...m, listing_name: listing?.name || null, owner_email: owner?.email || null, owner_name: owner?.name || null };
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const b = await request.json();

  const subdomain = String(b.subdomain || '').toLowerCase().trim();
  if (!/^[a-z0-9-]{2,40}$/.test(subdomain) || RESERVED.has(subdomain)) {
    return NextResponse.json({ error: 'Subdomeniu invalid (doar litere mici, cifre, liniuțe)' }, { status: 400 });
  }
  const table = TABLE[b.listing_type];
  if (!table || !b.listing_id) return NextResponse.json({ error: 'Listare invalidă' }, { status: 400 });

  if (db.prepare('SELECT id FROM microsites WHERE subdomain = ?').get(subdomain)) {
    return NextResponse.json({ error: 'Subdomeniu deja folosit' }, { status: 409 });
  }

  const ownerId = b.owner_user_id ? Number(b.owner_user_id) : null;
  try {
    db.prepare(`INSERT INTO microsites (subdomain, listing_type, listing_id, owner_user_id, theme_color, tagline, about_long, booking_enabled, booking_label, is_active)
      VALUES (?,?,?,?,?,?,?,?,?,1)`).run(
      subdomain, b.listing_type, b.listing_id, ownerId,
      b.theme_color || 'teal', b.tagline || null, b.about_long || null,
      b.booking_enabled === 0 ? 0 : 1, b.booking_label || null
    );
  } catch {
    return NextResponse.json({ error: 'Listarea are deja un micro-site' }, { status: 409 });
  }

  // Leagă proprietarul de listare ca să poată edita din dashboard
  if (ownerId) db.prepare(`UPDATE ${table} SET owner_user_id = ? WHERE id = ?`).run(ownerId, b.listing_id);

  return NextResponse.json({ ok: true });
}
