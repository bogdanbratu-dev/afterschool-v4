import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

// Marcheaza/demarcheaza "trimis" per contact (nu per pozitie de batch - vezi comentariul din
// db.ts la whatsapp_sent_at). listing_type: 'afterschool' | 'club' | 'caterer' | 'user'.
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const { listing_type, listing_id, sent } = await request.json();
  if (!listing_type || !listing_id) {
    return NextResponse.json({ error: 'listing_type și listing_id sunt obligatorii' }, { status: 400 });
  }
  const db = getDb();
  const value = sent === false ? null : Date.now();
  db.prepare(`
    INSERT INTO outreach_contacts (listing_type, listing_id, whatsapp_sent_at)
    VALUES (?, ?, ?)
    ON CONFLICT(listing_type, listing_id) DO UPDATE SET whatsapp_sent_at = excluded.whatsapp_sent_at
  `).run(listing_type, listing_id, value);
  return NextResponse.json({ success: true, whatsapp_sent_at: value });
}
