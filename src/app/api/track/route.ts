import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const id = parseInt(searchParams.get('id') || '0');
  const name = searchParams.get('name') || '';
  const lt = searchParams.get('lt') || '';
  const url = searchParams.get('url') || '';

  if (url) {
    const cookieStore = await cookies();
    const isAdmin = !!cookieStore.get('admin_session');
    if (!isAdmin) {
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
