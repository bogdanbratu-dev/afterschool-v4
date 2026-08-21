import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

// Clona lui whatsapp-leads/mark-sent/route.ts, scoped la campania "pachet site de prezentare" -
// scrie microsite_pitch_whatsapp_sent_at, nu whatsapp_sent_at (acela ramane al campaniei generale).
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
    INSERT INTO outreach_contacts (listing_type, listing_id, microsite_pitch_whatsapp_sent_at)
    VALUES (?, ?, ?)
    ON CONFLICT(listing_type, listing_id) DO UPDATE SET microsite_pitch_whatsapp_sent_at = excluded.microsite_pitch_whatsapp_sent_at
  `).run(listing_type, listing_id, value);
  return NextResponse.json({ success: true, microsite_pitch_whatsapp_sent_at: value });
}
