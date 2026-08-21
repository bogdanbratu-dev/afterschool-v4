import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

const TABLES = [
  { table: 'afterschools', listing_type: 'afterschool' },
  { table: 'clubs', listing_type: 'club' },
  { table: 'caterers', listing_type: 'caterer' },
  { table: 'professionals', listing_type: 'colaborator' },
  { table: 'kindergartens', listing_type: 'gradinita' },
  { table: 'tutors', listing_type: 'meditatii' },
];

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const in30 = new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0];
  const results: { id: number; name: string; premium_expires_at: string; listing_type: string; table_name: string }[] = [];
  for (const { table, listing_type } of TABLES) {
    try {
      const rows = db.prepare(
        `SELECT id, name, premium_expires_at FROM ${table} WHERE is_premium = 1 AND premium_expires_at IS NOT NULL AND premium_expires_at <= ?`
      ).all(in30) as { id: number; name: string; premium_expires_at: string }[];
      rows.forEach(r => results.push({ ...r, listing_type, table_name: table }));
    } catch {}
  }
  results.sort((a, b) => a.premium_expires_at.localeCompare(b.premium_expires_at));
  return NextResponse.json(results);
}
