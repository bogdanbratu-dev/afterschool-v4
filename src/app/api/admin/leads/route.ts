import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const leads = db.prepare(`
    SELECT l.*,
      CASE WHEN l.listing_type = 'afterschool' THEN a.phone ELSE c.phone END as owner_phone,
      CASE WHEN l.listing_type = 'afterschool' THEN a.email ELSE c.email END as owner_email
    FROM leads l
    LEFT JOIN afterschools a ON l.listing_type = 'afterschool' AND l.listing_id = a.id
    LEFT JOIN clubs c ON l.listing_type = 'club' AND l.listing_id = c.id
    ORDER BY l.created_at DESC
  `).all();
  return NextResponse.json(leads);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lead_id } = await request.json();
  const db = getDb();

  const lead = db.prepare(`
    SELECT l.*,
      CASE WHEN l.listing_type = 'afterschool' THEN a.email ELSE c.email END as owner_email
    FROM leads l
    LEFT JOIN afterschools a ON l.listing_type = 'afterschool' AND l.listing_id = a.id
    LEFT JOIN clubs c ON l.listing_type = 'club' AND l.listing_id = c.id
    WHERE l.id = ?
  `).get(lead_id) as any;

  if (!lead) return NextResponse.json({ error: 'Lead negăsit' }, { status: 404 });
  if (!lead.owner_email) return NextResponse.json({ error: 'Listarea nu are email configurat' }, { status: 400 });

  const { sendEmail } = await import('@/lib/email');
  await sendEmail(
    lead.owner_email,
    `Cerere nouă de informații – ${lead.listing_name}`,
    `Bună ziua,\n\nAți primit o cerere de informații prin ActivKids.ro.\n\nNume părinte: ${lead.parent_name}\nTelefon: ${lead.parent_phone}${lead.message ? `\nMesaj: ${lead.message}` : ''}\n\nVă rugăm să îi contactați cât mai curând.\n\nEchipa ActivKids`
  );

  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run('forwarded', lead_id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await request.json();
  const db = getDb();
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  const db = getDb();
  db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
