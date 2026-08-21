import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { ensureCircTables } from '@/lib/circumscriptii';

// Editeaza campurile editoriale (Faza 2): media_en/media_en_year, facilities/
// facilities_highlight, ssd_available/ssd_info, news_url, despre, show_all_contacts. Campurile din
// sursa oficiala ISMB (name, sector, address, phone, website) nu sunt editabile aici, ca sa nu
// diverga de la urmatorul re-import (scripts/import-circumscriptii.js le suprascrie oricum). Un
// camp lasat gol se salveaza NULL, ceea ce echivaleaza cu "sterge informatia" pentru acel camp.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const { id } = await params;
  const db = getDb();
  ensureCircTables(db);
  const body = await request.json();

  const facilities: string[] = Array.isArray(body.facilities)
    ? body.facilities.map((f: string) => f.trim()).filter(Boolean)
    : [];

  db.prepare(`
    UPDATE circ_schools SET
      media_en = ?, media_en_year = ?,
      facilities = ?, facilities_highlight = ?,
      ssd_available = ?, ssd_info = ?,
      news_url = ?, despre = ?, show_all_contacts = ?,
      updated_at = strftime('%s','now') * 1000
    WHERE id = ?
  `).run(
    body.media_en === '' || body.media_en == null ? null : Number(body.media_en),
    body.media_en_year === '' || body.media_en_year == null ? null : Number(body.media_en_year),
    facilities.length > 0 ? JSON.stringify(facilities) : null,
    body.facilities_highlight?.trim() || null,
    body.ssd_available ? 1 : 0,
    body.ssd_info?.trim() || null,
    body.news_url?.trim() || null,
    body.despre?.trim() || null,
    body.show_all_contacts ? 1 : 0,
    id
  );

  const updated = db.prepare('SELECT * FROM circ_schools WHERE id = ?').get(id);
  return NextResponse.json(updated);
}
