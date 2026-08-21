import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { calculateDistance, PREMIUM_BOOST_RADIUS_KM } from '@/lib/distance';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import { isContactVisible } from '@/lib/contactVisibility';
import type { Club } from '@/lib/db';

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const category = searchParams.get('category');
  const priceMax = searchParams.get('priceMax');
  const sector = searchParams.get('sector');
  const name = searchParams.get('name');

  let query = 'SELECT * FROM clubs WHERE 1=1';
  const params: (string | number)[] = [];

  if (name) {
    query += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (priceMax) {
    query += ' AND (price_min IS NULL OR price_min <= ?)';
    params.push(parseInt(priceMax));
  }
  if (sector) {
    query += ' AND sector = ?';
    params.push(parseInt(sector));
  }

  query += ' ORDER BY is_featured DESC, is_premium DESC';

  let clubs = db.prepare(query).all(...params) as Club[];

  const radiusKm = parseFloat(searchParams.get('radiusKm') || '0');

  if (lat && lng) {
    clubs = clubs.map(c => ({
      ...c,
      distance: calculateDistance(lat, lng, c.lat, c.lng),
    }));
    if (radiusKm > 0) {
      clubs = clubs.filter(c => (c.distance ?? Infinity) <= radiusKm);
    }

  }

  clubs = applyPremiumSpotlight(clubs, readSpotlightConfig(db), {
    tieBreak: (lat && lng) ? (a, b) => ((a.distance ?? 1e9) - (b.distance ?? 1e9)) : undefined,
    spotlightEligible: (lat && lng) ? (x) => (x.distance ?? Infinity) <= PREMIUM_BOOST_RADIUS_KM : undefined,
  });

  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    clubs = clubs.map(c => isContactVisible(c)
      ? { ...c, contacts_masked: false }
      : { ...c, phone: null, email: null, contacts_masked: true, has_phone: !!c.phone, has_email: !!c.email });
  }

  return NextResponse.json(clubs);
}
