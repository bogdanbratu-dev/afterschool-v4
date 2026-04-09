import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { isAuthenticated } from '@/lib/auth';

function getClient() {
  const b64 = process.env.GA_SERVICE_ACCOUNT_B64;
  if (!b64) throw new Error('GA_SERVICE_ACCOUNT_B64 not set');
  const creds = JSON.parse(Buffer.from(b64, 'base64').toString());
  return new BetaAnalyticsDataClient({ credentials: creds });
}

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const propertyId = process.env.GA_PROPERTY_ID;
  if (!propertyId) {
    return NextResponse.json({ error: 'GA_PROPERTY_ID not set' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const days = searchParams.get('days') || '7';
  const dateRange = from && to
    ? { startDate: from, endDate: to }
    : { startDate: `${days}daysAgo`, endDate: 'today' };

  try {
    const client = getClient();

    const [overview, pages, sources, geo, userJourney] = await Promise.all([
      // Overview: sessions, users, pageviews, bounce rate, avg session duration
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'newUsers' },
        ],
      }),

      // Top pages
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),

      // Traffic sources
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),

      // Geography
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'country' }, { name: 'city' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 20,
      }),

      // User journey: first page → landing page flow
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'landingPage' }],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
    ]);

    // Parse overview
    const overviewRow = overview[0].rows?.[0];
    const stats = {
      sessions: parseInt(overviewRow?.metricValues?.[0]?.value || '0'),
      activeUsers: parseInt(overviewRow?.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(overviewRow?.metricValues?.[2]?.value || '0'),
      bounceRate: parseFloat(overviewRow?.metricValues?.[3]?.value || '0'),
      avgSessionDuration: parseFloat(overviewRow?.metricValues?.[4]?.value || '0'),
      newUsers: parseInt(overviewRow?.metricValues?.[5]?.value || '0'),
    };

    // Parse pages
    const topPages = (pages[0].rows || []).map(row => ({
      path: row.dimensionValues?.[0]?.value || '',
      title: row.dimensionValues?.[1]?.value || '',
      views: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
      avgDuration: parseFloat(row.metricValues?.[2]?.value || '0'),
    }));

    // Parse sources
    const topSources = (sources[0].rows || []).map(row => ({
      source: row.dimensionValues?.[0]?.value || '',
      medium: row.dimensionValues?.[1]?.value || '',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
    }));

    // Parse geo
    const countryMap: Record<string, number> = {};
    const cityMap: Record<string, number> = {};
    for (const row of (geo[0].rows || [])) {
      const country = row.dimensionValues?.[0]?.value || '';
      const city = row.dimensionValues?.[1]?.value || '';
      const users = parseInt(row.metricValues?.[0]?.value || '0');
      if (country && country !== '(not set)') countryMap[country] = (countryMap[country] || 0) + users;
      if (city && city !== '(not set)') cityMap[city] = (cityMap[city] || 0) + users;
    }
    const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([country, users]) => ({ country, users }));
    const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, users]) => ({ city, users }));

    // Parse landing pages (funnel entry points)
    const landingPages = (userJourney[0].rows || []).map(row => ({
      page: row.dimensionValues?.[0]?.value || '',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      bounceRate: parseFloat(row.metricValues?.[1]?.value || '0'),
      avgDuration: parseFloat(row.metricValues?.[2]?.value || '0'),
    }));

    return NextResponse.json({ stats, topPages, topSources, topCountries, topCities, landingPages });
  } catch (err: any) {
    console.error('GA API error:', err);
    return NextResponse.json({ error: err.message || 'GA API error' }, { status: 500 });
  }
}
