'use client';

import { useState } from 'react';

interface Props {
  micrositeId: number;
  listingType: 'afterschool' | 'club' | 'caterer' | 'professional' | 'kindergarten';
  listingId: number;
  listingName: string;
  kind: 'visit' | 'trial';
  btnClass: string;
  ringClass: string;
}

const SLOTS = ['Dimineața', 'La prânz', 'După-amiaza', 'Seara'];

export default function BookingForm({ micrositeId, listingType, listingId, listingName, kind, btnClass, ringClass }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError('Completează numele și telefonul.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          microsite_id: micrositeId, listing_type: listingType, listing_id: listingId, listing_name: listingName,
          name, phone, email, preferred_date: date, preferred_slot: slot, message, kind,
        }),
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
        Cererea ta a fost trimisă! Te contactăm pentru confirmare.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Numele tău"
          className={`w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 ${ringClass}`} />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefon" inputMode="tel"
          className={`w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 ${ringClass}`} />
      </div>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (opțional)" inputMode="email"
        className={`w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 ${ringClass}`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-light)] mb-1">Data preferată</label>
          <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)}
            className={`w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 ${ringClass}`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-light)] mb-1">Interval</label>
          <select value={slot} onChange={e => setSlot(e.target.value)}
            className={`w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 ${ringClass}`}>
            <option value="">Oricând</option>
            {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Detalii (vârsta copilului, întrebări...)" rows={2}
        className={`w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg)] focus:outline-none focus:ring-2 ${ringClass}`} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={loading}
        className={`w-full py-3 ${btnClass} text-white font-bold rounded-xl transition-colors disabled:opacity-50`}>
        {loading ? 'Se trimite...' : 'Trimite cererea'}
      </button>
    </form>
  );
}
