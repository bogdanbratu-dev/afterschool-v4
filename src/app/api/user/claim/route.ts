import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateAccessToken } from '@/lib/userAuth';
import { sendEmail, sendAdminNotification } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { listing_type, listing_id, listing_name, first_name, last_name, email, phone, website, company_name } = await request.json();
    if (!listing_type || !listing_id || !first_name || !last_name || !email) {
      return NextResponse.json({ error: 'Campuri obligatorii lipsa' }, { status: 400 });
    }

    const db = getDb();
    let userId: number;
    let isNewAccount = false;
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      isNewAccount = true;
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, name, phone) VALUES (?, ?, ?, ?)'
      ).run(email, crypto.randomBytes(32).toString('hex'), first_name + ' ' + last_name, phone || null);
      userId = result.lastInsertRowid as number;
    }

    const now = Date.now();
    db.prepare(`
      INSERT INTO claim_requests (user_id, listing_type, listing_id, listing_name, first_name, last_name, contact_email, contact_phone, contact_website, status, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'auto_approved', ?)
    `).run(userId, listing_type, listing_id, listing_name || '', first_name, last_name, email, phone || null, website || null, now);

    // Auto-aprobare: link imediat listarea la user
    const table = listing_type === 'afterschool' ? 'afterschools' : listing_type === 'caterer' ? 'caterers' : listing_type === 'professional' ? 'professionals' : listing_type === 'kindergarten' ? 'kindergartens' : listing_type === 'tutor' ? 'tutors' : 'clubs';
    db.prepare('UPDATE ' + table + ' SET owner_user_id = ? WHERE id = ?').run(userId, listing_id);

    const token = generateAccessToken(userId);
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://activkids.ro';
    const link = base + '/accesare/' + token;

    void sendAdminNotification(
      'Revendicare noua (auto-aprobata): ' + listing_name,
      'Listare: ' + listing_name + ' (' + listing_type + ' #' + listing_id + ')\nNume: ' + first_name + ' ' + last_name + '\nEmail: ' + email + '\n\nListarea a fost LINKUITA automat.\nDaca e frauda, sterge contul din admin:\nhttps://activkids.ro/admin'
    );

    void sendEmail(email, 'Acces dashboard ActivKids',
      'Buna ' + first_name + ',\n\nAm primit cererea ta pentru "' + listing_name + '" si ai primit acces imediat.\n\nLink acces dashboard:\n' + link + '\n\nSalveaza acest link!\n\nEchipa ActivKids'
    );

    return NextResponse.json({ ok: true, token, link, accountCreated: isNewAccount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
