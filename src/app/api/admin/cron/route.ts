import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

function runScrapeInBackground() {
  const { exec } = require('child_process');
  const path = require('path');
  const scriptPath = path.join(process.cwd(), 'scripts', 'scrape-all.js');
  const logPath = path.join(process.cwd(), 'data', 'scrape-all.log');
  exec(`node "${scriptPath}" >> "${logPath}" 2>&1`, (err: Error | null) => {
    if (err) console.error('Eroare scrape-all:', err.message);
  });
}

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const get = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value;

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN last_checked IS NOT NULL THEN 1 ELSE 0 END) as checked,
      SUM(CASE WHEN availability = 'available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN availability = 'full' THEN 1 ELSE 0 END) as full
    FROM afterschools WHERE website IS NOT NULL AND website != ''
  `).get();

  const progress = parseInt(get('cron_progress') || '0');
  const total = parseInt(get('cron_total') || '0');

  return NextResponse.json({
    enabled: get('cron_enabled') !== 'false',
    intervalDays: parseInt(get('cron_interval_days') || '7'),
    lastTriggered: get('cron_last_triggered') ? new Date(parseInt(get('cron_last_triggered')!)).toISOString() : null,
    running: get('cron_running') === 'true',
    progress,
    total,
    percentage: total > 0 ? Math.round((progress / total) * 100) : 0,
    stats,
  });
}

export async function POST(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action } = body;
  const db = getDb();

  if (action === 'stop') {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cron_enabled', 'false')").run();
    return NextResponse.json({ message: 'Verificarea automata a fost oprita.' });
  }
  if (action === 'start') {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cron_enabled', 'true')").run();
    return NextResponse.json({ message: 'Verificarea automata a fost pornita.' });
  }
  if (action === 'run-now') {
    const running = (db.prepare("SELECT value FROM settings WHERE key = 'cron_running'").get() as { value: string } | undefined)?.value;
    if (running === 'true') {
      return NextResponse.json({ error: 'O verificare este deja in curs.' }, { status: 400 });
    }
    runScrapeInBackground();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cron_last_triggered', ?)").run(Date.now().toString());
    return NextResponse.json({ message: 'Verificare pornita.' });
  }

  if (action === 'stop-run') {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cron_stop_requested', 'true')").run();
    return NextResponse.json({ message: 'Oprire solicitata. Verificarea se va opri dupa elementul curent.' });
  }

  if (action === 'set-interval') {
    const days = parseInt(body.days);
    if (!days || days < 1 || days > 365) {
      return NextResponse.json({ error: 'Interval invalid (1-365 zile).' }, { status: 400 });
    }
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cron_interval_days', ?)").run(days.toString());
    return NextResponse.json({ message: `Interval setat la ${days} ${days === 1 ? 'zi' : 'zile'}.` });
  }

  return NextResponse.json({ error: 'Actiune necunoscuta' }, { status: 400 });
}
