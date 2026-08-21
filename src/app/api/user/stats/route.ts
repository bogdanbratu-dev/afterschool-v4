import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const ms = db.prepare('SELECT * FROM microsites WHERE owner_user_id = ? LIMIT 1').get(user.id) as { subdomain: string; listing_type: string; listing_id: number } | undefined;
  if (!ms) return NextResponse.json({ builtin: null, ga: null });

  const page = `/site/${ms.subdomain}`;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);

  const count = (since: number) =>
    (db.prepare('SELECT COUNT(*) as n FROM pageviews WHERE page = ? AND timestamp >= ?').get(page, since) as { n: number }).n;

  const builtin = {
    today: count(startToday.getTime()),
    last7: count(now - 7 * dayMs),
    last30: count(now - 30 * dayMs),
    total: (db.prepare('SELECT COUNT(*) as n FROM pageviews WHERE page = ?').get(page) as { n: number }).n,
    sources: db.prepare("SELECT COALESCE(source,'direct') as source, COUNT(*) as n FROM pageviews WHERE page = ? AND timestamp >= ? GROUP BY source ORDER BY n DESC LIMIT 8").all(page, now - 30 * dayMs),
    devices: db.prepare('SELECT device, COUNT(*) as n FROM pageviews WHERE page = ? AND timestamp >= ? GROUP BY device ORDER BY n DESC').all(page, now - 30 * dayMs),
  };

  // GA detaliat (optional — nu blocheaza daca lipsesc credentialele)
  let ga: unknown = null;
  try {
    const b64 = process.env.GA_SERVICE_ACCOUNT_B64;
    const propertyId = process.env.GA_PROPERTY_ID;
    if (b64 && propertyId) {
      const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
      const creds = JSON.parse(Buffer.from(b64, 'base64').toString());
      const client = new BetaAnalyticsDataClient({ credentials: creds });
      const hostName = `${ms.subdomain}.activkids.ro`;
      const hostFilter = { filter: { fieldName: 'hostName', stringFilter: { value: hostName } } };

      const [overview, sources, geo] = await Promise.all([
        client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
          dimensionFilter: hostFilter,
        }),
        client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'sessionSource' }],
          metrics: [{ name: 'sessions' }],
          dimensionFilter: hostFilter,
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 8,
        }),
        client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'city' }],
          metrics: [{ name: 'activeUsers' }],
          dimensionFilter: hostFilter,
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 8,
        }),
      ]);

      const o = overview[0].rows?.[0];
      ga = {
        sessions: parseInt(o?.metricValues?.[0]?.value || '0'),
        users: parseInt(o?.metricValues?.[1]?.value || '0'),
        pageViews: parseInt(o?.metricValues?.[2]?.value || '0'),
        avgDuration: parseFloat(o?.metricValues?.[3]?.value || '0'),
        sources: (sources[0].rows || []).map(r => ({ source: r.dimensionValues?.[0]?.value || '', sessions: parseInt(r.metricValues?.[0]?.value || '0') })),
        cities: (geo[0].rows || []).filter(r => (r.dimensionValues?.[0]?.value || '') !== '(not set)').map(r => ({ city: r.dimensionValues?.[0]?.value || '', users: parseInt(r.metricValues?.[0]?.value || '0') })),
      };
    }
  } catch (e) {
    console.error('GA per-site error:', e);
    ga = null;
  }

  return NextResponse.json({ subdomain: ms.subdomain, builtin, ga });
}
