import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { rankMatches, AFTERSCHOOL_MATCH_CONFIG, KINDERGARTEN_MATCH_CONFIG, type MatchAnswers } from '@/lib/matchScoring';
import type { AfterSchool, Kindergarten } from '@/lib/db';

export async function POST(request: Request) {
  try {
    seedDatabase();
    const { answers } = await request.json() as { answers: MatchAnswers };

    if (!answers || (answers.listingType !== 'afterschool' && answers.listingType !== 'kindergarten') || typeof answers.lat !== 'number' || typeof answers.lng !== 'number') {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 });
    }

    const db = getDb();

    if (answers.listingType === 'kindergarten') {
      const kindergartens = db.prepare('SELECT * FROM kindergartens').all() as Kindergarten[];
      const { matches, nearMisses } = rankMatches(kindergartens, answers, KINDERGARTEN_MATCH_CONFIG);
      return NextResponse.json({ matches: matches.slice(0, 12), nearMisses: nearMisses.slice(0, 5) });
    }

    const afterschools = db.prepare('SELECT * FROM afterschools WHERE is_paused = 0').all() as AfterSchool[];
    const { matches, nearMisses } = rankMatches(afterschools, answers, AFTERSCHOOL_MATCH_CONFIG);
    return NextResponse.json({ matches: matches.slice(0, 12), nearMisses: nearMisses.slice(0, 5) });
  } catch (err) {
    console.error('Error computing match:', err);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
