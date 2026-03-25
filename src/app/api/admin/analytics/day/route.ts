import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'Parametru date lipsă' }, { status: 400 });
  }

  const db = getDb();

  // Parse date range for the day
  const startDate = new Date(date + 'T00:00:00.000Z');
  const endDate = new Date(date + 'T23:59:59.999Z');
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();

  // Get all pageviews for this day
  const pageviewRows = db.prepare(
    `SELECT page, device, timestamp, source, country, city, referrer FROM pageviews
     WHERE timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp DESC`
  ).all(startTimestamp, endTimestamp) as {
    page: string;
    device: string;
    timestamp: number;
    source: string | null;
    country: string | null;
    city: string | null;
    referrer: string | null;
  }[];

  // Get all clicks for this day
  const clickRows = db.prepare(
    `SELECT name, type, timestamp FROM clicks
     WHERE timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp DESC`
  ).all(startTimestamp, endTimestamp) as {
    name: string;
    type: string;
    timestamp: number;
  }[];

  // Get all searches for this day
  const searchRows = db.prepare(
    `SELECT query, timestamp FROM searches
     WHERE timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp DESC`
  ).all(startTimestamp, endTimestamp) as {
    query: string;
    timestamp: number;
  }[];

  // Analyze sources
  const sourceBreakdown: Record<string, number> = {};
  const referrerBreakdown: Record<string, number> = {};
  const searchEngineBreakdown: Record<string, number> = {};

  for (const row of pageviewRows) {
    const src = row.source || 'direct';
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;

    if (row.referrer && row.referrer !== 'direct') {
      referrerBreakdown[row.referrer] = (referrerBreakdown[row.referrer] || 0) + 1;

      // Detect search engines
      if (row.referrer.includes('google.com')) {
        searchEngineBreakdown['google'] = (searchEngineBreakdown['google'] || 0) + 1;
      } else if (row.referrer.includes('bing.com')) {
        searchEngineBreakdown['bing'] = (searchEngineBreakdown['bing'] || 0) + 1;
      } else if (row.referrer.includes('yahoo.com')) {
        searchEngineBreakdown['yahoo'] = (searchEngineBreakdown['yahoo'] || 0) + 1;
      }
    }
  }

  // Analyze locations
  const countryBreakdown: Record<string, number> = {};
  const cityBreakdown: Record<string, number> = {};

  for (const row of pageviewRows) {
    if (row.country) {
      countryBreakdown[row.country] = (countryBreakdown[row.country] || 0) + 1;
    }
    if (row.city) {
      cityBreakdown[row.city] = (cityBreakdown[row.city] || 0) + 1;
    }
  }

  // Top searches
  const searchQueryBreakdown: Record<string, number> = {};
  for (const row of searchRows) {
    searchQueryBreakdown[row.query] = (searchQueryBreakdown[row.query] || 0) + 1;
  }
  const topSearches = Object.entries(searchQueryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  // Top clicks
  const clickBreakdown: Record<string, number> = {};
  for (const row of clickRows) {
    const key = `${row.type}:${row.name}`;
    clickBreakdown[key] = (clickBreakdown[key] || 0) + 1;
  }
  const topClicks = Object.entries(clickBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => {
      const [type, name] = key.split(':');
      return { name, type, count };
    });

  return NextResponse.json({
    date,
    totalVisits: pageviewRows.length,
    pageviews: pageviewRows.slice(0, 50), // Limit for performance
    sourceBreakdown,
    referrerBreakdown,
    searchEngineBreakdown,
    countryBreakdown,
    cityBreakdown,
    topSearches,
    topClicks,
    totalClicks: clickRows.length,
    totalSearches: searchRows.length,
  });
}