import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';
import { sendAdminNotification } from '@/lib/email';

export async function POST() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const u = db.prepare('SELECT id, name, email, is_premium, premium_pending FROM users WHERE id = ?').get(user.id) as {
    id: number; name: string; email: string; is_premium: number; premium_pending: number;
  } | undefined;

  if (!u) return NextResponse.json({ error: 'User negasit' }, { status: 404 });
  if (u.is_premium) return NextResponse.json({ error: 'Deja premium' }, { status: 400 });
  if (u.premium_pending) return NextResponse.json({ error: 'Cerere deja trimisa' }, { status: 400 });

  db.prepare('UPDATE users SET premium_pending = 1 WHERE id = ?').run(user.id);

  await sendAdminNotification(
    'Cerere plata Premium',
    `Utilizatorul ${u.name} (${u.email}) a declarat ca a platit abonamentul Premium de 50 RON/luna.\n\nVerifica in Revolut (@bogdanmxn) si aproba din panoul de admin:\nhttps://activkids.ro/admin\n\nID user: ${u.id}`
  );

  return NextResponse.json({ ok: true });
}
