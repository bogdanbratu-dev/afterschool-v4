import { getDb } from './db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE = 'user_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 zile

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + process.env.AUTH_SECRET || 'activkids_secret').digest('hex');
}

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function getUserSession(): Promise<{ id: number; email: string; name: string; is_premium: number } | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId) return null;

    const db = getDb();
    const row = db.prepare(`
      SELECT u.id, u.email, u.name, u.is_premium
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.created_at > ?
    `).get(sessionId, Date.now() - SESSION_DURATION) as { id: number; email: string; name: string; is_premium: number } | undefined;

    return row || null;
  } catch {
    return null;
  }
}

export function createUserSession(userId: number): string {
  const sessionId = generateSessionId();
  const db = getDb();
  db.prepare('INSERT INTO user_sessions (id, user_id, created_at) VALUES (?, ?, ?)').run(sessionId, userId, Date.now());
  return sessionId;
}

export function deleteUserSession(sessionId: string) {
  const db = getDb();
  db.prepare('DELETE FROM user_sessions WHERE id = ?').run(sessionId);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
