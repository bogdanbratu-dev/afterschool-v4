import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { readSpotlightConfig } from '@/lib/premiumRanking';

export async function GET() {
  const db = getDb();
  const get = (key: string) =>
    (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value;
  return NextResponse.json({
    business_mode: get('business_mode') === 'true',
    spotlight: readSpotlightConfig(db),
  });
}