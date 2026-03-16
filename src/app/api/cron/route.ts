import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const CRON_SECRET = process.env.CRON_SECRET;

// GET /api/cron?secret=XXX — apelat de cron-job.org saptamanal
// POST /api/cron?secret=XXX&action=start|stop — control manual din admin
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  // Verifica daca cron-ul e activ
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'cron_enabled'").get() as { value: string } | undefined;
  if (setting?.value === 'false') {
    return NextResponse.json({ message: 'Cron dezactivat. Nicio actiune efectuata.' });
  }

  // Porneste scraping-ul in background (fara await — raspunde imediat)
  runScrapeInBackground();

  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cron_last_triggered', ?)").run(Date.now().toString());

  return NextResponse.json({ message: 'Verificare pornita in background.', timestamp: new Date().toISOString() });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const action = searchParams.get('action');

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  if (action === 'stop') {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cron_enabled', 'false')").run();
    return NextResponse.json({ message: 'Cron oprit.' });
  }

  if (action === 'start') {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cron_enabled', 'true')").run();
    return NextResponse.json({ message: 'Cron pornit.' });
  }

  if (action === 'run-now') {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'cron_enabled'").get() as { value: string } | undefined;
    if (setting?.value === 'false') {
      return NextResponse.json({ error: 'Cron-ul e oprit. Porneste-l mai intai.' }, { status: 400 });
    }
    runScrapeInBackground();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cron_last_triggered', ?)").run(Date.now().toString());
    return NextResponse.json({ message: 'Verificare manuala pornita.' });
  }

  return NextResponse.json({ error: 'Actiune necunoscuta' }, { status: 400 });
}

function runScrapeInBackground() {
  const { exec } = require('child_process');
  const path = require('path');
  const scriptPath = path.join(process.cwd(), 'scripts', 'scrape-all.js');
  const logPath = path.join(process.cwd(), 'data', 'scrape-all.log');
  exec(`node "${scriptPath}" >> "${logPath}" 2>&1`, (err: Error | null) => {
    if (err) console.error('Eroare scrape-all:', err.message);
  });
}
