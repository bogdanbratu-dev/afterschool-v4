import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteUserSession, SESSION_COOKIE_NAME } from '@/lib/userAuth';

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) deleteUserSession(sessionId);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
