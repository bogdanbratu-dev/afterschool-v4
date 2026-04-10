import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendAdminNotification } from '@/lib/email';
import { hashPassword, createUserSession, SESSION_COOKIE_NAME } from '@/lib/userAuth';
import { cookies } from 'next/headers';
export async function POST(request: Request) {
  try {
    const { listing_type, listing_id, listing_name, first_name, last_name, company_name, email, phone, website, password } = await request.json();

    if (!listing_type || !listing_id || !first_name || !last_name || !email || !password) {
      return NextResponse.json({ error: 'Campuri obligatorii lipsa' }, { status: 400 });
    }

    const db = getDb();

    // Verifica daca exista deja un claim pending pentru acelasi listing
    const existing = db.prepare(
      `SELECT id FROM claim_requests WHERE listing_type = ? AND listing_id = ? AND status = 'pending'`
    ).get(listing_type, listing_id);
    if (existing) {
      return NextResponse.json({ error: 'Exista deja o cerere de revendicare in asteptare pentru aceasta listare' }, { status: 400 });
    }

    // Creeaza sau gaseste contul utilizatorului
    let userId: number;
    let isNewAccount = false;
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      isNewAccount = true;
      const passwordHash = hashPassword(password as string);
      const fullName = `${first_name} ${last_name}`;
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, name, phone) VALUES (?, ?, ?, ?)'
      ).run(email, passwordHash, fullName, phone || null);
      userId = result.lastInsertRowid as number;
    }

    // Salveaza cererea de revendicare
    db.prepare(`
      INSERT INTO claim_requests (user_id, listing_type, listing_id, listing_name, first_name, last_name, contact_email, contact_phone, contact_website)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, listing_type, listing_id, listing_name || '', first_name, last_name, email, phone || null, website || null);

    // Notificare admin
    await sendAdminNotification(
      `Cerere revendicare: ${listing_name}`,
      `Cerere noua de revendicare listare:\n\nListare: ${listing_name} (${listing_type} #${listing_id})\n\nContact:\nNume: ${first_name} ${last_name}\nFirma: ${company_name || '-'}\nEmail: ${email}\nTelefon: ${phone || '-'}\nWebsite: ${website || '-'}\n${isNewAccount ? `\nCont creat:\nEmail: ${email}\n` : '\nUtilizatorul avea deja cont.'}\n\nVerifica la: https://activkids.ro/admin`
    );

    // Email de confirmare catre utilizator
    if (isNewAccount) {
      await sendAdminNotification(
        `Cererea ta de revendicare a fost primita — ActivKids`,
        `Buna ${first_name},\n\nAm primit cererea ta de revendicare pentru "${listing_name}".\n\nTe vom contacta in curand pentru verificare.\n\nDatele tale de acces:\nEmail: ${email}\nParola: cea aleasa de tine\n\nTe poti loga la: https://activkids.ro/login\n\nMultumim,\nEchipa ActivKids`
      );
    }

    // Auto-login: creeaza sesiune imediat
    const sessionId = createUserSession(userId);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return NextResponse.json({ ok: true, accountCreated: isNewAccount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
