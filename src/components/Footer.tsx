export default function Footer() {
  return (
    <footer className="bg-[var(--color-card)] border-t border-[var(--color-border)] mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-[var(--color-text-light)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} ActivKids.ro</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="/termeni" className="hover:text-[var(--color-primary)] transition-colors">Termeni și condiții</a>
            <a href="/confidentialitate" className="hover:text-[var(--color-primary)] transition-colors">Confidențialitate</a>
            <a href="mailto:activkidsromania@gmail.com" className="hover:text-[var(--color-primary)] transition-colors">Contact</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
