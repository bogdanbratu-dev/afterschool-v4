import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createUserSession, SESSION_COOKIE_NAME } from '@/lib/userAuth';

const ERROR_HTML = `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="utf-8"><title>Link invalid - ActivKids</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa}.c{background:#fff;border-radius:16px;padding:40px;text-align:center;max-width:380px;box-shadow:0 4px 24px rgba(0,0,0,.1)}h1{color:#1f2937;margin:8px 0}p{color:#6b7280;margin-bottom:24px}a{color:#6366f1;font-weight:700;text-decoration:none}</style>
</head><body><div class="c">
<p style="font-size:48px;margin:0 0 12px">&#128279;</p>
<h1>Link invalid</h1>
<p>Acest link nu este valid sau a expirat.</p>
<a href="/register">Creeaza cont nou</a>
</div></body></html>`;

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!token || token.length !== 64) {
    return new Response(ERROR_HTML, { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const db = getDb();
  const row = db.prepare('SELECT user_id FROM access_tokens WHERE id = ?').get(token) as { user_id: number } | undefined;

  if (!row) {
    return new Response(ERROR_HTML, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const sessionId = createUserSession(row.user_id);
  const response = NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_BASE_URL || 'https://activkids.ro'));
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
  return response;
}
