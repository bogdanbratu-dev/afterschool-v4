import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { ensureCircTables } from '@/lib/circumscriptii';

// Lista completa (174 randuri, suficient de mica pentru cautare/filtrare client-side).
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const db = getDb();
  ensureCircTables(db);
  const rows = db.prepare(
    `SELECT id, name, type, sector, address, phone, website,
            media_en, media_en_year, facilities, facilities_highlight,
            ssd_available, ssd_info, news_url, despre, show_all_contacts, updated_at
     FROM circ_schools ORDER BY sector, name`
  ).all();
  return NextResponse.json(rows);
}
