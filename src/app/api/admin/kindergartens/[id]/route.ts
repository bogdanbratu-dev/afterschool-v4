import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { nearestNeighborhood, resolveSector } from '@/lib/geo';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const b = await request.json();

  const lat = b.lat || 0;
  const lng = b.lng || 0;
  const sector = await resolveSector(lat, lng, b.sector || null);
  const neighborhood = nearestNeighborhood(lat, lng);

  db.prepare(`
    UPDATE kindergartens SET
      name = ?, type = ?, address = ?, sector = ?, lat = ?, lng = ?, neighborhood = ?, phone = ?, email = ?, website = ?, facebook_url = ?,
      price_min = ?, price_max = ?, program = ?, age_min = ?, age_max = ?, description = ?, editorial_summary = ?, activities = ?,
      photo_urls = ?, video_urls = ?, reviews_url = ?, banner_url = ?, availability = ?,
      is_premium = ?, premium_expires_at = ?, is_featured = ?, contacts_hidden = ?, leads_enabled = ?
    WHERE id = ?
  `).run(
    b.name, b.type || 'gradinita', b.address || '', sector, lat, lng, neighborhood,
    b.phone || null, b.email || null, b.website || null, b.facebook_url || null,
    b.price_min || null, b.price_max || null, b.program || null, b.age_min || null, b.age_max || null,
    b.description || null, b.editorial_summary || null, b.activities || null,
    b.photo_urls || null, b.video_urls || null, b.reviews_url || null, b.banner_url || null,
    b.availability || 'unknown', b.is_premium ? 1 : 0, b.premium_expires_at || null, b.is_featured ? 1 : 0, b.contacts_hidden ? 1 : 0, b.leads_enabled ?? null,
    id
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params;
  getDb().prepare('DELETE FROM kindergartens WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
