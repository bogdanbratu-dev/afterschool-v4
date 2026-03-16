import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7');
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const db = getDb();

  // Vizite pe zi
  const pageviewRows = db.prepare(
    `SELECT page, device, timestamp FROM pageviews WHERE timestamp >= ?`
  ).all(since) as { page: string; device: string; timestamp: number }[];

  const visitsByDayMap: Record<string, number> = {};
  const pageMap: Record<string, number> = {};
  const deviceMap: Record<string, number> = { mobile: 0, desktop: 0 };

  for (const row of pageviewRows) {
    const date = new Date(row.timestamp).toISOString().slice(0, 10);
    visitsByDayMap[date] = (visitsByDayMap[date] || 0) + 1;
    pageMap[row.page] = (pageMap[row.page] || 0) + 1;
    deviceMap[row.device] = (deviceMap[row.device] || 0) + 1;
  }

  // Genereaza toate zilele din interval (inclusiv cele fara vizite)
  const visitsByDay = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    visitsByDay.push({ date, count: visitsByDayMap[date] || 0 });
  }

  // Top cautari
  const topSearches = db.prepare(
    `SELECT query, COUNT(*) as count FROM searches WHERE timestamp >= ? GROUP BY query ORDER BY count DESC LIMIT 10`
  ).all(since) as { query: string; count: number }[];

  // Top click-uri
  const topClicks = db.prepare(
    `SELECT item_name as name, type, COUNT(*) as count FROM result_clicks WHERE timestamp >= ? GROUP BY item_id, type ORDER BY count DESC LIMIT 10`
  ).all(since) as { name: string; type: string; count: number }[];

  return NextResponse.json({
    visitsByDay,
    pageBreakdown: pageMap,
    deviceBreakdown: deviceMap,
    topSearches,
    topClicks,
    total: pageviewRows.length,
  });
}
