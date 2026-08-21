import { getDb } from '@/lib/db';

export const MICROSITE_TABLE: Record<string, string> = {
  afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens',
};

export const MICROSITE_THEMES: Record<string, { hero: string; btn: string; text: string; ring: string; chip: string }> = {
  teal:    { hero: 'from-teal-600 to-teal-800',       btn: 'bg-teal-600 hover:bg-teal-700',       text: 'text-teal-700',    ring: 'focus:ring-teal-300',    chip: 'bg-teal-50 text-teal-700' },
  blue:    { hero: 'from-blue-600 to-blue-800',       btn: 'bg-blue-600 hover:bg-blue-700',       text: 'text-blue-700',    ring: 'focus:ring-blue-300',    chip: 'bg-blue-50 text-blue-700' },
  purple:  { hero: 'from-purple-600 to-purple-800',   btn: 'bg-purple-600 hover:bg-purple-700',   text: 'text-purple-700',  ring: 'focus:ring-purple-300',  chip: 'bg-purple-50 text-purple-700' },
  rose:    { hero: 'from-rose-500 to-rose-700',       btn: 'bg-rose-500 hover:bg-rose-600',       text: 'text-rose-700',    ring: 'focus:ring-rose-300',    chip: 'bg-rose-50 text-rose-700' },
  amber:   { hero: 'from-amber-500 to-amber-700',     btn: 'bg-amber-500 hover:bg-amber-600',     text: 'text-amber-700',   ring: 'focus:ring-amber-300',   chip: 'bg-amber-50 text-amber-700' },
  emerald: { hero: 'from-emerald-600 to-emerald-800', btn: 'bg-emerald-600 hover:bg-emerald-700', text: 'text-emerald-700', ring: 'focus:ring-emerald-300', chip: 'bg-emerald-50 text-emerald-700' },
};

export type MicrositeListingType = 'afterschool' | 'club' | 'caterer' | 'professional' | 'kindergarten';

// Fetch comun folosit de layout + fiecare pagina din /site/[sub]/* - un singur loc de adevar
// pentru "ce e un micro-site" (in loc sa fie reimplementat per pagina, ca inainte).
export function getMicrositeData(sub: string) {
  const db = getDb();
  const ms = db.prepare('SELECT * FROM microsites WHERE subdomain = ? AND is_active = 1').get(sub) as Record<string, unknown> | undefined;
  if (!ms) return null;
  const table = MICROSITE_TABLE[ms.listing_type as string];
  if (!table) return null;
  const listing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(ms.listing_id as number) as Record<string, unknown> | undefined;
  if (!listing) return null;
  return { ms, listing };
}

export function micrositeTheme(ms: Record<string, unknown>) {
  return MICROSITE_THEMES[(ms.theme_color as string) || 'teal'] || MICROSITE_THEMES.teal;
}

export function defaultBookingLabel(type: string) {
  if (type === 'club') return 'Antrenament de probă';
  if (type === 'caterer') return 'Cere o ofertă';
  if (type === 'professional') return 'Programează o ședință';
  if (type === 'kindergarten') return 'Programează o vizită';
  return 'Programează o vizionare';
}

export function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, '');
}

export function micrositeSocials(ms: Record<string, unknown>, listing: Record<string, unknown>) {
  return [
    listing.facebook_url && { href: listing.facebook_url as string, label: 'Facebook', key: 'facebook' },
    ms.instagram_url && { href: ms.instagram_url as string, label: 'Instagram', key: 'instagram' },
    ms.tiktok_url && { href: ms.tiktok_url as string, label: 'TikTok', key: 'tiktok' },
    ms.youtube_url && { href: ms.youtube_url as string, label: 'YouTube', key: 'youtube' },
  ].filter(Boolean) as { href: string; label: string; key: string }[];
}
