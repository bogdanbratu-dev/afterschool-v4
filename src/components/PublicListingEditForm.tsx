'use client';

import { useState } from 'react';

type FieldType = 'text' | 'textarea' | 'number' | 'select';

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
}

const AVAILABILITY_OPTIONS = [
  { value: 'unknown', label: 'Necunoscut' },
  { value: 'available', label: 'Locuri disponibile' },
  { value: 'full', label: 'Complet (fara locuri)' },
  { value: 'closed', label: 'Inchis temporar' },
];

const FIELDS: Record<string, FieldDef[]> = {
  afterschool: [
    { key: 'name', label: 'Nume', type: 'text' },
    { key: 'address', label: 'Adresa', type: 'text' },
    { key: 'neighborhood', label: 'Cartier', type: 'text' },
    { key: 'phone', label: 'Telefon', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'facebook_url', label: 'Pagina Facebook', type: 'text' },
    { key: 'price_min', label: 'Pret minim (RON)', type: 'number' },
    { key: 'price_max', label: 'Pret maxim (RON)', type: 'number' },
    { key: 'pickup_time', label: 'Ora preluare de la scoala', type: 'text' },
    { key: 'end_time', label: 'Ora incheiere program', type: 'text' },
    { key: 'age_min', label: 'Varsta minima', type: 'number' },
    { key: 'age_max', label: 'Varsta maxima', type: 'number' },
    { key: 'description', label: 'Descriere', type: 'textarea' },
    { key: 'activities', label: 'Activitati oferite', type: 'textarea' },
    { key: 'image_url', label: 'URL imagine', type: 'text' },
    { key: 'availability', label: 'Disponibilitate', type: 'select', options: AVAILABILITY_OPTIONS },
  ],
  club: [
    { key: 'name', label: 'Nume', type: 'text' },
    { key: 'address', label: 'Adresa', type: 'text' },
    { key: 'neighborhood', label: 'Cartier', type: 'text' },
    { key: 'phone', label: 'Telefon', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'facebook_url', label: 'Pagina Facebook', type: 'text' },
    { key: 'price_min', label: 'Pret minim (RON)', type: 'number' },
    { key: 'price_max', label: 'Pret maxim (RON)', type: 'number' },
    { key: 'schedule', label: 'Program', type: 'textarea' },
    { key: 'age_min', label: 'Varsta minima', type: 'number' },
    { key: 'age_max', label: 'Varsta maxima', type: 'number' },
    { key: 'description', label: 'Descriere', type: 'textarea' },
    { key: 'availability', label: 'Disponibilitate', type: 'select', options: AVAILABILITY_OPTIONS },
  ],
  caterer: [
    { key: 'name', label: 'Nume', type: 'text' },
    { key: 'address', label: 'Adresa', type: 'text' },
    { key: 'neighborhood', label: 'Cartier', type: 'text' },
    { key: 'coverage_area', label: 'Zona acoperita', type: 'text' },
    { key: 'phone', label: 'Telefon', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'facebook_url', label: 'Pagina Facebook', type: 'text' },
    { key: 'price_min', label: 'Pret minim (RON)', type: 'number' },
    { key: 'price_max', label: 'Pret maxim (RON)', type: 'number' },
    { key: 'description', label: 'Descriere', type: 'textarea' },
    { key: 'availability', label: 'Disponibilitate', type: 'select', options: AVAILABILITY_OPTIONS },
  ],
  professional: [
    { key: 'name', label: 'Nume', type: 'text' },
    { key: 'address', label: 'Adresa', type: 'text' },
    { key: 'neighborhood', label: 'Cartier', type: 'text' },
    { key: 'coverage_area', label: 'Zona acoperita', type: 'text' },
    { key: 'phone', label: 'Telefon', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'facebook_url', label: 'Pagina Facebook', type: 'text' },
    { key: 'price_min', label: 'Pret minim (RON)', type: 'number' },
    { key: 'price_max', label: 'Pret maxim (RON)', type: 'number' },
    { key: 'description', label: 'Descriere', type: 'textarea' },
    { key: 'availability', label: 'Disponibilitate', type: 'select', options: AVAILABILITY_OPTIONS },
  ],
  kindergarten: [
    { key: 'name', label: 'Nume', type: 'text' },
    { key: 'address', label: 'Adresa', type: 'text' },
    { key: 'neighborhood', label: 'Cartier', type: 'text' },
    { key: 'phone', label: 'Telefon', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'facebook_url', label: 'Pagina Facebook', type: 'text' },
    { key: 'price_min', label: 'Pret minim (RON)', type: 'number' },
    { key: 'price_max', label: 'Pret maxim (RON)', type: 'number' },
    { key: 'program', label: 'Program', type: 'text' },
    { key: 'program_start', label: 'Ora inceput program', type: 'text' },
    { key: 'program_end', label: 'Ora sfarsit program', type: 'text' },
    { key: 'age_min', label: 'Varsta minima', type: 'number' },
    { key: 'age_max', label: 'Varsta maxima', type: 'number' },
    { key: 'description', label: 'Descriere', type: 'textarea' },
    { key: 'activities', label: 'Activitati oferite', type: 'textarea' },
    { key: 'availability', label: 'Disponibilitate', type: 'select', options: AVAILABILITY_OPTIONS },
  ],
};

export default function PublicListingEditForm({
  token,
  listingType,
  listing,
}: {
  token: string;
  listingType: string;
  listing: Record<string, unknown>;
}) {
  const fields = FIELDS[listingType] || [];
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of fields) initial[f.key] = listing[f.key] == null ? '' : String(listing[f.key]);
    return initial;
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const listingName = String(listing.name || '');

  function handleChange(key: string, value: string) {
    setValues(v => ({ ...v, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!agreedToTerms) {
      setSaveMsg({ type: 'error', text: 'Trebuie sa fii de acord cu Termenii si Conditiile si Politica de Confidentialitate.' });
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const changes: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = values[f.key];
        if (f.type === 'number') {
          changes[f.key] = raw === '' ? null : Number(raw);
        } else {
          changes[f.key] = raw === '' ? null : raw;
        }
      }
      const res = await fetch(`/api/public/listing-edit/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes, agreedToTerms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la salvare');
      setSaveMsg({ type: 'ok', text: 'Modificarile au fost salvate.' });
    } catch (err) {
      setSaveMsg({ type: 'error', text: err instanceof Error ? err.message : 'Eroare la salvare' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirmName.trim().toLowerCase() !== listingName.trim().toLowerCase()) {
      setDeleteMsg('Numele introdus nu corespunde exact cu numele listarii.');
      return;
    }
    setDeleting(true);
    setDeleteMsg(null);
    try {
      const res = await fetch(`/api/public/listing-edit/${token}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la stergere');
      setDeleted(true);
    } catch (err) {
      setDeleteMsg(err instanceof Error ? err.message : 'Eroare la stergere');
    } finally {
      setDeleting(false);
    }
  }

  if (deleted) {
    return (
      <Shell>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Listare stearsa</h1>
        <p style={{ color: '#6b7280' }}>Listarea &bdquo;{listingName}&rdquo; a fost stearsa definitiv. Acest link nu mai este valid.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Editeaza listarea ta</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        {listingName} &middot; poti actualiza detaliile de mai jos. Acest link e personal, nu il distribui public.
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {fields.map(f => (
          <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, color: '#374151' }}>
            <span style={{ fontWeight: 600 }}>{f.label}</span>
            {f.type === 'textarea' ? (
              <textarea
                value={values[f.key] || ''}
                onChange={e => handleChange(f.key, e.target.value)}
                rows={4}
                style={inputStyle}
              />
            ) : f.type === 'select' ? (
              <select value={values[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)} style={inputStyle}>
                {(f.options || []).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                value={values[f.key] || ''}
                onChange={e => handleChange(f.key, e.target.value)}
                style={inputStyle}
              />
            )}
          </label>
        ))}

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, marginTop: 8 }}>
          <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            Sunt de acord cu <a href="/termeni" target="_blank" rel="noopener noreferrer">Termenii si Conditiile</a> si{' '}
            <a href="/confidentialitate" target="_blank" rel="noopener noreferrer">Politica de Confidentialitate</a>, si confirm ca am
            dreptul sa reprezint aceasta afacere.
          </span>
        </label>

        {saveMsg && (
          <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 14, background: saveMsg.type === 'ok' ? '#ecfdf5' : '#fef2f2', color: saveMsg.type === 'ok' ? '#065f46' : '#991b1b' }}>
            {saveMsg.text}
          </div>
        )}

        <button type="submit" disabled={saving} style={saveButtonStyle}>
          {saving ? 'Se salveaza...' : 'Salveaza modificarile'}
        </button>
      </form>

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #fee2e2' }}>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)} style={dangerLinkStyle}>
            Sterge definitiv aceasta listare
          </button>
        ) : (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16 }}>
            <p style={{ color: '#991b1b', fontSize: 14, marginBottom: 10 }}>
              Aceasta actiune este definitiva si nu poate fi anulata. Listarea va disparea imediat de pe activkids.ro.
              Pentru confirmare, scrie exact numele listarii: <strong>{listingName}</strong>
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder={listingName}
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            {deleteMsg && <p style={{ color: '#991b1b', fontSize: 13, marginBottom: 10 }}>{deleteMsg}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDelete} disabled={deleting} style={confirmDeleteButtonStyle}>
                {deleting ? 'Se sterge...' : 'Confirma stergerea definitiva'}
              </button>
              <button onClick={() => { setShowDelete(false); setDeleteConfirmName(''); setDeleteMsg(null); }} style={cancelButtonStyle}>
                Renunta
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'system-ui, sans-serif', padding: '32px 16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
};

const saveButtonStyle: React.CSSProperties = {
  padding: '12px 20px',
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};

const dangerLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#dc2626',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
};

const confirmDeleteButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#fff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};
