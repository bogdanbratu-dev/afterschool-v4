import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

const TABLES = ['afterschools', 'clubs', 'kindergartens', 'professionals', 'tutors', 'caterers'];

function keyFor(table: string, sector: number | null) {
  return `spotlight_override_${table}_${sector == null ? 'null' : sector}`;
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const overrides: { table: string; sector: number | null; config: Record<string, number> }[] = [];
  for (const table of TABLES) {
    const rows = db
      .prepare('SELECT key, value FROM settings WHERE key LIKE ?')
      .all(`spotlight_override_${table}_%`) as { key: string; value: string }[];
    for (const row of rows) {
      const sectorPart = row.key.slice(`spotlight_override_${table}_`.length);
      const sector = sectorPart === 'null' ? null : parseInt(sectorPart);
      try { overrides.push({ table, sector, config: JSON.parse(row.value) }); } catch {}
    }
  }
  return NextResponse.json(overrides);
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const { table, sector, config } = await req.json();
  if (!TABLES.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(keyFor(table, sector != null ? Number(sector) : null), JSON.stringify(config));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const db = getDb();
  const { table, sector } = await req.json();
  db.prepare('DELETE FROM settings WHERE key = ?')
    .run(keyFor(table, sector != null ? Number(sector) : null));
  return NextResponse.json({ ok: true });
}
