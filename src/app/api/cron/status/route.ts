import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();

  const enabled = db.prepare("SELECT value FROM settings WHERE key = 'cron_enabled'").get() as { value: string } | undefined;
  const lastTriggered = db.prepare("SELECT value FROM settings WHERE key = 'cron_last_triggered'").get() as { value: string } | undefined;

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN last_checked IS NOT NULL THEN 1 ELSE 0 END) as checked,
      SUM(CASE WHEN availability = 'available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN availability = 'full' THEN 1 ELSE 0 END) as full,
      MIN(last_checked) as oldest_check
    FROM afterschools WHERE website IS NOT NULL AND website != ''
  `).get() as { total: number; checked: number; available: number; full: number; oldest_check: number | null };

  return NextResponse.json({
    enabled: enabled?.value !== 'false',
    lastTriggered: lastTriggered?.value ? new Date(parseInt(lastTriggered.value)).toISOString() : null,
    stats,
  });
}
