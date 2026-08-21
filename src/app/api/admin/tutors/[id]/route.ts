import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params; const db = getDb(); const b = await request.json();
  db.prepare(`UPDATE tutors SET name=?, subject=?, kind=?, address=?, sector=?, lat=?, lng=?, coverage_area=?, phone=?, email=?, website=?, facebook_url=?, price_min=?, price_max=?, description=?, editorial_summary=?, photo_urls=?, online_available=?, home_service=?, is_premium=?, premium_expires_at=?, is_featured=?, contacts_hidden=?, leads_enabled=? WHERE id=?`).run(
    b.name, b.subject || 'altele', b.kind || 'independent', b.address || null, b.sector || null, b.lat || 0, b.lng || 0,
    b.coverage_area || null, b.phone || null, b.email || null, b.website || null, b.facebook_url || null,
    b.price_min || null, b.price_max || null, b.description || null, b.editorial_summary || null, b.photo_urls || null,
    b.online_available ? 1 : 0, b.home_service ? 1 : 0, b.is_premium ? 1 : 0, b.premium_expires_at || null, b.is_featured ? 1 : 0, b.contacts_hidden ? 1 : 0, b.leads_enabled ?? null, id);
  return NextResponse.json({ success: true });
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const { id } = await params; getDb().prepare('DELETE FROM tutors WHERE id=?').run(id);
  return NextResponse.json({ success: true });
}
