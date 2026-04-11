import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { listing_type, listing_id, listing_name, parent_name, parent_phone, message } = await request.json();

    if (!listing_type || !listing_id || !parent_name || !parent_phone) {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO leads (listing_type, listing_id, listing_name, parent_name, parent_phone, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(listing_type, listing_id, listing_name, parent_name.trim(), parent_phone.trim(), message?.trim() || null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error saving lead:', err);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
