import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { isBotUserAgent } from '@/lib/botDetection';

function detectSource(referrer: string): string {
  if (!referrer) return 'direct';
  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();
    if (host.includes('google')) return 'google';
    if (host.includes('bing')) return 'bing';
    if (host.includes('yahoo')) return 'yahoo';
    if (host.includes('facebook') || host.includes('fb.com') || host.includes('fb.me')) return 'facebook';
    if (host.includes('instagram')) return 'instagram';
    if (host.includes('tiktok')) return 'tiktok';
    if (host.includes('youtube')) return 'youtube';
    if (host.includes('activkids.ro') || host.includes('localhost')) return 'direct';
    return 'other';
  } catch {
    return 'other';
  }
}

async function getGeoFromIp(ip: string): Promise<{ country: string | null; city: string | null }> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: null, city: null };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { country: null, city: null };
    const data = await res.json();
    return { country: data.country || null, city: data.city || null };
  } catch {
    return { country: null, city: null };
  }
}

export async function POST(request: Request) {
  try {
    const { page, device, referrer } = await request.json();

    // Filtreaza botii si adminii logati
    const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);
    const ua = headersList.get('user-agent') || '';
    if (isBotUserAgent(ua)) return NextResponse.json({ ok: true });
    if (cookieStore.get('admin_session')) return NextResponse.json({ ok: true });

    const db = getDb();

    const source = detectSource(referrer || '');

    // Extract IP from headers. X-Real-IP intai: nginx il seteaza direct din $remote_addr,
    // suprascriindu-l mereu. X-Forwarded-For foloseste $proxy_add_x_forwarded_for (adauga, nu
    // inlocuieste), deci un client poate trimite el insusi acest header cu o valoare falsa pe
    // prima pozitie - nu e de incredere ca prima sursa (vezi acelasi fix in rateLimit.ts::clientIp).
    const realIp = headersList.get('x-real-ip');
    const forwarded = headersList.get('x-forwarded-for');
    const ip = realIp?.trim() || (forwarded?.split(',')[0]?.trim()) || '';

    // Geo-IP lookup (non-blocking — don't let it fail the pageview)
    const geo = await getGeoFromIp(ip);

    db.prepare(
      'INSERT INTO pageviews (page, device, timestamp, referrer, source, country, city) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      page || '/', device || 'desktop', Date.now(),
      referrer || null, source, geo.country, geo.city
    );
  } catch {}
  return NextResponse.json({ ok: true });
}
