import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { CLUB_CATEGORY_LABELS, type ClubCategory } from '@/lib/clubs';

interface RawRow {
  id: number;
  name: string;
  phone: string;
  sector: number | null;
  category: string | null;
  whatsapp_sent_at: number | null;
}

interface ClaimedUserRow {
  listing_id: number;
  listing_name: string;
  user_phone: string;
  source: string;
  whatsapp_sent_at: number | null;
}

// Acelasi mecanism ca la email (send-email/route.ts): reia tokenul existent daca listarea a mai
// fost contactata, altfel genereaza unul nou si il persista - linkul din WhatsApp trebuie sa
// functioneze imediat, fara sa astepte un email trimis anterior. Nu atinge status/contacted_at/
// email_sent_at, coloane specifice canalului de email.
function getOrCreateConfirmToken(db: ReturnType<typeof getDb>, type: string, id: number): string {
  const row = db.prepare(
    'SELECT confirm_token FROM outreach_contacts WHERE listing_type = ? AND listing_id = ?'
  ).get(type, id) as { confirm_token: string | null } | undefined;
  if (row?.confirm_token) return row.confirm_token;
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`
    INSERT INTO outreach_contacts (listing_type, listing_id, confirm_token)
    VALUES (?, ?, ?)
    ON CONFLICT(listing_type, listing_id) DO UPDATE SET confirm_token = COALESCE(outreach_contacts.confirm_token, excluded.confirm_token)
  `).run(type, id, token);
  return token;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  const db = getDb();

  // Excludem premium (deja platesc), cele cu owner_user_id setat (au confirmat deja listarea,
  // prin orice canal - outreach pe email/WhatsApp sau auto-claim din /promovare) si cele care
  // s-au dezabonat explicit (opted_out, de obicei din campania de email) - altfel batch-urile
  // irosesc mesaje pe afaceri care nu mai au niciun motiv sa primeasca pitch-ul de confirmare,
  // sau contactam din nou pe cineva care a cerut clar sa nu mai fie contactat.
  const afterschools = db.prepare(
    `SELECT a.id, a.name, a.phone, a.sector, NULL as category, oc.whatsapp_sent_at as whatsapp_sent_at FROM afterschools a
     LEFT JOIN outreach_contacts oc ON oc.listing_type = 'afterschool' AND oc.listing_id = a.id
     WHERE a.phone IS NOT NULL AND TRIM(a.phone) != '' AND a.is_premium != 1 AND a.owner_user_id IS NULL
       AND COALESCE(oc.opted_out, 0) != 1
     ORDER BY a.id`
  ).all() as RawRow[];

  const clubs = db.prepare(
    `SELECT c.id, c.name, c.phone, c.sector, c.category, oc.whatsapp_sent_at as whatsapp_sent_at FROM clubs c
     LEFT JOIN outreach_contacts oc ON oc.listing_type = 'club' AND oc.listing_id = c.id
     WHERE c.phone IS NOT NULL AND TRIM(c.phone) != '' AND c.is_premium != 1 AND c.owner_user_id IS NULL
       AND COALESCE(oc.opted_out, 0) != 1
     ORDER BY c.id`
  ).all() as RawRow[];

  // Catering: spre deosebire de afterschool/club, aici nu e o listare gratuita de confirmat, ci
  // o oferta platita directa (Premium 150 lei/6 luni + prezentare personala trimisa de Bogdan catre
  // reteaua de afterschooluri/gradinite) - vezi DEFAULT_MESSAGE.caterer din adminOutreachTemplates.ts.
  // Nu excludem pe owner_user_id (a revendica listarea nu inseamna ca a cumparat Premium), doar
  // premium si opted_out.
  const caterers = db.prepare(
    `SELECT c.id, c.name, c.phone, c.sector, NULL as category, oc.whatsapp_sent_at as whatsapp_sent_at FROM caterers c
     LEFT JOIN outreach_contacts oc ON oc.listing_type = 'caterer' AND oc.listing_id = c.id
     WHERE c.phone IS NOT NULL AND TRIM(c.phone) != '' AND c.is_premium != 1
       AND COALESCE(oc.opted_out, 0) != 1
     ORDER BY c.id`
  ).all() as RawRow[];

  // Preferam telefonul contului; daca userul nu are telefon salvat, cadem pe telefonul
  // listarii pe care o detine (unii owneri au completat telefonul doar pe listare).
  const claimedNonPremium = db.prepare(
    `SELECT a.id as listing_id, a.name as listing_name,
            COALESCE(NULLIF(TRIM(u.phone), ''), a.phone) as user_phone, 'afterschool' as source,
            oc.whatsapp_sent_at as whatsapp_sent_at
     FROM users u JOIN afterschools a ON a.owner_user_id = u.id
     LEFT JOIN outreach_contacts oc ON oc.listing_type = 'afterschool' AND oc.listing_id = a.id
     WHERE u.is_premium = 0 AND COALESCE(NULLIF(TRIM(u.phone), ''), a.phone) IS NOT NULL
       AND TRIM(COALESCE(NULLIF(TRIM(u.phone), ''), a.phone)) != ''
     UNION ALL
     SELECT c.id as listing_id, c.name as listing_name,
            COALESCE(NULLIF(TRIM(u.phone), ''), c.phone) as user_phone, 'club' as source,
            oc.whatsapp_sent_at as whatsapp_sent_at
     FROM users u JOIN clubs c ON c.owner_user_id = u.id
     LEFT JOIN outreach_contacts oc ON oc.listing_type = 'club' AND oc.listing_id = c.id
     WHERE u.is_premium = 0 AND COALESCE(NULLIF(TRIM(u.phone), ''), c.phone) IS NOT NULL
       AND TRIM(COALESCE(NULLIF(TRIM(u.phone), ''), c.phone)) != ''
     ORDER BY listing_id`
  ).all() as ClaimedUserRow[];

  // Includere manuala: useri fara listare revendicata in DB (contactati direct de Bogdan
  // pentru oferta legacy), adaugati explicit la cerere - vezi id-urile din tabela users.
  // listing_type='user' (nu 'afterschool'/'club') la marcarea "trimis" - id-ul e din users, nu
  // dintr-o listare, ar coliziona cu un id real de listare altfel.
  const MANUAL_INCLUDE_USER_IDS = [8]; // 8 = Visan Simona
  const manualIncludes = MANUAL_INCLUDE_USER_IDS.length > 0
    ? db.prepare(
        `SELECT u.id, u.name, u.phone, oc.whatsapp_sent_at as whatsapp_sent_at
         FROM users u
         LEFT JOIN outreach_contacts oc ON oc.listing_type = 'user' AND oc.listing_id = u.id
         WHERE u.id IN (${MANUAL_INCLUDE_USER_IDS.map(() => '?').join(',')})
         AND u.is_premium = 0 AND u.phone IS NOT NULL AND TRIM(u.phone) != ''
         ORDER BY u.id`
      ).all(...MANUAL_INCLUDE_USER_IDS) as { id: number; name: string; phone: string; whatsapp_sent_at: number | null }[]
    : [];

  const groups: Record<string, { label: string; items: { id: number; name: string; phone: string; source: string; listingType: string; link?: string; sentAt: number | null }[] }> = {};

  // listingType e cheia reala pt. marcarea "trimis" (outreach_contacts.listing_type) - de regula
  // egal cu source, doar 'manual' se traduce in 'user' (vezi comentariul de mai sus).
  const push = (groupKey: string, label: string, row: RawRow, source: string, link?: string) => {
    if (!groups[groupKey]) groups[groupKey] = { label, items: [] };
    const listingType = source === 'manual' ? 'user' : source;
    groups[groupKey].items.push({
      id: row.id, name: row.name, phone: row.phone, source, listingType,
      sentAt: row.whatsapp_sent_at ?? null, ...(link ? { link } : {}),
    });
  };

  for (const row of afterschools) {
    const key = row.sector ? `afterschool_sector_${row.sector}` : 'afterschool_fara_sector';
    const label = row.sector ? `Afterschool — Sector ${row.sector}` : 'Afterschool — fără sector';
    const token = getOrCreateConfirmToken(db, 'afterschool', row.id);
    push(key, label, row, 'afterschool', `https://activkids.ro/confirma/${token}`);
  }

  for (const row of clubs) {
    const cat = row.category as ClubCategory;
    const key = `club_${row.category || 'altele'}`;
    const label = `Club — ${CLUB_CATEGORY_LABELS[cat] || row.category || 'Altele'}`;
    push(key, label, row, 'club');
  }

  for (const row of caterers) {
    push('caterer_all', 'Catering — toți', row, 'caterer');
  }

  if (claimedNonPremium.length > 0 || manualIncludes.length > 0) {
    const key = 'legacy_offer_claimed_users';
    const label = 'Oferta legacy: listari revendicate (non-Premium)';
    groups[key] = { label, items: [] };
    for (const row of claimedNonPremium) {
      groups[key].items.push({
        id: row.listing_id, name: row.listing_name, phone: row.user_phone, source: row.source,
        listingType: row.source, sentAt: row.whatsapp_sent_at ?? null,
      });
    }
    for (const row of manualIncludes) {
      groups[key].items.push({
        id: row.id, name: row.name, phone: row.phone, source: 'manual',
        listingType: 'user', sentAt: row.whatsapp_sent_at ?? null,
      });
    }
  }

  return NextResponse.json({ groups });
}
