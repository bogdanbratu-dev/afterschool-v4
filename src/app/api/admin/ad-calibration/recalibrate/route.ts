import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { recalibrateFromImports } from '@/lib/adCalibration';
import { getEffectiveBenchmarks } from '@/lib/adBenchmarks';

// GET - starea curenta a benchmark-urilor (statice sau deja recalibrate), pentru afisare in tab.
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const db = getDb();
  return NextResponse.json(getEffectiveBenchmarks(db));
}

// POST - recalculeaza benchmark-urile din randurile objective='trafic' si le salveaza in settings.
// Vezi src/lib/adCalibration.ts pentru logica de agregare si constrangerea de esantion minim.
export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const db = getDb();
  const result = recalibrateFromImports(db);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
