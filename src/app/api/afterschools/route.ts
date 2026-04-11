import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { calculateDistance } from '@/lib/distance';
import type { AfterSchool } from '@/lib/db';

export async function GET(request: Request) {
  seedDatabase();
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const priceMin = searchParams.get('priceMin');
  const priceMax = searchParams.get('priceMax');
  const pickupTime = searchParams.get('pickupTime');
  const endTimeMin = searchParams.get('endTimeMin');
  const activities = searchParams.get('activities');
  const sector = searchParams.get('sector');

  const name = searchParams.get('name');

  let query = 'SELECT * FROM afterschools WHERE 1=1';
  const params: (string | number)[] = [];

  if (name) {
    query += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }
  if (priceMin) {
    query += ' AND price_min >= ?';
    params.push(parseInt(priceMin));
  }
  if (priceMax) {
    query += ' AND price_min <= ?';
    params.push(parseInt(priceMax));
  }
  if (pickupTime) {
    query += ' AND pickup_time <= ?';
    params.push(pickupTime);
  }
  if (endTimeMin) {
    query += ' AND end_time >= ?';
    params.push(endTimeMin);
  }
  if (sector) {
    query += ' AND sector = ?';
    params.push(parseInt(sector));
  }

  query += ' ORDER BY is_featured DESC, is_premium DESC';

  let afterschools = db.prepare(query).all(...params) as AfterSchool[];

  // Filter by activities
  if (activities) {
    const actList = activities.split(',').map(a => a.trim().toLowerCase());
    afterschools = afterschools.filter(as => {
      if (!as.activities) return false;
      const asActivities = as.activities.toLowerCase();
      return actList.some(act => asActivities.includes(act));
    });
  }

  // Calculate distance if coordinates provided
  if (lat && lng) {
    afterschools = afterschools.map(as => ({
      ...as,
      distance: calculateDistance(lat, lng, as.lat, as.lng),
    }));
    afterschools.sort((a, b) => (b.is_premium - a.is_premium) || (a.distance || 0) - (b.distance || 0));
  }

  // Mascheaza contactele pentru listari non-premium cand business_mode e activ
  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    afterschools = afterschools.map(as => (as.is_premium || !as.contacts_hidden) ? as : {
      ...as,
      phone: null,
      email: null,
      website: null,
    });
  }

  return NextResponse.json(afterschools);
}
