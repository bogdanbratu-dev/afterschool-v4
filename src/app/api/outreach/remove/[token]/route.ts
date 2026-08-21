import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendAdminNotification } from '@/lib/email';

function page(title: string, message: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="utf-8"><title>${title} | ActivKids</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: Arial, sans-serif; max-width: 480px; margin: 80px auto; padding: 24px; color: #333; line-height: 1.6; text-align: center;">
  <h1 style="font-size: 20px;">${title}</h1>
  <p>${message}</p>
  <p style="margin-top: 24px;"><a href="https://activkids.ro" style="color: #0f766e;">Înapoi la ActivKids.ro</a></p>
</body>
</html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

const LISTING_TABLE: Record<string, string> = {
  afterschool: 'afterschools',
  club: 'clubs',
  kindergarten: 'kindergartens',
  caterer: 'caterers',
  professional: 'professionals',
  tutor: 'tutors',
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const contact = db.prepare(
    'SELECT listing_type, listing_id FROM outreach_contacts WHERE confirm_token = ?'
  ).get(token) as { listing_type: string; listing_id: number } | undefined;

  if (!contact) {
    return page('Link invalid', 'Linkul de eliminare nu este valid sau a expirat.');
  }

  const table = LISTING_TABLE[contact.listing_type];
  const listing = table
    ? (db.prepare(`SELECT name FROM ${table} WHERE id = ?`).get(contact.listing_id) as { name: string } | undefined)
    : undefined;
  const name = listing?.name || 'listarea dvs.';

  db.prepare(
    `UPDATE outreach_contacts SET opted_out = 1, status = 'skip', note = 'Cerere de eliminare din email'
     WHERE confirm_token = ?`
  ).run(token);

  await sendAdminNotification(
    'Cerere de eliminare listare',
    `S-a cerut eliminarea listării "${name}" (${contact.listing_type} #${contact.listing_id}) prin linkul din emailul de outreach. Nu a fost ștearsă automat, verifică și șterge manual din admin dacă e cazul.`
  );

  return page(
    'Cerere înregistrată',
    `Am notat cererea dvs. Vom elimina în cel mai scurt timp listarea "${name}" de pe ActivKids.ro. Nu veți mai primi emailuri de la noi pe acest subiect.`
  );
}
