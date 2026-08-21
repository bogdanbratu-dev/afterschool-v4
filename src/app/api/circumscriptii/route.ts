import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { lookupStreet, lookupSchoolNumber, lookupSchoolByName } from '@/lib/circumscriptii';
import { toSlug } from '@/lib/slug';

// GET /api/circumscriptii?street=grivitei&sector=1
// GET /api/circumscriptii?number=82
// GET /api/circumscriptii?name=bolintineanu
// Intoarce scoala/scolile de circumscriptie pentru strada, numarul de scoala sau numele scolii
// cautat. O strada lunga poate aparea de mai multe ori (tronsoane de numere arondate la scoli
// diferite) - le returnam pe toate cu intervalul.
export async function GET(request: Request) {
  seedDatabase();
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const number = (searchParams.get('number') || '').trim();
  const name = (searchParams.get('name') || '').trim();

  if (number) {
    const { matches, resolved } = lookupSchoolNumber(db, number);
    const results = matches.map((m) => ({
      slug: toSlug(m.name, m.id),
      school_name: m.name,
      type: m.type,
      sector: m.sector,
      street: m.address || '',
    }));
    return NextResponse.json({ results, resolved, numberFiltered: false, suggestions: [] });
  }

  if (name) {
    const { matches, resolved } = lookupSchoolByName(db, name);
    const results = matches.map((m) => ({
      slug: toSlug(m.name, m.id),
      school_name: m.name,
      type: m.type,
      sector: m.sector,
      street: m.address || '',
    }));
    return NextResponse.json({ results, resolved, numberFiltered: false, suggestions: [] });
  }

  const street = (searchParams.get('street') || '').trim();
  const sectorParam = searchParams.get('sector');
  const sector = sectorParam ? parseInt(sectorParam, 10) : undefined;

  if (street.length < 3) return NextResponse.json({ results: [], resolved: false, numberFiltered: false, suggestions: [] });

  const { matches, resolved, numberFiltered, suggestions } = lookupStreet(db, street, sector && sector >= 1 && sector <= 6 ? sector : undefined);
  const results = matches.map((m) => ({
    slug: toSlug(m.school_name, m.circ_school_id),
    school_name: m.school_name,
    type: m.type,
    sector: m.sector,
    street: m.street_raw,
  }));
  return NextResponse.json({ results, resolved, numberFiltered, suggestions });
}
