import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, createUserSession, SESSION_COOKIE_NAME } from '@/lib/userAuth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email si parola sunt obligatorii' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare(
      'SELECT id, name, is_premium FROM users WHERE email = ? AND password_hash = ?'
    ).get(email.toLowerCase().trim(), hashPassword(password)) as { id: number; name: string; is_premium: number } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'Email sau parola incorecta' }, { status: 401 });
    }

    const sessionId = createUserSession(user.id);
    const response = NextResponse.json({ ok: true, name: user.name, is_premium: user.is_premium });
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
