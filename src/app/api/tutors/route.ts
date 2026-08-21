import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { calculateDistance } from '@/lib/distance';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import { isContactVisible } from '@/lib/contactVisibility';
import type { Tutor } from '@/lib/db';

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const sector = searchParams.get('sector');
  const subject = searchParams.get('subject');
  const kind = searchParams.get('kind');
  const name = searchParams.get('name');
  const useGeo = lat !== 0 && lng !== 0;

  let query = 'SELECT * FROM tutors WHERE 1=1';
  const params: (string | number)[] = [];
  if (name) { query += ' AND (name LIKE ? OR coverage_area LIKE ? OR address LIKE ?)'; params.push(`%${name}%`, `%${name}%`, `%${name}%`); }
  if (subject) { query += ' AND subject = ?'; params.push(subject); }
  if (kind) { query += ' AND kind = ?'; params.push(kind); }
  if (sector) { query += ' AND sector = ?'; params.push(parseInt(sector)); }

  if (!useGeo) {
    query += ' ORDER BY is_featured DESC, is_premium DESC, rating IS NULL, rating DESC, name';
  }

  let tutors = db.prepare(query).all(...params) as Tutor[];

  if (useGeo) {
    tutors = tutors.map(t => ({
      ...t,
      distance: (t.lat && t.lng) ? calculateDistance(lat, lng, t.lat, t.lng) : 99999,
    }));
    tutors.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      if (a.is_premium && !b.is_premium) return -1;
      if (!a.is_premium && b.is_premium) return 1;
      return ((a as any).distance ?? 99999) - ((b as any).distance ?? 99999);
    });
  } else {
    tutors = applyPremiumSpotlight(tutors, readSpotlightConfig(db), {
      tieBreak: (a, b) => (((a.rating == null ? 1 : 0) - (b.rating == null ? 1 : 0)) || ((b.rating || 0) - (a.rating || 0)) || String(a.name || '').localeCompare(String(b.name || ''))),
    });
  }

  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    tutors = tutors.map(t => isContactVisible(t)
      ? { ...t, contacts_masked: false }
      : { ...t, phone: null, email: null, contacts_masked: true, has_phone: !!t.phone, has_email: !!t.email });
  }
  return NextResponse.json(tutors);
}
