import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { stripDiacritics } from '@/lib/slug';
import { similarity } from '@/lib/fuzzy';
import type { School } from '@/lib/db';

const FUZZY_THRESHOLD = 0.6;

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
    // Scolile fara numar (doar nume, ex. "Sfintii Voievozi") folosesc numele in campul `number`
    // (vezi ismb.edu.ro/index.php/retea-scolara), deci cautarea trebuie sa fie fara diacritice
    // atat pe `number` cat si pe `name`.
    const unaccentedQuery = stripDiacritics(query);

    // Prioritize exact number match, then number starts-with, then name/address
    schools = db.prepare(
      `SELECT *,
        CASE
          WHEN number = ? THEN 0
          WHEN number LIKE ? THEN 1
          WHEN unaccent(number) LIKE unaccent(?) THEN 2
          WHEN unaccent(name) LIKE unaccent(?) THEN 3
          ELSE 4
        END as match_rank
      FROM schools
      WHERE number = ? OR number LIKE ? OR unaccent(number) LIKE unaccent(?) OR unaccent(name) LIKE unaccent(?)
      ORDER BY match_rank, CASE WHEN number GLOB '[0-9]*' THEN 0 ELSE 1 END, CAST(number AS INTEGER), number`
    ).all(
      numberQuery, `${numberQuery}%`, `%${unaccentedQuery}%`, `%${unaccentedQuery}%`,
      numberQuery, `${numberQuery}%`, `%${unaccentedQuery}%`, `%${unaccentedQuery}%`
    ) as School[];

    // Scolile fara numar (number = numele scolii) accepta si potriviri aproximative
    // (typo-uri, diacritice lipsa), nu doar substring exact - vezi ismb.edu.ro.
    if (unaccentedQuery.length >= 3) {
      const matchedIds = new Set(schools.map((s) => s.id));
      const nameOnlyRows = db.prepare(
        `SELECT * FROM schools WHERE NOT (number GLOB '[0-9]*')`
      ).all() as School[];

      const fuzzyMatches = nameOnlyRows
        .filter((s) => !matchedIds.has(s.id))
        .map((s) => ({ school: s, score: similarity(unaccentedQuery, stripDiacritics(s.number)) }))
        .filter((m) => m.score >= FUZZY_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .map((m) => m.school);

      schools = [...schools, ...fuzzyMatches];
    }
  } else {
    schools = db.prepare(
      `SELECT * FROM schools
       ORDER BY CASE WHEN number GLOB '[0-9]*' THEN 0 ELSE 1 END, CAST(number AS INTEGER), number`
    ).all();
  }

  return NextResponse.json(schools);
}
