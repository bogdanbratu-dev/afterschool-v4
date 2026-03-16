import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { calculateDistance } from '@/lib/distance';

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radiusKm = parseFloat(searchParams.get('radiusKm') || '5');

  const clubs = db.prepare('SELECT id, lat, lng, category FROM clubs').all() as {
    id: number; lat: number; lng: number; category: string;
  }[];

  const counts: Record<string, number> = {};

  for (const club of clubs) {
    if (lat && lng) {
      const dist = calculateDistance(lat, lng, club.lat, club.lng);
      if (dist > radiusKm) continue;
    }
    counts[club.category] = (counts[club.category] || 0) + 1;
  }

  return NextResponse.json(counts);
}
