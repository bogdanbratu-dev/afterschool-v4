import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/userAuth';
import { getDb } from '@/lib/db';

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };

type DB = ReturnType<typeof getDb>;

interface OwnerListing { type: string; id: number; }

function resolveOwnerListing(db: DB, userId: number): OwnerListing | null {
  for (const [type, table] of Object.entries(TABLE)) {
    const row = db.prepare(`SELECT id FROM ${table} WHERE owner_user_id = ? LIMIT 1`).get(userId) as { id: number } | undefined;
    if (row) return { type, id: row.id };
  }
  return null;
}

function getInfo(db: DB, type: string, id: number): { name: string; phone: string | null; email: string | null } {
  const table = TABLE[type];
  if (!table) return { name: 'Necunoscut', phone: null, email: null };
  const row = db.prepare(`SELECT name, phone, email FROM ${table} WHERE id = ?`).get(id) as { name: string; phone: string | null; email: string | null } | undefined;
  return row || { name: 'Necunoscut', phone: null, email: null };
}

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const me = resolveOwnerListing(db, user.id);
  if (!me) return NextResponse.json({ error: 'Nu detii nicio listare' }, { status: 403 });

  const received = db.prepare(
    'SELECT * FROM collaboration_requests WHERE to_type = ? AND to_id = ? ORDER BY created_at DESC'
  ).all(me.type, me.id) as Record<string, unknown>[];
  const sent = db.prepare(
    'SELECT * FROM collaboration_requests WHERE from_type = ? AND from_id = ? ORDER BY created_at DESC'
  ).all(me.type, me.id) as Record<string, unknown>[];

  const enrich = (r: Record<string, unknown>, counterpartType: string, counterpartId: number) => {
    const info = getInfo(db, counterpartType, counterpartId);
    const accepted = r.status === 'accepted';
    return {
      ...r,
      counterpart_type: counterpartType,
      counterpart_id: counterpartId,
      counterpart_name: info.name,
      counterpart_phone: accepted ? info.phone : null,
      counterpart_email: accepted ? info.email : null,
    };
  };

  return NextResponse.json({
    me,
    received: received.map(r => enrich(r, r.from_type as string, r.from_id as number)),
    sent: sent.map(r => enrich(r, r.to_type as string, r.to_id as number)),
  });
}

export async function POST(req: NextRequest) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const me = resolveOwnerListing(db, user.id);
  if (!me) return NextResponse.json({ error: 'Nu detii nicio listare' }, { status: 403 });

  const { to_type, to_id, message } = await req.json() as { to_type: string; to_id: number; message?: string };
  if (!TABLE[to_type] || !to_id) return NextResponse.json({ error: 'Destinatar invalid' }, { status: 400 });
  if (to_type === me.type && to_id === me.id) return NextResponse.json({ error: 'Nu te poti contacta pe tine' }, { status: 400 });

  // Evita duplicate pending
  const existing = db.prepare(
    "SELECT id FROM collaboration_requests WHERE from_type=? AND from_id=? AND to_type=? AND to_id=? AND status='pending'"
  ).get(me.type, me.id, to_type, to_id);
  if (existing) return NextResponse.json({ error: 'Ai deja o cerere in asteptare catre acest destinatar' }, { status: 409 });

  const now = Date.now();
  const info = db.prepare(
    'INSERT INTO collaboration_requests (from_type, from_id, to_type, to_id, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(me.type, me.id, to_type, to_id, (message || '').trim() || null, 'pending', now);

  return NextResponse.json({ success: true, id: info.lastInsertRowid });
}

export async function PATCH(req: NextRequest) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const me = resolveOwnerListing(db, user.id);
  if (!me) return NextResponse.json({ error: 'Nu detii nicio listare' }, { status: 403 });

  const { id, status } = await req.json() as { id: number; status: string };
  if (!['accepted', 'declined'].includes(status)) return NextResponse.json({ error: 'Status invalid' }, { status: 400 });

  const reqRow = db.prepare('SELECT * FROM collaboration_requests WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!reqRow) return NextResponse.json({ error: 'Cerere inexistenta' }, { status: 404 });
  // Doar destinatarul poate raspunde
  if (reqRow.to_type !== me.type || reqRow.to_id !== me.id) {
    return NextResponse.json({ error: 'Nu poti raspunde la aceasta cerere' }, { status: 403 });
  }

  db.prepare('UPDATE collaboration_requests SET status = ?, responded_at = ? WHERE id = ?').run(status, Date.now(), id);
  return NextResponse.json({ success: true });
}
