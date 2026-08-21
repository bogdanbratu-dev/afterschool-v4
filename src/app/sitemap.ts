import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import { PROFESSIONAL_CATEGORY_ORDER } from '@/lib/professionals';
import { TUTOR_SUBJECT_ORDER } from '@/lib/tutors';
import { getCartierStats } from '@/lib/cartiere';

const BASE_URL = 'https://activkids.ro';

export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDb();

  const afterschools = db.prepare('SELECT id, name FROM afterschools WHERE is_paused = 0').all() as { id: number; name: string }[];
  const clubs = db.prepare('SELECT id, name FROM clubs').all() as { id: number; name: string }[];
  let circSchools: { id: number; name: string }[] = [];
  try { circSchools = db.prepare('SELECT id, name FROM circ_schools').all() as { id: number; name: string }[]; } catch { /* tabel inca necreat */ }
  const caterers = db.prepare('SELECT id, name FROM caterers').all() as { id: number; name: string }[];
  const professionals = db.prepare('SELECT id, name FROM professionals').all() as { id: number; name: string }[];
  const kindergartens = db.prepare('SELECT id, name FROM kindergartens').all() as { id: number; name: string }[];
  const tutors = db.prepare('SELECT id, name FROM tutors').all() as { id: number; name: string }[];

  const sectors = ['1','2','3','4','5','6'];
  const categories = ['inot','fotbal','dansuri','arte_martiale','gimnastica','robotica','muzica','arte_creative','limbi_straine'];
  const profCategories = PROFESSIONAL_CATEGORY_ORDER;
  const tutorSubjects = TUTOR_SUBJECT_ORDER;

  const afterschoolCartiere = getCartierStats(db, 'afterschools');
  const clubCategoryCartiere = categories.flatMap(c => getCartierStats(db, 'clubs', 'AND category = ?', [c]).map(stat => ({ category: c, slug: stat.slug })));
  const kindergartenCartiere = getCartierStats(db, 'kindergartens');

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/activitati`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/catering`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/colaboratori`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/gradinite`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/meditatii`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/terapii`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/promovare`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/circumscriptii`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    ...sectors.map(s => ({ url: `${BASE_URL}/circumscriptii/sector/${s}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...circSchools.map(s => ({ url: `${BASE_URL}/circumscriptii/${toSlug(s.name, s.id)}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 })),
    // Pagini SEO per sector
    ...sectors.map(s => ({
      url: `${BASE_URL}/afterschool/sector/${s}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    // Pagini SEO per categorie
    ...categories.map(c => ({
      url: `${BASE_URL}/activitati/categorie/${c}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    // Pagini SEO per categorie + sector (cluburi)
    ...categories.flatMap(c => sectors.map(s => ({
      url: `${BASE_URL}/activitati/categorie/${c}/sector/${s}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }))),
    // Pagini SEO per cartier (afterschool)
    ...afterschoolCartiere.map(c => ({
      url: `${BASE_URL}/afterschool/cartier/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    })),
    // Pagini SEO per categorie + cartier (cluburi)
    ...clubCategoryCartiere.map(({ category, slug }) => ({
      url: `${BASE_URL}/activitati/categorie/${category}/cartier/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    // Pagini SEO per cartier (gradinite)
    ...kindergartenCartiere.map(c => ({
      url: `${BASE_URL}/gradinite/cartier/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    // Listari individuale
    ...afterschools.map(as => ({
      url: `${BASE_URL}/afterschool/${toSlug(as.name, as.id)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    })),
    ...clubs.map(c => ({
      url: `${BASE_URL}/activitati/${toSlug(c.name, c.id)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...caterers.map(c => ({
      url: `${BASE_URL}/catering/${toSlug(c.name, c.id)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    // Pagini SEO per categorie colaboratori
    ...profCategories.map(c => ({
      url: `${BASE_URL}/colaboratori/categorie/${c}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...professionals.map(p => ({
      url: `${BASE_URL}/colaboratori/${toSlug(p.name, p.id)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    })),
    ...sectors.map(s => ({
      url: `${BASE_URL}/gradinite/sector/${s}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...kindergartens.map(k => ({
      url: `${BASE_URL}/gradinite/${toSlug(k.name, k.id)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    })),
    ...tutors.map(t => ({
      url: `${BASE_URL}/meditatii/${toSlug(t.name, t.id)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    })),
    // Pagini SEO per materie meditatii
    ...tutorSubjects.map(s => ({
      url: `${BASE_URL}/meditatii/materie/${s}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
