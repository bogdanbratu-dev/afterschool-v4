import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { getDb } from '@/lib/db';
import { isBotUserAgent } from '@/lib/botDetection';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const id = parseInt(searchParams.get('id') || '0');
  const name = searchParams.get('name') || '';
  const lt = searchParams.get('lt') || '';
  const url = searchParams.get('url') || '';

  if (url) {
    const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);
    const isAdmin = !!cookieStore.get('admin_session');
    const ua = headersList.get('user-agent') || '';
    // Acest link e un <a href> normal, deci orice bot/crawler/scanner de linkuri care
    // urmareste linkurile paginii declanseaza acest GET fara sa fie un vizitator real -
    // spre deosebire de /api/analytics/pageview care e un beacon JS si nu ruleaza deloc
    // pentru botii fara JS. Filtram aceiasi boti aici ca sa nu umfle statistica de click-uri.
    if (!isAdmin && !isBotUserAgent(ua)) {
      try {
        const db = getDb();
        db.prepare(
          'INSERT INTO result_clicks (type, item_id, item_name, link_type, timestamp) VALUES (?, ?, ?, ?, ?)'
        ).run(type, id, name, lt, Date.now());
      } catch {}
    }
    return NextResponse.redirect(url);
  }

  return new NextResponse('Missing url', { status: 400 });
}
