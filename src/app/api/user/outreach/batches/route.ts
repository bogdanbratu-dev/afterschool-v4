import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/userAuth';
import { getDb } from '@/lib/db';

// Batch-uri de outreach personalizate (combinatii de cartiere/sectoare alese de partener),
// pe langa cele 3 implicite (cartierul propriu / sectorul propriu / tot Bucurestiul) calculate
// direct in rutele afterschools/kindergartens. Create/delete aici; listarea lor cu numarul de
// rezultate curent se face tot in acele rute (getSavedBatches), ca sa reflecte date live.

async function requireMs(userId: number) {
  const db = getDb();
  const ms = db.prepare('SELECT * FROM microsites WHERE owner_user_id = ? AND outreach_enabled = 1 LIMIT 1').get(userId) as Record<string, unknown> | undefined;
  return { db, ms };
}

export async function POST(req: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { db, ms } = await requireMs(user.id);
  if (!ms) return NextResponse.json({ error: 'Outreach indisponibil' }, { status: 403 });

  const body = await req.json().catch(() => null) as { target_type?: string; name?: string; filter_type?: string; values?: string[] } | null;
  if (!body) return NextResponse.json({ error: 'Body invalid' }, { status: 400 });

  const { target_type, name, filter_type, values } = body;
  if (!target_type || !['afterschool', 'kindergarten'].includes(target_type)) {
    return NextResponse.json({ error: 'target_type invalid' }, { status: 400 });
  }
  if (!name || !name.trim()) return NextResponse.json({ error: 'Numele batch-ului e obligatoriu' }, { status: 400 });
  if (!filter_type || !['sector', 'neighborhood'].includes(filter_type)) {
    return NextResponse.json({ error: 'filter_type invalid' }, { status: 400 });
  }
  if (!Array.isArray(values) || values.length === 0) {
    return NextResponse.json({ error: 'Selecteaza cel putin o valoare (cartier/sector)' }, { status: 400 });
  }

  const result = db.prepare(
    'INSERT INTO outreach_batches (partner_ms_id, target_type, name, filter_type, values_json) VALUES (?, ?, ?, ?, ?)'
  ).run(ms.id, target_type, name.trim().slice(0, 60), filter_type, JSON.stringify(values));

  return NextResponse.json({ id: result.lastInsertRowid });
}

export async function DELETE(req: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { db, ms } = await requireMs(user.id);
  if (!ms) return NextResponse.json({ error: 'Outreach indisponibil' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id lipsa' }, { status: 400 });

  db.prepare('DELETE FROM outreach_batches WHERE id = ? AND partner_ms_id = ?').run(id, ms.id);
  return NextResponse.json({ ok: true });
}
