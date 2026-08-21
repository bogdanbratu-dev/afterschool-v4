import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import crypto from 'crypto';

const TABLES: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };
const BOOKING_LABEL: Record<string, string> = {
  afterschool: 'Programează o vizionare',
  club: 'Înscrie-te la probă',
  caterer: 'Cere o ofertă',
};
const THEME: Record<string, string> = { afterschool: 'teal', club: 'blue', caterer: 'emerald' };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[șş]/g, 's').replace(/[țţ]/g, 't').replace(/[ăâ]/g, 'a').replace(/î/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function cleanHtml(html: string): string {
  return html
    .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<strong>(.*?)<\/strong>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { listing_type, listing_id } = await request.json();
  if (!TABLES[listing_type] || !listing_id) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

  const db = getDb();
  const table = TABLES[listing_type];

  // Get listing data
  const listing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(listing_id) as any;
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  // Check if microsite already exists for this listing
  const existing = db.prepare(
    "SELECT id, subdomain FROM microsites WHERE listing_type = ? AND listing_id = ?"
  ).get(listing_type, listing_id) as { id: number; subdomain: string } | undefined;

  // Generate subdomain
  let subdomain = slugify(listing.name);
  if (!subdomain) subdomain = `${listing_type}-${listing_id}`;
  // Ensure unique
  const taken = db.prepare('SELECT id FROM microsites WHERE subdomain = ?').get(subdomain);
  if (taken && !existing) subdomain = `${subdomain}-${listing_id}`;

  // About long — clean HTML from editorial_summary or description
  const rawAbout = listing.editorial_summary || listing.description || '';
  const about_long = cleanHtml(rawAbout);

  // Tagline
  const area = listing.coverage_area || listing.sector || listing.address?.split(',')[1]?.trim() || '';
  const typeLabel = listing_type === 'afterschool' ? 'Afterschool' : listing_type === 'club' ? 'Club / Activitate' : 'Catering';
  const tagline = area ? `${typeLabel} în ${area}` : typeLabel;

  // Create or get user
  let owner_user_id = listing.owner_user_id as number | null;
  if (!owner_user_id) {
    const email = listing.email || `${subdomain}@activkids-partner.ro`;
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined;
    if (existingUser) {
      owner_user_id = existingUser.id;
    } else {
      const pwd_hash = crypto.createHash('sha256').update(crypto.randomBytes(16).toString('hex') + 'activkids_secret').digest('hex');
      db.prepare('INSERT INTO users (email, password_hash, name, is_premium) VALUES (?,?,?,1)').run(email, pwd_hash, listing.name);
      owner_user_id = (db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number }).id;
    }
    db.prepare(`UPDATE ${table} SET owner_user_id = ? WHERE id = ?`).run(owner_user_id, listing_id);
  }

  // Create or update microsite
  if (existing) {
    db.prepare(`UPDATE microsites SET subdomain=?, owner_user_id=?, theme_color=?, tagline=?, about_long=?,
      booking_enabled=1, booking_label=?, is_active=1 WHERE id=?`).run(
      existing.subdomain, owner_user_id, THEME[listing_type], tagline, about_long,
      BOOKING_LABEL[listing_type], existing.id
    );
    subdomain = existing.subdomain;
  } else {
    db.prepare(`INSERT INTO microsites (subdomain, listing_type, listing_id, owner_user_id, theme_color,
      tagline, about_long, booking_enabled, booking_label, is_active)
      VALUES (?,?,?,?,?,?,?,1,?,1)`).run(
      subdomain, listing_type, listing_id, owner_user_id, THEME[listing_type],
      tagline, about_long, BOOKING_LABEL[listing_type]
    );
  }

  // Generate magic link token
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO access_tokens (id, user_id) VALUES (?,?)').run(token, owner_user_id);

  return NextResponse.json({
    subdomain,
    microsite_url: `https://${subdomain}.activkids.ro`,
    magic_link: `https://activkids.ro/accesare/${token}`,
    user_id: owner_user_id,
  });
}
