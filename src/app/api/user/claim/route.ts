import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';
import { sendAdminNotification } from '@/lib/email';

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  try {
    const { listing_type, listing_id, listing_name, message } = await request.json();
    if (!listing_type || !listing_id || !listing_name) {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 });
    }

    const db = getDb();

    // Verifica daca exista deja un claim pending pentru acelasi listing
    const existing = db.prepare(
      `SELECT id FROM claim_requests WHERE listing_type = ? AND listing_id = ? AND status = 'pending'`
    ).get(listing_type, listing_id);
    if (existing) {
      return NextResponse.json({ error: 'Exista deja o cerere de revendicare in asteptare pentru aceasta listare' }, { status: 400 });
    }

    db.prepare(`
      INSERT INTO claim_requests (user_id, listing_type, listing_id, listing_name, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, listing_type, listing_id, listing_name, message || null);

    await sendAdminNotification(
      'Cerere revendicare listing',
      `${user.name} (${user.email}) revendica: "${listing_name}" (${listing_type} #${listing_id}).\n\nMesaj: ${message || '-'}\n\nVerifica la: https://activkids.ro/admin`
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
