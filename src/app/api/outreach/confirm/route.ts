import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { generateAccessToken } from '@/lib/userAuth';
import { sendEmail, sendAdminNotification } from '@/lib/email';

// Clona a fluxului de auto-claim din api/user/claim/route.ts, dar pornind de la un token de
// outreach (nu de la un formular) - vezi src/app/confirma/[token]/page.tsx pentru gate-ul de T&C
// care trebuie bifat inainte ca acest endpoint sa fie apelat. Nu seteaza is_premium: listarea
// ramane pe planul gratuit dupa confirmare.
const TABLE_FOR: Record<string, string> = {
  afterschool: 'afterschools',
  club: 'clubs',
  caterer: 'caterers',
  kindergarten: 'kindergartens',
  professional: 'professionals',
  tutor: 'tutors',
};

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token lipsa' }, { status: 400 });
    }

    const db = getDb();
    const contact = db.prepare(
      'SELECT listing_type, listing_id, confirmed_at FROM outreach_contacts WHERE confirm_token = ?'
    ).get(token) as { listing_type: string; listing_id: number; confirmed_at: number | null } | undefined;

    if (!contact) {
      return NextResponse.json({ error: 'Link invalid' }, { status: 404 });
    }

    const table = TABLE_FOR[contact.listing_type];
    if (!table) {
      return NextResponse.json({ error: 'Tip de listare necunoscut' }, { status: 400 });
    }

    const listing = db.prepare(
      `SELECT id, name, email, owner_user_id FROM ${table} WHERE id = ?`
    ).get(contact.listing_id) as { id: number; name: string; email: string | null; owner_user_id: number | null } | undefined;

    if (!listing) {
      return NextResponse.json({ error: 'Listarea nu mai exista' }, { status: 404 });
    }

    let userId: number;
    if (listing.owner_user_id) {
      userId = listing.owner_user_id;
    } else if (listing.email) {
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(listing.email) as { id: number } | undefined;
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const result = db.prepare(
          'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
        ).run(listing.email, crypto.randomBytes(32).toString('hex'), listing.name);
        userId = result.lastInsertRowid as number;
      }
    } else {
      return NextResponse.json({ error: 'Listarea nu are un email asociat' }, { status: 400 });
    }

    // Idempotent: la a doua confirmare pe acelasi token nu mai cream un claim_request nou, doar
    // emitem un access_token proaspat.
    if (!contact.confirmed_at) {
      const now = Date.now();
      db.prepare(`
        INSERT INTO claim_requests (user_id, listing_type, listing_id, listing_name, first_name, last_name, contact_email, status, reviewed_at)
        VALUES (?, ?, ?, ?, '', '', ?, 'auto_approved', ?)
      `).run(userId, contact.listing_type, contact.listing_id, listing.name, listing.email || '', now);

      db.prepare(`UPDATE ${table} SET owner_user_id = ? WHERE id = ?`).run(userId, contact.listing_id);

      db.prepare(
        `UPDATE outreach_contacts SET status = 'converted', confirmed_at = ? WHERE confirm_token = ?`
      ).run(now, token);

      void sendAdminNotification(
        'Confirmare outreach: ' + listing.name,
        'Listare: ' + listing.name + ' (' + contact.listing_type + ' #' + contact.listing_id + ')\n' +
        'A confirmat T&C din campania de outreach si a primit acces automat pe planul gratuit.'
      );
    }

    const accessToken = generateAccessToken(userId);
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://activkids.ro';
    const link = base + '/accesare/' + accessToken;

    if (listing.email) {
      void sendEmail(listing.email, 'Acces dashboard ActivKids',
        'Buna,\n\nAti confirmat listarea "' + listing.name + '" si aveti acces imediat, gratuit.\n\nLink acces dashboard:\n' + link + '\n\nSalvati acest link!\n\nEchipa ActivKids'
      );
    }

    return NextResponse.json({ ok: true, link });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
