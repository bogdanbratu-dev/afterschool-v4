import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';
import { sendAdminNotification } from '@/lib/email';

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const u = db.prepare('SELECT id, name, email, is_premium FROM users WHERE id = ?').get(user.id) as {
    id: number; name: string; email: string; is_premium: number;
  } | undefined;

  if (!u) return NextResponse.json({ error: 'User negasit' }, { status: 404 });
  if (u.is_premium) return NextResponse.json({ error: 'Deja premium' }, { status: 400 });

  let body: { reference?: string } = {};
  try { body = await request.json(); } catch {}

  const now = Date.now();
  const periodEnd = now + 90 * 24 * 60 * 60 * 1000;

  db.prepare('UPDATE users SET is_premium = 1, premium_pending = 0 WHERE id = ?').run(user.id);
  db.prepare(
    "INSERT INTO payments (user_id, amount, currency, status, period_start, period_end, notes) VALUES (?, 100, 'RON', 'pending_verification', ?, ?, ?)"
  ).run(user.id, now, periodEnd, body.reference || null);

  void sendAdminNotification(
    'Plata Premium declarata',
    `${u.name} (${u.email}) a declarat ca a platit 100 RON.
Referinta: ${body.reference || '-'}

Accesul a fost ACTIVAT AUTOMAT.
Verifica in Revolut (@bogdanmxn) si dezactiveaza din admin daca nu gasesti plata.

ID user: ${u.id}`
  );

  return NextResponse.json({ ok: true });
}
