'use client';

import { useState } from 'react';

interface Props {
  listingType: 'afterschool' | 'club' | 'caterer' | 'professional' | 'kindergarten';
  listingId: number;
  listingName: string;
  btnClass: string;
  ringClass: string;
}

export default function MicrositeContactForm({ listingType, listingId, listingName, btnClass, ringClass }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError('Completează numele și telefonul.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_type: listingType, listing_id: listingId, listing_name: listingName, parent_name: name, parent_phone: phone, message }),
      });
      if (res.ok) setSent(true);
      else setError('A apărut o eroare. Încearcă din nou.');
    } catch {
      setError('A apărut o eroare. Încearcă din nou.');
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="bg-green-50 text-green-700 rounded-xl px-4 py-4 text-sm font-medium text-center">
        Mulțumim! Mesajul a fost trimis. Te contactăm în curând.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Numele tău"
        className={`w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 ${ringClass}`} />
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefon" inputMode="tel"
        className={`w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 ${ringClass}`} />
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Mesaj (opțional)" rows={3}
        className={`w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 ${ringClass}`} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={loading}
        className={`w-full py-3 ${btnClass} text-white font-bold rounded-xl transition-colors disabled:opacity-50`}>
        {loading ? 'Se trimite...' : 'Trimite mesajul'}
      </button>
    </form>
  );
}
