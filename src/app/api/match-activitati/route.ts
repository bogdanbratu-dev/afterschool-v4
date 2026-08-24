import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { rankMatches, CLUB_MATCH_CONFIG, type MatchAnswers } from '@/lib/matchScoring';
import type { Club } from '@/lib/db';

export async function POST(request: Request) {
  try {
    seedDatabase();
    const { answers } = await request.json() as { answers: MatchAnswers };

    if (!answers || answers.listingType !== 'club' || typeof answers.lat !== 'number' || typeof answers.lng !== 'number') {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 });
    }

    const db = getDb();
    const clubs = db.prepare('SELECT * FROM clubs').all() as Club[];
    const { matches, nearMisses } = rankMatches(clubs, answers, CLUB_MATCH_CONFIG);
    return NextResponse.json({ matches: matches.slice(0, 12), nearMisses: nearMisses.slice(0, 5) });
  } catch (err) {
    console.error('Error computing club match:', err);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
