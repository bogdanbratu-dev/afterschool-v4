import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/userAuth';
import { getDb } from '@/lib/db';
import { getSenderInfo, defaultMessage, defaultSubject, type SenderInfo } from '@/lib/outreachSender';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function firstSentences(text: string, n: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, n).join(' ').trim();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function messageToHtml(message: string): string {
  return message.trim().split(/\n{2,}/).map(para => `<p>${escapeHtml(para.trim()).replace(/\n/g, '<br>')}</p>`).join('\n  ');
}

function buildHtml(sender: SenderInfo, targetName: string, customMessage: string | null | undefined, unsubscribeUrl: string): string {
  const contact = `<ul style="padding-left:20px;">
    ${sender.phone ? `<li>Telefon: <strong>${sender.phone}</strong></li>` : ''}
    ${sender.email ? `<li>Email: <strong>${sender.email}</strong></li>` : ''}
    ${sender.address ? `<li>Adresa: <strong>${sender.address}</strong></li>` : ''}
    ${sender.website ? `<li>Site: <a href="${sender.website}" style="color:#4f46e5;">${sender.website}</a></li>` : ''}
  </ul>`;

  // Mesajul (custom sau implicit) foloseste placeholder-ul {nume} pentru numele destinatarului -
  // inlocuit aici cu numele real, apoi convertit in paragrafe HTML cu escapare.
  let message: string;
  if (customMessage && customMessage.trim()) {
    message = customMessage;
  } else {
    const desc = firstSentences(stripHtml(sender.desc || ''), 2);
    message = defaultMessage(sender, desc, '{nume}');
  }
  const bodyHtml = messageToHtml(message.replace(/\{nume\}/g, targetName));

  return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #333; line-height: 1.6;">
  <p>Buna ziua,</p>
  ${bodyHtml}
  <p>Ma puteti contacta la:</p>
  ${contact}
  <p style="margin-top: 24px;">O zi buna,<br>${sender.contactName ? `${sender.contactName}<br>` : ''}<strong>${sender.name}</strong></p>
  <p style="margin-top: 20px; font-size: 11px; color: #999;">Nu mai doriți să primiți astfel de emailuri? <a href="${unsubscribeUrl}" style="color: #999;">Dezabonare</a></p>
</body>
</html>`;
}

function getDailyPartnerSent(db: ReturnType<typeof getDb>, partnerMsId: number): number {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM outreach_contacts WHERE partner_ms_id = ? AND email_sent_at >= ?"
  ).get(partnerMsId, startOfDay.getTime()) as { cnt: number };
  return row.cnt;
}

function isOptedOut(db: ReturnType<typeof getDb>, type: string, id: number): boolean {
  const row = db.prepare(
    'SELECT opted_out FROM outreach_contacts WHERE listing_type = ? AND listing_id = ?'
  ).get(type, id) as { opted_out: number } | undefined;
  return !!row?.opted_out;
}

const EMAIL_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 zile
const EMAIL_LOOKUP_TABLES: Record<string, string> = {
  afterschool: 'afterschools', professional: 'professionals', kindergarten: 'kindergartens',
};

// Aceeasi adresa reala de email poate aparea pe mai multe listari distincte (acelasi business,
// randuri diferite in DB) - blocarea doar pe listing_id nu opreste retrimiterea catre aceeasi
// cutie postala printr-o alta listare care inca nu are propriul ei rand "contacted". Verificam
// deci direct pe email, peste toate cele 3 tabele, indiferent de listing_id curent.
function wasEmailRecentlyContacted(db: ReturnType<typeof getDb>, partnerMsId: number, email: string): boolean {
  const cutoff = Date.now() - EMAIL_COOLDOWN_MS;
  const normalized = email.trim().toLowerCase();
  for (const [type, table] of Object.entries(EMAIL_LOOKUP_TABLES)) {
    const row = db.prepare(
      `SELECT 1 FROM outreach_contacts oc
       JOIN ${table} t ON t.id = oc.listing_id
       WHERE oc.listing_type = ? AND oc.partner_ms_id = ? AND LOWER(t.email) = ? AND oc.email_sent_at >= ?
       LIMIT 1`
    ).get(type, partnerMsId, normalized, cutoff);
    if (row) return true;
  }
  return false;
}

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const ms = db.prepare('SELECT * FROM microsites WHERE owner_user_id = ? AND outreach_enabled = 1 LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (!ms) return NextResponse.json({ error: 'Outreach indisponibil' }, { status: 403 });
  let dailySent = 0;
  try { dailySent = getDailyPartnerSent(db, ms.id as number); } catch { dailySent = 0; }
  return NextResponse.json({ dailySent, dailyLimit: 100 });
}

export async function POST(req: NextRequest) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const ms = db.prepare('SELECT * FROM microsites WHERE owner_user_id = ? AND outreach_enabled = 1 LIMIT 1').get(user.id) as Record<string, unknown> | undefined;
  if (!ms) return NextResponse.json({ error: 'Outreach indisponibil' }, { status: 403 });
  if (!ms.resend_api_key) return NextResponse.json({ error: 'Cheia Resend nu este configurata' }, { status: 400 });

  const body = await req.json() as { listings: Array<{ id: number; name: string; email: string }>; target_type?: string };
  const VALID_TARGETS = ['afterschool', 'professional', 'kindergarten'];
  const targetType = VALID_TARGETS.includes(body.target_type || '') ? (body.target_type as string) : 'afterschool';

  const sender = getSenderInfo(db, ms);

  // Ensure partner_ms_id column exists (lazy migration)
  try { db.exec('ALTER TABLE outreach_contacts ADD COLUMN partner_ms_id INTEGER'); } catch {}

  let dailySent = 0;
  try { dailySent = getDailyPartnerSent(db, ms.id as number); } catch {}
  const DAILY_LIMIT = 100;
  if (dailySent >= DAILY_LIMIT) {
    return NextResponse.json({ error: `Limita zilnica de ${DAILY_LIMIT} emailuri atinsa` }, { status: 429 });
  }

  const { listings } = body;
  if (!listings?.length) return NextResponse.json({ error: 'Nicio listare selectata' }, { status: 400 });

  // Dedup pe email in cadrul aceluiasi request - doua listari diferite pot avea aceeasi adresa reala.
  const seenEmails = new Set<string>();
  const deduped = listings.filter((item) => {
    const key = (item.email || '').trim().toLowerCase();
    if (!key || seenEmails.has(key)) return false;
    seenEmails.add(key);
    return true;
  });

  const remaining = DAILY_LIMIT - dailySent;
  const batch = deduped.slice(0, remaining);
  const results: { name: string; success: boolean; error?: string }[] = [];

  const customSubject = (ms.outreach_email_subject as string | null) || null;
  const customMessage = (ms.outreach_email_message as string | null) || null;

  for (const item of batch) {
    const { id, name, email } = item;
    if (!email) { results.push({ name, success: false, error: 'Fara email' }); continue; }
    if (isOptedOut(db, targetType, id)) { results.push({ name, success: false, error: 'Dezabonat' }); continue; }
    if (wasEmailRecentlyContacted(db, ms.id as number, email)) { results.push({ name, success: false, error: 'Deja contactat recent' }); continue; }

    const subject = (customSubject && customSubject.trim()) ? customSubject.replace(/\{nume\}/g, name) : defaultSubject(sender);
    const unsubscribeUrl = `https://activkids.ro/api/outreach/unsubscribe?type=${targetType}&id=${id}`;
    const html = buildHtml(sender, name, customMessage, unsubscribeUrl);
    // Daca partenerul nu si-a putut verifica propriul domeniu in Resend (fara acces DNS),
    // trimitem de pe un subdomeniu activkids.ro deja verificat de noi; raspunsurile ajung
    // tot la partener prin reply_to.
    const sendDomain = ms.outreach_send_domain as string | null;
    // Verificarea Resend e la nivel de domeniu (DKIM/SPF), nu de casuta postala. Pe subdomeniul
    // nostru de workaround folosim prefixul generic "contact" (nu adresa reala a partenerului,
    // ar suna redundant repetata pe subdomeniul activkids.ro); pe domeniul propriu al
    // partenerului (fara workaround) pastram prefixul lor real.
    const localPart = sendDomain
      ? 'contact'
      : (sender.email.split('@')[0] || 'contact').replace(/[^a-zA-Z0-9._-]/g, '');
    const fromAddress = sendDomain ? `${localPart}@${sendDomain}` : sender.email;

    // Atasament optional (ex. meniu) configurat de partener - trimis pe fiecare email din batch.
    // Resend accepta 'path' cu un URL public, fara sa mai citim/incarcam fisierul noi.
    const attachmentUrl = ms.outreach_attachment_url as string | null;
    const attachmentName = ms.outreach_attachment_name as string | null;
    const attachments = attachmentUrl
      ? [{ filename: attachmentName || attachmentUrl.split('/').pop() || 'atasament', path: `https://activkids.ro${attachmentUrl}` }]
      : undefined;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ms.resend_api_key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${sender.name} <${fromAddress}>`, to: email, subject, html, reply_to: sender.replyTo, ...(attachments ? { attachments } : {}) }),
      });

      if (res.ok) {
        const now = Date.now();
        const sendData = await res.json().catch(() => ({})) as { id?: string };
        db.prepare(
          `INSERT INTO outreach_contacts (listing_type, listing_id, status, contacted_at, email_sent_at, partner_ms_id, resend_email_id, delivery_status, delivery_checked_at)
           VALUES (?, ?, 'contacted', ?, ?, ?, ?, NULL, NULL)
           ON CONFLICT(listing_type, listing_id) DO UPDATE SET status='contacted', contacted_at=excluded.contacted_at, email_sent_at=excluded.email_sent_at, partner_ms_id=excluded.partner_ms_id, resend_email_id=excluded.resend_email_id, delivery_status=NULL, delivery_checked_at=NULL`
        ).run(targetType, id, now, now, ms.id, sendData.id || null);
        results.push({ name, success: true });
      } else {
        const err = await res.json().catch(() => ({})) as { message?: string };
        results.push({ name, success: false, error: err.message || `HTTP ${res.status}` });
      }
    } catch (e: unknown) {
      results.push({ name, success: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  let newDailySent = 0;
  try { newDailySent = getDailyPartnerSent(db, ms.id as number); } catch {}

  return NextResponse.json({
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
    dailySent: newDailySent,
    dailyLimit: DAILY_LIMIT,
  });
}
