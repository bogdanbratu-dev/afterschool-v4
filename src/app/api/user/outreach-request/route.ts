import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';
import { sendAdminNotification } from '@/lib/email';

const PRICE_RON = 150;

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const prof = db.prepare('SELECT id, name FROM professionals WHERE owner_user_id = ?').get(user.id) as { id: number; name: string } | undefined;
  const tutor = !prof ? db.prepare('SELECT id, name FROM tutors WHERE owner_user_id = ?').get(user.id) as { id: number; name: string } | undefined : undefined;
  const caterer = !prof && !tutor ? db.prepare('SELECT id, name FROM caterers WHERE owner_user_id = ?').get(user.id) as { id: number; name: string } | undefined : undefined;
  const listing = prof ? { type: 'professional', ...prof } : tutor ? { type: 'tutor', ...tutor } : caterer ? { type: 'caterer', ...caterer } : null;

  if (!listing) return NextResponse.json({ error: 'Pachetul este disponibil doar pentru colaboratori, meditatori/profesori si catering' }, { status: 400 });

  const existing = db.prepare(
    "SELECT id FROM outreach_requests WHERE listing_type = ? AND listing_id = ? AND status != 'rejected'"
  ).get(listing.type, listing.id);
  if (existing) return NextResponse.json({ error: 'Ai deja o cerere pentru acest pachet' }, { status: 400 });

  let body: { reference?: string } = {};
  try { body = await request.json(); } catch {}

  const u = db.prepare('SELECT name, email FROM users WHERE id = ?').get(user.id) as { name: string; email: string };

  db.prepare(
    'INSERT INTO outreach_requests (user_id, listing_type, listing_id, listing_name, amount, reference) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(user.id, listing.type, listing.id, listing.name, PRICE_RON, body.reference || null);

  void sendAdminNotification(
    'Cerere Pachet Introducere Directa: ' + listing.name,
    `${u.name} (${u.email}) a declarat plata de ${PRICE_RON} RON pentru Pachetul Introducere Directa.
Listare: ${listing.name} (${listing.type} #${listing.id})
Referinta: ${body.reference || '-'}

Verifica plata in Revolut (@bogdanmxn) apoi porneste outreach-ul catre afterschool-uri din admin.`
  );

  return NextResponse.json({ ok: true });
}
