import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMicrositeData, micrositeTheme } from '@/lib/microsite';

type Props = { params: Promise<{ sub: string }>; children: React.ReactNode };

// Nav slim + footer comune tuturor paginilor unui micro-site (/, /contact, orice viitoare) -
// un singur loc care garanteaza aceeasi structura peste tot, in loc sa fie repetata per pagina.
export default async function MicrositeLayout({ params, children }: Props) {
  const { sub } = await params;
  const data = getMicrositeData(sub);
  if (!data) notFound();
  const { ms, listing } = data;
  const theme = micrositeTheme(ms);
  const name = listing.name as string;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <nav className="bg-[var(--color-card)] border-b border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-4 h-11 flex items-center justify-between text-sm">
          <Link href="/" className="font-semibold text-[var(--color-text-main)] truncate">{name}</Link>
          <Link href="/contact" className={`font-medium ${theme.text} hover:underline`}>Contact</Link>
        </div>
      </nav>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-[var(--color-border)] py-6 text-center">
        <p className="text-xs text-[var(--color-text-light)]">
          {name} · site realizat cu <a href="https://activkids.ro" target="_blank" rel="noopener noreferrer" className={`font-semibold ${theme.text} hover:underline`}>ActivKids</a>
        </p>
      </footer>
    </div>
  );
}
