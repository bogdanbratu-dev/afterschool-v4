import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const db = getDb();

  // Suporta fie from/to (YYYY-MM-DD), fie days (backward compat)
  let fromTs: number;
  let toTs: number;
  let days: number;

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  if (fromParam && toParam) {
    fromTs = new Date(fromParam + 'T00:00:00').getTime();
    toTs = new Date(toParam + 'T23:59:59.999').getTime();
    days = Math.max(1, Math.round((toTs - fromTs) / (24 * 60 * 60 * 1000)));
  } else {
    days = parseInt(searchParams.get('days') || '7');
    toTs = Date.now();
    fromTs = toTs - days * 24 * 60 * 60 * 1000;
  }

  // Vizite pe zi
  const pageviewRows = db.prepare(
    `SELECT page, device, timestamp, source, country, city FROM pageviews WHERE timestamp >= ? AND timestamp <= ?`
  ).all(fromTs, toTs) as { page: string; device: string; timestamp: number; source: string | null; country: string | null; city: string | null }[];

  const visitsByDayMap: Record<string, number> = {};
  const pageMap: Record<string, number> = {};
  const deviceMap: Record<string, number> = { mobile: 0, desktop: 0 };
  const sourceMap: Record<string, number> = {};
  const countryMap: Record<string, number> = {};
  const cityMap: Record<string, number> = {};

  for (const row of pageviewRows) {
    const date = new Date(row.timestamp).toISOString().slice(0, 10);
    visitsByDayMap[date] = (visitsByDayMap[date] || 0) + 1;
    pageMap[row.page] = (pageMap[row.page] || 0) + 1;
    deviceMap[row.device] = (deviceMap[row.device] || 0) + 1;

    const src = row.source || 'direct';
    sourceMap[src] = (sourceMap[src] || 0) + 1;

    if (row.country) countryMap[row.country] = (countryMap[row.country] || 0) + 1;
    if (row.city) cityMap[row.city] = (cityMap[row.city] || 0) + 1;
  }

  // Genereaza toate zilele din interval (inclusiv cele fara vizite)
  const visitsByDay = [];
  const startDate = new Date(fromParam ? fromParam + 'T00:00:00' : fromTs);
  const endDate = new Date(toParam ? toParam + 'T00:00:00' : toTs);
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const date = cur.toISOString().slice(0, 10);
    visitsByDay.push({ date, count: visitsByDayMap[date] || 0 });
    cur.setDate(cur.getDate() + 1);
  }

  // Top cautari
  const topSearches = db.prepare(
    `SELECT query, COUNT(*) as count FROM searches WHERE timestamp >= ? AND timestamp <= ? GROUP BY query ORDER BY count DESC LIMIT 10`
  ).all(fromTs, toTs) as { query: string; count: number }[];

  // Top click-uri
  const topClicks = db.prepare(
    `SELECT item_name as name, type, COUNT(*) as count FROM result_clicks WHERE timestamp >= ? AND timestamp <= ? GROUP BY item_id, type ORDER BY count DESC LIMIT 10`
  ).all(fromTs, toTs) as { name: string; type: string; count: number }[];

  const topCountries = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([country, count]) => ({ country, count }));

  const topCities = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([city, count]) => ({ city, count }));

  return NextResponse.json({
    visitsByDay,
    pageBreakdown: pageMap,
    deviceBreakdown: deviceMap,
    sourceBreakdown: sourceMap,
    topCountries,
    topCities,
    topSearches,
    topClicks,
    total: pageviewRows.length,
    days,
  });
}
