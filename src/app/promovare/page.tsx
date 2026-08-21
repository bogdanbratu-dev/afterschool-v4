import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import PromovarePage from './PromovarePage';

export const metadata: Metadata = {
  title: 'Promovează-ți After School-ul sau Activitatea pentru Copii | ActivKids',
  description: 'Listează gratuit sau premium after school-ul, clubul sau activitatea ta pentru copii pe ActivKids. Vizibilitate în fața a mii de părinți din București.',
  alternates: { canonical: 'https://activkids.ro/promovare' },
  openGraph: {
    title: 'Promovează-ți After School-ul | ActivKids',
    description: 'Listează-ți afacerea pe cea mai mare platformă de after school-uri și activități pentru copii din București.',
    url: 'https://activkids.ro/promovare',
  },
};

export default function Page() {
  const { count } = getDb().prepare('SELECT COUNT(*) as count FROM afterschools').get() as { count: number };
  return <PromovarePage afterschoolCount={count} />;
}
