import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

// Tabelele care alimenteaza tab-ul Outreach din admin - fiecare are aceleasi coloane de baza
// (id/name/sector/phone/email/website/is_premium/owner_user_id), deci query-ul e generat o
// singura data in loc de repetat pentru fiecare tip. extraCol e o coloana suplimentara specifica
// tipului (club/professional au 'category', tutor are 'subject'), aliniata la fieldul opational
// 'category' din OutreachItem (frontend).
const LISTING_TABLES: Record<string, { table: string; extraCol?: string }> = {
  afterschool: { table: 'afterschools' },
  club: { table: 'clubs', extraCol: 'category' },
  caterer: { table: 'caterers' },
  kindergarten: { table: 'kindergartens' },
  professional: { table: 'professionals', extraCol: 'category' },
  tutor: { table: 'tutors', extraCol: 'subject' },
};

function fetchOutreachRows(db: ReturnType<typeof getDb>, type: string, table: string, extraCol?: string) {
  const extraSelect = extraCol ? `c.${extraCol} as category,` : '';
  return db.prepare(`
    SELECT
      c.id, c.name, c.sector, c.phone, c.email, c.website, c.is_premium, ${extraSelect}
      CASE WHEN c.owner_user_id IS NOT NULL THEN 1 ELSE 0 END as has_owner,
      COALESCE(rc.click_count, 0) as view_count,
      COALESCE(oc.status, 'pending') as outreach_status,
      oc.note as outreach_note,
      oc.contacted_at
    FROM ${table} c
    LEFT JOIN (
      SELECT item_id, COUNT(*) as click_count
      FROM result_clicks WHERE type = ?
      GROUP BY item_id
    ) rc ON rc.item_id = c.id
    LEFT JOIN outreach_contacts oc
      ON oc.listing_type = ? AND oc.listing_id = c.id
    ORDER BY view_count DESC, c.name ASC
  `).all(type, type);
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  const result: Record<string, unknown> = {};
  for (const [type, { table, extraCol }] of Object.entries(LISTING_TABLES)) {
    result[`${type}s`] = fetchOutreachRows(db, type, table, extraCol);
  }

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listing_type, listing_id, status } = await req.json();
  if (!listing_type || !listing_id || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const db = getDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO outreach_contacts (listing_type, listing_id, status, contacted_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(listing_type, listing_id) DO UPDATE SET
      status = excluded.status,
      contacted_at = CASE
        WHEN excluded.status IN ('contacted', 'converted') THEN excluded.contacted_at
        ELSE contacted_at
      END
  `).run(listing_type, listing_id, status, now);

  return NextResponse.json({ ok: true });
}
