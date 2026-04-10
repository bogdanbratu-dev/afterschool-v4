import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  const { action, admin_note } = await request.json();
  const db = getDb();

  const listing = db.prepare('SELECT * FROM pending_listings WHERE id = ?').get(parseInt(id)) as any;
  if (!listing) return NextResponse.json({ error: 'Negasit' }, { status: 404 });

  db.prepare('UPDATE pending_listings SET status = ?, admin_note = ?, reviewed_at = ? WHERE id = ?')
    .run(action === 'approve' ? 'approved' : 'rejected', admin_note || null, Date.now(), parseInt(id));

  if (action === 'approve') {
    // Publica listarea in tabelul corespunzator
    const photoUrls = listing.photo_urls ? JSON.parse(listing.photo_urls) : null;
    const videoUrls = listing.video_urls ? JSON.parse(listing.video_urls) : null;

    if (listing.listing_type === 'afterschool') {
      db.prepare(`
        INSERT INTO afterschools (name, address, lat, lng, sector, price_min, price_max, age_min, age_max, availability, owner_user_id, photo_urls, video_urls, reviews_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        listing.name, listing.address, listing.lat, listing.lng, listing.sector,
        listing.price_min, listing.price_max, listing.age_min, listing.age_max,
        listing.availability, listing.user_id,
        photoUrls ? JSON.stringify(photoUrls.slice(0, 20)) : null,
        videoUrls ? JSON.stringify(videoUrls) : null,
        listing.reviews_url
      );
    } else {
      db.prepare(`
        INSERT INTO clubs (name, address, lat, lng, sector, category, price_min, price_max, age_min, age_max, availability, owner_user_id, photo_urls, video_urls, reviews_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        listing.name, listing.address, listing.lat, listing.lng, listing.sector,
        listing.category || 'inot',
        listing.price_min, listing.price_max, listing.age_min, listing.age_max,
        listing.availability, listing.user_id,
        photoUrls ? JSON.stringify(photoUrls.slice(0, 20)) : null,
        videoUrls ? JSON.stringify(videoUrls) : null,
        listing.reviews_url
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  getDb().prepare('DELETE FROM pending_listings WHERE id = ?').run(parseInt(id));
  return NextResponse.json({ ok: true });
}
