import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendAdminNotification } from '@/lib/email';
import { hashPassword } from '@/lib/userAuth';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { listing_type, listing_id, listing_name, first_name, last_name, company_name, email, phone, website } = await request.json();

    if (!listing_type || !listing_id || !first_name || !last_name || !email) {
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
    let tempPassword: string | null = null;
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      tempPassword = crypto.randomBytes(5).toString('hex'); // ex: a3f9b2c1d4
      const passwordHash = hashPassword(tempPassword);
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
      `Cerere noua de revendicare listare:\n\nListare: ${listing_name} (${listing_type} #${listing_id})\n\nContact:\nNume: ${first_name} ${last_name}\nFirma: ${company_name || '-'}\nEmail: ${email}\nTelefon: ${phone || '-'}\nWebsite: ${website || '-'}\n${tempPassword ? `\nCont creat automat:\nEmail: ${email}\nParola temporara: ${tempPassword}\n` : '\nUtilizatorul avea deja cont.'}\n\nVerifica la: https://activkids.ro/admin`
    );

    // Email de confirmare catre utilizator (cu parola daca contul e nou)
    if (tempPassword) {
      await sendAdminNotification(
        `Cererea ta de revendicare a fost primita — ActivKids`,
        `Buna ${first_name},\n\nAm primit cererea ta de revendicare pentru "${listing_name}".\n\nTe vom contacta in curand pentru verificare.\n\nIntre timp, un cont a fost creat automat pentru tine:\nEmail: ${email}\nParola temporara: ${tempPassword}\n\nTe poti loga la: https://activkids.ro/login\n\nMultumim,\nEchipa ActivKids`
      );
    }

    return NextResponse.json({ ok: true, accountCreated: !!tempPassword });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
