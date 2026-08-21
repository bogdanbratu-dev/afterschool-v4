import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { nearestNeighborhood, resolveSector } from '@/lib/geo';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const { id } = await params;
  const db = getDb();
  const b = await request.json();

  const lat = b.lat || 0;
  const lng = b.lng || 0;
  const sector = await resolveSector(lat, lng, b.sector || null);
  const neighborhood = nearestNeighborhood(lat, lng);

  db.prepare(`
    UPDATE professionals SET
      name = ?, category = ?, kind = ?, address = ?, sector = ?, lat = ?, lng = ?, neighborhood = ?, coverage_area = ?,
      phone = ?, email = ?, website = ?, facebook_url = ?,
      price_min = ?, price_max = ?, description = ?, editorial_summary = ?,
      photo_urls = ?, video_urls = ?, reviews_url = ?, banner_url = ?,
      availability = ?, online_available = ?, home_service = ?,
      is_premium = ?, premium_expires_at = ?, is_featured = ?, contacts_hidden = ?, leads_enabled = ?
    WHERE id = ?
  `).run(
    b.name, b.category || 'altele', b.kind || 'independent', b.address || null, sector, lat, lng, neighborhood, b.coverage_area || null,
    b.phone || null, b.email || null, b.website || null, b.facebook_url || null,
    b.price_min || null, b.price_max || null, b.description || null, b.editorial_summary || null,
    b.photo_urls || null, b.video_urls || null, b.reviews_url || null, b.banner_url || null,
    b.availability || 'unknown', b.online_available ? 1 : 0, b.home_service ? 1 : 0,
    b.is_premium ? 1 : 0, b.premium_expires_at || null, b.is_featured ? 1 : 0, b.contacts_hidden ? 1 : 0, b.leads_enabled ?? null,
    id
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM professionals WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
