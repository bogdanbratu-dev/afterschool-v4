import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { microsite_id, listing_type, listing_id, name, phone, email, preferred_date, preferred_slot, message, kind } = body;

    if (!microsite_id || !listing_type || !listing_id || !name || !phone) {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO bookings (microsite_id, listing_type, listing_id, name, phone, email, preferred_date, preferred_slot, message, kind)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      microsite_id, listing_type, listing_id,
      String(name).trim(), String(phone).trim(),
      email ? String(email).trim() : null,
      preferred_date || null, preferred_slot || null,
      message ? String(message).trim() : null,
      kind === 'trial' ? 'trial' : 'visit'
    );

    // Notifica proprietarul prin email daca listarea are email
    try {
      const table = listing_type === 'afterschool' ? 'afterschools' : listing_type === 'club' ? 'clubs' : listing_type === 'professional' ? 'professionals' : listing_type === 'kindergarten' ? 'kindergartens' : 'caterers';
      const listing = db.prepare(`SELECT name, email FROM ${table} WHERE id = ?`).get(listing_id) as { name: string; email: string | null } | undefined;
      if (listing?.email) {
        const { sendEmail } = await import('@/lib/email');
        const kindLabel = kind === 'trial' ? 'antrenament de probă' : 'vizionare';
        await sendEmail(
          listing.email,
          `Cerere de ${kindLabel} – ${listing.name}`,
          `Bună ziua,\n\nAți primit o cerere de ${kindLabel} prin site-ul dvs. ActivKids.\n\nNume: ${name}\nTelefon: ${phone}${email ? `\nEmail: ${email}` : ''}${preferred_date ? `\nData preferată: ${preferred_date}` : ''}${preferred_slot ? `\nInterval: ${preferred_slot}` : ''}${message ? `\nMesaj: ${message}` : ''}\n\nVă rugăm să o contactați pentru confirmare.\n\nEchipa ActivKids`
        );
      }
    } catch (e) {
      console.error('Booking email error:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error saving booking:', err);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
