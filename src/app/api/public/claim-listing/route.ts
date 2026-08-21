import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendEmail, sendAdminNotification } from '@/lib/email';
import crypto from 'crypto';

// Revendicare instant, fara cont/parola: genereaza (sau refoloseste) un token din
// listing_edit_tokens si trimite pe email link-ul de /editare/[token]. Distinct de
// /api/user/claim (cerere cu parola + aprobare admin) -- inlocuieste acel flux pe
// butonul public "Revendica aceasta listare".

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };

export async function POST(request: Request) {
  try {
    const { listing_type, listing_id, email } = await request.json();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Introdu o adresa de email valida' }, { status: 400 });
    }

    const table = TABLE[listing_type];
    if (!table || !listing_id) {
      return NextResponse.json({ error: 'Listare invalida' }, { status: 400 });
    }

    const db = getDb();
    const listing = db.prepare(`SELECT id, name FROM ${table} WHERE id = ?`).get(listing_id) as { id: number; name: string } | undefined;
    if (!listing) {
      return NextResponse.json({ error: 'Listarea nu a fost gasita' }, { status: 404 });
    }

    let token = (db.prepare(
      'SELECT id FROM listing_edit_tokens WHERE listing_type = ? AND listing_id = ? AND revoked = 0'
    ).get(listing_type, listing_id) as { id: string } | undefined)?.id;

    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      db.prepare('INSERT INTO listing_edit_tokens (id, listing_type, listing_id) VALUES (?, ?, ?)').run(token, listing_type, listing_id);
    }

    const link = `https://activkids.ro/editare/${token}`;

    await sendEmail(
      email,
      `Link de acces pentru ${listing.name}`,
      `Buna,\n\nAi cerut revendicarea listarii "${listing.name}" pe activkids.ro.\n\nFoloseste linkul de mai jos ca sa vezi si sa actualizezi direct informatiile afisate (program, poze, descriere), fara parola si fara cont:\n\n${link}\n\nPastreaza acest link, e legatura ta directa cu listarea. Daca nu ai cerut tu asta, poti ignora acest email.\n\nDaca ai nevoie de ajutor, ne gasesti la 0747 646 543.\n\nEchipa ActivKids`
    );

    await sendAdminNotification(
      `Revendicare instant: ${listing.name}`,
      `Cineva a cerut link de acces pentru "${listing.name}" (${listing_type} #${listing_id}) la adresa ${email}.\n\nLink trimis automat:\n${link}`
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
