// Rulat o singura data la pornirea serverului Next.js
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { exec } = require('child_process');
    const path = require('path');
    const Database = require('better-sqlite3');

    const DB_PATH = path.join(process.cwd(), 'data', 'afterschool.db');
    const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'scrape-all.js');
    const LOG_PATH = path.join(process.cwd(), 'data', 'scrape-all.log');

    // Verifica la fiecare minut daca trebuie pornit cron-ul
    setInterval(() => {
      try {
        const db = new Database(DB_PATH);

        const get = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value;

        if (get('cron_enabled') !== 'true') { db.close(); return; }
        if (get('cron_running') === 'true') { db.close(); return; }

        const intervalDays = parseInt(get('cron_interval_days') || '7');
        const lastTriggered = parseInt(get('cron_last_triggered') || '0');
        const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

        if (Date.now() - lastTriggered >= intervalMs) {
          console.log('[Cron] Pornesc verificarea automata...');
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cron_last_triggered', ?)").run(Date.now().toString());
          db.close();
          exec(`node "${SCRIPT_PATH}" >> "${LOG_PATH}" 2>&1`);
        } else {
          db.close();
        }
      } catch (e) {
        // DB poate sa nu existe inca la prima pornire
      }
    }, 60 * 1000); // verifica in fiecare minut
  }
}
