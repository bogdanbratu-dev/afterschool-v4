'use client';
import { useState, useEffect, useMemo } from 'react';

interface CircSchoolRow {
  id: number;
  name: string;
  type: string;
  sector: number | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  media_en: number | null;
  media_en_year: number | null;
  facilities: string | null;
  facilities_highlight: string | null;
  ssd_available: number;
  ssd_info: string | null;
  news_url: string | null;
  despre: string | null;
  show_all_contacts: number;
  updated_at: number;
}

interface EditState {
  media_en: string;
  media_en_year: string;
  facilities: string; // un rand per facilitate in textarea
  facilities_highlight: string;
  ssd_available: boolean;
  ssd_info: string;
  news_url: string;
  despre: string;
  show_all_contacts: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  gimnaziu: 'Gimnaziu', liceu: 'Liceu', colegiu: 'Colegiu', structura: 'Structură',
};

function parseFacilities(json: string | null): string {
  if (!json) return '';
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.join('\n') : '';
  } catch { return ''; }
}

function toEditState(s: CircSchoolRow): EditState {
  return {
    media_en: s.media_en != null ? String(s.media_en) : '',
    media_en_year: s.media_en_year != null ? String(s.media_en_year) : '',
    facilities: parseFacilities(s.facilities),
    facilities_highlight: s.facilities_highlight || '',
    ssd_available: !!s.ssd_available,
    ssd_info: s.ssd_info || '',
    news_url: s.news_url || '',
    despre: s.despre || '',
    show_all_contacts: !!s.show_all_contacts,
  };
}

const EMPTY_EDIT: EditState = {
  media_en: '', media_en_year: '', facilities: '', facilities_highlight: '',
  ssd_available: false, ssd_info: '', news_url: '', despre: '', show_all_contacts: false,
};

// Cate din cele 5 campuri editoriale sunt completate, pentru badge-ul rapid din lista.
function completeness(s: CircSchoolRow): number {
  let n = 0;
  if (s.media_en != null) n++;
  if (s.facilities_highlight || s.facilities) n++;
  if (s.ssd_available) n++;
  if (s.news_url) n++;
  if (s.despre) n++;
  return n;
}

export default function CircSchoolsTab() {
  const [schools, setSchools] = useState<CircSchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<number | 'all' | 'incomplete'>('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/circ-schools')
      .then(r => r.json())
      .then(d => { setSchools(Array.isArray(d) ? d : []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = schools;
    if (sectorFilter === 'incomplete') list = list.filter(s => completeness(s) === 0);
    else if (sectorFilter !== 'all') list = list.filter(s => s.sector === sectorFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [schools, sectorFilter, search]);

  const openRow = (s: CircSchoolRow) => {
    if (expanded === s.id) { setExpanded(null); return; }
    setExpanded(s.id);
    setEdit(toEditState(s));
    setSaveMsg(null);
  };

  const save = async (id: number) => {
    setSaving(true);
    setSaveMsg(null);
    const body = {
      media_en: edit.media_en,
      media_en_year: edit.media_en_year || (edit.media_en ? new Date().getFullYear() : ''),
      facilities: edit.facilities.split('\n').map(f => f.trim()).filter(Boolean),
      facilities_highlight: edit.facilities_highlight,
      ssd_available: edit.ssd_available,
      ssd_info: edit.ssd_info,
      news_url: edit.news_url,
      despre: edit.despre,
      show_all_contacts: edit.show_all_contacts,
    };
    const res = await fetch(`/api/admin/circ-schools/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setSchools(prev => prev.map(s => s.id === id ? updated : s));
      setSaveMsg('Salvat.');
    } else {
      setSaveMsg('Eroare la salvare.');
    }
    setSaving(false);
  };

  const clearAll = () => {
    setEdit(EMPTY_EDIT);
  };

  if (loading) return <p className="text-[var(--color-text-light)] py-8 text-center">Se încarcă...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">🏫 Circumscripții școlare — date editoriale</h2>
          <p className="text-xs text-[var(--color-text-light)] mt-1">
            Media Evaluare Națională, facilități, program „Școală după școală”, link știri și
            descriere per școală. Câmpurile de bază (nume, adresă, telefon, website) vin din sursa
            oficială ISMB și se reactualizează automat la fiecare rulare a scripturilor de import
            — nu sunt editabile aici, ca să nu diverge la refresh-ul anual.
          </p>
        </div>
        <span className="text-sm text-[var(--color-text-light)]">
          <span className="text-[var(--color-text-main)] font-semibold">{schools.filter(s => completeness(s) > 0).length}</span>/{schools.length} au cel puțin un câmp completat
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută după nume..."
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-white text-gray-900 placeholder:text-gray-400 min-w-[220px]"
        />
        <button
          onClick={() => setSectorFilter('all')}
          className={`px-3 py-1 text-xs rounded-full border ${sectorFilter === 'all' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-light)]'}`}
        >Toate</button>
        {[1, 2, 3, 4, 5, 6].map(s => (
          <button
            key={s}
            onClick={() => setSectorFilter(s)}
            className={`px-3 py-1 text-xs rounded-full border ${sectorFilter === s ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-light)]'}`}
          >Sector {s}</button>
        ))}
        <button
          onClick={() => setSectorFilter('incomplete')}
          className={`px-3 py-1 text-xs rounded-full border ${sectorFilter === 'incomplete' ? 'bg-amber-600 text-white border-amber-600' : 'border-[var(--color-border)] text-[var(--color-text-light)]'}`}
        >Fără niciun câmp completat</button>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        {filtered.length === 0 && (
          <p className="text-sm text-[var(--color-text-light)] px-4 py-6 text-center">Nicio școală găsită.</p>
        )}
        {filtered.map(s => {
          const isOpen = expanded === s.id;
          const c = completeness(s);
          return (
            <div key={s.id} className="border-b border-[var(--color-border)] last:border-b-0">
              <button
                onClick={() => openRow(s)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.03] transition-colors"
              >
                <span className="text-xs text-gray-400 w-6 flex-shrink-0">S{s.sector ?? '-'}</span>
                <span className="text-sm text-[var(--color-text-main)] flex-1 min-w-0 truncate">{s.name}</span>
                <span className="text-[10px] text-[var(--color-text-light)] bg-black/5 px-2 py-0.5 rounded-full flex-shrink-0">{TYPE_LABEL[s.type] || s.type}</span>
                {s.media_en != null && (
                  <span className="text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0">EN {s.media_en.toFixed(2)}</span>
                )}
                {!!s.show_all_contacts && (
                  <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex-shrink-0">📞 Contacte deblocate</span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${c === 0 ? 'text-gray-400 bg-black/5' : 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'}`}>{c}/5</span>
                <span className="text-gray-400 flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 bg-black/[0.015]">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-[var(--color-text-light)] block mb-1">Media Evaluare Națională</label>
                      <input
                        value={edit.media_en}
                        onChange={e => setEdit({ ...edit, media_en: e.target.value })}
                        placeholder="ex. 7.85"
                        type="number" step="0.01" min="1" max="10"
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-white text-gray-900"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-xs text-[var(--color-text-light)] block mb-1">An</label>
                      <input
                        value={edit.media_en_year}
                        onChange={e => setEdit({ ...edit, media_en_year: e.target.value })}
                        placeholder={String(new Date().getFullYear())}
                        type="number"
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-white text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[var(--color-text-light)] block mb-1">Facilități (câte una pe rând)</label>
                    <textarea
                      value={edit.facilities}
                      onChange={e => setEdit({ ...edit, facilities: e.target.value })}
                      rows={3}
                      placeholder={'Sală de sport nouă\nBazin de înot\nLaborator de informatică'}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-white text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[var(--color-text-light)] block mb-1">Puncte forte (text scurt, afișat sus pe pagina școlii)</label>
                    <textarea
                      value={edit.facilities_highlight}
                      onChange={e => setEdit({ ...edit, facilities_highlight: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-white text-gray-900"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id={`ssd-${s.id}`}
                      type="checkbox"
                      checked={edit.ssd_available}
                      onChange={e => setEdit({ ...edit, ssd_available: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`ssd-${s.id}`} className="text-xs text-[var(--color-text-light)]">Are program „Școală după școală” / semiinternat</label>
                  </div>
                  {edit.ssd_available && (
                    <textarea
                      value={edit.ssd_info}
                      onChange={e => setEdit({ ...edit, ssd_info: e.target.value })}
                      rows={2}
                      placeholder="Procedură de înscriere, eligibilitate, orar disponibil..."
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-white text-gray-900"
                    />
                  )}

                  <div>
                    <label className="text-xs text-[var(--color-text-light)] block mb-1">Link „Ultimele știri de la școală”</label>
                    <input
                      value={edit.news_url}
                      onChange={e => setEdit({ ...edit, news_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-white text-gray-900"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                    <input
                      id={`sac-${s.id}`}
                      type="checkbox"
                      checked={edit.show_all_contacts}
                      onChange={e => setEdit({ ...edit, show_all_contacts: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`sac-${s.id}`} className="text-xs text-purple-800">
                      Deblochează contactul (telefon/email) tuturor afterschool-urilor afișate lângă această școală,
                      chiar dacă nu sunt premium sau au contactele ascunse
                    </label>
                  </div>

                  <div>
                    <label className="text-xs text-[var(--color-text-light)] block mb-1">Despre școală (conținut editorial, SEO)</label>
                    <textarea
                      value={edit.despre}
                      onChange={e => setEdit({ ...edit, despre: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-white text-gray-900"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => save(s.id)}
                      disabled={saving}
                      className="text-xs bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-lg disabled:opacity-40"
                    >
                      {saving ? 'Se salvează...' : 'Salvează'}
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Golește toate câmpurile (nesalvat până la Salvează)
                    </button>
                    {saveMsg && <span className="text-xs text-[var(--color-text-light)]">{saveMsg}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
