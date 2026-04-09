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
  const pageFilter = searchParams.get('page') || '';

  if (fromParam && toParam) {
    fromTs = new Date(fromParam + 'T00:00:00').getTime();
    toTs = new Date(toParam + 'T23:59:59.999').getTime();
    days = Math.max(1, Math.round((toTs - fromTs) / (24 * 60 * 60 * 1000)));
  } else {
    days = parseInt(searchParams.get('days') || '7');
    toTs = Date.now();
    fromTs = toTs - days * 24 * 60 * 60 * 1000;
  }

  // Extrage item_id din slug pentru pagini de detaliu (/afterschool/name-123 sau /activitati/name-123)
  let itemIdFilter: number | null = null;
  if (pageFilter) {
    const match = pageFilter.match(/\/(?:afterschool|activitati)\/[^/]+-(\d+)$/);
    if (match) itemIdFilter = parseInt(match[1]);
  }

  // Vizite pe zi (filtrat dupa pagina daca e selectata)
  const pageviewRows = pageFilter
    ? db.prepare(
        `SELECT page, device, timestamp, source, country, city, referrer FROM pageviews WHERE timestamp >= ? AND timestamp <= ? AND page = ?`
      ).all(fromTs, toTs, pageFilter) as { page: string; device: string; timestamp: number; source: string | null; country: string | null; city: string | null; referrer: string | null }[]
    : db.prepare(
        `SELECT page, device, timestamp, source, country, city, referrer FROM pageviews WHERE timestamp >= ? AND timestamp <= ?`
      ).all(fromTs, toTs) as { page: string; device: string; timestamp: number; source: string | null; country: string | null; city: string | null; referrer: string | null }[];

  const visitsByDayMap: Record<string, number> = {};
  const pageMap: Record<string, number> = {};
  const deviceMap: Record<string, number> = { mobile: 0, desktop: 0 };
  const sourceMap: Record<string, number> = {};
  const countryMap: Record<string, number> = {};
  const cityMap: Record<string, number> = {};
  const referrerMap: Record<string, number> = {};
  const keywordMap: Record<string, number> = {};

  for (const row of pageviewRows) {
    const date = new Date(row.timestamp).toISOString().slice(0, 10);
    visitsByDayMap[date] = (visitsByDayMap[date] || 0) + 1;
    pageMap[row.page] = (pageMap[row.page] || 0) + 1;
    deviceMap[row.device] = (deviceMap[row.device] || 0) + 1;

    const src = row.source || 'direct';
    sourceMap[src] = (sourceMap[src] || 0) + 1;

    if (row.country) countryMap[row.country] = (countryMap[row.country] || 0) + 1;
    if (row.city) cityMap[row.city] = (cityMap[row.city] || 0) + 1;

    // Referrer domain
    if (row.referrer) {
      try {
        const url = new URL(row.referrer);
        const domain = url.hostname.replace(/^www\./, '');
        if (!domain.includes('activkids.ro')) {
          referrerMap[domain] = (referrerMap[domain] || 0) + 1;
        }
        // Cuvinte cheie din Bing, Yahoo, DuckDuckGo (Google le ascunde)
        const q = url.searchParams.get('q') || url.searchParams.get('p');
        if (q && (domain.includes('bing') || domain.includes('yahoo') || domain.includes('duckduckgo'))) {
          keywordMap[q.toLowerCase()] = (keywordMap[q.toLowerCase()] || 0) + 1;
        }
      } catch {}
    }
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

  // Top cautari (filtrate dupa pagina daca e o pagina de lista, altfel toate)
  const topSearches = (!pageFilter || !itemIdFilter)
    ? db.prepare(
        `SELECT query, COUNT(*) as count FROM searches WHERE timestamp >= ? AND timestamp <= ? GROUP BY query ORDER BY count DESC LIMIT 10`
      ).all(fromTs, toTs) as { query: string; count: number }[]
    : [];

  // Top click-uri cu breakdown pe link_type (filtrate dupa item_id daca e pagina de detaliu)
  const topClicks = itemIdFilter
    ? db.prepare(
        `SELECT item_name as name, type, link_type, COUNT(*) as count FROM result_clicks WHERE timestamp >= ? AND timestamp <= ? AND item_id = ? GROUP BY item_id, link_type ORDER BY count DESC LIMIT 20`
      ).all(fromTs, toTs, itemIdFilter) as { name: string; type: string; link_type: string | null; count: number }[]
    : db.prepare(
        `SELECT item_name as name, type, link_type, COUNT(*) as count FROM result_clicks WHERE timestamp >= ? AND timestamp <= ? GROUP BY item_id, link_type ORDER BY count DESC LIMIT 20`
      ).all(fromTs, toTs) as { name: string; type: string; link_type: string | null; count: number }[];

  // Breakdown pe tip de link (filtrat la fel)
  const linkTypeRows = itemIdFilter
    ? db.prepare(
        `SELECT link_type, COUNT(*) as count FROM result_clicks WHERE timestamp >= ? AND timestamp <= ? AND item_id = ? GROUP BY link_type ORDER BY count DESC`
      ).all(fromTs, toTs, itemIdFilter) as { link_type: string | null; count: number }[]
    : db.prepare(
        `SELECT link_type, COUNT(*) as count FROM result_clicks WHERE timestamp >= ? AND timestamp <= ? GROUP BY link_type ORDER BY count DESC`
      ).all(fromTs, toTs) as { link_type: string | null; count: number }[];
  const linkTypeBreakdown: Record<string, number> = {};
  for (const row of linkTypeRows) {
    linkTypeBreakdown[row.link_type ?? 'necunoscut'] = row.count;
  }

  const topCountries = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([country, count]) => ({ country, count }));

  const topCities = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([city, count]) => ({ city, count }));

  const topReferrers = Object.entries(referrerMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([domain, count]) => ({ domain, count }));

  const topKeywords = Object.entries(keywordMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  return NextResponse.json({
    visitsByDay,
    pageBreakdown: pageMap,
    deviceBreakdown: deviceMap,
    sourceBreakdown: sourceMap,
    topCountries,
    topCities,
    topReferrers,
    topKeywords,
    topSearches,
    topClicks,
    linkTypeBreakdown,
    total: pageviewRows.length,
    days,
    pageFilter,
  });
}
