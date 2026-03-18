import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  // Check for credentials file
  const credPaths = [
    path.join(process.cwd(), 'credentials.json'),
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH || '',
  ].filter(Boolean);

  let credPath = '';
  for (const p of credPaths) {
    if (p && fs.existsSync(p)) { credPath = p; break; }
  }

  if (!credPath) {
    return NextResponse.json({
      configured: false,
      error: 'Google Search Console nu este configurat. Plasează credentials.json în directorul proiectului.',
      queries: [],
      pages: [],
    });
  }

  try {
    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      keyFile: credPath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Try multiple site URL formats
    const siteUrls = process.env.SEARCH_CONSOLE_SITE_URL
      ? [process.env.SEARCH_CONSOLE_SITE_URL]
      : ['sc-domain:activkids.ro', 'https://activkids.ro/', 'https://activkids.ro', 'http://activkids.ro/'];

    let siteUrl = siteUrls[0];
    let queriesRes = null;
    let lastError = '';

    for (const url of siteUrls) {
      try {
        queriesRes = await searchconsole.searchanalytics.query({
          siteUrl: url,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['query'],
            rowLimit: 20,
          },
        });
        siteUrl = url;
        break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        queriesRes = null;
      }
    }

    if (!queriesRes) {
      return NextResponse.json({
        configured: true,
        error: `Nu s-a putut accesa Search Console. Verifică că email-ul Service Account are acces pe proprietatea activkids.ro. Eroare: ${lastError.substring(0, 150)}`,
        queries: [],
        pages: [],
      });
    }

    const queries = (queriesRes.data.rows || []).map(row => ({
      query: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: Math.round((row.ctr || 0) * 1000) / 10,
      position: Math.round((row.position || 0) * 10) / 10,
    }));

    // Top pages
    const pagesRes = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 10,
      },
    });

    const pages = (pagesRes.data.rows || []).map(row => ({
      page: row.keys?.[0]?.replace(siteUrl, '') || '/',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
    }));

    return NextResponse.json({
      configured: true,
      queries,
      pages,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Eroare necunoscuta';
    return NextResponse.json({
      configured: true,
      error: msg,
      queries: [],
      pages: [],
    });
  }
}
