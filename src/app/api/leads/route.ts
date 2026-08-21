import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendEmail, sendAdminNotification } from '@/lib/email';

const LISTING_TABLES: Record<string, string> = {
  afterschool: 'afterschools',
  club: 'clubs',
  caterer: 'caterers',
  professional: 'professionals',
  kindergarten: 'kindergartens',
};

export async function POST(request: Request) {
  try {
    const { listing_type, listing_id, listing_name, parent_name, parent_phone, message, source, match_context } = await request.json();

    if (!listing_type || !listing_id || !parent_name || !parent_phone) {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO leads (listing_type, listing_id, listing_name, parent_name, parent_phone, message, source, match_context)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      listing_type, listing_id, listing_name, parent_name.trim(), parent_phone.trim(), message?.trim() || null,
      source || null, match_context ? JSON.stringify(match_context) : null
    );

    const table = LISTING_TABLES[listing_type];
    const ownerRow = table
      ? (db.prepare(`SELECT email FROM ${table} WHERE id = ?`).get(listing_id) as { email: string | null } | undefined)
      : undefined;

    const body = `Bună ziua,\n\nAți primit o cerere de informații prin ActivKids.ro.\n\nNume părinte: ${parent_name.trim()}\nTelefon: ${parent_phone.trim()}${message?.trim() ? `\nMesaj: ${message.trim()}` : ''}\n\nVă rugăm să îi contactați cât mai curând.\n\nEchipa ActivKids`;

    if (ownerRow?.email) {
      sendEmail(ownerRow.email, `Cerere nouă de informații – ${listing_name}`, body).catch(() => {});
    }
    sendAdminNotification(
      `Lead nou – ${listing_name}`,
      `${body}\n\n(Listare: ${listing_type} #${listing_id}${ownerRow?.email ? `, trimis și către ${ownerRow.email}` : ', fără email de contact configurat'})`
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error saving lead:', err);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
