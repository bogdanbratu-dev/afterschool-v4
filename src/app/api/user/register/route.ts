import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, createUserSession, SESSION_COOKIE_NAME } from '@/lib/userAuth';

export async function POST(request: Request) {
  try {
    const { email, password, name, phone } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, parola si numele sunt obligatorii' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Parola trebuie sa aiba minim 6 caractere' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return NextResponse.json({ error: 'Exista deja un cont cu acest email' }, { status: 400 });
    }

    const result = db.prepare(
      'INSERT INTO users (email, password_hash, name, phone) VALUES (?, ?, ?, ?)'
    ).run(email.toLowerCase().trim(), hashPassword(password), name.trim(), phone || null);

    const sessionId = createUserSession(result.lastInsertRowid as number);

    const response = NextResponse.json({ ok: true, name: name.trim() });
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
