import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';
import { sendAdminNotification } from '@/lib/email';

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      listing_type, name, address, lat, lng, sector, category,
      price_min, price_max, age_min, age_max, availability,
      phone, email, website, description, photo_urls, video_urls, reviews_url
    } = body;

    if (!listing_type || !name || !address || !lat || !lng) {
      return NextResponse.json({ error: 'Campuri obligatorii lipsa' }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO pending_listings
        (user_id, listing_type, name, address, lat, lng, sector, category,
         price_min, price_max, age_min, age_max, availability,
         phone, email, website, description, photo_urls, video_urls, reviews_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id, listing_type, name, address, lat, lng, sector || null, category || null,
      price_min || null, price_max || null, age_min || null, age_max || null,
      availability || 'unknown',
      phone || null, email || null, website || null, description || null,
      photo_urls ? JSON.stringify(photo_urls) : null,
      video_urls ? JSON.stringify(video_urls) : null,
      reviews_url || null
    );

    await sendAdminNotification(
      'Listing nou de aprobat',
      `${user.name} (${user.email}) a trimis un listing nou: "${name}" (${listing_type}).\n\nVerifica la: https://activkids.ro/admin`
    );

    return NextResponse.json({ ok: true, id: result.lastInsertRowid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const listings = db.prepare(
    'SELECT * FROM pending_listings WHERE user_id = ? ORDER BY submitted_at DESC'
  ).all(user.id);
  const claims = db.prepare(
    'SELECT * FROM claim_requests WHERE user_id = ? ORDER BY submitted_at DESC'
  ).all(user.id);

  return NextResponse.json({ listings, claims });
}
