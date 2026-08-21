import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateAccessToken, createUserSession, SESSION_COOKIE_NAME } from '@/lib/userAuth';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email, name, phone } = await request.json();
    if (!email || !name) return NextResponse.json({ error: 'Email si numele sunt obligatorii' }, { status: 400 });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) return NextResponse.json({ error: 'Exista deja un cont cu acest email' }, { status: 400 });

    const result = db.prepare(
      'INSERT INTO users (email, password_hash, name, phone) VALUES (?, ?, ?, ?)'
    ).run(email.toLowerCase().trim(), crypto.randomBytes(32).toString('hex'), name.trim(), phone || null);

    const userId = result.lastInsertRowid as number;
    const token = generateAccessToken(userId);
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://activkids.ro';
    const link = `${base}/accesare/${token}`;

    void sendEmail(email, 'Link acces dashboard ActivKids',
      `Buna ${name.trim()},

Link-ul tau securizat de acces la dashboard:
${link}

Salveaza acest link - il vei folosi pentru a accesa si actualiza listarea ta.

Multumim,
Echipa ActivKids`
    );

    // Sesiunea se seteaza direct aici (nu printr-un fetch separat catre /accesare/[token]),
    // ca sa nu depindem de urmarirea unui redirect pentru Set-Cookie - nesigur in webview-ul FB.
    const sessionId = createUserSession(userId);
    const response = NextResponse.json({ ok: true, token, link });
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
