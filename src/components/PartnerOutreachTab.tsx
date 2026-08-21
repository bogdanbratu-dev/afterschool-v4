"use client";
import { useState, useEffect } from "react";

interface AfterSchoolItem {
  id: number; name: string; sector: number; email: string;
  phone: string | null; view_count: number;
  outreach_status: string | null; email_sent_at: number | null;
}

interface SectorData { count: number; items: AfterSchoolItem[] }

type SendResult = { name: string; success: boolean; error?: string };

export default function PartnerOutreachTab() {
  const [data, setData] = useState<{ sectors: Record<string, SectorData>; dailySent: number; dailyLimit: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSector, setSelectedSector] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dailySent, setDailySent] = useState(0);
  const DAILY_LIMIT = 100;

  const load = async () => {
    setLoading(true);
    const r = await fetch('/api/user/outreach/afterschools');
    if (r.ok) { const d = await r.json(); setData(d); setDailySent(d.dailySent ?? 0); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sectorItems = selectedSector !== null ? (data?.sectors[selectedSector]?.items ?? []) : [];
  const eligible = sectorItems.filter(a => a.email);
  const remaining = DAILY_LIMIT - dailySent;

  const handleSend = async () => {
    if (!selectedSector || eligible.length === 0) return;
    setSending(true);
    setSendResults(null);
    const batch = eligible.slice(0, remaining);
    const res = await fetch('/api/user/outreach/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listings: batch.map(a => ({ id: a.id, name: a.name, email: a.email })) }),
    });
    const d = await res.json();
    setSending(false);
    setShowModal(false);
    setSendResults(d.results ?? []);
    setDailySent(d.dailySent ?? dailySent);
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-7 h-7 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-sm text-gray-500 py-6 text-center">Nu s-au putut incarca datele.</p>;

  const sectors = Object.entries(data.sectors).sort((a, b) => Number(a[0]) - Number(b[0]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Outreach Afterschooluri</h2>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${dailySent >= DAILY_LIMIT ? 'bg-red-100 text-red-600' : 'bg-teal-50 text-teal-700'}`}>
          {dailySent}/{DAILY_LIMIT} emailuri azi
        </span>
      </div>

      {/* Sector grid */}
      <div className="grid grid-cols-3 gap-3">
        {sectors.map(([sec, sd]) => (
          <button key={sec} onClick={() => setSelectedSector(selectedSector === Number(sec) ? null : Number(sec))}
            className={`rounded-xl border-2 p-4 text-center transition-all ${selectedSector === Number(sec) ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-300'}`}>
            <div className="text-lg font-bold text-teal-700">S{sec}</div>
            <div className="text-2xl font-bold text-gray-900">{sd.count}</div>
            <div className="text-xs text-gray-500">afterschooluri</div>
            <div className="text-xs text-teal-600 mt-1">{sd.items.filter(a => a.outreach_status === 'contacted').length} contactate</div>
          </button>
        ))}
      </div>

      {/* Selected sector details */}
      {selectedSector !== null && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-teal-800">
              Sectorul {selectedSector} — {eligible.length} cu email
            </span>
            <button
              onClick={() => setShowModal(true)}
              disabled={eligible.length === 0 || dailySent >= DAILY_LIMIT}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
              Trimite batch ({Math.min(eligible.length, remaining)})
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {sectorItems.map(a => (
              <div key={a.id} className="px-4 py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.email || <span className="text-red-400">fara email</span>}</p>
                </div>
                {a.outreach_status === 'contacted'
                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Contactat</span>
                  : <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Neprelucrat</span>}
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
      {showModal && selectedSector !== null && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => !sending && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-2">Confirma trimitere</h3>
            <p className="text-sm text-gray-600 mb-4">
              Vei trimite emailuri catre <strong>{Math.min(eligible.length, remaining)}</strong> afterschooluri din Sectorul <strong>{selectedSector}</strong>.
              {eligible.length > remaining && <span className="text-amber-600"> (limita zilnica: maxim {remaining} ramase)</span>}
            </p>
            <p className="text-xs text-gray-400 mb-5">Emailul va fi trimis din contul tau Resend, cu datele firmei tale ca expeditor.</p>
            <div className="flex gap-3">
              <button onClick={handleSend} disabled={sending}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
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
