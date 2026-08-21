'use client';
import { useState, useEffect } from 'react';

interface FbGroup {
  id: number;
  name: string;
  url: string;
  category: string;
  member_count: number | null;
  notes: string | null;
  active: number;
  last_posted_at: number | null;
  created_at: number;
}

const GROUP_CATEGORIES = [
  { value: 'general', label: 'General părinți' },
  { value: 'sector', label: 'Grup de sector/cartier' },
  { value: 'mamici', label: 'Mămici/bebeluși' },
  { value: 'educational', label: 'Educațional' },
  { value: 'scoala', label: 'Școală/liceu/bac' },
  { value: 'activity_inot', label: 'Înot' },
  { value: 'activity_fotbal', label: 'Fotbal' },
  { value: 'activity_dansuri', label: 'Dansuri' },
  { value: 'activity_arte_martiale', label: 'Arte marțiale' },
  { value: 'activity_gimnastica', label: 'Gimnastică' },
  { value: 'activity_limbi_straine', label: 'Limbi străine' },
  { value: 'activity_robotica', label: 'Robotică' },
  { value: 'activity_muzica', label: 'Muzică' },
  { value: 'activity_arte_creative', label: 'Arte creative' },
  { value: 'vanzare_cumparare', label: 'Vânzare-cumpărare local' },
  { value: 'altele', label: 'Altele' },
];

const PAGE_CATEGORIES = [
  { value: 'afterschool_pages', label: 'Pagină afterschool (B2B)' },
];

const CATEGORIES = [...GROUP_CATEGORIES, ...PAGE_CATEGORIES];
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));
const PAGE_CATEGORY_VALUES = new Set(PAGE_CATEGORIES.map(c => c.value));

const BATCH_SIZE = 10;
const POST_TEXT_STORAGE_KEY = 'fb_outreach_post_text_v4';
const POST_TEXT_STORAGE_KEY_2 = 'fb_outreach_post_text_v2_variant2';
const POST_TEXT_STORAGE_KEY_3 = 'fb_outreach_post_text_v2_variant3';
const POST_TEXT_VARIANT_STORAGE_KEY = 'fb_outreach_post_text_variant';
const PAGE_POST_TEXT_STORAGE_KEY = 'fb_outreach_page_post_text_v1';

// Scopul acestor postari in grupuri e sa aduca followeri pe pagina de Facebook ActivKids
// (nu trafic direct pe site), asa ca CTA-ul e explicit "urmariti pagina", iar linkul din
// comentariu (vezi FB_PAGE_COMMENT_TEXT mai jos) tinteste pagina, nu activkids.ro.
const FB_PAGE_URL = 'https://www.facebook.com/profile.php?id=61591256207467';
const FB_PAGE_COMMENT_TEXT = `Ne găsiți și pe pagina de Facebook ActivKids, dacă vreți să nu pierdeți genul ăsta de subiecte: ${FB_PAGE_URL}`;

const DEFAULT_POST_TEXT = `Unul dintre subiectele pe care le discut des cu părinții, mai ales cei ai căror copii intră la clasa 0, este despre școli: la ce școală vor fi arondați după adresă.

Ca să fie mai simplu, am făcut un instrument pe activkids.ro: bagi strada, afli școala de circumscripție, și tot acolo poți vedea mai multe despre școala respectivă.

Pe lângă asta, vezi imediat și afterschoolurile din jur, pe o rază de 2 km, plus toate activitățile pentru copii din zonă: înot, fotbal, dansuri, arte marțiale, gimnastică, robotică, muzică și altele.

Sper să vă fie de folos. Dacă vă plac genul ăsta de resurse pentru părinți, ne găsiți și pe pagina de Facebook ActivKids, las linkul în comentariu.`;

// Varianta 2: axata pe colaboratori individuali (nu meditatii, rubrica aceea nu e inca
// dezvoltata) + gradinite + circumscriptie, fara cuvantul "gratuit" (e oricum evident ca
// navigarea pe site e libera) si fara link in text, ca sa nu afecteze reach-ul postarii.
// La fel ca varianta 1, CTA-ul final e "urmariti pagina", nu "vizitati site-ul" - scopul
// postarii e sa aduca followeri pe pagina de Facebook.
const DEFAULT_POST_TEXT_2 = `Un alt subiect care revine des în discuțiile cu părinții: unde găsești ajutor pentru copil în afara școlii, dincolo de afterschool sau clubul clasic de activități.

Pe activkids.ro am adăugat și o secțiune cu colaboratori individuali, căutabili după zonă: logopezi, profesori de limbi străine, profesori de arte creative și alți specialiști pentru copii.

Tot acolo găsiți afterschool-uri și grădinițe după zonă, cluburi de activități (înot, fotbal, dansuri, arte marțiale, robotică, muzică și altele), plus un instrument prin care aflați la ce școală e arondată adresa voastră și detalii despre școala respectivă.

Dacă vă sunt utile genul ăsta de resurse, ne găsiți și pe pagina de Facebook ActivKids, las linkul în comentariu. Sper să fie de folos!`;

// Varianta 3: prezentare generala, pentru ambele audiente (parinti + afaceri), nu doar
// parinti ca variantele 1 si 2. Meditatiile nu sunt scoase in evidenta separat (rubrica
// aceea nu e inca dezvoltata) - apar doar implicit prin "colaboratori individuali", alaturi
// de logopezi/profesori limbi straine/arte creative, la fel ca varianta 2. Fara mentiune de
// video, fara niciun link/domeniu scris in text (nici macar "activkids.ro", ca sa nu fie
// auto-linkificat de Facebook) - site-ul e mentionat doar ca nume de brand, iar singurul
// link e cel din comentariu, catre pagina de Facebook (CTA de follow, scopul postarii).
const DEFAULT_POST_TEXT_3 = `Salutare tuturor! 👋

Sunt administratorul ActivKids, un portal unde părinții din București pot căuta după cartier, sector, școală, program și preț toate afterschool-urile și cluburile de activități disponibile (înot, dansuri, robotică, arte marțiale, fotbal și altele), plus colaboratori individuali: logopezi, profesori de limbi străine, profesori de arte creative și alți specialiști pentru copii.

🔍 Părinți: căutați după zonă, vârstă și program, din câteva click-uri.

🏢 Aveți un afterschool sau un club de activități? Vă puteți lista afacerea GRATUIT pe platformă, ca să vă găsească părinții din zona voastră - durează doar 2 minute.

👉 Dacă vă face plăcere să dați un follow paginii noastre de Facebook, ne-ar ajuta foarte mult și ați fi la curent cu toate noutățile - las linkul în comentariu.

Dacă aveți întrebări, sunt disponibil oricând.`;

const DEFAULT_PAGE_POST_TEXT = `Bună ziua,

Cred că activitatea dumneavoastră s-ar potrivi audienței noastre și aș vrea să vă listez, gratuit, pe activkids.ro, un portal unde părinții din București caută afterschool-uri, cluburi și meditații după zonă, program și preț.

Dacă aveți acordul dvs., vă adaug listarea și vă trimit linkul, ca să o puteți completa sau corecta oricând.

🔗 activkids.ro

Mulțumesc, aștept răspunsul dvs.`;

function daysSince(ts: number | null): string {
  if (!ts) return 'niciodată';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return 'azi';
  if (days === 1) return 'ieri';
  return `acum ${days} zile`;
}

const emptyForm = { name: '', url: '', category: 'general', member_count: '', notes: '' };

export default function FbOutreach() {
  const [groups, setGroups] = useState<FbGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<'grupuri' | 'pagini'>('grupuri');
  const [filterCategory, setFilterCategory] = useState<string>('toate');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [postText, setPostText] = useState(DEFAULT_POST_TEXT);
  const [postText2, setPostText2] = useState(DEFAULT_POST_TEXT_2);
  const [postText3, setPostText3] = useState(DEFAULT_POST_TEXT_3);
  const [postVariant, setPostVariant] = useState<1 | 2 | 3>(1);
  const [pagePostText, setPagePostText] = useState(DEFAULT_PAGE_POST_TEXT);
  const [editingText, setEditingText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedComment, setCopiedComment] = useState(false);

  const load = async () => {
    const res = await fetch('/api/admin/fb-groups');
    const data = await res.json();
    setGroups(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    try {
      const stored = localStorage.getItem(POST_TEXT_STORAGE_KEY);
      if (stored) setPostText(stored);
      const stored2 = localStorage.getItem(POST_TEXT_STORAGE_KEY_2);
      if (stored2) setPostText2(stored2);
      const stored3 = localStorage.getItem(POST_TEXT_STORAGE_KEY_3);
      if (stored3) setPostText3(stored3);
      const storedVariant = localStorage.getItem(POST_TEXT_VARIANT_STORAGE_KEY);
      if (storedVariant === '2') setPostVariant(2);
      else if (storedVariant === '3') setPostVariant(3);
      const storedPage = localStorage.getItem(PAGE_POST_TEXT_STORAGE_KEY);
      if (storedPage) setPagePostText(storedPage);
    } catch { /* ignore */ }
  }, []);

  const switchTab = (tab: 'grupuri' | 'pagini') => {
    setMainTab(tab);
    setFilterCategory('toate');
    setShowForm(false);
  };

  const savePostText = (text: string) => {
    setPostText(text);
    try { localStorage.setItem(POST_TEXT_STORAGE_KEY, text); } catch { /* ignore */ }
  };

  const savePostText2 = (text: string) => {
    setPostText2(text);
    try { localStorage.setItem(POST_TEXT_STORAGE_KEY_2, text); } catch { /* ignore */ }
  };

  const savePostText3 = (text: string) => {
    setPostText3(text);
    try { localStorage.setItem(POST_TEXT_STORAGE_KEY_3, text); } catch { /* ignore */ }
  };

  const chooseVariant = (v: 1 | 2 | 3) => {
    setPostVariant(v);
    try { localStorage.setItem(POST_TEXT_VARIANT_STORAGE_KEY, String(v)); } catch { /* ignore */ }
  };

  const savePagePostText = (text: string) => {
    setPagePostText(text);
    try { localStorage.setItem(PAGE_POST_TEXT_STORAGE_KEY, text); } catch { /* ignore */ }
  };

  const activeGroupText = postVariant === 1 ? postText : postVariant === 2 ? postText2 : postText3;

  const copyPostText = async () => {
    try {
      await navigator.clipboard.writeText(mainTab === 'pagini' ? pagePostText : activeGroupText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const copyCommentText = async () => {
    try {
      await navigator.clipboard.writeText(FB_PAGE_COMMENT_TEXT);
      setCopiedComment(true);
      setTimeout(() => setCopiedComment(false), 2000);
    } catch { /* ignore */ }
  };

  const setF = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f: any) => ({ ...f, [field]: e.target.value }));

  const openAdd = () => {
    setForm({ ...emptyForm, category: mainTab === 'pagini' ? 'afterschool_pages' : 'general' });
    setEditingId(null);
    setShowForm(true);
  };
  const openEdit = (g: FbGroup) => {
    setForm({ name: g.name, url: g.url, category: g.category, member_count: g.member_count ?? '', notes: g.notes ?? '' });
    setEditingId(g.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name || !form.url) return;
    setSaving(true);
    const body = JSON.stringify({ ...form, member_count: form.member_count ? parseInt(form.member_count) : null });
    if (editingId) {
      await fetch(`/api/admin/fb-groups/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
    } else {
      await fetch('/api/admin/fb-groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Ștergi acest grup?')) return;
    await fetch(`/api/admin/fb-groups/${id}`, { method: 'DELETE' });
    load();
  };

  const markPosted = async (id: number) => {
    await fetch(`/api/admin/fb-groups/${id}/mark-posted`, { method: 'POST' });
    load();
  };

  const postToGroup = async (g: FbGroup) => {
    const text = PAGE_CATEGORY_VALUES.has(g.category) ? pagePostText : activeGroupText;
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    window.open(g.url, '_blank', 'noopener,noreferrer');
  };

  if (loading) return <div className="text-slate-300">Se încarcă...</div>;

  const activeAll = groups.filter(g => g.active);
  const tabCategories = mainTab === 'pagini' ? PAGE_CATEGORIES : GROUP_CATEGORIES;
  const active = mainTab === 'pagini'
    ? activeAll.filter(g => PAGE_CATEGORY_VALUES.has(g.category))
    : activeAll.filter(g => !PAGE_CATEGORY_VALUES.has(g.category));
  const filtered = filterCategory === 'toate' ? active : active.filter(g => g.category === filterCategory);
  const batch = [...active].sort((a, b) => (a.last_posted_at || 0) - (b.last_posted_at || 0)).slice(0, BATCH_SIZE);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const postedToday = active.filter(g => g.last_posted_at && g.last_posted_at >= todayStart.getTime()).length;

  return (
    <div className="space-y-6">
      {/* Tab principal: Grupuri vs Pagini */}
      <div className="flex gap-2">
        <button
          onClick={() => switchTab('grupuri')}
          className={`px-4 py-2 text-sm font-medium rounded-lg border ${mainTab === 'grupuri' ? 'bg-blue-600 text-white border-blue-600' : 'border-[var(--color-border)] text-slate-300'}`}
        >
          👥 Grupuri ({activeAll.filter(g => !PAGE_CATEGORY_VALUES.has(g.category)).length})
        </button>
        <button
          onClick={() => switchTab('pagini')}
          className={`px-4 py-2 text-sm font-medium rounded-lg border ${mainTab === 'pagini' ? 'bg-blue-600 text-white border-blue-600' : 'border-[var(--color-border)] text-slate-300'}`}
        >
          🏢 Pagini afterschool ({activeAll.filter(g => PAGE_CATEGORY_VALUES.has(g.category)).length})
        </button>
      </div>
      {mainTab === 'pagini' && (
        <p className="text-sm text-amber-400">Paginile de Facebook nu accepta postare pe wall ca grupurile. Mesajul se trimite ca DM (Messenger), pitch-ul e diferit (B2B, cerere de listare).</p>
      )}

      {/* Text de postat */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <h3 className="font-semibold text-slate-100">
            {mainTab === 'pagini' ? '📝 Mesaj DM pentru pagini (B2B)' : '📝 Text de postat (grupuri de părinți)'}
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setEditingText(v => !v)} className="text-xs text-blue-400 hover:underline">
              {editingText ? 'Ascunde editare' : 'Editează textul'}
            </button>
            <button onClick={copyPostText} className={`text-xs px-3 py-1.5 rounded-lg ${copied ? 'bg-green-700 text-white' : 'bg-[var(--color-card-hover)] text-slate-300 hover:text-white'}`}>
              {copied ? '✓ Copiat!' : '📋 Copiază text'}
            </button>
          </div>
        </div>
        {mainTab === 'grupuri' && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => chooseVariant(1)}
              className={`px-3 py-1 text-xs rounded-full border ${postVariant === 1 ? 'bg-blue-600 text-white border-blue-600' : 'border-[var(--color-border)] text-slate-300'}`}
            >
              Varianta 1 · școli/circumscripție
            </button>
            <button
              onClick={() => chooseVariant(2)}
              className={`px-3 py-1 text-xs rounded-full border ${postVariant === 2 ? 'bg-blue-600 text-white border-blue-600' : 'border-[var(--color-border)] text-slate-300'}`}
            >
              Varianta 2 · colaboratori/grădinițe
            </button>
            <button
              onClick={() => chooseVariant(3)}
              className={`px-3 py-1 text-xs rounded-full border ${postVariant === 3 ? 'bg-blue-600 text-white border-blue-600' : 'border-[var(--color-border)] text-slate-300'}`}
            >
              Varianta 3 · prezentare generală
            </button>
          </div>
        )}
        {editingText ? (
          <textarea
            value={mainTab === 'pagini' ? pagePostText : activeGroupText}
            onChange={e => (mainTab === 'pagini' ? savePagePostText(e.target.value) : (postVariant === 1 ? savePostText(e.target.value) : postVariant === 2 ? savePostText2(e.target.value) : savePostText3(e.target.value)))}
            rows={10}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900"
          />
        ) : (
          <p className="text-sm text-slate-400 whitespace-pre-line">{mainTab === 'pagini' ? pagePostText : activeGroupText}</p>
        )}
      </div>

      {/* Comentariu cu linkul catre pagina - scopul postarilor in grupuri e sa aduca followeri
          pe pagina de Facebook, nu trafic direct pe site, deci linkul din comentariu tinteste
          pagina, nu activkids.ro */}
      {mainTab === 'grupuri' && (
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <h3 className="font-semibold text-slate-100">💬 Text de pus în comentariu (link către pagină)</h3>
            <button onClick={copyCommentText} className={`text-xs px-3 py-1.5 rounded-lg ${copiedComment ? 'bg-green-700 text-white' : 'bg-[var(--color-card-hover)] text-slate-300 hover:text-white'}`}>
              {copiedComment ? '✓ Copiat!' : '📋 Copiază comentariul'}
            </button>
          </div>
          <p className="text-sm text-slate-400">{FB_PAGE_COMMENT_TEXT}</p>
          <p className="text-xs text-slate-500 mt-2">Scopul acestor postări e să aducă followeri pe pagina de Facebook ActivKids, nu trafic direct pe site - de-asta linkul din comentariu duce către pagină, nu către activkids.ro.</p>
        </div>
      )}

      {/* Batch de azi */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-1">📅 Batch de postat azi ({batch.length}) · {postedToday} postate azi</h3>
        <p className="text-sm text-gray-600 mb-4">Apasă pe numele grupului: se copiază automat textul și se deschide grupul într-un tab nou. Lipește (Ctrl+V), postează, apoi apasă „Am postat”.</p>
        <div className="space-y-2">
          {batch.map(g => (
            <div key={g.id} className="flex items-center justify-between gap-3 p-3 bg-white border border-blue-200 rounded-xl">
              <div className="min-w-0">
                <button onClick={() => postToGroup(g)} className="font-medium text-blue-700 hover:underline truncate block text-left">{g.name}</button>
                <span className="text-xs text-gray-500">{CATEGORY_LABELS[g.category] || g.category} · ultima postare: {daysSince(g.last_posted_at)}</span>
              </div>
              <button onClick={() => markPosted(g.id)} className="shrink-0 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                ✓ Am postat
              </button>
            </div>
          ))}
          {batch.length === 0 && <p className="text-sm text-gray-500">Niciun grup activ. Adaugă grupuri mai jos.</p>}
        </div>
      </div>

      {/* Lista completa */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="font-semibold text-slate-100">{mainTab === 'pagini' ? 'Toate paginile' : 'Toate grupurile'} ({active.length})</h3>
          <button onClick={openAdd} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {mainTab === 'pagini' ? '+ Adaugă pagină' : '+ Adaugă grup'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilterCategory('toate')}
            className={`px-3 py-1.5 text-sm rounded-full border ${filterCategory === 'toate' ? 'bg-blue-600 text-white border-blue-600' : 'border-[var(--color-border)] text-slate-300'}`}
          >
            Toate
          </button>
          {tabCategories.map(c => (
            <button
              key={c.value}
              onClick={() => setFilterCategory(c.value)}
              className={`px-3 py-1.5 text-sm rounded-full border ${filterCategory === c.value ? 'bg-blue-600 text-white border-blue-600' : 'border-[var(--color-border)] text-slate-300'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="mb-4 p-4 border border-[var(--color-border)] rounded-xl space-y-3">
            <input value={form.name} onChange={setF('name')} placeholder={mainTab === 'pagini' ? 'Nume pagină' : 'Nume grup'} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900" />
            <input value={form.url} onChange={setF('url')} placeholder={mainTab === 'pagini' ? 'Link pagină Facebook (https://facebook.com/...)' : 'Link Facebook (https://facebook.com/groups/...)'} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900" />
            <div className="flex gap-3">
              <select value={form.category} onChange={setF('category')} className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900">
                {tabCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input value={form.member_count} onChange={setF('member_count')} type="number" placeholder="Nr. membri (opțional)" className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900" />
            </div>
            <textarea value={form.notes} onChange={setF('notes')} placeholder="Notițe (reguli grup, ziua permisă pt. reclame, etc.)" rows={2} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900" />
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] text-slate-300 rounded-lg">
                Anulează
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(g => (
            <div key={g.id} className="flex items-center justify-between gap-3 p-3 border border-[var(--color-border)] rounded-xl">
              <div className="min-w-0">
                <button onClick={() => postToGroup(g)} className="font-medium text-blue-400 hover:underline truncate block text-left">{g.name}</button>
                <span className="text-xs text-slate-400">
                  {CATEGORY_LABELS[g.category] || g.category}
                  {g.member_count ? ` · ${g.member_count.toLocaleString('ro-RO')} membri` : ''}
                  {' · ultima postare: '}{daysSince(g.last_posted_at)}
                </span>
                {g.notes && <p className="text-xs text-slate-500 mt-1">{g.notes}</p>}
              </div>
              <div className="shrink-0 flex gap-2">
                <button onClick={() => markPosted(g.id)} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">✓ Postat</button>
                <button onClick={() => openEdit(g)} className="px-3 py-1.5 text-sm border border-[var(--color-border)] text-slate-300 rounded-lg">Editează</button>
                <button onClick={() => remove(g.id)} className="px-3 py-1.5 text-sm text-[var(--color-danger)] border border-[var(--color-danger)] rounded-lg">Șterge</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-slate-400">Niciun grup în această categorie.</p>}
        </div>
      </div>
    </div>
  );
}
