"use client";
import { useState, useEffect } from "react";
import { PROFESSIONAL_CATEGORY_LABELS, PROFESSIONAL_CATEGORY_ORDER, type ProfessionalCategory } from "@/lib/professionals";
import { CLUB_CATEGORY_LABELS, type ClubCategory } from "@/lib/clubs";

const CLUB_CATEGORY_ORDER = Object.keys(CLUB_CATEGORY_LABELS) as ClubCategory[];
const CATEGORIZED_TYPES = new Set(["professional", "club"]);

interface OutreachItem {
  id: number;
  name: string;
  sector: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  is_premium: number;
  has_owner: number;
  view_count: number;
  outreach_status: string;
  listing_type: string;
  category?: string;
}

interface Props {
  outreachData: Record<string, any[]> | null;
  outreachFilter: string;
  setOutreachFilter: (v: string) => void;
  loadOutreach: () => void;
  updateOutreach: (type: string, id: number, status: string) => void;
}

// Toate tipurile de listari care au sectiune de outreach in admin. Culorile sunt clase Tailwind
// complete (nu construite dinamic), altfel JIT-ul nu le detecteaza in build.
const LISTING_TYPES: { v: string; label: string; badge?: string; activeClass: string }[] = [
  { v: "afterschool", label: "After School", activeClass: "bg-blue-600 text-white" },
  { v: "club", label: "Activități", activeClass: "bg-purple-600 text-white" },
  { v: "caterer", label: "Catering", badge: "🍽️", activeClass: "bg-amber-600 text-white" },
  { v: "kindergarten", label: "Grădinițe", badge: "🧸", activeClass: "bg-pink-600 text-white" },
  { v: "professional", label: "Colaboratori", badge: "🎓", activeClass: "bg-indigo-600 text-white" },
  { v: "tutor", label: "Meditații", badge: "📚", activeClass: "bg-teal-600 text-white" },
];

function labelFor(type: string): string {
  return LISTING_TYPES.find(t => t.v === type)?.label || type;
}

type SendResult = { name: string; success: boolean; error?: string };

function toWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("40")) return digits;
  if (digits.startsWith("0")) return "40" + digits.slice(1);
  return "40" + digits;
}

function waLink(phone: string, name: string): string {
  const text = encodeURIComponent(
    "Buna ziua! Ma numesc Bogdan si am construit ActivKids.ro, un site prin care parintii din Bucuresti cauta afterschool-uri si activitati pentru copii.\n\n" +
    "Cred ca " + name + " s-ar potrivi bine audientei mele si as vrea sa va listez, gratuit. Mi s-a parut corect sa va intreb direct.\n\n" +
    "Listarea de baza e gratuita, puteti actualiza informatiile oricand. Avem si un plan Premium la 100 RON/3 luni daca vreti mai multa vizibilitate.\n\n" +
    "Daca am acordul dvs., va puteti inregistra aici: https://activkids.ro/promovare\n\n" +
    "Daca aveti intrebari sau vreti sa discutam direct, ma puteti suna la 0747 646 543. Sunt deschis la orice colaborare sau idee care credeti ca v-ar ajuta la promovare."
  );
  // web.whatsapp.com in loc de wa.me: wa.me redirecteaza spre api.whatsapp.com, care declanseaza
  // dialogul "Open WhatsApp?" al browserului daca ai aplicatia desktop instalata.
  return "https://web.whatsapp.com/send?phone=" + toWaPhone(phone) + "&text=" + text;
}

export default function OutreachTab({ outreachData, outreachFilter, setOutreachFilter, loadOutreach, updateOutreach }: Props) {
  const FILTERS = [
    { v: "all", l: "Toate" },
    { v: "has_email", l: "Batch nou" },
    { v: "pending", l: "Neprelucrate" },
    { v: "contacted", l: "Contactate" },
    { v: "converted", l: "Convertite" },
    { v: "skip", l: "Skip" },
  ];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);
  const [customSubject, setCustomSubject] = useState("");
  const [batch, setBatch] = useState(0);
  const [dailySent, setDailySent] = useState<number | null>(null);
  const [listingType, setListingType] = useState<string>("afterschool");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const DAILY_LIMIT = 100;

  const [templateSubject, setTemplateSubject] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");
  const [savedSubject, setSavedSubject] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [templateIsCustom, setTemplateIsCustom] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateEditing, setTemplateEditing] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const loadTemplate = async (type: string) => {
    setTemplateLoading(true);
    setTemplateEditing(false);
    try {
      const r = await fetch(`/api/admin/outreach/templates?type=${type}`);
      const d = await r.json();
      setTemplateSubject(d.subject || "");
      setTemplateMessage(d.message || "");
      setSavedSubject(d.subject || "");
      setSavedMessage(d.message || "");
      setTemplateIsCustom(!!d.isCustom);
      setAttachmentUrl(d.attachmentUrl || null);
      setAttachmentName(d.attachmentName || null);
    } catch {}
    setTemplateLoading(false);
  };

  const ALLOWED_ATTACHMENT_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png", "image/webp", "image/gif"];
  const uploadAttachment = async (type: string, file: File) => {
    setAttachmentError(null);
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachmentError("Format nesuportat — foloseste PDF, Word sau o imagine.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAttachmentError("Fisierul este prea mare (max 8MB).");
      return;
    }
    setAttachmentUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/admin/outreach/upload-attachment", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) { setAttachmentError(upData.error || "Eroare la incarcare"); return; }
      const r = await fetch("/api/admin/outreach/templates", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, attachmentUrl: upData.url, attachmentName: upData.originalName || file.name }),
      });
      if (r.ok) { setAttachmentUrl(upData.url); setAttachmentName(upData.originalName || file.name); }
      else setAttachmentError("Eroare la salvare");
    } finally { setAttachmentUploading(false); }
  };

  const removeAttachment = async (type: string) => {
    setAttachmentUploading(true);
    setAttachmentError(null);
    try {
      const r = await fetch("/api/admin/outreach/templates", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, attachmentUrl: null, attachmentName: null }),
      });
      if (r.ok) { setAttachmentUrl(null); setAttachmentName(null); }
    } finally { setAttachmentUploading(false); }
  };

  useEffect(() => { loadTemplate(listingType); }, [listingType]);

  const cancelEditTemplate = () => {
    setTemplateSubject(savedSubject);
    setTemplateMessage(savedMessage);
    setTemplateEditing(false);
  };

  const saveTemplate = async () => {
    setTemplateSaving(true);
    try {
      const r = await fetch("/api/admin/outreach/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: listingType, subject: templateSubject, message: templateMessage }),
      });
      const d = await r.json();
      setSavedSubject(d.subject || "");
      setSavedMessage(d.message || "");
      setTemplateSubject(d.subject || "");
      setTemplateMessage(d.message || "");
      setTemplateIsCustom(!!d.isCustom);
      setTemplateEditing(false);
    } catch {}
    setTemplateSaving(false);
  };

  const resetTemplate = async () => {
    setTemplateSaving(true);
    try {
      const r = await fetch("/api/admin/outreach/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: listingType, subject: "", message: "" }),
      });
      const d = await r.json();
      setSavedSubject(d.subject || "");
      setSavedMessage(d.message || "");
      setTemplateSubject(d.subject || "");
      setTemplateMessage(d.message || "");
      setTemplateIsCustom(!!d.isCustom);
      setTemplateEditing(false);
    } catch {}
    setTemplateSaving(false);
  };

  const fetchDailySent = async () => {
    try {
      const r = await fetch("/api/admin/outreach/send-email");
      const d = await r.json();
      setDailySent(d.dailySent ?? 0);
    } catch {}
  };

  if (outreachData && dailySent === null) fetchDailySent();
  const BATCH_SIZE = 100;

  const itemsFor = (type: string): OutreachItem[] =>
    outreachData ? (outreachData[`${type}s`] || []).map((x: any) => ({ ...x, listing_type: type })).sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0)) : [];
  const all: OutreachItem[] = itemsFor(listingType);

  // Colaboratorii au 20 de categorii foarte diferite (logopedie, asistenta la teme, robotica...) si
  // activitatile/cluburile au 9 (dansuri, arte martiale, limbi straine...) - un filtru suplimentar
  // pe categorie, separat de outreachFilter (status), ca sa poti trimite catre un singur tip de
  // activitate/colaborator fara sa scrii sabloane separate pentru fiecare.
  const categoryCounts = listingType === "professional"
    ? PROFESSIONAL_CATEGORY_ORDER
        .map(c => ({ v: c, label: PROFESSIONAL_CATEGORY_LABELS[c], count: all.filter(x => x.category === c).length }))
        .filter(c => c.count > 0)
    : listingType === "club"
    ? CLUB_CATEGORY_ORDER
        .map(c => ({ v: c, label: CLUB_CATEGORY_LABELS[c], count: all.filter(x => x.category === c).length }))
        .filter(c => c.count > 0)
    : [];
  const byCategory = CATEGORIZED_TYPES.has(listingType) && categoryFilter
    ? all.filter(x => x.category === categoryFilter)
    : all;

  const filtered = outreachFilter === "all" ? byCategory
    : outreachFilter === "has_email" ? byCategory.filter(x => !!x.email && x.is_premium !== 1 && !x.has_owner && x.outreach_status !== "converted")
    : byCategory.filter(x => x.outreach_status === outreachFilter);

  const totalBatches = Math.ceil(filtered.length / BATCH_SIZE);
  const currentBatch = filtered.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);
  const selectableItems = currentBatch.filter(item => item.email && item.is_premium !== 1);
  const selectedItems = all.filter(item => selected.has(item.listing_type + "-" + item.id));
  const selectedWithEmail = selectedItems.filter(i => i.email);

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(prev => {
    const next = new Set(prev);
    selectableItems.forEach(i => next.add(i.listing_type + "-" + i.id));
    return next;
  });
  const clearAll = () => setSelected(new Set());
  const changeBatch = (n: number) => { setBatch(n); clearAll(); };

  const openModal = () => {
    setSendResults(null);
    setCustomSubject("");
    setShowModal(true);
  };

  const sendEmails = async () => {
    setSending(true);
    const listings = selectedWithEmail.map(i => ({
      id: i.id, type: i.listing_type, name: i.name, email: i.email, clicks: i.view_count, category: i.category,
    }));
    try {
      const res = await fetch("/api/admin/outreach/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listings, customSubject: customSubject || undefined }),
      });
      const data = await res.json();
      setSendResults(data.results);
      if (data.dailySent !== undefined) setDailySent(data.dailySent);
      clearAll();
      loadOutreach();
    } catch (e) {
      setSendResults([{ name: "Eroare retea", success: false, error: String(e) }]);
    } finally {
      setSending(false);
    }
  };

  const statusLabel: Record<string, string> = {
    pending: "○ Neprelucrat",
    contacted: "● Contactat",
    converted: "★ Convertit",
    skip: "× Skip",
  };
  const statusColor: Record<string, string> = {
    pending: "text-slate-400",
    contacted: "text-blue-400",
    converted: "text-emerald-400",
    skip: "text-slate-600",
  };

  return (
    <div className="p-6">
      <div className="flex gap-2 mb-4 flex-wrap">
        {LISTING_TYPES.map(lt => (
          <button key={lt.v} onClick={() => { setListingType(lt.v); setCategoryFilter(""); setBatch(0); clearAll(); }}
            className={"px-4 py-2 text-sm font-semibold rounded-xl transition-colors " + (listingType === lt.v ? lt.activeClass : "bg-slate-700 text-slate-300 hover:bg-slate-600")}>
            {lt.badge ? lt.badge + " " : ""}{lt.label}
            <span className="ml-2 text-xs opacity-70">{itemsFor(lt.v).length}</span>
          </button>
        ))}
      </div>
      {CATEGORIZED_TYPES.has(listingType) && categoryCounts.length > 0 && (() => {
        const activeClass = listingType === "club" ? "bg-purple-600 text-white" : "bg-indigo-600 text-white";
        return (
          <div className="flex gap-1.5 flex-wrap mb-4">
            <button onClick={() => { setCategoryFilter(""); setBatch(0); clearAll(); }}
              className={"px-3 py-1 text-xs rounded-full transition-colors " + (categoryFilter === "" ? activeClass : "bg-slate-700 text-slate-300 hover:bg-slate-600")}>
              Toate ({all.length})
            </button>
            {categoryCounts.map(c => (
              <button key={c.v} onClick={() => { setCategoryFilter(c.v); setBatch(0); clearAll(); }}
                className={"px-3 py-1 text-xs rounded-full transition-colors " + (categoryFilter === c.v ? activeClass : "bg-slate-700 text-slate-300 hover:bg-slate-600")}>
                {c.label} ({c.count})
              </button>
            ))}
          </div>
        );
      })()}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
        {templateLoading ? (
          <p className="text-xs text-slate-500">Se incarca sablonul...</p>
        ) : templateEditing ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Sablon email · {labelFor(listingType)}</h3>
            </div>
            <label className="text-xs text-slate-400 mb-1 block">Subiect</label>
            <input type="text" value={templateSubject} onChange={e => setTemplateSubject(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:border-blue-500" />
            <label className="text-xs text-slate-400 mb-1 block">Mesaj</label>
            <textarea value={templateMessage} onChange={e => setTemplateMessage(e.target.value)} rows={10}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-blue-500 font-mono" />
            <p className="text-xs text-slate-500 mb-3">
              Foloseste <code className="text-blue-400">{"{nume}"}</code> pentru numele listarii{listingType !== "caterer" && (<> si <code className="text-blue-400">{"{clickuri}"}</code> pentru mentiunea de clickuri (goala daca listarea nu are)</>)}, <code className="text-blue-400">{"{link}"}</code> pentru pagina de confirmare T&C (link securizat de acces, dezvaluit dupa bifare), <code className="text-blue-400">{"{promo}"}</code> pentru oferta Premium curenta (50% reducere pana pe 31 august) si <code className="text-blue-400">{"{remove}"}</code> pentru linkul de cerere de eliminare a listarii{listingType === "club" && (<> ({"{categorie}"} e disponibil si aici, pentru tipul de club: "cluburi de inot" etc., iar <code className="text-blue-400">{"{parteneriat}"}</code> adauga paragraful despre colaborarea cu afterschool-uri doar pentru categoriile care nu au nevoie de o facilitate speciala: dansuri, arte martiale, limbi straine, robotica, muzica, arte creative, si dispare complet la inot, fotbal, gimnastica)</>)}.
            </p>
            <div className="flex gap-2">
              <button onClick={saveTemplate} disabled={templateSaving}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
                {templateSaving ? "Se salveaza..." : "Salveaza"}
              </button>
              <button onClick={cancelEditTemplate} disabled={templateSaving}
                className="px-4 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
                Anuleaza
              </button>
              {templateIsCustom && (
                <button onClick={resetTemplate} disabled={templateSaving}
                  className="px-4 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-600 text-slate-400 rounded-lg transition-colors ml-auto">
                  Reseteaza la implicit
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-white">Sablon email · {labelFor(listingType)}</h3>
              <button onClick={() => setTemplateEditing(true)}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
                ✏️ Editeaza
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-0.5">Subiect</p>
            <p className="text-sm text-white mb-2">{savedSubject}</p>
            <p className="text-xs text-slate-500 mb-0.5">Mesaj</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/50 rounded-lg p-3 max-h-40 overflow-y-auto">{savedMessage}</p>
            {!templateIsCustom && (
              <p className="text-xs text-slate-600 mt-2 italic">Sablon implicit — il poti personaliza cu butonul de mai sus.</p>
            )}
          </>
        )}

        {/* Atasament (ex. meniu de catering) - trimis cu fiecare email din acest tip de sablon */}
        {!templateLoading && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1.5">Atasament (PDF, Word sau imagine)</p>
            {attachmentUrl ? (
              <div className="flex items-center justify-between gap-2 bg-slate-900/50 rounded-lg px-3 py-2">
                <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 truncate">
                  📎 {attachmentName || "atasament"}
                </a>
                <button onClick={() => removeAttachment(listingType)} disabled={attachmentUploading}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40 flex-shrink-0">
                  {attachmentUploading ? "..." : "Sterge"}
                </button>
              </div>
            ) : (
              <div>
                <input type="file" accept=".pdf,.doc,.docx,image/*" disabled={attachmentUploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachment(listingType, f); e.target.value = ""; }}
                  className="text-xs text-slate-400" />
                {attachmentUploading && <p className="text-xs text-slate-500 mt-1">Se incarca...</p>}
              </div>
            )}
            {attachmentError && <p className="text-xs text-red-400 mt-1">{attachmentError}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-white">Outreach · {labelFor(listingType)}</h2>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(({ v, l }) => (
            <button key={v} onClick={() => { setOutreachFilter(v); setBatch(0); clearAll(); }}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${outreachFilter === v ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
              {l}
            </button>
          ))}
          <button onClick={loadOutreach} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full">
            Refresh
          </button>
        </div>
      </div>

      {dailySent !== null && (
        <div className={"rounded-xl p-3 mb-4 border " + (
          dailySent >= 90 ? "bg-red-900/20 border-red-700/50" :
          dailySent >= 70 ? "bg-amber-900/20 border-amber-700/50" :
          "bg-slate-800 border-slate-700"
        )}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={"text-xs font-medium " + (dailySent >= 90 ? "text-red-400" : dailySent >= 70 ? "text-amber-400" : "text-slate-300")}>
              {dailySent >= 90 ? "Aproape de limita zilnica!" : dailySent >= 70 ? "Atentie la limita zilnica" : "Emailuri trimise azi"}
            </span>
            <span className={"text-xs font-bold " + (dailySent >= 90 ? "text-red-400" : dailySent >= 70 ? "text-amber-400" : "text-white")}>
              {dailySent} / {DAILY_LIMIT}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div className={"h-1.5 rounded-full transition-all " + (dailySent >= 90 ? "bg-red-500" : dailySent >= 70 ? "bg-amber-500" : "bg-blue-500")}
              style={{ width: Math.min(100, (dailySent / DAILY_LIMIT) * 100) + "%" }} />
          </div>
          {dailySent >= DAILY_LIMIT && (
            <p className="text-xs text-red-400 mt-1">Limita de azi atinsa. Resend blocheaza trimiterea — revin maine.</p>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-blue-300">
            {selected.size} selectate · {selectedWithEmail.length} cu email
          </span>
          <div className="flex gap-2">
            <button onClick={clearAll} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
              Deselecteaza
            </button>
            {selectedWithEmail.length > 0 && (
              <button onClick={openModal} className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium">
                Trimite email ({selectedWithEmail.length})
              </button>
            )}
          </div>
        </div>
      )}

      {!outreachData ? (
        <p className="text-slate-400 text-sm">Apasa Refresh pentru a incarca datele.</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400 text-sm">Nicio listare in aceasta categorie.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-xs text-slate-500">
              {filtered.length} listari · Batch {batch + 1}/{totalBatches} · #{batch * BATCH_SIZE + 1}-{Math.min((batch + 1) * BATCH_SIZE, filtered.length)}
            </p>
            {selectableItems.length > 0 && (
              <button onClick={selected.size > 0 ? clearAll : selectAll}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                {selected.size > 0 ? "Deselecteaza tot" : `Selecteaza batch cu email (${selectableItems.length})`}
              </button>
            )}
          </div>
          {totalBatches > 1 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {Array.from({ length: totalBatches }, (_, i) => (
                <button key={i} onClick={() => changeBatch(i)}
                  className={"px-3 py-1 text-xs rounded-lg font-medium transition-colors " + (
                    batch === i
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  )}>
                  Batch {i + 1}
                  <span className="ml-1 opacity-60 text-xs">
                    {i * BATCH_SIZE + 1}-{Math.min((i + 1) * BATCH_SIZE, filtered.length)}
                  </span>
                </button>
              ))}
            </div>
          )}
          {currentBatch.map((item) => {
            const key = item.listing_type + "-" + item.id;
            const isSelected = selected.has(key);
            const isPriority = item.view_count > 20 && !item.has_owner;
            const canSelect = !!item.email && item.is_premium !== 1 && !item.has_owner && item.outreach_status !== "converted";
            return (
              <div key={key}
                className={"bg-slate-800 border rounded-xl p-4 transition-colors " + (
                  isSelected ? "border-blue-500/70 bg-blue-950/20" :
                  item.is_premium === 1 ? "border-emerald-800/40 opacity-50" :
                  item.outreach_status === "skip" ? "border-slate-700/40 opacity-40" :
                  isPriority ? "border-amber-500/50" : "border-slate-700"
                )}>
                <div className="flex items-start gap-3">
                  {canSelect && (
                    <div className="pt-1 flex-shrink-0">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(key)}
                        className="w-4 h-4 cursor-pointer accent-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isPriority && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">Prioritar</span>
                          )}
                          {item.is_premium === 1 && (
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Premium</span>
                          )}
                          <span className={"text-xs " + (statusColor[item.outreach_status] || "text-slate-400")}>
                            {statusLabel[item.outreach_status] || item.outreach_status}
                          </span>
                        </div>
                        <p className="text-white font-semibold">{item.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {labelFor(item.listing_type)}
                          {item.listing_type === "professional" && item.category && ` · ${PROFESSIONAL_CATEGORY_LABELS[item.category as ProfessionalCategory] || item.category}`}
                          {item.listing_type === "club" && item.category && ` · ${CLUB_CATEGORY_LABELS[item.category as ClubCategory] || item.category}`}
                          {item.sector ? " · Sector " + item.sector : ""}
                          {item.view_count > 0 && (
                            <span className="ml-2 text-blue-400 font-medium">{item.view_count} clickuri</span>
                          )}
                          {item.has_owner
                            ? <span className="ml-2 text-slate-500"> Revendicat</span>
                            : <span className="ml-2 text-amber-500"> Nerevendicat</span>
                          }
                        </p>
                      </div>
                      {item.is_premium !== 1 && (
                        <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                          <button
                            onClick={() => updateOutreach(item.listing_type, item.id,
                              item.outreach_status === "contacted" ? "pending" : "contacted")}
                            className={"px-2.5 py-1.5 text-xs rounded-lg transition-colors font-medium border " + (
                              item.outreach_status === "contacted"
                                ? "bg-blue-900/40 text-blue-400 border-blue-700"
                                : "bg-slate-700 hover:bg-blue-700/50 text-slate-200 border-slate-600"
                            )}>
                            {item.outreach_status === "contacted" ? "Contactat" : "Marcat contactat"}
                          </button>
                          <button
                            onClick={() => updateOutreach(item.listing_type, item.id, "converted")}
                            className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-700 hover:bg-emerald-700/50 text-slate-200 transition-colors font-medium border border-slate-600">
                            Convertit
                          </button>
                          <button
                            onClick={() => updateOutreach(item.listing_type, item.id,
                              item.outreach_status === "skip" ? "pending" : "skip")}
                            className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-500 transition-colors border border-slate-700">
                            Skip
                          </button>
                        </div>
                      )}
                    </div>
                    {item.is_premium !== 1 && (
                      <div className="flex gap-2 flex-wrap mt-1 pt-2 border-t border-slate-700/50">
                        {item.phone && (
                          <>
                            <a href={"tel:" + item.phone}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-green-800 text-green-400 hover:text-green-200 text-xs rounded-lg transition-colors border border-slate-600 font-medium">
                              {item.phone}
                            </a>
                            <a href={waLink(item.phone, item.name)}
                              target="_blank" rel="noopener noreferrer"
                              onClick={() => updateOutreach(item.listing_type, item.id, "contacted")}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs rounded-lg transition-colors border border-[#25D366]/30 font-medium">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                              WhatsApp
                            </a>
                          </>
                        )}
                        {item.email && (
                          <button onClick={() => toggleSelect(key)}
                            className={"inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors border font-medium " + (
                              isSelected
                                ? "bg-blue-900/40 text-blue-400 border-blue-700"
                                : "bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border-blue-800/40"
                            )}>
                            {isSelected ? "Selectat pt. email" : "Adauga la email bulk"}
                          </button>
                        )}
                        {item.website && (
                          <a href={item.website} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-colors border border-slate-700 font-medium">
                            Site
                          </a>
                        )}
                        {!item.phone && !item.email && (
                          <span className="text-xs text-slate-600 italic py-1">Fara date de contact</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            {!sendResults ? (
              <>
                <h3 className="text-lg font-bold text-white mb-4">Trimite emailuri</h3>
                <p className="text-sm text-slate-400 mb-3">
                  Destinatari: <span className="text-white font-semibold">{selectedWithEmail.length} listari</span>
                </p>
                <div className="bg-slate-800 rounded-xl p-3 mb-4 max-h-36 overflow-y-auto space-y-1.5">
                  {selectedWithEmail.map(i => (
                    <div key={i.listing_type + "-" + i.id} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-white truncate">{i.name}</span>
                      <span className="text-slate-500 flex-shrink-0 truncate max-w-[180px]">{i.email}</span>
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="text-xs text-slate-400 mb-1.5 block">Subiect (lasa gol pentru sablonul curent)</label>
                  <input type="text" value={customSubject} onChange={e => setCustomSubject(e.target.value)}
                    placeholder={savedSubject}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 mb-5 text-xs text-slate-400 leading-relaxed max-h-32 overflow-y-auto">
                  <p className="font-medium text-slate-300 mb-1">Preview mesaj (sablonul curent, editabil mai sus in pagina):</p>
                  <p className="whitespace-pre-wrap">{savedMessage}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors">
                    Anuleaza
                  </button>
                  <button onClick={sendEmails} disabled={sending}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                    {sending ? "Se trimite..." : "Trimite " + selectedWithEmail.length + " emailuri"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-4">Rezultate</h3>
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {sendResults.map((r, i) => (
                    <div key={i} className={"flex items-center gap-2 text-sm p-2 rounded-lg " + (r.success ? "bg-emerald-900/20 text-emerald-400" : "bg-red-900/20 text-red-400")}>
                      <span className="font-bold">{r.success ? "+" : "x"}</span>
                      <span className="flex-1 truncate">{r.name}</span>
                      {r.error && <span className="text-xs opacity-70 truncate max-w-[150px]">{r.error}</span>}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-slate-400 mb-4">
                  <span className="text-emerald-400 font-medium">{sendResults.filter(r => r.success).length} trimise</span>
                  {sendResults.filter(r => !r.success).length > 0 && (
                    <span className="ml-3 text-red-400 font-medium">{sendResults.filter(r => !r.success).length} erori</span>
                  )}
                </div>
                <button onClick={() => setShowModal(false)}
                  className="w-full px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors">
                  Inchide
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
