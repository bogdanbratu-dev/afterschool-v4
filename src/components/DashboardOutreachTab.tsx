"use client";
import { useState, useEffect, useMemo } from "react";
import { PROFESSIONAL_CATEGORY_LABELS, type ProfessionalCategory } from "@/lib/professionals";

interface Item {
  id: number; name: string; sector?: number | null; category?: string | null; neighborhood?: string | null;
  email: string; phone: string | null;
  outreach_status: string | null; email_sent_at: number | null;
}

interface GroupData { count: number; items: Item[] }

interface SavedBatch {
  id: number; name: string; filterType: 'sector' | 'neighborhood'; values: string[]; count: number; items: Item[];
}

interface OwnLocation { sector: string | null; neighborhood: string | null }

type SendResult = { name: string; success: boolean; error?: string };

interface ReportData { totalSent: number; delivered: number; bounced: number; pending: number }

const ENDPOINTS: Record<string, string> = {
  professional: '/api/user/outreach/professionals',
  afterschool: '/api/user/outreach/afterschools',
  kindergarten: '/api/user/outreach/kindergartens',
};
const TARGET_NOUNS: Record<string, string> = {
  professional: 'colaboratori', afterschool: 'afterschooluri', kindergarten: 'gradinite',
};
const TAB_TITLES: Record<string, string> = {
  professional: 'Gaseste colaboratori', afterschool: 'Abordeaza afterschooluri', kindergarten: 'Abordeaza gradinite',
};

// targetType: pe cine abordam.
//  'afterschool' -> grupare pe sector SAU cartier (folosit de colaboratori / caterers)
//  'professional' -> grupare pe categorie (folosit de afterschooluri)
//  'kindergarten' -> grupare pe sector SAU cartier (folosit de caterers, optional alaturi de 'afterschool')
// allowRequests: arata butonul "+ Cerere" (propunere de colaborare 1-la-1). Are sens doar
// intre afterschool <-> profesionist, NU pt. expeditori de campanii bulk (caterer/club/gradinita).
//
// Selectia de grupuri (sectoare/cartiere) e multi-select: apesi pe mai multe carduri, se aduna
// (uniune, deduplicat dupa id) intr-un singur batch de trimis. 'toate' e exclusiv - selectarea lui
// goleste restul selectiei, si invers.
export default function OutreachTab({ targetType, allowRequests = true }: { targetType: 'afterschool' | 'professional' | 'kindergarten'; allowRequests?: boolean }) {
  const [sectors, setSectors] = useState<Record<string, GroupData> | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<Record<string, GroupData> | null>(null);
  const [categories, setCategories] = useState<Record<string, GroupData> | null>(null);
  const [ownLocation, setOwnLocation] = useState<OwnLocation | null>(null);
  const [batches, setBatches] = useState<SavedBatch[]>([]);
  const [groupBy, setGroupBy] = useState<'sector' | 'neighborhood'>('sector');
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dailySent, setDailySent] = useState(0);
  const [reqState, setReqState] = useState<Record<number, 'sending' | 'sent' | 'error'>>({});
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchFilterType, setNewBatchFilterType] = useState<'sector' | 'neighborhood'>('sector');
  const [newBatchValues, setNewBatchValues] = useState<Set<string>>(new Set());
  const [savingBatch, setSavingBatch] = useState(false);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateMessage, setTemplateMessage] = useState('');
  const [savedSubject, setSavedSubject] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [templateIsCustom, setTemplateIsCustom] = useState(false);
  const [templateSenderName, setTemplateSenderName] = useState('');
  const [templateContactName, setTemplateContactName] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateEditing, setTemplateEditing] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [excludeContacted, setExcludeContacted] = useState(true);
  const DAILY_LIMIT = 100;

  const isPro = targetType === 'professional';
  const showLocationFeatures = !isPro;
  const endpoint = ENDPOINTS[targetType];
  const targetNoun = TARGET_NOUNS[targetType];

  const groups = isPro ? categories : (groupBy === 'neighborhood' ? neighborhoods : sectors);

  const groupLabel = (key: string) => {
    if (key === 'toate') return 'Tot Bucureștiul';
    if (isPro) return PROFESSIONAL_CATEGORY_LABELS[key as ProfessionalCategory] || key;
    if (groupBy === 'neighborhood') return key === 'necunoscut' ? 'Cartier necunoscut' : key;
    if (key === '0') return 'Ilfov / fara sector';
    return `Sectorul ${key}`;
  };
  const groupShort = (key: string) => {
    if (key === 'toate') return 'Toate';
    if (isPro) return (PROFESSIONAL_CATEGORY_LABELS[key as ProfessionalCategory] || key).split(' ')[0];
    if (groupBy === 'neighborhood') return key === 'necunoscut' ? 'Necunoscut' : key;
    if (key === '0') return 'Ilfov';
    return `S${key}`;
  };

  const load = async () => {
    setLoading(true);
    const r = await fetch(endpoint);
    if (r.ok) {
      const d = await r.json();
      if (isPro) {
        setCategories(d.categories);
      } else {
        setSectors(d.sectors);
        setNeighborhoods(d.neighborhoods);
        setOwnLocation(d.ownLocation ?? null);
        setBatches(d.batches ?? []);
      }
      setDailySent(d.dailySent ?? 0);
    }
    setLoading(false);
  };

  const loadReport = async () => {
    setReportLoading(true);
    try {
      const r = await fetch('/api/user/outreach/report');
      if (r.ok) setReport(await r.json());
    } finally { setReportLoading(false); }
  };

  useEffect(() => {
    setSelectedKeys(new Set()); setSelectedBatchId(null); setGroupBy('sector');
    load(); loadReport();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [targetType]);

  // Sablonul de email e al partenerului, nu al tab-ului curent (afterschool/profesionist/gradinita) -
  // se incarca o singura data, nu se reincarca la schimbarea sub-tab-ului.
  const loadTemplate = async () => {
    setTemplateLoading(true);
    try {
      const r = await fetch('/api/user/outreach/template');
      if (r.ok) {
        const d = await r.json();
        setTemplateSubject(d.subject); setSavedSubject(d.subject);
        setTemplateMessage(d.message); setSavedMessage(d.message);
        setTemplateIsCustom(d.isCustom);
        setTemplateSenderName(d.senderName ?? '');
        setTemplateContactName(d.contactName ?? null);
        setAttachmentUrl(d.attachmentUrl ?? null);
        setAttachmentName(d.attachmentName ?? null);
      }
    } finally { setTemplateLoading(false); }
  };

  const ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const uploadAttachment = async (file: File) => {
    setAttachmentError(null);
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachmentError('Format nesuportat — foloseste PDF, Word sau o imagine.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAttachmentError('Fisierul este prea mare (max 8MB).');
      return;
    }
    setAttachmentUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'attachment');
      const up = await fetch('/api/user/upload', { method: 'POST', body: fd });
      const upData = await up.json();
      if (!up.ok) { setAttachmentError(upData.error || 'Eroare la incarcare'); return; }
      const r = await fetch('/api/user/outreach/template', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentUrl: upData.url, attachmentName: upData.originalName || file.name }),
      });
      if (r.ok) { setAttachmentUrl(upData.url); setAttachmentName(upData.originalName || file.name); }
      else setAttachmentError('Eroare la salvare');
    } finally { setAttachmentUploading(false); }
  };

  const removeAttachment = async () => {
    setAttachmentUploading(true);
    setAttachmentError(null);
    try {
      const r = await fetch('/api/user/outreach/template', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentUrl: null, attachmentName: null }),
      });
      if (r.ok) { setAttachmentUrl(null); setAttachmentName(null); }
    } finally { setAttachmentUploading(false); }
  };
  useEffect(() => {
    loadTemplate();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const cancelEditTemplate = () => {
    setTemplateSubject(savedSubject);
    setTemplateMessage(savedMessage);
    setTemplateEditing(false);
  };

  const saveTemplate = async () => {
    if (!templateSubject.trim() || !templateMessage.trim()) return;
    setTemplateSaving(true);
    try {
      const r = await fetch('/api/user/outreach/template', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: templateSubject, message: templateMessage }),
      });
      if (r.ok) {
        setSavedSubject(templateSubject); setSavedMessage(templateMessage);
        setTemplateIsCustom(true);
        setTemplateEditing(false);
      }
    } finally { setTemplateSaving(false); }
  };

  const resetTemplate = async () => {
    setTemplateSaving(true);
    try {
      const r = await fetch('/api/user/outreach/template', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: '', message: '' }),
      });
      if (r.ok) { await loadTemplate(); setTemplateEditing(false); }
    } finally { setTemplateSaving(false); }
  };

  const selectedBatch = selectedBatchId != null ? batches.find(b => b.id === selectedBatchId) ?? null : null;

  const items = useMemo(() => {
    if (selectedBatch) return selectedBatch.items;
    if (selectedKeys.size === 0 || !groups) return [];
    const map = new Map<number, Item>();
    selectedKeys.forEach(key => {
      (groups[key]?.items ?? []).forEach(it => map.set(it.id, it));
    });
    return Array.from(map.values());
  }, [selectedBatch, selectedKeys, groups]);

  const withEmail = items.filter(a => a.email);
  const alreadyContactedCount = withEmail.filter(a => a.outreach_status === 'contacted').length;
  const filteredByStatus = withEmail.filter(a => !excludeContacted || a.outreach_status !== 'contacted');
  // Aceeasi adresa reala poate aparea pe mai multe listari distincte - o numaram o singura data.
  const seenEmails = new Set<string>();
  const eligible = filteredByStatus.filter(a => {
    const key = a.email.trim().toLowerCase();
    if (seenEmails.has(key)) return false;
    seenEmails.add(key);
    return true;
  });
  const remaining = DAILY_LIMIT - dailySent;

  const currentLabel = selectedBatch
    ? selectedBatch.name
    : selectedKeys.size === 1
      ? groupLabel(Array.from(selectedKeys)[0])
      : selectedKeys.size > 1
        ? `${selectedKeys.size} ${groupBy === 'neighborhood' ? 'cartiere' : 'sectoare'} selectate`
        : '';

  const selectGroup = (key: string) => {
    setSelectedBatchId(null);
    setSelectedKeys(prev => {
      if (key === 'toate') {
        return prev.has('toate') ? new Set() : new Set(['toate']);
      }
      const next = new Set(prev);
      next.delete('toate');
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const selectBatch = (id: number) => {
    setSelectedKeys(new Set());
    setSelectedBatchId(prev => (prev === id ? null : id));
  };

  const goToOwnNeighborhood = () => {
    if (!ownLocation?.neighborhood) return;
    setGroupBy('neighborhood');
    setSelectedBatchId(null);
    setSelectedKeys(new Set([ownLocation.neighborhood]));
  };
  const goToOwnSector = () => {
    if (!ownLocation?.sector) return;
    setGroupBy('sector');
    setSelectedBatchId(null);
    setSelectedKeys(new Set([ownLocation.sector]));
  };
  const goToAllBucharest = () => {
    setSelectedBatchId(null);
    setSelectedKeys(new Set(['toate']));
  };

  const handleSend = async () => {
    if ((selectedKeys.size === 0 && !selectedBatch) || eligible.length === 0) return;
    setSending(true);
    setSendResults(null);
    const batch = eligible.slice(0, remaining);
    const res = await fetch('/api/user/outreach/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: targetType, listings: batch.map(a => ({ id: a.id, name: a.name, email: a.email })) }),
    });
    const d = await res.json();
    setSending(false);
    setShowModal(false);
    setSendResults(d.results ?? []);
    setDailySent(d.dailySent ?? dailySent);
    load();
    loadReport();
  };

  const sendRequest = async (item: Item) => {
    setReqState(s => ({ ...s, [item.id]: 'sending' }));
    const res = await fetch('/api/user/collaborations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_type: targetType, to_id: item.id, message: '' }),
    });
    setReqState(s => ({ ...s, [item.id]: res.ok ? 'sent' : 'error' }));
  };

  const toggleBatchValue = (key: string) => {
    setNewBatchValues(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const resetBatchForm = () => {
    setShowBatchForm(false);
    setNewBatchName('');
    setNewBatchFilterType('sector');
    setNewBatchValues(new Set());
  };

  const saveBatch = async () => {
    if (!newBatchName.trim() || newBatchValues.size === 0) return;
    setSavingBatch(true);
    try {
      const res = await fetch('/api/user/outreach/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          name: newBatchName.trim(),
          filter_type: newBatchFilterType,
          values: Array.from(newBatchValues),
        }),
      });
      if (res.ok) { resetBatchForm(); load(); }
    } finally { setSavingBatch(false); }
  };

  const deleteBatch = async (id: number) => {
    if (selectedBatchId === id) setSelectedBatchId(null);
    await fetch(`/api/user/outreach/batches?id=${id}`, { method: 'DELETE' });
    load();
  };

  const batchFormOptions = useMemo(() => {
    const src = newBatchFilterType === 'neighborhood' ? neighborhoods : sectors;
    if (!src) return [];
    return Object.keys(src).filter(k => k !== 'toate').sort((a, b) => (
      newBatchFilterType === 'neighborhood' ? a.localeCompare(b) : Number(a) - Number(b)
    ));
  }, [newBatchFilterType, neighborhoods, sectors]);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!groups) return <p className="text-sm text-gray-500 py-6 text-center">Nu s-au putut incarca datele.</p>;

  const entries = Object.entries(groups).sort((a, b) => {
    if (a[0] === 'toate') return -1;
    if (b[0] === 'toate') return 1;
    if (isPro || groupBy === 'neighborhood') return a[0].localeCompare(b[0]);
    return Number(a[0]) - Number(b[0]);
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">{TAB_TITLES[targetType]}</h2>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${dailySent >= DAILY_LIMIT ? 'bg-red-100 text-red-600' : 'bg-indigo-50 text-indigo-700'}`}>
          {dailySent}/{DAILY_LIMIT} emailuri azi
        </span>
      </div>

      {/* Raport outreach */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Raport trimiteri</h3>
          <button onClick={loadReport} disabled={reportLoading}
            className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
            {reportLoading ? 'Se actualizeaza...' : '↻ Actualizeaza'}
          </button>
        </div>
        {report ? (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-xl font-bold text-gray-900">{report.totalSent}</div>
              <div className="text-xs text-gray-500">Trimise</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">{report.delivered}</div>
              <div className="text-xs text-gray-500">Livrate</div>
            </div>
            <div>
              <div className="text-xl font-bold text-red-500">{report.bounced}</div>
              <div className="text-xs text-gray-500">Esuate</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-500">{report.pending}</div>
              <div className="text-xs text-gray-500">In asteptare</div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">{reportLoading ? 'Se incarca...' : 'Nicio trimitere inca.'}</p>
        )}
      </div>

      {/* Sablon email */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Emailul care se trimite</h3>
          {!templateEditing && !templateLoading && (
            <button onClick={() => setTemplateEditing(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              ✏️ Editeaza
            </button>
          )}
        </div>

        {templateLoading ? (
          <p className="text-xs text-gray-400">Se incarca...</p>
        ) : templateEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Subiect</label>
              <input type="text" value={templateSubject} onChange={e => setTemplateSubject(e.target.value)} maxLength={200}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Mesaj</label>
              <textarea value={templateMessage} onChange={e => setTemplateMessage(e.target.value)} rows={8} maxLength={4000}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 resize-y" />
              <p className="text-xs text-gray-400 mt-1">Poti folosi <code className="bg-gray-100 px-1 rounded">{'{nume}'}</code> ca sa apara automat numele destinatarului in fiecare email.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={saveTemplate} disabled={templateSaving || !templateSubject.trim() || !templateMessage.trim()}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg">
                {templateSaving ? 'Se salveaza...' : 'Salveaza'}
              </button>
              <button onClick={cancelEditTemplate} disabled={templateSaving}
                className="flex-1 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium rounded-lg">
                Anuleaza
              </button>
              {templateIsCustom && (
                <button onClick={resetTemplate} disabled={templateSaving}
                  className="px-3 py-2 text-xs text-red-500 hover:text-red-600 disabled:opacity-40">
                  Reseteaza
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-gray-500">Subiect: </span>
              <span className="text-sm text-gray-800">{templateSubject}</span>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
              {'Buna ziua,\n\n'}
              {templateMessage}
              {'\n\nO zi buna,\n'}
              {templateContactName ? `${templateContactName}\n` : ''}
              {templateSenderName}
            </div>
            {!templateIsCustom && <p className="text-xs text-gray-400">Sablon generat automat — il poti personaliza cu butonul de mai sus.</p>}
          </div>
        )}

        {/* Atasament (ex. meniu) - trimis cu fiecare email din acest cont */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="text-xs font-medium text-gray-500 block mb-1">Atasament (ex. meniu — PDF, Word sau imagine)</label>
          {attachmentUrl ? (
            <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800 truncate">
                📎 {attachmentName || 'atasament'}
              </a>
              <button onClick={removeAttachment} disabled={attachmentUploading}
                className="text-xs text-red-500 hover:text-red-600 disabled:opacity-40 flex-shrink-0">
                {attachmentUploading ? '...' : 'Sterge'}
              </button>
            </div>
          ) : (
            <div>
              <input type="file" accept=".pdf,.doc,.docx,image/*" disabled={attachmentUploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ''; }}
                className="text-xs text-gray-600" />
              {attachmentUploading && <p className="text-xs text-gray-400 mt-1">Se incarca...</p>}
            </div>
          )}
          {attachmentError && <p className="text-xs text-red-500 mt-1">{attachmentError}</p>}
          <p className="text-xs text-gray-400 mt-1">Se trimite atasat la fiecare email de outreach din acest cont (max 8MB).</p>
        </div>
      </div>

      {showLocationFeatures && (
        <>
          {/* Scurtaturi zona proprie */}
          {(ownLocation?.neighborhood || ownLocation?.sector) && (
            <div className="flex flex-wrap gap-2">
              {ownLocation.neighborhood && (
                <button onClick={goToOwnNeighborhood}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${!selectedBatch && selectedKeys.has(ownLocation.neighborhood) && groupBy === 'neighborhood' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                  📍 Cartierul meu ({ownLocation.neighborhood})
                </button>
              )}
              {ownLocation.sector && (
                <button onClick={goToOwnSector}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${!selectedBatch && selectedKeys.has(ownLocation.sector) && groupBy === 'sector' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                  🏙️ Sectorul meu ({ownLocation.sector})
                </button>
              )}
              <button onClick={goToAllBucharest}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${!selectedBatch && selectedKeys.has('toate') ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                🌆 Tot Bucureștiul
              </button>
            </div>
          )}

          {/* Toggle grupare */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Grupeaza dupa:</span>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                <button onClick={() => { setGroupBy('sector'); setSelectedKeys(new Set()); setSelectedBatchId(null); }}
                  className={`px-3 py-1 text-xs font-medium ${groupBy === 'sector' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  Sector
                </button>
                <button onClick={() => { setGroupBy('neighborhood'); setSelectedKeys(new Set()); setSelectedBatchId(null); }}
                  className={`px-3 py-1 text-xs font-medium ${groupBy === 'neighborhood' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  Cartier
                </button>
              </div>
            </div>
            {selectedKeys.size > 0 && !selectedBatch && (
              <button onClick={() => setSelectedKeys(new Set())} className="text-xs text-gray-400 hover:text-red-500">
                Deselecteaza tot ({selectedKeys.size})
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 -mt-3">Poti selecta mai multe {groupBy === 'neighborhood' ? 'cartiere' : 'sectoare'} deodata — apasa pe fiecare card ca sa-l adaugi sau sa-l scoti din lot.</p>
        </>
      )}

      {/* Group grid */}
      <div className="grid grid-cols-3 gap-3">
        {entries.map(([key, gd]) => (
          <button key={key} onClick={() => selectGroup(key)}
            className={`rounded-xl border-2 p-4 text-center transition-all ${selectedKeys.has(key) && !selectedBatch ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}>
            <div className="text-sm font-bold text-indigo-700 truncate">{groupShort(key)}</div>
            <div className="text-2xl font-bold text-gray-900">{gd.count}</div>
            <div className="text-xs text-gray-500">{targetNoun}</div>
            <div className="text-xs text-indigo-600 mt-1">{gd.items.filter(a => a.outreach_status === 'contacted').length} contactate</div>
          </button>
        ))}
      </div>

      {/* Loturi personalizate salvate */}
      {showLocationFeatures && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Loturile mele</h3>
            <button onClick={() => setShowBatchForm(s => !s)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              {showBatchForm ? 'Anuleaza' : '+ Lot nou'}
            </button>
          </div>

          {showBatchForm && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
              <input
                type="text" value={newBatchName} onChange={e => setNewBatchName(e.target.value)}
                placeholder="Numele lotului (ex: Zona mea de livrare)"
                maxLength={60}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
              />
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                <button onClick={() => { setNewBatchFilterType('sector'); setNewBatchValues(new Set()); }}
                  className={`px-3 py-1 text-xs font-medium ${newBatchFilterType === 'sector' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>
                  Dupa sector
                </button>
                <button onClick={() => { setNewBatchFilterType('neighborhood'); setNewBatchValues(new Set()); }}
                  className={`px-3 py-1 text-xs font-medium ${newBatchFilterType === 'neighborhood' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>
                  Dupa cartier
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {batchFormOptions.map(key => (
                  <button key={key} onClick={() => toggleBatchValue(key)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${newBatchValues.has(key) ? 'border-indigo-500 bg-indigo-100 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                    {newBatchFilterType === 'sector' ? `Sector ${key}` : key}
                  </button>
                ))}
              </div>
              <button onClick={saveBatch} disabled={savingBatch || !newBatchName.trim() || newBatchValues.size === 0}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg">
                {savingBatch ? 'Se salveaza...' : `Salveaza lot (${newBatchValues.size} selectate)`}
              </button>
            </div>
          )}

          {batches.length === 0 ? (
            <p className="text-xs text-gray-400">Niciun lot personalizat inca.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {batches.map(b => (
                <div key={b.id}
                  className={`relative rounded-lg border-2 p-3 text-left transition-all ${selectedBatch?.id === b.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}>
                  <button onClick={() => deleteBatch(b.id)}
                    className="absolute top-1 right-1 text-gray-300 hover:text-red-500 text-sm leading-none px-1">&times;</button>
                  <button onClick={() => selectBatch(b.id)} className="w-full text-left pr-4">
                    <div className="text-sm font-semibold text-indigo-700 truncate">{b.name}</div>
                    <div className="text-xs text-gray-500">{b.count} {targetNoun} · {b.filterType === 'sector' ? 'sectoare' : 'cartiere'}</div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected group/lot details */}
      {(selectedKeys.size > 0 || selectedBatch) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-indigo-800">
              {currentLabel} — {eligible.length} cu email
            </span>
            <button
              onClick={() => setShowModal(true)}
              disabled={eligible.length === 0 || dailySent >= DAILY_LIMIT}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
              Trimite lot ({Math.min(eligible.length, remaining)})
            </button>
          </div>
          {alreadyContactedCount > 0 && (
            <label className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 text-xs text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={excludeContacted} onChange={e => setExcludeContacted(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400" />
              Exclude cele deja contactate ({alreadyContactedCount})
            </label>
          )}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {items.map(a => (
              <div key={a.id} className="px-4 py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.email || <span className="text-red-400">fara email</span>}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.outreach_status === 'contacted'
                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Contactat</span>
                    : <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Neprelucrat</span>}
                  {allowRequests && (
                    <button onClick={() => sendRequest(a)} disabled={reqState[a.id] === 'sending' || reqState[a.id] === 'sent'}
                      className="text-xs px-2 py-0.5 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50">
                      {reqState[a.id] === 'sent' ? '✓ Cerere' : reqState[a.id] === 'sending' ? '...' : reqState[a.id] === 'error' ? 'Eroare' : '+ Cerere'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send results */}
      {sendResults && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Rezultate trimitere</h3>
            <button onClick={() => setSendResults(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>
          <div className="flex gap-4 mb-3 text-sm">
            <span className="text-green-600 font-medium">✓ {sendResults.filter(r => r.success).length} trimise</span>
            <span className="text-red-500 font-medium">✗ {sendResults.filter(r => !r.success).length} erori</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {sendResults.filter(r => !r.success).map((r, i) => (
              <div key={i} className="text-xs text-red-500">{r.name}: {r.error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {showModal && (selectedKeys.size > 0 || selectedBatch) && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => !sending && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-2">Confirma trimitere</h3>
            <p className="text-sm text-gray-600 mb-4">
              Vei trimite emailuri catre <strong>{Math.min(eligible.length, remaining)}</strong> {targetNoun} din <strong>{currentLabel}</strong>.
              {eligible.length > remaining && <span className="text-amber-600"> (limita zilnica: maxim {remaining} ramase)</span>}
            </p>
            <p className="text-xs text-gray-400 mb-5">Emailul va fi trimis din contul tau Resend, cu datele tale ca expeditor.</p>
            <div className="flex gap-3">
              <button onClick={handleSend} disabled={sending}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                {sending ? 'Se trimite...' : 'Trimite'}
              </button>
              <button onClick={() => setShowModal(false)} disabled={sending}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium">
                Anuleaza
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
