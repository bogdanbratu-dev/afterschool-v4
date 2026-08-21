import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

// Tinta campaniei "pachet site de prezentare" (50 lei, ad-hoc, nu apare pe /promovare): institutii
// fara website propriu SI fara un microsite deja creat (microsites.listing_type/listing_id) - cele
// care au deja unul nu au nevoie de pitch. Colaboratorii/tutorii individuali sunt excluse, la fel
// ca in intrebarea initiala a userului despre institutii fara website.
const LISTING_TABLES: Record<string, { table: string; extraCol?: string }> = {
  afterschool: { table: 'afterschools' },
  club: { table: 'clubs', extraCol: 'category' },
  kindergarten: { table: 'kindergartens' },
  caterer: { table: 'caterers' },
};

// Excludere manuala pt. afaceri deja gestionate direct de Bogdan pe alt canal (telefon/email
// personal) - nu au nevoie sa primeasca pitch-ul automat inca o data. Olimpia Kids (afterschool
// id 177/286, kindergarten id 38/340) e deja exclus si de filtrul "fara website" mai jos (are
// olimpia-kids.ro completat), dar il tinem si aici explicit ca protectie daca website-ul dispare
// vreodata din date, plus ca precedent pentru orice alt contact tratat manual pe viitor.
const MANUAL_EXCLUDE = new Set<string>([
  'afterschool_177', 'afterschool_286', 'kindergarten_38', 'kindergarten_340',
]);

// Acelasi mecanism ca la whatsapp-leads/route.ts si send-email/route.ts: reia tokenul existent
// daca listarea a mai fost contactata, altfel genereaza unul nou si il persista - linkul de
// confirmare (/confirma/[token]) trebuie sa functioneze imediat, indiferent de canal.
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

// oc.confirmed_at IS NULL exclude cei care deja au bifat termenii si au confirmat listarea prin
// /confirma/[token] (fluxul de consimtamant al campaniei generale) - mesajul acestui batch cere
// din nou "cu permisiunea dvs, sa va adaug gratuit", ceea ce nu are sens pentru cineva deja confirmat.
function fetchTargets(db: ReturnType<typeof getDb>, listingType: string, table: string, extraCol?: string) {
  const extraSelect = extraCol ? `c.${extraCol} as category,` : '';
  const rows = db.prepare(`
    SELECT
      c.id, c.name, c.sector, c.phone, c.email, ${extraSelect}
      COALESCE(rc.click_count, 0) as view_count,
      oc.microsite_pitch_email_sent_at as email_sent_at,
      oc.microsite_pitch_whatsapp_sent_at as whatsapp_sent_at,
      COALESCE(oc.opted_out, 0) as opted_out
    FROM ${table} c
    LEFT JOIN (
      SELECT item_id, COUNT(*) as click_count
      FROM result_clicks WHERE type = ?
      GROUP BY item_id
    ) rc ON rc.item_id = c.id
    LEFT JOIN outreach_contacts oc
      ON oc.listing_type = ? AND oc.listing_id = c.id
    WHERE (c.website IS NULL OR c.website = '')
      AND COALESCE(c.is_premium, 0) != 1
      AND COALESCE(oc.opted_out, 0) != 1
      AND oc.confirmed_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM microsites m WHERE m.listing_type = ? AND m.listing_id = c.id
      )
    ORDER BY view_count DESC, c.name ASC
  `).all(listingType, listingType, listingType) as any[];
  // Linkul de confirmare e generat/persistat lazy, doar cand lista e efectiv incarcata in admin
  // (nu la fiecare request public) - acelasi tipar ca whatsapp-leads/route.ts.
  return rows
    .filter(row => !MANUAL_EXCLUDE.has(`${listingType}_${row.id}`))
    .map(row => ({
      ...row,
      listing_type: listingType,
      link: `https://activkids.ro/confirma/${getOrCreateConfirmToken(db, listingType, row.id)}`,
    }));
}

function getDailySent(db: ReturnType<typeof getDb>): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  // Cap comun cu campania generala de email (send-email/route.ts) - e aceeasi resursa reala
  // (contul Resend/reputatia domeniului), nu o limita separata per campanie.
  const row = db.prepare(
    'SELECT COUNT(*) as cnt FROM outreach_contacts WHERE (email_sent_at >= ? OR microsite_pitch_email_sent_at >= ?)'
  ).get(startOfDay.getTime(), startOfDay.getTime()) as { cnt: number };
  return row.cnt;
}

export async function GET() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getDb();
  const result: Record<string, any[]> = {};
  for (const [listingType, { table, extraCol }] of Object.entries(LISTING_TABLES)) {
    result[listingType] = fetchTargets(db, listingType, table, extraCol);
  }
  return NextResponse.json({ ...result, dailySent: getDailySent(db), dailyLimit: 100 });
}
