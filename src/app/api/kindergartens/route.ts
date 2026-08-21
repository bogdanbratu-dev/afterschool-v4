import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { calculateDistance } from '@/lib/distance';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import { isContactVisible } from '@/lib/contactVisibility';
import type { Kindergarten } from '@/lib/db';

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const sector = searchParams.get('sector');
  const type = searchParams.get('type'); // gradinita | cresa
  const name = searchParams.get('name');
  const priceMax = searchParams.get('priceMax');
  const dropoffTime = searchParams.get('dropoffTime');
  const pickupMin = searchParams.get('pickupMin');
  const onlyAvailable = searchParams.get('onlyAvailable');
  const activities = searchParams.get('activities');

  let query = 'SELECT * FROM kindergartens WHERE 1=1';
  const params: (string | number)[] = [];

  if (name) {
    query += ' AND (name LIKE ? OR address LIKE ?)';
    params.push(`%${name}%`, `%${name}%`);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (sector) {
    query += ' AND sector = ?';
    params.push(parseInt(sector));
  }
  if (priceMax) {
    query += ' AND price_min <= ?';
    params.push(parseInt(priceMax));
  }
  if (dropoffTime) {
    query += ' AND program_start <= ?';
    params.push(dropoffTime);
  }
  if (pickupMin) {
    query += ' AND program_end >= ?';
    params.push(pickupMin);
  }
  if (onlyAvailable === 'true') {
    query += " AND availability = 'available'";
  }

  query += ' ORDER BY is_featured DESC, is_premium DESC, rating IS NULL, rating DESC, name';

  let kindergartens = db.prepare(query).all(...params) as Kindergarten[];

  if (activities) {
    const actList = activities.split(',').map(a => a.trim().toLowerCase());
    kindergartens = kindergartens.filter(k => {
      if (!k.activities) return false;
      const kActivities = k.activities.toLowerCase();
      return actList.some(act => kActivities.includes(act));
    });
  }

  if (lat && lng) {
    kindergartens = kindergartens.map(k => ({
      ...k,
      distance: (k.lat && k.lng) ? calculateDistance(lat, lng, k.lat, k.lng) : undefined,
    }));

  }

  kindergartens = applyPremiumSpotlight(kindergartens, readSpotlightConfig(db), { tieBreak: (lat && lng) ? (a, b) => ((a.distance ?? 1e9) - (b.distance ?? 1e9)) : undefined });

  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    kindergartens = kindergartens.map(k => isContactVisible(k)
      ? { ...k, contacts_masked: false }
      : { ...k, phone: null, email: null, contacts_masked: true, has_phone: !!k.phone, has_email: !!k.email });
  }

  return NextResponse.json(kindergartens);
}
