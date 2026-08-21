'use client';
import { useState } from 'react';

const LINKS = [
  { href: '/', label: 'After School' },
  { href: '/activitati', label: 'Activități' },
  { href: '/gradinite', label: 'Grădinițe' },
  { href: '/colaboratori', label: 'Colaboratori' },
  { href: '/meditatii', label: 'Meditații' },
  { href: '/circumscriptii', label: 'Circumscripții' },
  { href: '/catering', label: 'Catering' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-[var(--color-card)] border-b border-[var(--color-border)] relative z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="/" className="font-bold text-lg text-[var(--color-primary)] tracking-tight">ActivKids</a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 text-sm">
          {LINKS.map(l => (
            <a key={l.href} href={l.href} className="px-3 py-1.5 rounded-lg text-[var(--color-text-main)] hover:bg-[var(--color-bg)] transition-colors">
              {l.label}
            </a>
          ))}
          <a href="/promovare" className="ml-3 inline-flex items-center gap-1 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap">
            + Adaugă listare
          </a>
        </nav>

        {/* Mobile: CTA + hamburger */}
        <div className="flex lg:hidden items-center gap-2">
          <a href="/promovare" className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
            + Adaugă
          </a>
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Meniu"
            className="p-2 rounded-lg hover:bg-[var(--color-bg)] transition-colors text-[var(--color-text-main)]"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="lg:hidden absolute top-14 left-0 right-0 bg-[var(--color-card)] border-b border-[var(--color-border)] shadow-lg">
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-5 py-3.5 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-bg)] border-b border-[var(--color-border)] last:border-0 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
