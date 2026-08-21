import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };

function ownerListing(userId: number) {
  const db = getDb();
  // Preferă maparea prin micro-site; fallback la owner_user_id direct pe listare
  const ms = db.prepare('SELECT listing_type, listing_id FROM microsites WHERE owner_user_id = ? LIMIT 1').get(userId) as { listing_type: string; listing_id: number } | undefined;
  if (ms) return ms;
  for (const [type, table] of Object.entries(TABLE)) {
    const row = db.prepare(`SELECT id FROM ${table} WHERE owner_user_id = ? LIMIT 1`).get(userId) as { id: number } | undefined;
    if (row) return { listing_type: type, listing_id: row.id };
  }
  return null;
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return '"' + s.replace(/"/g, '""') + '"';
}

export async function GET(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const target = ownerListing(user.id);
  if (!target) return NextResponse.json({ leads: [], bookings: [] });

  const db = getDb();
  const leads = db.prepare(
    'SELECT id, parent_name, parent_phone, message, status, created_at FROM leads WHERE listing_type = ? AND listing_id = ? ORDER BY created_at DESC'
  ).all(target.listing_type, target.listing_id) as Record<string, unknown>[];

  const bookings = db.prepare(
    'SELECT id, name, phone, email, preferred_date, preferred_slot, message, kind, status, created_at FROM bookings WHERE listing_type = ? AND listing_id = ? ORDER BY created_at DESC'
  ).all(target.listing_type, target.listing_id) as Record<string, unknown>[];

  const { searchParams } = new URL(request.url);
  if (searchParams.get('format') === 'csv') {
    const rows: string[] = ['Tip,Nume,Telefon,Email,Data preferata,Interval,Mesaj,Status,Creat la'];
    for (const l of leads) {
      rows.push([csvEscape('Mesaj'), csvEscape(l.parent_name), csvEscape(l.parent_phone), csvEscape(''), csvEscape(''), csvEscape(''), csvEscape(l.message), csvEscape(l.status), csvEscape(new Date(l.created_at as number).toLocaleString('ro-RO'))].join(','));
    }
    for (const b of bookings) {
      rows.push([csvEscape(b.kind === 'trial' ? 'Probă' : 'Vizionare'), csvEscape(b.name), csvEscape(b.phone), csvEscape(b.email), csvEscape(b.preferred_date), csvEscape(b.preferred_slot), csvEscape(b.message), csvEscape(b.status), csvEscape(new Date(b.created_at as number).toLocaleString('ro-RO'))].join(','));
    }
    const csv = '﻿' + rows.join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="contacte-activkids.csv"',
      },
    });
  }

  return NextResponse.json({ leads, bookings });
}
