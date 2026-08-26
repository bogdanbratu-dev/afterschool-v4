'use client';
import { useState, useEffect } from 'react';

interface Target {
  id: number;
  name: string;
  sector: number;
  phone: string | null;
  email: string | null;
  category?: string;
  view_count: number;
  email_sent_at: number | null;
  whatsapp_sent_at: number | null;
  opted_out: number;
  listing_type: string;
  link: string;
}

const LISTING_TYPES: { v: string; label: string }[] = [
  { v: 'afterschool', label: 'After School' },
  { v: 'club', label: 'Activități' },
  { v: 'kindergarten', label: 'Grădinițe' },
  { v: 'caterer', label: 'Catering' },
];

type Filter = 'all' | 'no_email' | 'no_wa' | 'done' | 'today';

// WhatsApp Web nu poate initializa multe sesiuni simultan intr-un browser - testat 2026-08-17,
// un lot de 20 de tab-uri deschise deodata a ramas blocat pe ecranul de incarcare "Criptat integral"
// la toate, niciunul nu a ajuns sa afiseze conversatia. Marit la cererea admin-ului (2026-08-26) de
// la valoarea conservatoare de 3 - risc mai mare ca unele tab-uri sa ramana blocate de browser.
const BATCH_SIZE = 10;

function toWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('40')) return digits;
  if (digits.startsWith('0')) return '40' + digits.slice(1);
  return '40' + digits;
}

function keyOf(t: { listing_type: string; id: number }): string {
  return `${t.listing_type}_${t.id}`;
}

// Text WhatsApp hardcodat (nu stocat in DB), acelasi ton de "cerere de acord" ca sablonul de email
// (adminOutreachTemplates.ts) - nu spunem ca sunt deja adaugati, ii intrebam daca vor sa fie
// adaugati. Linkul de confirmare vine din API (confirm_token persistat in outreach_contacts).
function micrositeWaLink(phone: string, name: string, link: string): string {
  const text = encodeURIComponent(
    `Bună ziua! Îmi cer scuze de deranj. Mă numesc Bogdan și am construit ActivKids.ro, un site prin care părinții din București caută afterschool-uri, grădinițe, cluburi de sporturi și activități și alți furnizori de servicii pentru copii.\n\n` +
    `Am căutat și am contactat mai multe astfel de afaceri din oraș ca să construiesc platforma, și am dat și de ${name}, așa că aș vrea, cu permisiunea dvs, să vă adaug gratuit.\n\n` +
    `Fiind adăugați pe activkids.ro, aveți gratuit: apariție în căutările părinților din zona dvs., profil complet cu poze, descriere, program și date de contact, și posibilitatea să actualizați oricând informațiile din propriul cont.\n\n` +
    `Dacă sunteți de acord, confirmarea e scurtă: ${link}\n\n` +
    `Am observat totuși că nu aveți un site propriu. Un site v-ar ajuta nu doar să vă îmbunătățiți listările pe astfel de platforme, dar potențialii clienți vă pot găsi și prin Google sau chiar prin ChatGPT în zilele acestea.\n\n` +
    `Listarea pe activkids.ro este gratuită, iar pachetul Premium (100 lei/3 luni) vă aduce în plus poziție prioritară în rezultate, badge Premium, carusel foto mai vizibil, contact direct de la părinți, statistici de vizite și acces la catalogul nostru de colaboratori (logopezi, psihologi, meditatori).\n\n` +
    `Un site cu orice funcționalități doriți vi-l pot face cu 500 lei, o singură dată - și aș putea include în acei 500 lei și prețul unei listări Premium, ca să nu plătiți separat pentru ea. Mă ocup și de mentenanța sitului după aceea.\n\n` +
    `Nu cer niciun avans: plata se face abia la final, după ce vedeți rezultatul și sunteți mulțumit.\n\n` +
    `Dacă nu vă interesează site-ul, nicio problemă, listarea gratuită rămâne disponibilă oricum.\n\n` +
    `Dacă aveți întrebări, răspundeți aici sau sunați-mă la 0747 646 543.`
  );
  return 'https://wa.me/' + toWaPhone(phone) + '?text=' + text;
}

export default function MicrositePitchTab() {
  const [data, setData] = useState<Record<string, Target[]>>({});
  const [loading, setLoading] = useState(true);
  const [listingType, setListingType] = useState<string>('afterschool');
  const [filter, setFilter] = useState<Filter>('all');
  const [dailySent, setDailySent] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSendingEmail, setBulkSendingEmail] = useState(false);
  const [bulkInfo, setBulkInfo] = useState<string | null>(null);
  // Ferestrele WhatsApp deschise dar neconfirmate inca - fereastra se poate deschide fara sa se
  // incarce efectiv conversatia (browserul nu duce la bun sfarsit toate tab-urile deschise deodata),
  // deci NU marcam "trimis" doar pentru ca window.open() a reusit sa creeze fereastra. Marcarea reala
  // se face abia dupa ce adminul confirma manual, per contact sau in bloc.
  const [pendingConfirm, setPendingConfirm] = useState<Target[]>([]);

  const [templateSubject, setTemplateSubject] = useState('');
  const [templateMessage, setTemplateMessage] = useState('');
  const [savedSubject, setSavedSubject] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [templateEditing, setTemplateEditing] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateSaving, setTemplateSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/outreach/microsite-pitch')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setDailySent(d.dailySent ?? 0);
        setDailyLimit(d.dailyLimit ?? 100);
        setLoading(false);
      });
  };

  const loadTemplate = () => {
    setTemplateLoading(true);
    fetch('/api/admin/outreach/templates?type=microsite_pitch')
      .then(r => r.json())
      .then(d => {
        setTemplateSubject(d.subject || '');
        setTemplateMessage(d.message || '');
        setSavedSubject(d.subject || '');
        setSavedMessage(d.message || '');
        setTemplateLoading(false);
      });
  };

  useEffect(() => { load(); loadTemplate(); }, []);

  const cancelEditTemplate = () => {
    setTemplateSubject(savedSubject);
    setTemplateMessage(savedMessage);
    setTemplateEditing(false);
  };

  const saveTemplate = async () => {
    setTemplateSaving(true);
    try {
      const r = await fetch('/api/admin/outreach/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'microsite_pitch', subject: templateSubject, message: templateMessage }),
      });
      const d = await r.json();
      setSavedSubject(d.subject || '');
      setSavedMessage(d.message || '');
      setTemplateSubject(d.subject || '');
      setTemplateMessage(d.message || '');
      setTemplateEditing(false);
    } catch { /* ignore */ }
    setTemplateSaving(false);
  };

  const applyLocally = (type: string, id: number, patch: Partial<Target>) => {
    setData(prev => ({
      ...prev,
      [type]: (prev[type] || []).map(t => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const sendEmail = async (t: Target) => {
    if (!t.email || sendingId === t.id) return;
    setSendingId(t.id);
    setSendError(null);
    try {
      const r = await fetch('/api/admin/outreach/microsite-pitch/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listings: [{ id: t.id, type: t.listing_type, name: t.name, email: t.email, clicks: t.view_count, category: t.category }] }),
      });
      const d = await r.json();
      if (d.sent > 0) {
        applyLocally(t.listing_type, t.id, { email_sent_at: Date.now() });
        setDailySent(d.dailySent ?? dailySent + 1);
        setSelected(prev => { const next = new Set(prev); next.delete(keyOf(t)); return next; });
      } else {
        setSendError(d.results?.[0]?.error || 'Eroare la trimitere');
      }
    } catch {
      setSendError('Eroare la trimitere');
    }
    setSendingId(null);
  };

  const markWaSent = async (t: Target, sent: boolean) => {
    applyLocally(t.listing_type, t.id, { whatsapp_sent_at: sent ? Date.now() : null });
    try {
      await fetch('/api/admin/outreach/microsite-pitch/mark-whatsapp-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_type: t.listing_type, listing_id: t.id, sent }),
      });
    } catch { /* stare optimista, refresh de pagina resincronizeaza */ }
  };

  const addPending = (targets: Target[]) => {
    setPendingConfirm(prev => {
      const existingKeys = new Set(prev.map(keyOf));
      const toAdd = targets.filter(t => !existingKeys.has(keyOf(t)));
      return [...prev, ...toAdd];
    });
  };

  const confirmPendingSent = (t: Target) => {
    markWaSent(t, true);
    setPendingConfirm(prev => prev.filter(p => keyOf(p) !== keyOf(t)));
  };

  const confirmPendingNotSent = (t: Target) => {
    setPendingConfirm(prev => prev.filter(p => keyOf(p) !== keyOf(t)));
  };

  const confirmAllPendingSent = () => {
    pendingConfirm.forEach(t => markWaSent(t, true));
    setPendingConfirm([]);
  };

  const discardAllPending = () => {
    setPendingConfirm([]);
  };

  const sendWa = (t: Target) => {
    if (!t.phone) return;
    window.open(micrositeWaLink(t.phone, t.name, t.link), '_blank');
    addPending([t]);
    setSelected(prev => { const next = new Set(prev); next.delete(keyOf(t)); return next; });
  };

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = (keys: string[]) => {
    setSelected(prev => {
      const allSelected = keys.length > 0 && keys.every(k => prev.has(k));
      const next = new Set(prev);
      if (allSelected) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const changeListingType = (v: string) => {
    setListingType(v);
    setSelected(new Set());
    setBulkInfo(null);
  };

  if (loading) return <p className="text-[var(--color-text-light)] py-8 text-center">Se încarcă...</p>;

  const items = data[listingType] || [];
  const todayStartMs = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const filtered = items.filter(t => {
    if (t.opted_out) return false;
    if (filter === 'no_email') return !t.email_sent_at;
    if (filter === 'no_wa') return !t.whatsapp_sent_at;
    if (filter === 'done') return !!t.email_sent_at || !!t.whatsapp_sent_at;
    if (filter === 'today') return (!!t.email_sent_at && t.email_sent_at >= todayStartMs) || (!!t.whatsapp_sent_at && t.whatsapp_sent_at >= todayStartMs);
    return true;
  });
  // "Contactate"/"Trimis azi" au sens doar sortate dupa cel mai recent trimis (nu dupa click-uri,
  // ordinea implicita a listei) - altfel cele trimise azi sunt imprastiate printre cele vechi.
  if (filter === 'done' || filter === 'today') {
    filtered.sort((a, b) => Math.max(b.email_sent_at || 0, b.whatsapp_sent_at || 0) - Math.max(a.email_sent_at || 0, a.whatsapp_sent_at || 0));
  }

  const filteredKeys = filtered.map(keyOf);
  const allFilteredSelected = filteredKeys.length > 0 && filteredKeys.every(k => selected.has(k));
  const pendingKeys = new Set(pendingConfirm.map(keyOf));
  const selectedInView = filtered.filter(t => selected.has(keyOf(t)));
  const selectedEmailTargets = selectedInView.filter(t => t.email && !t.email_sent_at);
  const selectedWaTargets = selectedInView.filter(t => t.phone && !t.whatsapp_sent_at && !pendingKeys.has(keyOf(t)));

  // Loturi WhatsApp de cate BATCH_SIZE, calculate din lista curenta (fara sa fie nevoie de
  // selectie manuala) - acelasi rol ca loturile din WaOutreach.tsx/FbOutreach.tsx. Exclude si
  // contactele aflate deja in coada de confirmare, ca sa nu apara in doua loturi deodata.
  const waEligible = filtered.filter(t => t.phone && !t.whatsapp_sent_at && !pendingKeys.has(keyOf(t)));
  const waBatches: Target[][] = [];
  for (let i = 0; i < waEligible.length; i += BATCH_SIZE) {
    waBatches.push(waEligible.slice(i, i + BATCH_SIZE));
  }

  // Trimitere reala prin API (Resend) intr-un singur request cu toate listarile selectate - ruta
  // deja accepta un array `listings`, folosit pana acum doar cu un singur element per click.
  const bulkSendEmail = async () => {
    if (selectedEmailTargets.length === 0 || bulkSendingEmail) return;
    setBulkSendingEmail(true);
    setSendError(null);
    setBulkInfo(null);
    try {
      const r = await fetch('/api/admin/outreach/microsite-pitch/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listings: selectedEmailTargets.map(t => ({ id: t.id, type: t.listing_type, name: t.name, email: t.email, clicks: t.view_count, category: t.category })),
        }),
      });
      const d = await r.json();
      const results: { name: string; success: boolean; error?: string }[] = d.results || [];
      const succeededKeys = new Set<string>();
      results.forEach((res, i) => {
        const t = selectedEmailTargets[i];
        if (!t) return;
        if (res.success) {
          applyLocally(t.listing_type, t.id, { email_sent_at: Date.now() });
          succeededKeys.add(keyOf(t));
        }
      });
      setSelected(prev => {
        const next = new Set(prev);
        succeededKeys.forEach(k => next.delete(k));
        return next;
      });
      setDailySent(d.dailySent ?? dailySent);
      const failed = results.filter(res => !res.success);
      setBulkInfo(`${d.sent ?? 0} email-uri trimise${failed.length ? `, ${failed.length} eșuate` : ''}.`);
      if (failed.length) setSendError(failed.map(f => `${f.name}: ${f.error || 'eroare'}`).join(' · '));
    } catch {
      setSendError('Eroare la trimiterea în bulk');
    }
    setBulkSendingEmail(false);
  };

  // Deschide fiecare conversatie WhatsApp intr-un tab nou, sincron (fara setTimeout) - browserul
  // permite mai multe window.open() consecutive doar cat timp raman in acelasi handler de click,
  // orice apel amanat (async) pierde privilegiul si e blocat aproape sigur.
  const bulkSendWa = () => {
    if (selectedWaTargets.length === 0) return;
    // Se deschid cel mult BATCH_SIZE deodata chiar daca sunt mai multe selectate - WhatsApp Web nu
    // tine sesiuni multiple simultane (vezi comentariul de la BATCH_SIZE), restul raman selectate
    // pentru un click urmator.
    const toOpen = selectedWaTargets.slice(0, BATCH_SIZE);
    let blocked = 0;
    const opened: Target[] = [];
    toOpen.forEach(t => {
      const win = window.open(micrositeWaLink(t.phone as string, t.name, t.link), '_blank');
      if (win) {
        opened.push(t);
        setSelected(prev => { const next = new Set(prev); next.delete(keyOf(t)); return next; });
      } else {
        blocked++;
      }
    });
    if (opened.length > 0) addPending(opened);
    const remaining = selectedWaTargets.length - toOpen.length;
    const remainingMsg = remaining > 0 ? ` Mai sunt ${remaining} selectate, apasă din nou pentru următoarele.` : '';
    if (blocked > 0) {
      setBulkInfo(`${opened.length} conversații WhatsApp deschise, ${blocked} blocate de browser — permite ferestre pop-up pentru acest site (iconița din bara de adrese) și încearcă din nou pentru restul. Verifică jos care s-au încărcat efectiv înainte de a confirma trimiterea.${remainingMsg}`);
    } else {
      setBulkInfo(`${opened.length} conversații WhatsApp deschise într-un tab nou. Verifică jos care s-au încărcat efectiv înainte de a confirma trimiterea.${remainingMsg}`);
    }
  };

  // Trimite un lot intreg (BATCH_SIZE) fara selectie manuala prealabila - acelasi principiu
  // sincron (fara setTimeout) ca bulkSendWa, doar ca lotul e precalculat, nu ales din checkbox-uri.
  const sendWaBatch = (batch: Target[]) => {
    let blocked = 0;
    const opened: Target[] = [];
    batch.forEach(t => {
      const win = window.open(micrositeWaLink(t.phone as string, t.name, t.link), '_blank');
      if (win) {
        opened.push(t);
      } else {
        blocked++;
      }
    });
    if (opened.length > 0) addPending(opened);
    if (blocked > 0) {
      setBulkInfo(`${opened.length} conversații WhatsApp deschise, ${blocked} blocate de browser — permite ferestre pop-up pentru acest site (iconița din bara de adrese) și încearcă din nou pentru restul. Verifică jos care s-au încărcat efectiv înainte de a confirma trimiterea.`);
    } else {
      setBulkInfo(`${opened.length} conversații WhatsApp deschise într-un tab nou (lot). Verifică jos care s-au încărcat efectiv înainte de a confirma trimiterea.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">🌐 Pachet site de prezentare (50 lei)</h2>
          <p className="text-xs text-[var(--color-text-light)] mt-1">
            Instituții fără website propriu și fără microsite deja creat. Pachet ad-hoc — nu apare pe pagina /promovare, doar pentru acest outreach targetat.
          </p>
        </div>
        <span className="text-sm text-[var(--color-text-light)]">
          <span className="text-[var(--color-text-main)] font-semibold">{dailySent}</span>/{dailyLimit} email-uri trimise azi (total, ambele campanii)
        </span>
      </div>

      {sendError && (
        <div className="bg-red-100 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-800">{sendError}</div>
      )}
      {bulkInfo && (
        <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl px-4 py-3 text-sm text-[var(--color-text-main)]">{bulkInfo}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {LISTING_TYPES.map(lt => (
          <button
            key={lt.v}
            onClick={() => changeListingType(lt.v)}
            className={`px-3 py-1.5 text-sm rounded-full border ${listingType === lt.v ? 'bg-teal-600 text-white border-teal-600' : 'border-[var(--color-border)] text-[var(--color-text-light)]'}`}
          >
            {lt.label} ({(data[lt.v] || []).length})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { v: 'all', l: 'Toate' },
          { v: 'no_email', l: 'Fără email trimis' },
          { v: 'no_wa', l: 'Fără WhatsApp trimis' },
          { v: 'today', l: 'Trimis azi' },
          { v: 'done', l: 'Contactate' },
        ] as { v: Filter; l: string }[]).map(f => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`px-3 py-1 text-xs rounded-full border ${filter === f.v ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-light)]'}`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* Template email */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[var(--color-text-main)]">Șablon email</h3>
          {!templateLoading && (
            templateEditing ? (
              <div className="flex items-center gap-3">
                <button onClick={cancelEditTemplate} className="text-xs text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">Anulează</button>
                <button onClick={saveTemplate} disabled={templateSaving} className="text-xs text-[var(--color-primary)] hover:underline font-medium">
                  {templateSaving ? 'Se salvează...' : 'Salvează'}
                </button>
              </div>
            ) : (
              <button onClick={() => setTemplateEditing(true)} className="text-xs text-[var(--color-primary)] hover:underline">Editează textul</button>
            )
          )}
        </div>
        {templateLoading ? (
          <p className="text-xs text-[var(--color-text-light)]">Se încarcă...</p>
        ) : templateEditing ? (
          <div className="space-y-2">
            <input
              value={templateSubject}
              onChange={e => setTemplateSubject(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900"
              placeholder="Subiect"
            />
            <textarea
              value={templateMessage}
              onChange={e => setTemplateMessage(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900"
            />
          </div>
        ) : (
          <>
            <p className="text-xs font-medium text-[var(--color-text-main)]">{savedSubject}</p>
            <p className="text-xs text-[var(--color-text-light)] whitespace-pre-line mt-1">{savedMessage}</p>
          </>
        )}
        <p className="text-xs text-[var(--color-text-light)] mt-2">Folosește <code>{'{nume}'}</code> — se înlocuiește automat cu numele fiecărei instituții.</p>
      </div>

      {/* Bara actiuni bulk - apare doar cand exista selectie in lista vizibila */}
      {selectedInView.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-[var(--color-card)] border border-[var(--color-primary)] rounded-xl px-4 py-3">
          <span className="text-sm text-[var(--color-text-main)] font-medium">{selectedInView.length} selectate</span>
          <button
            onClick={bulkSendEmail}
            disabled={selectedEmailTargets.length === 0 || bulkSendingEmail}
            className="text-xs bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg disabled:opacity-40"
          >
            {bulkSendingEmail ? 'Se trimite...' : `✉️ Trimite email la ${selectedEmailTargets.length}`}
          </button>
          <button
            onClick={bulkSendWa}
            disabled={selectedWaTargets.length === 0}
            className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-40"
          >
            📱 Deschide WhatsApp pentru {Math.min(selectedWaTargets.length, BATCH_SIZE)}{selectedWaTargets.length > BATCH_SIZE ? ` din ${selectedWaTargets.length}` : ''}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-[var(--color-text-light)] hover:text-[var(--color-text-main)] ml-auto">
            Deselectează tot
          </button>
        </div>
      )}

      {/* Confirmare trimitere WhatsApp - fereastra deschisa nu inseamna neaparat mesaj trimis,
          asa ca aici se confirma manual, per contact sau in bloc, inainte sa se scrie in DB */}
      {pendingConfirm.length > 0 && (
        <div className="bg-amber-100 border border-amber-400 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
              ⏳ {pendingConfirm.length} conversații deschise, neconfirmate
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={confirmAllPendingSent} className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-600">
                ✅ Am trimis toate ({pendingConfirm.length})
              </button>
              <button onClick={discardAllPending} className="text-xs text-[var(--color-text-light)] hover:text-[var(--color-text-main)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg">
                Niciuna trimisă, renunță
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-light)]">
            Verifică fiecare tab deschis (unele s-ar putea să nu se fi încărcat) și confirmă individual, sau folosește butonul de mai sus dacă știi sigur că toate au plecat.
          </p>
          <div className="max-h-48 overflow-y-auto divide-y divide-[var(--color-border)]">
            {pendingConfirm.map(t => (
              <div key={keyOf(t)} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="text-[var(--color-text-main)] truncate">{t.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => confirmPendingSent(t)} className="text-xs bg-green-700 text-white px-2 py-1 rounded-lg hover:bg-green-600">
                    ✅ Trimis
                  </button>
                  <button onClick={() => confirmPendingNotSent(t)} className="text-xs bg-[var(--color-border)] text-[var(--color-text-light)] px-2 py-1 rounded-lg hover:text-[var(--color-text-main)]">
                    ❌ Nu s-a încărcat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loturi WhatsApp - deschide cate BATCH_SIZE conversatii dintr-o data, fara sa bifezi manual */}
      {waBatches.length > 0 && (
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-main)] mb-1">📱 Loturi WhatsApp (câte {BATCH_SIZE})</h3>
          <p className="text-xs text-[var(--color-text-light)] mb-3">
            Deschide pe rând câte {BATCH_SIZE} conversații WhatsApp din lista curentă (fără WhatsApp trimis deja), fără să selectezi manual fiecare rând.
          </p>
          <div className="flex flex-wrap gap-2">
            {waBatches.map((batch, i) => (
              <button
                key={i}
                onClick={() => sendWaBatch(batch)}
                className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-600"
              >
                📱 Lot {i + 1} ({batch.length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] text-xs text-[var(--color-text-light)]">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={() => toggleSelectAll(filteredKeys)}
            className="w-4 h-4"
          />
          <span>Selectează tot ({filtered.length})</span>
        </div>
        <div className="max-h-[32rem] overflow-y-auto divide-y divide-[var(--color-border)]">
          {filtered.map(t => {
            const key = keyOf(t);
            return (
              <div key={key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggleSelect(key)}
                    className="w-4 h-4 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-text-main)] font-medium truncate">{t.name}</span>
                      {t.category && <span className="text-xs text-[var(--color-text-light)]">{t.category}</span>}
                    </div>
                    <div className="text-xs text-[var(--color-text-light)] flex items-center gap-2 mt-0.5">
                      {t.phone && <span>{t.phone}</span>}
                      {t.email && <span className="truncate">{t.email}</span>}
                      <span>{t.view_count} click-uri</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.email_sent_at ? (
                    <span className="text-xs text-green-600">✅ email {new Date(t.email_sent_at).toLocaleDateString('ro-RO')} {new Date(t.email_sent_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                  ) : (
                    <button
                      onClick={() => sendEmail(t)}
                      disabled={!t.email || sendingId === t.id}
                      className="text-xs bg-[var(--color-primary)] text-white px-2.5 py-1 rounded-lg disabled:opacity-40"
                    >
                      {sendingId === t.id ? '...' : '✉️ Trimite'}
                    </button>
                  )}
                  {t.whatsapp_sent_at ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-green-600">✅ WA {new Date(t.whatsapp_sent_at).toLocaleDateString('ro-RO')} {new Date(t.whatsapp_sent_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                      <button onClick={() => markWaSent(t, false)} className="text-[var(--color-text-light)] hover:text-[var(--color-text-main)]" title="Anulează marcajul">↺</button>
                    </div>
                  ) : pendingKeys.has(key) ? (
                    <span className="text-xs text-amber-600">⏳ neconfirmat</span>
                  ) : (
                    <button
                      onClick={() => sendWa(t)}
                      disabled={!t.phone}
                      className="text-xs bg-green-700 text-white px-2.5 py-1 rounded-lg disabled:opacity-40"
                    >
                      📱 WhatsApp
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-[var(--color-text-light)] px-4 py-6 text-center">Niciun rezultat pentru acest filtru.</p>}
        </div>
      </div>
    </div>
  );
}
