import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import type { GrowthCampaignRow } from '@/lib/growthCampaigns';

// Masina de stari a unei campanii Growth - orice alta tranzitie ceruta e respinsa cu 400, la fel
// cum pending_edits verifica status !== 'pending' inainte sa actioneze.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'rejected'],
  approved: ['active'],
  active: ['paused', 'completed'],
  paused: ['active', 'completed'],
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const row = db.prepare('SELECT * FROM growth_campaigns WHERE id = ?').get(Number(id)) as GrowthCampaignRow | undefined;
  if (!row) return NextResponse.json({ error: 'Negasit' }, { status: 404 });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.status !== undefined) {
    const nextStatus = String(body.status);
    const allowed = ALLOWED_TRANSITIONS[row.status] || [];
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json({ error: `Tranzitie invalida: ${row.status} -> ${nextStatus}` }, { status: 400 });
    }
    fields.push('status = ?', 'reviewed_at = ?');
    values.push(nextStatus, Date.now());
    if (nextStatus === 'active') {
      fields.push('campaign_start = ?');
      values.push(body.campaign_start ? Number(body.campaign_start) : Date.now());
    }
    if (nextStatus === 'completed') {
      fields.push('campaign_end = ?');
      values.push(body.campaign_end ? Number(body.campaign_end) : Date.now());
    }
  }

  if (body.spend_actual_lei !== undefined) {
    fields.push('spend_actual_lei = ?');
    values.push(body.spend_actual_lei === null ? null : Number(body.spend_actual_lei));
  }
  if (body.impressions_actual !== undefined) {
    fields.push('impressions_actual = ?');
    values.push(body.impressions_actual === null ? null : Number(body.impressions_actual));
  }
  if (body.clicks_actual !== undefined) {
    fields.push('clicks_actual = ?');
    values.push(body.clicks_actual === null ? null : Number(body.clicks_actual));
  }
  if (body.admin_note !== undefined) {
    fields.push('admin_note = ?');
    values.push(body.admin_note ? String(body.admin_note).slice(0, 2000) : null);
  }

  if (fields.length === 0) return NextResponse.json({ error: 'Nimic de actualizat' }, { status: 400 });

  values.push(Number(id));
  db.prepare(`UPDATE growth_campaigns SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}
