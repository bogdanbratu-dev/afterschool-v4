import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { parseAdCsv } from '@/lib/adCsvParser';

// POST /api/admin/ad-calibration/import - primeste textul brut al unui CSV exportat din Meta Ads
// Manager, il parseaza si insereaza randurile in ad_campaign_imports sub un batch_id nou. Randurile
// intra fara objective/category (etichetare manuala ulterioara, vezi PATCH pe /rows) - vezi
// src/lib/adCsvParser.ts pentru detalii despre potrivirea coloanelor.
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const csvText = body?.csvText;
  if (!csvText || typeof csvText !== 'string') {
    return NextResponse.json({ error: 'Lipseste csvText.' }, { status: 400 });
  }

  const rows = parseAdCsv(csvText);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Niciun rand valid gasit in CSV. Verifica formatul exportului.' }, { status: 400 });
  }

  const db = getDb();
  const batchId = `${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}-${Math.random().toString(36).slice(2, 7)}`;
  const importedAt = Date.now();

  const insert = db.prepare(`
    INSERT INTO ad_campaign_imports (
      batch_id, campaign_name, ad_set_name, date_start, date_stop, amount_spent_lei,
      impressions, reach, link_clicks, ctr_pct, cpc_lei, cpm_lei, results, cost_per_result_lei,
      objective, category, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
  `);

  const insertMany = db.transaction((items: typeof rows) => {
    for (const r of items) {
      insert.run(
        batchId, r.campaignName, r.adSetName, r.dateStart, r.dateStop, r.amountSpentLei,
        r.impressions, r.reach, r.linkClicks, r.ctrPct, r.cpcLei, r.cpmLei, r.results, r.costPerResultLei,
        importedAt
      );
    }
  });
  insertMany(rows);

  return NextResponse.json({ ok: true, batchId, count: rows.length });
}
