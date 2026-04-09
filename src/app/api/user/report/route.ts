import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserSession } from '@/lib/userAuth';

export async function GET(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
  if (!user.is_premium) return NextResponse.json({ error: 'Doar pentru premium' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month'); // format: YYYY-MM, defaults to current month

  const now = new Date();
  const year = monthParam ? parseInt(monthParam.split('-')[0]) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam.split('-')[1]) : now.getMonth() + 1;

  const from = new Date(year, month - 1, 1).getTime();
  const to = new Date(year, month, 1).getTime();

  const db = getDb();

  // Find listings owned by this user (both afterschools and clubs)
  const ownedAS = db.prepare('SELECT id, name FROM afterschools WHERE owner_user_id = ?').all(user.id) as { id: number; name: string }[];
  const ownedClubs = db.prepare('SELECT id, name FROM clubs WHERE owner_user_id = ?').all(user.id) as { id: number; name: string }[];

  const results: {
    listing_type: string;
    listing_id: number;
    listing_name: string;
    clicks: { link_type: string; count: number }[];
    total: number;
  }[] = [];

  for (const as of ownedAS) {
    const clicks = db.prepare(`
      SELECT link_type, COUNT(*) as count FROM result_clicks
      WHERE item_type = 'afterschool' AND item_id = ? AND clicked_at >= ? AND clicked_at < ?
      GROUP BY link_type ORDER BY count DESC
    `).all(as.id, from, to) as { link_type: string; count: number }[];
    const total = clicks.reduce((s, r) => s + r.count, 0);
    results.push({ listing_type: 'afterschool', listing_id: as.id, listing_name: as.name, clicks, total });
  }

  for (const club of ownedClubs) {
    const clicks = db.prepare(`
      SELECT link_type, COUNT(*) as count FROM result_clicks
      WHERE item_type = 'club' AND item_id = ? AND clicked_at >= ? AND clicked_at < ?
      GROUP BY link_type ORDER BY count DESC
    `).all(club.id, from, to) as { link_type: string; count: number }[];
    const total = clicks.reduce((s, r) => s + r.count, 0);
    results.push({ listing_type: 'club', listing_id: club.id, listing_name: club.name, clicks, total });
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  const totalClicks = results.reduce((s, r) => s + r.total, 0);

  const linkTypeLabel: Record<string, string> = {
    phone: 'Telefon', website: 'Website', email: 'Email',
    maps: 'Harta', reviews: 'Recenzii',
  };

  const rows = results.map(r => `
    <tr>
      <td>${r.listing_name}</td>
      <td>${r.listing_type === 'afterschool' ? 'After School' : 'Activitate'}</td>
      <td>${r.clicks.map(c => `${linkTypeLabel[c.link_type] || c.link_type}: <strong>${c.count}</strong>`).join(', ') || '—'}</td>
      <td><strong>${r.total}</strong></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<title>Raport clickuri ${monthLabel}</title>
<style>
  body { font-family: Arial, sans-serif; color: #111; padding: 32px; font-size: 14px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .sub { color: #666; margin-bottom: 24px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #f0f4ff; text-align: left; padding: 8px 12px; border-bottom: 2px solid #c7d2fe; font-size: 13px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  .total-row td { font-weight: bold; background: #f9fafb; }
  .footer { margin-top: 32px; font-size: 12px; color: #999; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>Raport clickuri — ${monthLabel}</h1>
<p class="sub">Utilizator: ${user.name} (${user.email}) &nbsp;·&nbsp; Total clickuri: <strong>${totalClicks}</strong></p>
<table>
  <thead>
    <tr>
      <th>Listing</th>
      <th>Tip</th>
      <th>Detalii clickuri</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>
    ${rows || '<tr><td colspan="4" style="color:#999;padding:16px">Niciun click in aceasta luna.</td></tr>'}
    <tr class="total-row">
      <td colspan="3">Total general</td>
      <td>${totalClicks}</td>
    </tr>
  </tbody>
</table>
<p class="footer">Generat pe ${new Date().toLocaleDateString('ro-RO')} · activkids.ro</p>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
