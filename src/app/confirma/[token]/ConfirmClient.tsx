'use client';

import { useState } from 'react';

export default function ConfirmClient({ token, alreadyConfirmed }: { token: string; alreadyConfirmed: boolean }) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/outreach/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'A apărut o eroare, încearcă din nou.');
        return;
      }
      setLink(data.link);
    } catch {
      setError('A apărut o eroare, încearcă din nou.');
    } finally {
      setSubmitting(false);
    }
  }

  if (link) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
        <p className="text-emerald-800 font-semibold mb-3">Confirmare reușită! Ai acces gratuit la platformă.</p>
        <a
          href={link}
          className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Accesează platforma →
        </a>
      </div>
    );
  }

  return (
    <div>
      {alreadyConfirmed && (
        <p className="text-xs text-[var(--color-text-light)] mb-3">
          Ai confirmat deja acest link anterior. Apasă din nou pentru un link nou de acces.
        </p>
      )}
      <label className="flex items-start gap-2 mb-4 cursor-pointer text-sm text-[var(--color-text-main)]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Sunt de acord cu{' '}
          <a href="/termeni" target="_blank" className="text-[var(--color-primary)] underline">
            Termenii și condițiile
          </a>{' '}
          și{' '}
          <a href="/confidentialitate" target="_blank" className="text-[var(--color-primary)] underline">
            Politica de confidențialitate
          </a>
          .
        </span>
      </label>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <button
        onClick={handleConfirm}
        disabled={!checked || submitting}
        className="w-full px-5 py-2.5 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-opacity"
      >
        {submitting ? 'Se procesează...' : 'Confirmă și accesează platforma'}
      </button>
    </div>
  );
}
