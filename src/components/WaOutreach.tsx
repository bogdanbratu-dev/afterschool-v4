'use client';
import { useState, useEffect } from 'react';

interface Lead {
  id: number;
  name: string;
  phone: string;
  source: string;
  listingType: string;
  link?: string;
  sentAt: number | null;
}

interface GroupData {
  label: string;
  items: Lead[];
}

const BATCH_SIZE = 10;
const TEMPLATE_STORAGE_KEY = 'wa_outreach_templates_v1';

function premiumPromoText(): string {
  return 'Planul Premium costă 100 RON pentru 3 luni.';
}

function defaultTemplate(groupKey: string, groupLabel: string): string {
  if (groupKey === 'legacy_offer_claimed_users') {
    return `Bună ziua, îmi cer scuze de deranj. Vă scriu de la activkids.ro, unde {name} este deja listată.\n\nAm observat că v-ați făcut cont ca să aveți acces la listare, vă mulțumesc pentru asta.\n\nDacă vreți și mai multă vizibilitate, avem și un plan Premium: poziție prioritară în rezultate, badge, statistici de vizite și acces la catalogul nostru de colaboratori (psihologi, logopezi, meditatori etc.). ${premiumPromoText()}\n\nAici găsiți tot ce include Premium: activkids.ro/promovare\n\nDacă vă interesează, răspundeți-mi aici sau sunați-mă la 0747 646 543.`;
  }
  if (groupKey.startsWith('afterschool_')) {
    return `Bună ziua, îmi cer scuze de deranj. Mă numesc Bogdan Bratu și vă contactez de la activkids.ro, un site unde părinții din București caută afterschooluri și activități pentru copii.\n\nCred că afterschool-ul {name} s-ar potrivi foarte bine audienței noastre și aș vrea să vă listez, gratuit. Dacă am acordul dvs., confirmarea se face pe o pagină scurtă, bifați acordul cu termenii și primiți acces gratuit direct: {link}\n\nRămâne gratuit oricând, fără nicio obligație. Dacă vreți și mai multă vizibilitate, avem și un plan Premium: poziție prioritară în rezultate, badge, statistici de vizite. Am lansat de curând și o secțiune cu circumscripțiile școlare din București, unde părinții caută școala arondată adresei lor și văd automat afterschool-urile din apropiere, pe o rază de 2 km, iar partenerii Premium apar primii în acea listă. Premium include și acces la catalogul nostru de colaboratori (psihologi, logopezi, meditatori etc.), de unde puteți găsi voi înșivă specialiști pentru afterschool. ${premiumPromoText()}\n\nDacă aveți întrebări sau orice idee, sunați-mă cu încredere la 0747 646 543.`;
  }
  if (groupKey === 'caterer_all') {
    return `Bună ziua, îmi cer scuze de deranj. Mă numesc Bogdan Bratu și vă contactez de la activkids.ro. Am listate peste 400 de afterschooluri și peste 300 de grădinițe private din București, care ar putea căuta furnizori de mâncare pentru copii.\n\nCred că {name} s-ar potrivi bine pentru multe dintre ele și v-aș vrea să vă recomand personal: pentru 150 lei vă trimit o prezentare a dvs., cu propunere de colaborare, către toată rețeaua de afterschooluri și grădinițe (sau doar către zona care vă interesează, dacă livrați limitat), plus o listare Premium pe 6 luni pe activkids.ro.\n\nDacă vă interesează, răspundeți-mi aici sau sunați-mă la 0747 646 543.`;
  }
  return `Bună ziua, îmi cer scuze de deranj.\n\nSunt Bogdan și administrez activkids.ro, un portal unde părinții din București caută afterschooluri și activități pentru copii.\n\nCred că {name} s-ar potrivi bine audienței noastre și aș vrea să vă listez, gratuit, cu poze, program și prețuri, iar dacă vreți, puteți apărea și în topul căutărilor.\n\nDacă am acordul dvs., răspundeți-mi aici sau sunați-mă la 0747 646 543 și vă trimit linkul de confirmare. Sunt disponibil oricând pentru întrebări.`;
}

function buildWaUrl(phone: string, name: string, link: string | undefined, template: string): string | null {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('0') && digits.length === 10 ? '40' + digits.slice(1)
    : digits.startsWith('40') && digits.length === 11 ? digits : digits;
  if (normalized.length < 10) return null;
  const msg = template.replaceAll('{name}', name).replaceAll('{link}', link || 'activkids.ro/promovare');
  // web.whatsapp.com in loc de wa.me: wa.me redirecteaza spre api.whatsapp.com, care declanseaza
  // dialogul "Open WhatsApp?" al browserului daca ai aplicatia desktop instalata - dialogul e modal
  // per-fereastra si browserul rezolva interactiv doar unul deodata, deci la deschiderea mai multor
  // tab-uri simultan (batch send) doar unul ajunge sa se deschida cu adevarat. web.whatsapp.com/send
  // duce direct in clientul web, fara sa mai treaca prin acel handoff.
  return `https://web.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(msg)}`;
}

export default function WaOutreach() {
  const [groups, setGroups] = useState<Record<string, GroupData>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [editingTemplate, setEditingTemplate] = useState(false);

  const load = () => {
    fetch('/api/admin/outreach/whatsapp-leads')
      .then(r => r.json())
      .then(d => {
        setGroups(d.groups || {});
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    try {
      const storedTemplates = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (storedTemplates) setTemplates(JSON.parse(storedTemplates));
    } catch { /* ignore */ }
  }, []);

  const groupKeys = Object.keys(groups).sort((a, b) => groups[a].label.localeCompare(groups[b].label));

  const currentGroup = selectedGroup ? groups[selectedGroup] : null;
  const currentTemplate = (selectedGroup && templates[selectedGroup]) || (currentGroup && selectedGroup ? defaultTemplate(selectedGroup, currentGroup.label) : '');

  const batches: Lead[][] = [];
  if (currentGroup) {
    for (let i = 0; i < currentGroup.items.length; i += BATCH_SIZE) {
      batches.push(currentGroup.items.slice(i, i + BATCH_SIZE));
    }
  }

  // "trimis" e acum legat de contact (listingType + id), persistat server-side in
  // outreach_contacts.whatsapp_sent_at - nu mai e tinut in localStorage pe indexul batch-ului.
  // Vechiul sistem arata batch-uri deja trimise ca "netrimise" de fiecare data cand ordinea
  // randurilor din DB se schimba (query-urile sursa nu aveau ORDER BY), pentru ca acelasi index
  // ajungea sa insemne alt contact.
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const sentToday = Object.values(groups).reduce(
    (acc, g) => acc + g.items.filter(l => l.sentAt && l.sentAt >= todayStart.getTime()).length,
    0
  );

  const saveTemplate = (text: string) => {
    if (!selectedGroup) return;
    const updated = { ...templates, [selectedGroup]: text };
    setTemplates(updated);
    try { localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  // Sterge textul salvat local pt. acest grup, ca sa revina la defaultTemplate() curent -
  // necesar dupa ce actualizam textul implicit in cod, altfel ramane blocat pe versiunea veche
  // salvata in browser.
  const resetTemplate = () => {
    if (!selectedGroup) return;
    const updated = { ...templates };
    delete updated[selectedGroup];
    setTemplates(updated);
    try { localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const applySentLocally = (leadId: number, listingType: string, sentAt: number | null) => {
    setGroups(prev => {
      const updated: Record<string, GroupData> = {};
      for (const key in prev) {
        updated[key] = {
          ...prev[key],
          items: prev[key].items.map(l => (l.id === leadId && l.listingType === listingType ? { ...l, sentAt } : l)),
        };
      }
      return updated;
    });
  };

  const markSent = async (lead: Lead, sent: boolean) => {
    applySentLocally(lead.id, lead.listingType, sent ? Date.now() : null);
    try {
      await fetch('/api/admin/outreach/whatsapp-leads/mark-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_type: lead.listingType, listing_id: lead.id, sent }),
      });
    } catch { /* starea locala ramane optimista; urmatorul refresh de pagina resincronizeaza */ }
  };

  const sendLead = (lead: Lead) => {
    const url = buildWaUrl(lead.phone, lead.name, lead.link, currentTemplate);
    if (url) window.open(url, '_blank');
    markSent(lead, true);
  };

  const sendBatch = (batch: Lead[]) => {
    const unsent = batch.filter(l => !l.sentAt);
    if (unsent.length === 0) return;
    unsent.forEach(l => {
      const url = buildWaUrl(l.phone, l.name, l.link, currentTemplate);
      if (url) window.open(url, '_blank');
      markSent(l, true);
    });
    alert(`${unsent.length} tab-uri WhatsApp deschise. Dacă browserul a blocat popup-urile, permite-le și încearcă din nou.`);
  };

  if (loading) return <p className="text-[var(--color-text-light)] py-8 text-center">Se încarcă...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-text-main)]">📱 Outreach WhatsApp</h2>
        <span className="text-sm text-[var(--color-text-light)]">
          <span className="text-[var(--color-text-main)] font-semibold">{sentToday}</span> mesaje trimise azi
        </span>
      </div>

      {sentToday > 30 && (
        <div className="bg-amber-100 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
          ⚠️ Ai trimis {sentToday} mesaje azi. Ai grijă la limita zilnică pentru siguranța contului de WhatsApp.
        </div>
      )}

      {/* Selector categorie */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-4">
        <p className="text-sm text-[var(--color-text-light)] mb-3">Alege o categorie — fiecare are propriul set de batch-uri și propriul text de mesaj:</p>
        <div className="flex flex-wrap gap-2">
          {groupKeys.map(key => (
            <button
              key={key}
              onClick={() => setSelectedGroup(key)}
              className={`px-3 py-1.5 text-sm rounded-full border ${selectedGroup === key ? 'bg-green-700 text-white border-green-700' : 'border-[var(--color-border)] text-[var(--color-text-light)]'}`}
            >
              {groups[key].label} ({groups[key].items.filter(l => !l.sentAt).length}/{groups[key].items.length})
            </button>
          ))}
          {groupKeys.length === 0 && <p className="text-sm text-[var(--color-text-light)]">Niciun contact cu telefon găsit.</p>}
        </div>
      </div>

      {currentGroup && (
        <>
          {/* Mesaj / template */}
          <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-main)]">Text mesaj — {currentGroup.label}</h3>
              <div className="flex items-center gap-3">
                {templates[selectedGroup!] !== undefined && (
                  <button onClick={resetTemplate} className="text-xs text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">
                    ↺ Resetează la text implicit
                  </button>
                )}
                <button onClick={() => setEditingTemplate(v => !v)} className="text-xs text-[var(--color-primary)] hover:underline">
                  {editingTemplate ? 'Ascunde editare' : 'Editează textul'}
                </button>
              </div>
            </div>
            {editingTemplate ? (
              <textarea
                value={currentTemplate}
                onChange={e => saveTemplate(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900"
              />
            ) : (
              <p className="text-xs text-[var(--color-text-light)] whitespace-pre-line">{currentTemplate}</p>
            )}
            <p className="text-xs text-[var(--color-text-light)] mt-2">Folosește <code>{'{name}'}</code> — se înlocuiește automat cu numele fiecărui contact{selectedGroup?.startsWith('afterschool_') ? <> și <code>{'{link}'}</code> — linkul unic de confirmare a listării</> : null}.</p>
          </div>

          {/* Batch-uri */}
          <div className="space-y-3">
            {batches.map((batch, idx) => {
              const sentCount = batch.filter(l => l.sentAt).length;
              const allSent = sentCount === batch.length;
              return (
                <div key={idx} className={`bg-[var(--color-card)] border rounded-xl overflow-hidden ${allSent ? 'border-green-700/40 opacity-80' : 'border-[var(--color-border)]'}`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] flex-wrap gap-2">
                    <div>
                      <span className="font-semibold text-[var(--color-text-main)]">📦 Batch {idx + 1}</span>
                      <span className="text-[var(--color-text-light)] text-xs ml-2">— {sentCount}/{batch.length} trimise</span>
                    </div>
                    <button
                      onClick={() => sendBatch(batch)}
                      disabled={allSent}
                      className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                    >
                      {sentCount > 0 ? '📱 Trimite restul' : '📱 Trimite batch'}
                    </button>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                    {batch.map(l => (
                      <div key={`${l.listingType}_${l.id}`} className="flex items-center justify-between gap-2 text-xs px-2 py-1 rounded bg-black/5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[var(--color-text-main)] truncate max-w-[120px]">{l.name}</span>
                          <span className="text-[var(--color-text-light)] shrink-0">{l.phone}</span>
                        </div>
                        {l.sentAt ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-green-600">✅ {new Date(l.sentAt).toLocaleDateString('ro-RO')}</span>
                            <button onClick={() => markSent(l, false)} className="text-[var(--color-text-light)] hover:text-[var(--color-text-main)]" title="Anulează marcajul de trimis">↺</button>
                          </div>
                        ) : (
                          <button onClick={() => sendLead(l)} className="shrink-0 text-green-700 hover:underline font-medium">📱 Trimite</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {batches.length === 0 && <p className="text-sm text-[var(--color-text-light)]">Niciun contact în această categorie.</p>}
          </div>
        </>
      )}
    </div>
  );
}
