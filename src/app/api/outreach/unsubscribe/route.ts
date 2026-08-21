import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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

// Dezabonare de la emailurile de outreach (parteneriat), fara autentificare - link direct din email.
// Nu foloseste token semnat: worst-case cineva dezaboneaza o listare care nu e a lui, ceea ce
// doar opreste emailurile viitoare catre acel contact (nicio expunere de date, risc acceptabil).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id = Number(searchParams.get('id'));

  if (!type || !id) {
    return page('Link invalid', 'Linkul de dezabonare nu este valid.');
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO outreach_contacts (listing_type, listing_id, status, opted_out)
     VALUES (?, ?, 'pending', 1)
     ON CONFLICT(listing_type, listing_id) DO UPDATE SET opted_out = 1`
  ).run(type, id);

  return page('Dezabonare confirmată', 'Nu vei mai primi emailuri de la ActivKids.ro pentru această listare.');
}
