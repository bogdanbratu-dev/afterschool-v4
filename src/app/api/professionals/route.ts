import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { calculateDistance } from '@/lib/distance';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import { PROFESSIONAL_GROUPS, type ProfessionalGroup } from '@/lib/professionals';
import { isContactVisible } from '@/lib/contactVisibility';
import type { Professional } from '@/lib/db';

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const sector = searchParams.get('sector');
  const category = searchParams.get('category');
  const group = searchParams.get('group');
  const name = searchParams.get('name');

  let query = 'SELECT * FROM professionals WHERE 1=1';
  const params: (string | number)[] = [];

  if (name) {
    query += ' AND (name LIKE ? OR coverage_area LIKE ?)';
    params.push(`%${name}%`, `%${name}%`);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  } else if (group && PROFESSIONAL_GROUPS[group as ProfessionalGroup]) {
    const cats = PROFESSIONAL_GROUPS[group as ProfessionalGroup];
    query += ` AND category IN (${cats.map(() => '?').join(',')})`;
    params.push(...cats);
  }
  if (sector) {
    query += ' AND sector = ?';
    params.push(parseInt(sector));
  }

  query += ' ORDER BY is_featured DESC, is_premium DESC, rating IS NULL, rating DESC, name';

  let professionals = db.prepare(query).all(...params) as Professional[];

  // Distanta e doar informativa - nu filtram si nu resortam (model director)
  if (lat && lng) {
    professionals = professionals.map(p => ({
      ...p,
      distance: (p.lat && p.lng) ? calculateDistance(lat, lng, p.lat, p.lng) : undefined,
    }));
  }

  professionals = applyPremiumSpotlight(professionals, readSpotlightConfig(db), { tieBreak: (a, b) => (((a.rating == null ? 1 : 0) - (b.rating == null ? 1 : 0)) || ((b.rating || 0) - (a.rating || 0)) || String(a.name || '').localeCompare(String(b.name || ''))) });

  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    professionals = professionals.map(p => isContactVisible(p)
      ? { ...p, contacts_masked: false }
      : { ...p, phone: null, email: null, contacts_masked: true, has_phone: !!p.phone, has_email: !!p.email });
  }

  return NextResponse.json(professionals);
}
