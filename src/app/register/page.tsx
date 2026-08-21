'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setLink(data.link);
  };

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (link) return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--color-card)] rounded-2xl shadow-lg border border-[var(--color-border)] p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Cont creat cu succes!</h1>
          <p className="text-sm text-[var(--color-text-light)] mt-1">Link-ul tau securizat de acces</p>
        </div>
        <div className="bg-[var(--color-bg)] rounded-xl border-2 border-[var(--color-primary)] p-4 mb-4">
          <p className="text-xs text-[var(--color-text-light)] mb-2 font-medium uppercase tracking-wide">Link acces dashboard</p>
          <p className="text-xs break-all text-[var(--color-primary)] font-mono leading-relaxed select-all">{link}</p>
        </div>
        <button onClick={copy}
          className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-xl transition-colors mb-3">
          {copied ? '✓ Copiat!' : 'Copiaza link-ul'}
        </button>
        <a href={link}
          className="block w-full py-3 text-center border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-bold rounded-xl hover:bg-[var(--color-primary)] hover:text-white transition-colors mb-4">
          Acceseaza dashboardul acum
        </a>
        <p className="text-xs text-[var(--color-text-light)] text-center leading-relaxed">
          Salveaza acest link — este singurul mod de a accesa dashboardul tau.
          Am trimis si pe email la <strong>{form.email}</strong>.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--color-card)] rounded-2xl shadow-lg border border-[var(--color-border)] p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Creeaza cont</h1>
          <p className="text-sm text-[var(--color-text-light)] mt-1">Adauga sau revendica listarea ta</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nume complet *</label>
            <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefon</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-xl transition-colors disabled:opacity-50">
            {loading ? 'Se creeaza...' : 'Creeaza cont → primesti link-ul'}
          </button>
        </form>
        <p className="text-center text-sm text-[var(--color-text-light)] mt-6">
          Ai deja un link?{' '}
          <Link href="/login" className="text-[var(--color-primary)] font-semibold hover:underline">Conecteaza-te cu parola</Link>
        </p>
      </div>
    </div>
  );
}
