import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { sessionId, listingType, stepId, stepIndex, totalSteps, draft, completed } = await request.json();
    if (!sessionId) return NextResponse.json({ ok: true });
    const db = getDb();
    const now = Date.now();

    // Marcare "a vazut recomandarile" fara detalii de pas noi (apelat de potrivire/page.tsx dupa
    // ce /api/match raspunde cu succes) - doar actualizeaza randul existent, nu-l recreeaza.
    if (completed && !stepId) {
      db.prepare('UPDATE match_progress SET completed = 1, updated_at = ? WHERE session_id = ?').run(now, String(sessionId).slice(0, 64));
      return NextResponse.json({ ok: true });
    }

    if (!stepId || typeof stepIndex !== 'number' || typeof totalSteps !== 'number') {
      return NextResponse.json({ ok: true });
    }
    db.prepare(`
      INSERT INTO match_progress (session_id, listing_type, step_id, step_index, total_steps, draft, completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        listing_type = excluded.listing_type,
        step_id = excluded.step_id,
        step_index = excluded.step_index,
        total_steps = excluded.total_steps,
        draft = excluded.draft,
        completed = MAX(completed, excluded.completed),
        updated_at = excluded.updated_at
    `).run(
      String(sessionId).slice(0, 64),
      typeof listingType === 'string' ? listingType.slice(0, 30) : null,
      String(stepId).slice(0, 40),
      stepIndex,
      totalSteps,
      draft ? JSON.stringify(draft).slice(0, 2000) : null,
      completed ? 1 : 0,
      now,
      now
    );
  } catch {}
  return NextResponse.json({ ok: true });
}
