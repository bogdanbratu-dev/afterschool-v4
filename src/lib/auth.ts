import { cookies } from 'next/headers';
import bcryptjs from 'bcryptjs';
import { getDb } from './db';

const SESSION_COOKIE = 'admin_session';
const SESSION_SECRET = 'afterschool-admin-secret-key-change-in-production';

export async function login(username: string, password: string): Promise<boolean> {
  const db = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as { id: number; username: string; password: string } | undefined;

  if (!user) return false;

  const valid = bcryptjs.compareSync(password, user.password);
  if (!valid) return false;

  const cookieStore = await cookies();
  const token = Buffer.from(JSON.stringify({ userId: user.id, username: user.username, ts: Date.now() })).toString('base64');
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false, // local dev
    maxAge: 60 * 60 * 24, // 24h
    path: '/',
  });

  return true;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE);
  if (!token) return false;

  try {
    const data = JSON.parse(Buffer.from(token.value, 'base64').toString());
    return !!data.userId;
  } catch {
    return false;
  }
}
