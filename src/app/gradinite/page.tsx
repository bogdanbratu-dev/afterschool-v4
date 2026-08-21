import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import KindergartenSearch from './KindergartenSearch';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Grădinițe și creșe private în București | ActivKids',
  description:
    'Găsește grădinițe și creșe private în București, căutabile după adresă și sector. Program, prețuri, vârste și contact pentru fiecare unitate.',
  alternates: { canonical: 'https://activkids.ro/gradinite' },
  openGraph: {
    title: 'Grădinițe și creșe private în București | ActivKids',
    description: 'Grădinițe și creșe private în București, căutabile după adresă și sector.',
    url: 'https://activkids.ro/gradinite', siteName: 'ActivKids', locale: 'ro_RO', type: 'website',
  },
  twitter: { card: 'summary', title: 'Grădinițe și creșe private în București | ActivKids', description: 'Grădinițe și creșe private în București.' },
};

export default function KindergartensPage() {
  const db = getDb();
  const { n: count } = db.prepare('SELECT count(*) as n FROM kindergartens').get() as { n: number };

  const jsonLdList = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: 'Grădinițe și creșe private în București',
    url: 'https://activkids.ro/gradinite', numberOfItems: count,
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdList) }} />
      <Navbar />

      <section className="bg-gradient-to-br from-pink-600 to-pink-800 text-white py-7 sm:py-10">
        <div className="max-w-6xl mx-auto text-center mb-5 px-4">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-3">{count} grădinițe și creșe private în București</h1>
          <p className="text-pink-100 text-sm sm:text-base max-w-2xl mx-auto hidden sm:block">Introdu adresa sau zona ta și găsește cele mai apropiate grădinițe și creșe</p>
        </div>
        <Suspense fallback={<div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /></div>}>
          <KindergartenSearch initialCount={count} />
        </Suspense>
      </section>

      <footer className="bg-[var(--color-card)] border-t border-[var(--color-border)] py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-light)]">
          <span>ActivKids · Grădinițe și creșe private București</span>
          <div className="flex gap-4">
            <a href="https://www.facebook.com/profile.php?id=61591256207467" target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</a><a href="/" className="hover:underline">Afterschool-uri</a><a href="/colaboratori" className="hover:underline">Colaboratori</a><a href="/catering" className="hover:underline">Catering</a></div>
        </div>
      </footer>
    </div>
  );
}
