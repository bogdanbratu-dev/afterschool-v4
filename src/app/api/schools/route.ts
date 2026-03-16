import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET(request: Request) {
  seedDatabase();
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  let schools;
  if (query) {
    // Extract just the number from queries like "scoala 51", "nr. 51", "scoala numarul 51"
    const numberMatch = query.match(/\d+/);
    const numberQuery = numberMatch ? numberMatch[0] : query;

    // Prioritize exact number match, then number starts-with, then name/address
    schools = db.prepare(
      `SELECT *,
        CASE
          WHEN number = ? THEN 0
          WHEN number LIKE ? THEN 1
          WHEN name LIKE ? THEN 2
          ELSE 3
        END as match_rank
      FROM schools
      WHERE number = ? OR number LIKE ? OR name LIKE ?
      ORDER BY match_rank, CAST(number AS INTEGER)`
    ).all(numberQuery, `${numberQuery}%`, `%${query}%`, numberQuery, `${numberQuery}%`, `%${query}%`);
  } else {
    schools = db.prepare('SELECT * FROM schools ORDER BY CAST(number AS INTEGER)').all();
  }

  return NextResponse.json(schools);
}
