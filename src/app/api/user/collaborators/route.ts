import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/userAuth';
import { getDb } from '@/lib/db';
import { calculateDistance } from '@/lib/distance';
import { CATEGORY_TO_GROUP, PROFESSIONAL_GROUP_LABELS, PROFESSIONAL_GROUP_ORDER, type ProfessionalCategory, type ProfessionalGroup } from '@/lib/professionals';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';

interface OwnListing { type: 'afterschool' | 'kindergarten'; lat: number; lng: number; is_premium: number }

function resolveOwnListing(db: ReturnType<typeof getDb>, userId: number): OwnListing | null {
  const as = db.prepare('SELECT lat, lng, is_premium FROM afterschools WHERE owner_user_id = ? LIMIT 1').get(userId) as { lat: number; lng: number; is_premium: number } | undefined;
  if (as) return { type: 'afterschool', ...as };

  const kg = db.prepare('SELECT lat, lng, is_premium FROM kindergartens WHERE owner_user_id = ? LIMIT 1').get(userId) as { lat: number; lng: number; is_premium: number } | undefined;
  if (kg) return { type: 'kindergarten', ...kg };

  return null;
}

interface ProfessionalRow {
  id: number; name: string; category: ProfessionalCategory; kind: string | null;
  address: string | null; sector: number | null; coverage_area: string | null;
  phone: string | null; email: string | null; website: string | null; facebook_url: string | null;
  price_min: number | null; price_max: number | null;
  description: string | null; editorial_summary: string | null;
  availability: string; online_available: number | null; home_service: number | null;
  is_premium: number; is_featured: number; contacts_hidden: number;
  banner_url: string | null; photo_urls: string | null;
  rating: number | null; reviews_count: number | null; maps_url: string | null;
  lat: number | null; lng: number | null;
}

interface CatererRow {
  id: number; name: string;
  address: string; sector: number; coverage_area: string | null;
  phone: string | null; email: string | null; website: string | null; facebook_url: string | null;
  price_min: number | null; price_max: number | null;
  description: string | null; editorial_summary: string | null;
  availability: string;
  is_premium: number; is_featured: number; contacts_hidden: number;
  banner_url: string | null; photo_urls: string | null;
  rating: number | null; reviews_count: number | null; maps_url: string | null;
  lat: number | null; lng: number | null;
}

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  const db = getDb();
  const me = resolveOwnListing(db, user.id);
  if (!me) return NextResponse.json({ error: 'Nu detii nicio listare' }, { status: 403 });
  if (me.is_premium !== 1) return NextResponse.json({ error: 'Doar pentru premium' }, { status: 403 });

  const rows = db.prepare(`
    SELECT id, name, category, kind, address, sector, coverage_area, phone, email, website, facebook_url,
      price_min, price_max, description, editorial_summary, availability, online_available, home_service,
      is_premium, is_featured, contacts_hidden, banner_url, photo_urls, rating, reviews_count, maps_url, lat, lng
    FROM professionals
  `).all() as ProfessionalRow[];

  const withDistance = rows.map(p => ({
    ...p,
    distance: (p.lat && p.lng) ? calculateDistance(me.lat, me.lng, p.lat, p.lng) : undefined,
  }));

  const groups: Record<ProfessionalGroup, { label: string; items: typeof withDistance }> = {
    personal: { label: PROFESSIONAL_GROUP_LABELS.personal, items: [] },
    optionale: { label: PROFESSIONAL_GROUP_LABELS.optionale, items: [] },
    terapie: { label: PROFESSIONAL_GROUP_LABELS.terapie, items: [] },
  };
  for (const p of withDistance) {
    const group = CATEGORY_TO_GROUP[p.category] || 'optionale';
    groups[group].items.push(p);
  }
  const spotlightCfg = readSpotlightConfig(db);
  const tieBreak = (a: typeof withDistance[number], b: typeof withDistance[number]) => {
    if (a.distance === undefined && b.distance === undefined) return a.name.localeCompare(b.name);
    if (a.distance === undefined) return 1;
    if (b.distance === undefined) return -1;
    return a.distance - b.distance;
  };
  for (const g of PROFESSIONAL_GROUP_ORDER) {
    groups[g].items = applyPremiumSpotlight(groups[g].items, spotlightCfg, { tieBreak });
  }

  const catererRows = db.prepare(`
    SELECT id, name, address, sector, coverage_area, phone, email, website, facebook_url,
      price_min, price_max, description, editorial_summary, availability,
      is_premium, is_featured, contacts_hidden, banner_url, photo_urls, rating, reviews_count, maps_url, lat, lng
    FROM caterers
  `).all() as CatererRow[];

  const caterersWithDistance = catererRows.map(c => ({
    ...c,
    distance: (c.lat && c.lng) ? calculateDistance(me.lat, me.lng, c.lat, c.lng) : undefined,
  }));
  const catererTieBreak = (a: typeof caterersWithDistance[number], b: typeof caterersWithDistance[number]) => {
    if (a.distance === undefined && b.distance === undefined) return a.name.localeCompare(b.name);
    if (a.distance === undefined) return 1;
    if (b.distance === undefined) return -1;
    return a.distance - b.distance;
  };
  const caterers = applyPremiumSpotlight(caterersWithDistance, spotlightCfg, { tieBreak: catererTieBreak });

  return NextResponse.json({
    groups,
    caterers: { label: 'Catering', items: caterers },
    total: withDistance.length + caterers.length,
  });
}
