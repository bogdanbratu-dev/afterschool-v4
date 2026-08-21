// Cartier (cel mai apropiat "quarter"/"suburb" numit din OpenStreetMap, vezi
// data/bucharest-neighborhoods.json si scripts/enrich-neighborhoods.js). Cartierele nu sunt
// unitati administrative cu granite exacte, deci "cel mai apropiat punct numit" e sursa de
// adevar pentru coloana `neighborhood` de pe afterschools/clubs/kindergartens - vezi src/lib/geo.ts.
import type Database from 'better-sqlite3';
import { stripDiacritics } from './slug';
import neighborhoods from '../../data/bucharest-neighborhoods.json';

// Sub acest prag pagina de cartier ar fi continut subtire (thin content) - cartierul ramane
// navigabil doar prin pagina de sector, nu capata pagina proprie.
export const CARTIER_MIN_LISTINGS = 3;

export function cartierSlug(name: string): string {
  return stripDiacritics(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const SLUG_TO_NAME: Record<string, string> = Object.fromEntries(
  (neighborhoods as { name: string }[]).map(n => [cartierSlug(n.name), n.name])
);

export function cartierNameFromSlug(slug: string): string | null {
  return SLUG_TO_NAME[slug] ?? null;
}

export interface CartierStat {
  name: string;
  slug: string;
  count: number;
  sector: number | null;
  priceMin: number | null;
  priceMax: number | null;
}

type ListingTable = 'afterschools' | 'clubs' | 'kindergartens';

// Grupeaza pe (neighborhood, sector) mai intai (un cartier poate avea listari cu sector diferit
// din cauza aproximarii) si pastreaza, per cartier, sectorul cu cele mai multe listari.
export function getCartierStats(
  db: Database.Database,
  table: ListingTable,
  whereExtra = '',
  params: unknown[] = []
): CartierStat[] {
  const rows = db.prepare(`
    SELECT neighborhood, sector, COUNT(*) as count, MIN(price_min) as priceMin, MAX(price_max) as priceMax
    FROM ${table}
    WHERE neighborhood IS NOT NULL ${whereExtra}
    GROUP BY neighborhood, sector
    ORDER BY count DESC
  `).all(...params) as { neighborhood: string; sector: number | null; count: number; priceMin: number | null; priceMax: number | null }[];

  const byName = new Map<string, CartierStat>();
  for (const r of rows) {
    const existing = byName.get(r.neighborhood);
    if (existing) {
      existing.count += r.count;
      if (r.priceMin != null && (existing.priceMin == null || r.priceMin < existing.priceMin)) existing.priceMin = r.priceMin;
      if (r.priceMax != null && (existing.priceMax == null || r.priceMax > existing.priceMax)) existing.priceMax = r.priceMax;
    } else {
      byName.set(r.neighborhood, {
        name: r.neighborhood,
        slug: cartierSlug(r.neighborhood),
        count: r.count,
        sector: r.sector,
        priceMin: r.priceMin,
        priceMax: r.priceMax,
      });
    }
  }
  return [...byName.values()].filter(c => c.count >= CARTIER_MIN_LISTINGS).sort((a, b) => b.count - a.count);
}

// Alegere determinista (nu Math.random) - aceeasi pagina randeaza mereu aceeasi varianta intre
// build-uri, dar cartiere diferite (seed diferit) primesc formulari diferite.
export function pickBySeed<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

export function cartierIntro(kindPlural: string, cartierName: string, count: number, sectorLabel: string | null): string {
  const templates = [
    `Cartierul ${cartierName}${sectorLabel ? ` (${sectorLabel})` : ''} are ${count} ${kindPlural} listate momentan pe ActivKids, cu program și prețuri actualizate.`,
    `În ${cartierName}${sectorLabel ? `, parte din ${sectorLabel}` : ''}, am adunat ${count} ${kindPlural} din zonă.`,
    `Dacă locuiești în ${cartierName}, ai de ales dintre ${count} ${kindPlural} apropiate.`,
    `${count} ${kindPlural} sunt listate în acest moment în ${cartierName}${sectorLabel ? `, ${sectorLabel}` : ''}.`,
  ];
  return pickBySeed(templates, cartierName + kindPlural + 'intro');
}

export function cartierPriceNote(cartierName: string, kindPlural: string, priceMin: number | null, priceMax: number | null): string | null {
  if (priceMin == null || priceMax == null) return null;
  const templates = [
    `Prețurile pentru ${kindPlural} din ${cartierName} pornesc de la ${priceMin} lei/lună și ajung până la ${priceMax} lei/lună, în funcție de program și activitățile incluse.`,
    `Bugetul necesar variază între ${priceMin} și ${priceMax} lei/lună, diferența ținând mai ales de orar și de serviciile incluse.`,
    `În zonă, tarifele merg de la ${priceMin} până la ${priceMax} lei/lună, deci merită comparate cel puțin 2-3 opțiuni înainte de a alege.`,
  ];
  return pickBySeed(templates, cartierName + kindPlural + 'pret');
}

export function cartierClosing(cartierName: string, kindPlural: string): string {
  const templates = [
    `Fiecare listare din ${cartierName} are program, prețuri și date de contact verificate, actualizate periodic.`,
    `Poți compara direct ${kindPlural} din ${cartierName} după preț, program sau vârstă, fără să cauți pe mai multe site-uri.`,
    `Lista de mai jos se actualizează pe măsură ce apar noi ${kindPlural} în ${cartierName}.`,
  ];
  return pickBySeed(templates, cartierName + kindPlural + 'closing');
}

export interface CartierExtras {
  ageMin: number | null;
  ageMax: number | null;
  availableCount: number;
  ratingAvg: number | null;
  ratedCount: number;
}

// Semnale reale per cartier (nu doar text generat), ca sa deosebeasca efectiv paginile intre ele
// dincolo de simpla substituire de nume - relevant la scara (~150 pagini de cartier).
export function getCartierExtras(
  db: Database.Database,
  table: ListingTable,
  neighborhood: string,
  whereExtra = '',
  params: unknown[] = []
): CartierExtras {
  const row = db.prepare(`
    SELECT MIN(age_min) as ageMin, MAX(age_max) as ageMax,
      SUM(CASE WHEN availability = 'available' THEN 1 ELSE 0 END) as availableCount,
      AVG(CASE WHEN rating IS NOT NULL THEN rating END) as ratingAvg,
      SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END) as ratedCount
    FROM ${table}
    WHERE neighborhood = ? ${whereExtra}
  `).get(neighborhood, ...params) as {
    ageMin: number | null; ageMax: number | null; availableCount: number | null;
    ratingAvg: number | null; ratedCount: number | null;
  };
  return {
    ageMin: row.ageMin,
    ageMax: row.ageMax,
    availableCount: row.availableCount ?? 0,
    ratingAvg: row.ratingAvg,
    ratedCount: row.ratedCount ?? 0,
  };
}

export function cartierDespre(
  kindPlural: string,
  cartierName: string,
  sectorLabel: string | null,
  count: number,
  extras: CartierExtras
): string {
  const ageText = extras.ageMin != null && extras.ageMax != null
    ? ` pentru copii cu vârste între ${extras.ageMin} și ${extras.ageMax} ani`
    : '';
  const ratingText = extras.ratedCount >= 3 && extras.ratingAvg != null
    ? ` Media notelor Google pentru cele ${extras.ratedCount} listări evaluate din zonă este ${extras.ratingAvg.toFixed(1)}.`
    : '';
  const templates = [
    `${cartierName}${sectorLabel ? `, în ${sectorLabel},` : ''} este una dintre zonele Bucureștiului cu ofertă solidă de ${kindPlural}${ageText}.${ratingText}`,
    `Cu ${count} ${kindPlural} listate, ${cartierName} oferă suficiente opțiuni cât să compari programul și prețul fără să ieși din cartier${ageText}.${ratingText}`,
    `${cartierName}${sectorLabel ? ` (${sectorLabel})` : ''} concentrează ${count} ${kindPlural}${ageText}, majoritatea la câțiva pași unele de altele.${ratingText}`,
  ];
  return pickBySeed(templates, cartierName + kindPlural + 'despre');
}

export function cartierRecomandari(kindPlural: string, extras: CartierExtras): string[] {
  const tips: string[] = [];
  tips.push(
    extras.availableCount > 0
      ? `${extras.availableCount} din listările din zonă au în acest moment locuri disponibile, urmărește eticheta "Locuri disponibile" de pe fiecare card.`
      : `Disponibilitatea locurilor se schimbă des, cel mai sigur e să suni sau scrii direct înainte să te decizi.`
  );
  tips.push(`Compară programul și activitățile incluse, nu doar prețul lunar, două listări cu preț apropiat pot avea orare foarte diferite.`);
  tips.push(`Verifică distanța reală pe hartă față de școală sau casă, adresele de la limita dintre două cartiere pot fi mai aproape decât par.`);
  return tips;
}
