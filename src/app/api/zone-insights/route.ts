import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { lookupStreet, getCircSchool } from '@/lib/circumscriptii';
import { findZoneCentroid } from '@/lib/zones';
import { computeZoneInsights, clampRadiusKm, type BusinessType } from '@/lib/zoneInsights';

// GET public, determinist, fara AI - doar interogari SQLite, deci fara rate limiting (vezi plan:
// "endpointul determinist ramane nelimitat, e doar SQLite, ieftin"). Rezolva zona in doua moduri:
// - ?zone=<nume cartier din zones.ts> -> centroid exact
// - ?address=<strada/adresa liber scrisa> -> lookupStreet() din circumscriptii.ts (acelasi motor ca
//   /circumscriptii); daca e ambigua sau nerezolvata, se intoarce lista de potriviri/sugestii in loc
//   de raport, exact ca la CircSearch, ca UI-ul sa poata cere userului sa aleaga.
const VALID_TYPES: BusinessType[] = ['afterschool', 'kindergarten', 'club'];

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type') as BusinessType | null;
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Tip de afacere invalid. Foloseste afterschool, kindergarten sau club.' }, { status: 400 });
  }
  const radiusKm = clampRadiusKm(searchParams.get('radiusKm'));
  const clubCategory = type === 'club' ? searchParams.get('clubCategory') : null;
  const budgetRaw = searchParams.get('budget');
  const budgetLei = budgetRaw ? parseFloat(budgetRaw) : null;

  const zoneParam = searchParams.get('zone');
  const addressParam = searchParams.get('address');
  const circSchoolIdParam = searchParams.get('circSchoolId');

  // 1. Zona aleasa din dropdown-ul de cartiere - centroid exact, fara ambiguitate.
  if (zoneParam) {
    const centroid = findZoneCentroid(zoneParam);
    if (!centroid) {
      return NextResponse.json({ error: 'Cartier necunoscut.' }, { status: 400 });
    }
    const [lat, lng] = centroid;
    const report = computeZoneInsights(db, {
      lat, lng, zoneLabel: zoneParam, radiusKm, businessType: type, clubCategory, budgetLei,
    });
    return NextResponse.json({ report });
  }

  // 2. Selectie explicita dintr-o lista de potriviri ambigua (al doilea pas, dupa ce userul a ales).
  if (circSchoolIdParam) {
    const circSchool = getCircSchool(db, parseInt(circSchoolIdParam, 10));
    if (!circSchool || circSchool.lat == null || circSchool.lng == null) {
      return NextResponse.json({ error: 'Scoala de circumscriptie nu a fost gasita.' }, { status: 404 });
    }
    const report = computeZoneInsights(db, {
      lat: circSchool.lat, lng: circSchool.lng, zoneLabel: circSchool.name, radiusKm,
      businessType: type, clubCategory, budgetLei, sector: circSchool.sector ?? undefined,
    });
    return NextResponse.json({ report, circSchoolId: circSchool.id });
  }

  // 3. Strada/adresa liber scrisa.
  if (addressParam) {
    if (addressParam.trim().length < 3) {
      return NextResponse.json({ matches: [], suggestions: [] });
    }
    const lookup = lookupStreet(db, addressParam);
    if (lookup.matches.length === 1 || (lookup.resolved && lookup.matches.length > 0)) {
      const match = lookup.matches[0];
      const circSchool = getCircSchool(db, match.circ_school_id);
      if (circSchool && circSchool.lat != null && circSchool.lng != null) {
        const report = computeZoneInsights(db, {
          lat: circSchool.lat, lng: circSchool.lng, zoneLabel: addressParam.trim(), radiusKm,
          businessType: type, clubCategory, budgetLei, sector: circSchool.sector ?? undefined,
        });
        // nota de precizie: punctul folosit e scoala de circumscriptie, nu adresa exacta
        return NextResponse.json({ report, approximated: true, circSchoolId: circSchool.id });
      }
    }
    if (lookup.matches.length > 1) {
      return NextResponse.json({
        matches: lookup.matches.map((m) => ({
          circSchoolId: m.circ_school_id, schoolName: m.school_name, sector: m.sector, streetRaw: m.street_raw,
        })),
      });
    }
    return NextResponse.json({ matches: [], suggestions: lookup.suggestions });
  }

  return NextResponse.json({ error: 'Lipseste zona (zone) sau adresa (address).' }, { status: 400 });
}
