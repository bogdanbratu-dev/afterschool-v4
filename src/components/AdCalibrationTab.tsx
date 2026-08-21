'use client';
import { useState, useEffect, useRef, useMemo } from 'react';

interface ImportRow {
  id: number;
  batch_id: string;
  campaign_name: string | null;
  ad_set_name: string | null;
  date_start: string | null;
  date_stop: string | null;
  amount_spent_lei: number | null;
  impressions: number | null;
  link_clicks: number | null;
  cpc_lei: number | null;
  cpm_lei: number | null;
  results: number | null;
  objective: string | null;
  category: string | null;
  imported_at: number;
}

interface Benchmarks {
  benchmarks: { cpcLei: [number, number]; cpmLei: [number, number]; landingToLeadPct: [number, number] };
  calibratedAt: string;
  source: string;
  sampleSize?: number;
}

const OBJECTIVE_OPTIONS = [
  { value: '', label: 'Netaguit' },
  { value: 'trafic', label: 'Trafic (folosit la recalibrare)' },
  { value: 'followers', label: 'Followers / like-uri pagină' },
  { value: 'interactiune', label: 'Interacțiune / engagement' },
  { value: 'alt', label: 'Alt obiectiv' },
];

function fmt(n: number | null): string {
  return n == null ? '-' : n.toFixed(2);
}

// Exemplu de format, cu aceleasi antete pe care le foloseste exportul CSV din Meta Ads Manager
// (Raportare > Export > .csv), ca sa se vada clar ce coloane recunoaste parserul (src/lib/adCsvParser.ts).
const SAMPLE_CSV = `Campaign name,Ad set name,Reporting starts,Reporting ends,Amount spent (RON),Impressions,Reach,Link clicks,CTR (link click-through rate),CPC (cost per link click),"CPM (cost per 1,000 impressions)",Results,Cost per results
Trafic parinti Bucuresti,Set 1,2026-07-01,2026-07-15,450.25,25000,18000,210,0.84,2.14,18.01,12,37.52
Trafic parinti Bucuresti,Set 2,2026-07-16,2026-07-31,520.10,28500,19500,245,0.86,2.12,18.25,15,34.67
Promovare pagina followers,Set 1,2026-07-01,2026-07-31,200.00,40000,30000,50,0.12,4.00,5.00,180,1.11
`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'exemplu-meta-ads-export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdCalibrationTab() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkObjective, setBulkObjective] = useState('trafic');
  const [bulkCategory, setBulkCategory] = useState('');
  const [recalibrating, setRecalibrating] = useState(false);
  const [recalMsg, setRecalMsg] = useState<string | null>(null);
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/ad-calibration/rows').then((r) => r.json()),
      fetch('/api/admin/ad-calibration/recalibrate').then((r) => r.json()),
    ]).then(([rowsData, benchData]) => {
      setRows(Array.isArray(rowsData) ? rowsData : []);
      setBenchmarks(benchData);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const batches = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.batch_id, (map.get(r.batch_id) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const filtered = useMemo(() => {
    return batchFilter === 'all' ? rows : rows.filter((r) => r.batch_id === batchFilter);
  }, [rows, batchFilter]);

  const traficCount = useMemo(() => rows.filter((r) => r.objective === 'trafic').length, [rows]);

  async function handleImport() {
    if (!csvText.trim()) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await fetch('/api/admin/ad-calibration/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportMsg(`Importat: ${data.count} rânduri (batch ${data.batchId}).`);
        setCsvText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        load();
      } else {
        setImportMsg(data.error || 'Eroare la import.');
      }
    } catch {
      setImportMsg('Eroare de rețea la import.');
    }
    setImporting(false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ''));
    reader.readAsText(file);
  }

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const allSelected = filtered.every((r) => prev.has(r.id));
      if (allSelected) return new Set();
      return new Set(filtered.map((r) => r.id));
    });
  }

  async function applyBulkTag() {
    if (selected.size === 0) return;
    const res = await fetch('/api/admin/ad-calibration/rows', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), objective: bulkObjective, category: bulkCategory || null }),
    });
    if (res.ok) {
      setSelected(new Set());
      load();
    }
  }

  async function deleteRow(id: number) {
    await fetch(`/api/admin/ad-calibration/rows/${id}`, { method: 'DELETE' });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleRecalibrate() {
    setRecalibrating(true);
    setRecalMsg(null);
    try {
      const res = await fetch('/api/admin/ad-calibration/recalibrate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRecalMsg(`Recalibrat din ${data.sampleSize} campanii.`);
        load();
      } else {
        setRecalMsg(data.error || 'Eroare la recalibrare.');
      }
    } catch {
      setRecalMsg('Eroare de rețea la recalibrare.');
    }
    setRecalibrating(false);
  }

  if (loading) return <p className="text-[var(--color-text-light)] text-sm">Se încarcă...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-main)]">📊 Calibrare reclame</h2>
        <p className="text-xs text-[var(--color-text-light)] mt-1">
          Importă exporturi CSV din Meta Ads Manager (Raportare → Export), etichetează manual fiecare
          campanie cu obiectivul real, apoi recalibrează intervalele de buget folosite de widgetul
          „Potențialul zonei” de pe /promovare. Doar rândurile etichetate „Trafic” intră în calcul,
          pentru că o campanie cu alt obiectiv (ex. followers) are alt tip de cost și nu e un proxy valid.
        </p>
      </div>

      {benchmarks && (
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-text-main)] font-semibold mb-2">Benchmark-uri active acum</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-[var(--color-text-light)] text-xs">CPC</p>
              <p className="text-[var(--color-text-main)] tabular-nums">{benchmarks.benchmarks.cpcLei[0]} - {benchmarks.benchmarks.cpcLei[1]} lei</p>
            </div>
            <div>
              <p className="text-[var(--color-text-light)] text-xs">CPM</p>
              <p className="text-[var(--color-text-main)] tabular-nums">{benchmarks.benchmarks.cpmLei[0]} - {benchmarks.benchmarks.cpmLei[1]} lei</p>
            </div>
            <div>
              <p className="text-[var(--color-text-light)] text-xs">Rată click → contact</p>
              <p className="text-[var(--color-text-main)] tabular-nums">{benchmarks.benchmarks.landingToLeadPct[0]}% - {benchmarks.benchmarks.landingToLeadPct[1]}%</p>
            </div>
          </div>
          <p className="text-[11px] text-[var(--color-text-light)] mt-2">
            Calibrat: {benchmarks.calibratedAt} · {benchmarks.source}
            {benchmarks.sampleSize ? ` · ${benchmarks.sampleSize} campanii` : ''}
          </p>
        </div>
      )}

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-text-main)] font-semibold">Import CSV nou</p>
          <button
            onClick={downloadSampleCsv}
            className="text-xs text-[var(--color-text-light)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg hover:text-[var(--color-text-main)]"
          >
            ⬇ Descarcă exemplu CSV
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-light)]">
          Exemplul arată formatul așteptat (antetele exportului Meta Ads Manager). Îl poți deschide
          ca să vezi cum arată coloanele, sau îl poți importa direct ca test, fără nicio campanie reală.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block text-xs text-[var(--color-text-light)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:text-white file:text-xs"
        />
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={4}
          placeholder="Sau lipește direct conținutul CSV aici..."
          className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-[var(--color-border)] bg-white text-gray-900"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            disabled={importing || !csvText.trim()}
            className="text-xs bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-lg disabled:opacity-40"
          >
            {importing ? 'Se importă...' : 'Importă CSV'}
          </button>
          {importMsg && <span className="text-xs text-[var(--color-text-light)]">{importMsg}</span>}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setBatchFilter('all')}
            className={`px-3 py-1 text-xs rounded-full border ${batchFilter === 'all' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-light)]'}`}
          >
            Toate ({rows.length})
          </button>
          {batches.map(([batchId, count]) => (
            <button
              key={batchId}
              onClick={() => setBatchFilter(batchId)}
              className={`px-3 py-1 text-xs rounded-full border ${batchFilter === batchId ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-light)]'}`}
            >
              {batchId} ({count})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-text-light)]">{traficCount} rânduri etichetate „Trafic”</span>
          <button
            onClick={handleRecalibrate}
            disabled={recalibrating}
            className="text-xs bg-green-600 text-white px-4 py-1.5 rounded-lg disabled:opacity-40"
          >
            {recalibrating ? 'Se recalibrează...' : 'Recalibrează din campaniile taguite'}
          </button>
        </div>
      </div>
      {recalMsg && <p className="text-xs text-[var(--color-text-light)]">{recalMsg}</p>}

      {selected.size > 0 && (
        <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl p-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[var(--color-text-main)]">{selected.size} selectate</span>
          <select
            value={bulkObjective}
            onChange={(e) => setBulkObjective(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-[var(--color-border)] bg-white text-gray-900"
          >
            {OBJECTIVE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            placeholder="categorie (opțional)"
            className="px-2 py-1 text-xs rounded-lg border border-[var(--color-border)] bg-white text-gray-900 w-40"
          />
          <button onClick={applyBulkTag} className="text-xs bg-[var(--color-primary)] text-white px-3 py-1 rounded-lg">
            Aplică etichetă
          </button>
        </div>
      )}

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-light)] text-left">
              <th className="px-3 py-2">
                <input type="checkbox" checked={filtered.length > 0 && filtered.every((r) => selected.has(r.id))} onChange={toggleAllVisible} />
              </th>
              <th className="px-3 py-2">Campanie</th>
              <th className="px-3 py-2">Perioadă</th>
              <th className="px-3 py-2 text-right">Cheltuit</th>
              <th className="px-3 py-2 text-right">Click-uri</th>
              <th className="px-3 py-2 text-right">CPC</th>
              <th className="px-3 py-2 text-right">CPM</th>
              <th className="px-3 py-2 text-right">Rezultate</th>
              <th className="px-3 py-2">Obiectiv</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-[var(--color-text-light)]">Niciun rând importat încă.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-black/[0.03]">
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} />
                </td>
                <td className="px-3 py-2 text-[var(--color-text-main)] max-w-[220px] truncate" title={r.campaign_name || ''}>{r.campaign_name || '-'}</td>
                <td className="px-3 py-2 text-[var(--color-text-light)]">{r.date_start || '-'}{r.date_stop ? ` → ${r.date_stop}` : ''}</td>
                <td className="px-3 py-2 text-right text-[var(--color-text-light)] tabular-nums">{fmt(r.amount_spent_lei)}</td>
                <td className="px-3 py-2 text-right text-[var(--color-text-light)] tabular-nums">{r.link_clicks ?? '-'}</td>
                <td className="px-3 py-2 text-right text-[var(--color-text-light)] tabular-nums">{fmt(r.cpc_lei)}</td>
                <td className="px-3 py-2 text-right text-[var(--color-text-light)] tabular-nums">{fmt(r.cpm_lei)}</td>
                <td className="px-3 py-2 text-right text-[var(--color-text-light)] tabular-nums">{r.results ?? '-'}</td>
                <td className="px-3 py-2">
                  <select
                    value={r.objective || ''}
                    onChange={async (e) => {
                      const objective = e.target.value;
                      setRows((prev) => prev.map((row) => (row.id === r.id ? { ...row, objective } : row)));
                      await fetch(`/api/admin/ad-calibration/rows/${r.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ objective, category: r.category }),
                      });
                    }}
                    className={`px-2 py-1 text-xs rounded-lg border ${r.objective === 'trafic' ? 'border-green-600 bg-green-50 text-green-700' : 'border-[var(--color-border)] bg-white text-gray-900'}`}
                  >
                    {OBJECTIVE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => deleteRow(r.id)} className="text-red-600 hover:text-red-700">Șterge</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
