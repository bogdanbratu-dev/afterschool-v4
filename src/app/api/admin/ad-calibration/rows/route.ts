import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

// GET - lista completa a randurilor importate (toate batch-urile), cele mai noi primele.
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM ad_campaign_imports ORDER BY imported_at DESC, id DESC`).all();
  return NextResponse.json(rows);
}

// PATCH - etichetare in bulk: { ids: number[], objective?: string|null, category?: string|null }.
// Cel putin unul din objective/category trebuie prezent in body; campul absent nu se atinge.
export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(id))) {
    return NextResponse.json({ error: 'Lipseste lista de id-uri (ids).' }, { status: 400 });
  }
  const hasObjective = Object.prototype.hasOwnProperty.call(body, 'objective');
  const hasCategory = Object.prototype.hasOwnProperty.call(body, 'category');
  if (!hasObjective && !hasCategory) {
    return NextResponse.json({ error: 'Nimic de actualizat (objective/category lipsesc).' }, { status: 400 });
  }

  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');

  if (hasObjective) {
    db.prepare(`UPDATE ad_campaign_imports SET objective = ? WHERE id IN (${placeholders})`).run(
      body.objective || null, ...ids
    );
  }
  if (hasCategory) {
    db.prepare(`UPDATE ad_campaign_imports SET category = ? WHERE id IN (${placeholders})`).run(
      body.category || null, ...ids
    );
  }

  return NextResponse.json({ ok: true, updated: ids.length });
}
