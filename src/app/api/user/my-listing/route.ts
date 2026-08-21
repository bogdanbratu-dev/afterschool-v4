import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };
const PROTECTED = new Set(['id', 'owner_user_id', 'is_premium', 'is_featured', 'contacts_hidden', 'lat', 'lng']);

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const as = db.prepare('SELECT * FROM afterschools WHERE owner_user_id = ? LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (as) return NextResponse.json({ listing: as, type: 'afterschool' });

  const club = db.prepare('SELECT * FROM clubs WHERE owner_user_id = ? LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (club) return NextResponse.json({ listing: club, type: 'club' });

  const cat = db.prepare('SELECT * FROM caterers WHERE owner_user_id = ? LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (cat) return NextResponse.json({ listing: cat, type: 'caterer' });

  const prof = db.prepare('SELECT * FROM professionals WHERE owner_user_id = ? LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (prof) return NextResponse.json({ listing: prof, type: 'professional' });

  const kg = db.prepare('SELECT * FROM kindergartens WHERE owner_user_id = ? LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (kg) return NextResponse.json({ listing: kg, type: 'kindergarten' });

  return NextResponse.json({ listing: null });
}

export async function PATCH(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const { listing_type, listing_id, changes } = await request.json();
  const table = TABLE[listing_type];
  if (!table) return NextResponse.json({ error: 'Tip invalid' }, { status: 400 });

  const listing = db.prepare(`SELECT id FROM ${table} WHERE id = ? AND owner_user_id = ?`).get(listing_id, user.id);
  if (!listing) return NextResponse.json({ error: 'Nu ai acces la aceasta listare' }, { status: 403 });

  // Toti proprietarii editeaza live, fara coada de aprobare: dreptul de proprietate e deja
  // verificat prin claim/inregistrare, iar PROTECTED blocheaza campurile sensibile mai jos.
  const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);
  const keys = Object.keys(changes || {}).filter(k => cols.includes(k) && !PROTECTED.has(k));
  if (keys.length > 0) {
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (changes as Record<string, unknown>)[k]);
    values.push(listing_id);
    db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values);
  }
  return NextResponse.json({ ok: true, live: true });
}
