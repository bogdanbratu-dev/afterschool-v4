import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';

const BASE_URL = 'https://activkids.ro';

export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDb();

  const afterschools = db.prepare('SELECT id, name FROM afterschools').all() as { id: number; name: string }[];
  const clubs = db.prepare('SELECT id, name FROM clubs').all() as { id: number; name: string }[];

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/activitati`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...afterschools.map(as => ({
      url: `${BASE_URL}/afterschool/${toSlug(as.name, as.id)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...clubs.map(c => ({
      url: `${BASE_URL}/activitati/${toSlug(c.name, c.id)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
