import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Editare publica a unei listari printr-un link securizat (token), fara cont/login.
// Distinct de /api/user/my-listing (care cere sesiune de utilizator autentificat).

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };

// Campuri niciodata editabile prin acest link: identificatori, flag-uri de sistem/monetizare,
// geodate (setate prin geocodare, nu manual), si campuri populate exclusiv prin enrichment
// automat (Google Places etc.) care nu ar trebui suprascrise manual de proprietar.
const PROTECTED = new Set([
  'id', 'owner_user_id', 'is_premium', 'is_featured', 'contacts_hidden', 'lat', 'lng', 'sector',
  'rating', 'reviews_count', 'maps_url', 'photo_urls', 'video_urls', 'reviews_url',
  'editorial_summary', 'is_paused', 'admin_note', 'fb_last_promoted_at', 'fb_last_promoted_id',
  'leads_enabled', 'banner_url',
]);

interface TokenRow {
  listing_type: string;
  listing_id: number;
  revoked: number;
}

function getTokenRow(db: ReturnType<typeof getDb>, token: string): TokenRow | undefined {
  if (!token || token.length !== 64) return undefined;
  return db.prepare('SELECT listing_type, listing_id, revoked FROM listing_edit_tokens WHERE id = ?').get(token) as TokenRow | undefined;
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const tokenRow = getTokenRow(db, token);
  if (!tokenRow || tokenRow.revoked) {
    return NextResponse.json({ error: 'Link invalid sau revocat' }, { status: 404 });
  }

  const table = TABLE[tokenRow.listing_type];
  if (!table) return NextResponse.json({ error: 'Tip invalid' }, { status: 400 });

  const listing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(tokenRow.listing_id) as Record<string, unknown> | undefined;
  if (!listing) return NextResponse.json({ error: 'Listarea nu mai exista' }, { status: 404 });

  return NextResponse.json({ listing, listing_type: tokenRow.listing_type });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const tokenRow = getTokenRow(db, token);
  if (!tokenRow || tokenRow.revoked) {
    return NextResponse.json({ error: 'Link invalid sau revocat' }, { status: 404 });
  }

  const table = TABLE[tokenRow.listing_type];
  if (!table) return NextResponse.json({ error: 'Tip invalid' }, { status: 400 });

  const { changes, agreedToTerms } = await request.json();
  if (!agreedToTerms) {
    return NextResponse.json({ error: 'Trebuie sa fii de acord cu Termenii si Conditiile si Politica de Confidentialitate.' }, { status: 400 });
  }

  const listing = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(tokenRow.listing_id);
  if (!listing) return NextResponse.json({ error: 'Listarea nu mai exista' }, { status: 404 });

  const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);
  const keys = Object.keys(changes || {}).filter(k => cols.includes(k) && !PROTECTED.has(k));
  if (keys.length > 0) {
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (changes as Record<string, unknown>)[k]);
    values.push(tokenRow.listing_id);
    db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values);
  }

  db.prepare('UPDATE listing_edit_tokens SET terms_accepted_at = ? WHERE id = ?').run(Date.now(), token);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const tokenRow = getTokenRow(db, token);
  if (!tokenRow || tokenRow.revoked) {
    return NextResponse.json({ error: 'Link invalid sau revocat' }, { status: 404 });
  }

  const table = TABLE[tokenRow.listing_type];
  if (!table) return NextResponse.json({ error: 'Tip invalid' }, { status: 400 });

  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(tokenRow.listing_id);
  db.prepare('UPDATE listing_edit_tokens SET revoked = 1 WHERE id = ?').run(token);

  return NextResponse.json({ ok: true });
}
