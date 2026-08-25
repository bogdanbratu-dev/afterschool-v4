'use client';
import { useState, useEffect } from 'react';

interface Suggestion {
  id: number;
  listing_type: string;
  listing_id: number;
  listing_name: string;
  field: string;
  old_value: string | null;
  new_value: string;
  source_url: string | null;
  status: string;
  created_at: number;
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  phone: 'Telefon',
};

export default function ContactSuggestionsTab() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  const load = async () => {
    const data = await fetch('/api/admin/contact-suggestions').then((r) => r.json());
    setSuggestions(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (id: number, action: 'approve' | 'reject') => {
    setActing(id);
    await fetch(`/api/admin/contact-suggestions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setActing(null);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Ștergi definitiv această propunere?')) return;
    setActing(id);
    await fetch(`/api/admin/contact-suggestions/${id}`, { method: 'DELETE' });
    setActing(null);
    load();
  };

  if (loading) return <p className="text-[var(--color-text-light)] text-sm">Se încarcă...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-main)]">📇 Propuneri date de contact</h2>
        <p className="text-xs text-[var(--color-text-light)] mt-1">
          Generate de <code>scripts/crawl-contact-info.js</code>, care verifică emailul/telefonul afterschool-urilor
          (cu website) contra a ceea ce e publicat chiar pe site-ul lor. Nu se aplică nimic automat — aprobă sau
          respinge fiecare propunere aici.
        </p>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-light)] text-left">
              <th className="px-3 py-2">Listare</th>
              <th className="px-3 py-2">Câmp</th>
              <th className="px-3 py-2">Valoare veche</th>
              <th className="px-3 py-2">Valoare nouă</th>
              <th className="px-3 py-2">Sursă</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {suggestions.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-[var(--color-text-light)]">Nicio propunere în așteptare.</td></tr>
            )}
            {suggestions.map((s) => (
              <tr key={s.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-black/[0.03]">
                <td className="px-3 py-2 text-[var(--color-text-main)] max-w-[220px] truncate" title={s.listing_name}>{s.listing_name}</td>
                <td className="px-3 py-2 text-[var(--color-text-light)]">{FIELD_LABELS[s.field] || s.field}</td>
                <td className="px-3 py-2 text-[var(--color-text-light)]">{s.old_value || '(lipsă)'}</td>
                <td className="px-3 py-2 text-[var(--color-text-main)] font-medium">{s.new_value}</td>
                <td className="px-3 py-2">
                  {s.source_url ? (
                    <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
                      sursă ↗
                    </a>
                  ) : '-'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => act(s.id, 'approve')}
                      disabled={acting === s.id}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg disabled:opacity-40"
                    >
                      Aprobă
                    </button>
                    <button
                      onClick={() => act(s.id, 'reject')}
                      disabled={acting === s.id}
                      className="text-xs border border-[var(--color-border)] text-[var(--color-text-light)] px-3 py-1 rounded-lg disabled:opacity-40"
                    >
                      Respinge
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      disabled={acting === s.id}
                      className="text-red-600 hover:text-red-700 disabled:opacity-40"
                    >
                      Șterge
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
