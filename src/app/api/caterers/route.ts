import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { calculateDistance } from '@/lib/distance';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import { isContactVisible } from '@/lib/contactVisibility';
import type { Caterer } from '@/lib/db';

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const sector = searchParams.get('sector');
  const name = searchParams.get('name');

  let query = 'SELECT * FROM caterers WHERE 1=1';
  const params: (string | number)[] = [];

  if (name) {
    query += ' AND (name LIKE ? OR coverage_area LIKE ?)';
    params.push(`%${name}%`, `%${name}%`);
  }
  if (sector) {
    query += ' AND sector = ?';
    params.push(parseInt(sector));
  }

  query += ' ORDER BY is_featured DESC, is_premium DESC, rating IS NULL, rating DESC, name';

  let caterers = db.prepare(query).all(...params) as Caterer[];

  // Distanta e doar informativa - nu filtram si nu resortam (model director)
  if (lat && lng) {
    caterers = caterers.map(c => ({
      ...c,
      distance: (c.lat && c.lng) ? calculateDistance(lat, lng, c.lat, c.lng) : undefined,
    }));
  }

  caterers = applyPremiumSpotlight(caterers, readSpotlightConfig(db), { tieBreak: (a, b) => (((a.rating == null ? 1 : 0) - (b.rating == null ? 1 : 0)) || ((b.rating || 0) - (a.rating || 0)) || String(a.name || '').localeCompare(String(b.name || ''))) });

  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    caterers = caterers.map(c => isContactVisible(c)
      ? { ...c, contacts_masked: false }
      : { ...c, phone: null, email: null, contacts_masked: true, has_phone: !!c.phone, has_email: !!c.email });
  }

  return NextResponse.json(caterers);
}
