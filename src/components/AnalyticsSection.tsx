'use client';

import { useState } from 'react';

function exportToPdf(analyticsData: any, selectedPage: string, analyticsDays: number, analyticsFrom: string, analyticsTo: string) {
  const linkIcon: Record<string, string> = { phone: '📞', website: '🌐', maps: '🗺️', email: '✉️' };
  const linkLabel: Record<string, string> = { phone: 'Telefon', website: 'Website', maps: 'Harta', email: 'Email' };
  const typeIcon: Record<string, string> = { afterschool: '🏫', club: '⚽' };
  const period = analyticsFrom && analyticsTo ? `${analyticsFrom} → ${analyticsTo}` : `Ultimele ${analyticsDays} zile`;

  // Group clicks by item
  const grouped: Record<string, { type: string; total: number; byLink: Record<string, number> }> = {};
  for (const c of (analyticsData.topClicks || [])) {
    if (!grouped[c.name]) grouped[c.name] = { type: c.type, total: 0, byLink: {} };
    grouped[c.name].total += c.count;
    const lt = c.link_type || 'altele';
    grouped[c.name].byLink[lt] = (grouped[c.name].byLink[lt] || 0) + c.count;
  }
  const sortedClicks = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);

  const html = `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<title>Raport Analytics${selectedPage ? ' - ' + selectedPage : ''} - ${period}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: white; padding: 24px; }
  h1 { font-size: 20px; color: #1d4ed8; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #1d4ed8; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .meta { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .card { background: #f3f4f6; border-radius: 8px; padding: 10px; text-align: center; }
  .card .val { font-size: 22px; font-weight: bold; color: #1d4ed8; }
  .card .lbl { font-size: 10px; color: #6b7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 11px; color: #6b7280; }
  td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
  .badge { display: inline-block; background: #e5e7eb; border-radius: 9999px; padding: 2px 8px; font-size: 10px; margin: 1px; }
  .bar-wrap { background: #f3f4f6; border-radius: 4px; height: 6px; margin-top: 3px; }
  .bar { background: #f97316; border-radius: 4px; height: 6px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<h1>📊 Raport Analytics</h1>
<p class="meta">Perioada: ${period}${selectedPage ? ' · Pagina: ' + selectedPage : ''} · Generat: ${new Date().toLocaleString('ro-RO')}</p>

<div class="grid">
  <div class="card"><div class="val">${analyticsData.total}</div><div class="lbl">Total vizite</div></div>
  <div class="card"><div class="val">${Math.round(analyticsData.total / (analyticsData.days || analyticsDays))}</div><div class="lbl">Medie/zi</div></div>
  <div class="card"><div class="val">${Math.max(...(analyticsData.visitsByDay || []).map((d: any) => d.count), 0)}</div><div class="lbl">Cea mai buna zi</div></div>
  <div class="card"><div class="val">${Object.keys(analyticsData.pageBreakdown || {}).length}</div><div class="lbl">Pagini unice</div></div>
</div>

<h2>👆 Click-uri pe rezultate</h2>
<table>
  <tr><th>Rezultat</th><th>Total</th><th>Detaliu</th></tr>
  ${sortedClicks.map(([name, item]) => `
  <tr>
    <td>${typeIcon[item.type] || '📌'} <strong>${name}</strong></td>
    <td><strong>${item.total}</strong></td>
    <td>${Object.entries(item.byLink).map(([lt, cnt]) => `<span class="badge">${linkIcon[lt] || '🔗'} ${linkLabel[lt] || lt}: ${cnt}</span>`).join('')}</td>
  </tr>`).join('')}
</table>

<h2>📄 Top Pagini</h2>
<table>
  <tr><th>#</th><th>Pagina</th><th>Vizite</th></tr>
  ${Object.entries(analyticsData.pageBreakdown || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 15).map(([page, count]: any, i) => `
  <tr><td>${i + 1}</td><td>${page}</td><td>${count}</td></tr>`).join('')}
</table>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
<div>
<h2>🔗 Surse trafic</h2>
<table>
  <tr><th>Sursa</th><th>Vizite</th></tr>
  ${Object.entries(analyticsData.sourceBreakdown || {}).sort((a: any, b: any) => b[1] - a[1]).map(([src, cnt]: any) => `
  <tr><td>${src}</td><td>${cnt}</td></tr>`).join('')}
</table>
</div>
<div>
<h2>🗺️ Tari</h2>
<table>
  <tr><th>Tara</th><th>Vizite</th></tr>
  ${(analyticsData.topCountries || []).slice(0, 8).map((c: any) => `
  <tr><td>${c.country}</td><td>${c.count}</td></tr>`).join('')}
</table>
</div>
</div>

${(analyticsData.topSearches || []).length > 0 ? `
<h2>🔍 Cautari in site</h2>
<table>
  <tr><th>Cautare</th><th>Nr.</th></tr>
  ${analyticsData.topSearches.map((s: any) => `<tr><td>${s.query}</td><td>${s.count}</td></tr>`).join('')}
</table>` : ''}

<script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function AnalyticsSection({
  activeTab,
  analyticsDays,
  setAnalyticsDays,
  analyticsFrom,
  setAnalyticsFrom,
  analyticsTo,
  setAnalyticsTo,
  analyticsLoading,
  analyticsData,
  dayDetails,
  setDayDetails,
  loadAnalytics,
  loadDayDetails,
  searchConsoleData
}: any) {
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedPage, setSelectedPage] = useState('');

  const quickPresets = [
    { label: 'Azi', days: 1, from: todayStr(), to: todayStr() },
    { label: 'Ieri', days: 1, from: yesterdayStr(), to: yesterdayStr() },
    { label: '7 zile', days: 7, from: null, to: null },
    { label: '30 zile', days: 30, from: null, to: null },
    { label: '90 zile', days: 90, from: null, to: null },
  ];

  const isPresetActive = (p: typeof quickPresets[0]) => {
    if (p.from) return analyticsFrom === p.from && analyticsTo === p.to;
    return !analyticsFrom && analyticsDays === p.days;
  };

  const applyPreset = (p: typeof quickPresets[0]) => {
    setShowCustom(false);
    if (p.from) {
      setAnalyticsFrom(p.from);
      setAnalyticsTo(p.to);
      setAnalyticsDays(p.days);
      loadAnalytics(p.days, p.from, p.to, selectedPage || undefined);
    } else {
      setAnalyticsFrom('');
      setAnalyticsTo('');
      setAnalyticsDays(p.days);
      loadAnalytics(p.days, undefined, undefined, selectedPage || undefined);
    }
  };

  const applyCustom = () => {
    if (!customFrom || !customTo || customFrom > customTo) return;
    const days = Math.max(1, Math.round((new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000) + 1);
    setAnalyticsFrom(customFrom);
    setAnalyticsTo(customTo);
    setAnalyticsDays(days);
    loadAnalytics(days, customFrom, customTo, selectedPage || undefined);
    setShowCustom(false);
  };

  const applyPageFilter = (page: string) => {
    setSelectedPage(page);
    if (analyticsFrom && analyticsTo) {
      loadAnalytics(analyticsDays, analyticsFrom, analyticsTo, page || undefined);
    } else {
      loadAnalytics(analyticsDays, undefined, undefined, page || undefined);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-primary)]">📊 Traffic Analytics</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {analyticsFrom && analyticsTo ? (
                <p className="text-sm text-[var(--color-text-light)]">{analyticsFrom} → {analyticsTo}</p>
              ) : (
                <p className="text-sm text-[var(--color-text-light)]">Ultimele {analyticsDays} zile</p>
              )}
              {selectedPage && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  📄 {selectedPage}
                  <button onClick={() => applyPageFilter('')} className="ml-1 hover:text-blue-900">✕</button>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {analyticsData && (
              <button
                onClick={() => exportToPdf(analyticsData, selectedPage, analyticsDays, analyticsFrom, analyticsTo)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-all flex items-center gap-1.5"
              >
                ⬇️ Export PDF
              </button>
            )}
            {quickPresets.map(p => (
              <button key={p.label} onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  isPresetActive(p)
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                showCustom
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              Perioada custom
            </button>
          </div>
        </div>

        {/* Custom date range picker */}
        {showCustom && (
          <div className="flex flex-wrap items-end gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">De la</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                max={todayStr()}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pana la</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                min={customFrom} max={todayStr()}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-900" />
            </div>
            <button
              onClick={applyCustom}
              disabled={!customFrom || !customTo || customFrom > customTo}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-all">
              Aplica
            </button>
          </div>
        )}
        {/* Filtru pagina */}
        {analyticsData && Object.keys(analyticsData.pageBreakdown || {}).length > 0 && (
          <div className="flex items-center gap-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-text-light)] flex-shrink-0">📄 Filtreaza pagina:</span>
            <select
              value={selectedPage}
              onChange={e => applyPageFilter(e.target.value)}
              className="flex-1 text-sm bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">— Toate paginile —</option>
              {Object.entries(analyticsData.pageBreakdown)
                .sort((a: any, b: any) => b[1] - a[1])
                .map(([page, count]: any) => (
                  <option key={page} value={page}>{page} ({count})</option>
                ))}
            </select>
          </div>
        )}
      </div>

      {analyticsLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !analyticsData ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <p className="text-blue-700">No analytics data yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 🎯 STAT CARDS - JETPACK STYLE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Visits', value: analyticsData.total, icon: '📈', color: 'from-blue-50 to-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
              { label: 'Avg/Day', value: Math.round(analyticsData.total / (analyticsData.days || analyticsDays)), icon: '📊', color: 'from-purple-50 to-purple-100', textColor: 'text-purple-700', borderColor: 'border-purple-200' },
              { label: 'Best Day', value: Math.max(...analyticsData.visitsByDay.map((d: any) => d.count), 0), icon: '🔥', color: 'from-orange-50 to-orange-100', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
              { label: 'Top Pages', value: Object.keys(analyticsData.pageBreakdown).length, icon: '📄', color: 'from-green-50 to-green-100', textColor: 'text-green-700', borderColor: 'border-green-200' }
            ].map(stat => (
              <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-xl border ${stat.borderColor} p-5 shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-1">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
                  </div>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 📈 CHART */}
          <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-primary)]">Visits Timeline</h3>
                <p className="text-sm text-[var(--color-text-light)]">Click bars for daily details</p>
              </div>
            </div>

            {(() => {
              const max = Math.max(...analyticsData.visitsByDay.map((d: any) => d.count), 1);
              return (
                <div className="flex items-end gap-2 h-48">
                  {analyticsData.visitsByDay.map((d: any) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                      <span className="text-xs font-semibold text-[var(--color-text-main)] opacity-0 group-hover:opacity-100 transition-opacity h-5">
                        {d.count}
                      </span>
                      <div
                        className="w-full rounded-t-lg opacity-70 transition-all cursor-pointer hover:opacity-100 hover:shadow-lg group-hover:shadow-xl bg-gradient-to-t from-blue-500 to-blue-400"
                        style={{ height: `${Math.max((d.count / max) * 160, d.count > 0 ? 8 : 2)}px` }}
                        onClick={() => loadDayDetails(d.date)}
                        title={`Click for details: ${d.date}`}
                      />
                      <span className="text-xs font-medium text-[var(--color-text-light)]">{d.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* 📱 GRID WITH BREAKDOWNS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pages */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-4 text-[var(--color-primary)]">📄 Top Pages</h3>
              {(() => {
                const entries = Object.entries(analyticsData.pageBreakdown).sort((a: any, b: any) => b[1] - a[1]);
                const total = entries.reduce((sum, [, count]: any) => sum + count, 0) || 1;
                return entries.slice(0, 5).map(([page, count]: any, i) => (
                  <div key={page} className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-bold text-[var(--color-primary)]">#{i + 1}</span>
                      <span className="text-sm truncate">{page}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500" style={{ width: `${count / total * 100}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-600 w-10 text-right">{count}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Devices */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-4 text-[var(--color-primary)]">📱 Devices</h3>
              {(() => {
                const total: number = Object.values(analyticsData.deviceBreakdown).reduce((a: number, b: unknown) => a + (b as number), 0) || 1;
                const labels: Record<string, string> = { mobile: '📱 Mobile', desktop: '💻 Desktop' };
                const colors = { mobile: 'from-purple-400 to-purple-500', desktop: 'from-blue-400 to-blue-500' };
                return Object.entries(analyticsData.deviceBreakdown).map(([device, count]) => (
                  <div key={device} className="py-3 border-b border-[var(--color-border)] last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">{labels[device]}</span>
                      <span className="text-sm font-bold">{Math.round((count as number) / total * 100)}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${colors[device as keyof typeof colors] || 'from-gray-400 to-gray-500'}`} style={{ width: `${(count as number) / total * 100}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* 🔗 SOURCES & REFERRERS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Sources */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-4 text-[var(--color-primary)]">🔗 Surse trafic</h3>
              {(() => {
                const entries = Object.entries(analyticsData.sourceBreakdown || {}).sort((a: any, b: any) => b[1] - a[1]);
                const total = entries.reduce((sum, [, count]: any) => sum + count, 0) || 1;
                const icons: Record<string, string> = { google: '🔍', direct: '⭐', facebook: '👍', instagram: '📸', bing: '🔎', yahoo: '🟣', tiktok: '🎵', youtube: '▶️', other: '🌐' };
                const labels: Record<string, string> = { google: 'Google', direct: 'Direct / bookmark', facebook: 'Facebook', instagram: 'Instagram', bing: 'Bing', yahoo: 'Yahoo', tiktok: 'TikTok', youtube: 'YouTube', other: 'Altele' };
                return entries.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-light)]">Nicio vizita inca</p>
                ) : entries.map(([source, count]: any) => (
                  <div key={source} className="py-2.5 border-b border-[var(--color-border)] last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span>{icons[source] || '🌐'}</span>
                        <span className="text-sm font-medium">{labels[source] || source}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{Math.round(count / total * 100)}%</span>
                        <span className="text-sm font-bold text-gray-600 w-8 text-right">{count}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" style={{ width: `${count / total * 100}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Top Referrers */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-1 text-[var(--color-primary)]">🌐 Referrers</h3>
              <p className="text-xs text-[var(--color-text-light)] mb-4">Site-uri care au trimis vizitatori</p>
              {(analyticsData.topReferrers || []).length === 0 ? (
                <p className="text-sm text-[var(--color-text-light)]">Niciun referrer extern inca</p>
              ) : (() => {
                const total = (analyticsData.topReferrers || []).reduce((s: number, r: any) => s + r.count, 0) || 1;
                return (analyticsData.topReferrers || []).map((r: any) => (
                  <div key={r.domain} className="py-2.5 border-b border-[var(--color-border)] last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate max-w-[180px]">{r.domain}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">{Math.round(r.count / total * 100)}%</span>
                        <span className="text-sm font-bold text-gray-600 w-8 text-right">{r.count}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full" style={{ width: `${r.count / total * 100}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* LOCATIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Countries */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-4 text-[var(--color-primary)]">🗺️ Tari</h3>
              {(analyticsData.topCountries || []).length === 0 ? (
                <p className="text-sm text-[var(--color-text-light)]">Nicio locatie inca</p>
              ) : (() => {
                const total = (analyticsData.topCountries || []).reduce((s: number, c: any) => s + c.count, 0) || 1;
                return (analyticsData.topCountries || []).slice(0, 6).map((c: any) => (
                  <div key={c.country} className="py-2.5 border-b border-[var(--color-border)] last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{c.country}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{Math.round(c.count / total * 100)}%</span>
                        <span className="text-sm font-bold text-gray-600 w-8 text-right">{c.count}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" style={{ width: `${c.count / total * 100}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Top Clicks in site */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-1 text-[var(--color-primary)]">👆 Click-uri in site</h3>
              <p className="text-xs text-[var(--color-text-light)] mb-4">Cele mai accesate afterschool-uri si activitati</p>
              {(analyticsData.topClicks || []).length === 0 ? (
                <p className="text-sm text-[var(--color-text-light)]">Niciun click inregistrat inca</p>
              ) : (() => {
                const linkIcon: Record<string, string> = { phone: '📞', website: '🌐', maps: '🗺️', email: '✉️' };
                const linkLabel: Record<string, string> = { phone: 'Telefon', website: 'Website', maps: 'Harta', email: 'Email' };
                const typeIcon: Record<string, string> = { afterschool: '🏫', club: '⚽' };
                // Group by item name
                const grouped: Record<string, { type: string; total: number; byLink: Record<string, number> }> = {};
                for (const c of (analyticsData.topClicks || [])) {
                  if (!grouped[c.name]) grouped[c.name] = { type: c.type, total: 0, byLink: {} };
                  grouped[c.name].total += c.count;
                  const lt = c.link_type || 'altele';
                  grouped[c.name].byLink[lt] = (grouped[c.name].byLink[lt] || 0) + c.count;
                }
                const sorted = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);
                const grandTotal = sorted.reduce((s, [, v]) => s + v.total, 0) || 1;
                return sorted.slice(0, 8).map(([name, item]) => (
                  <div key={name} className="py-3 border-b border-[var(--color-border)] last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="flex-shrink-0">{typeIcon[item.type] || '📌'}</span>
                        <span className="text-sm font-semibold truncate max-w-[180px]">{name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-700 flex-shrink-0">{item.total} click-uri</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full" style={{ width: `${item.total / grandTotal * 100}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(item.byLink).sort((a, b) => b[1] - a[1]).map(([lt, cnt]) => (
                        <span key={lt} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {linkIcon[lt] || '🔗'} {linkLabel[lt] || lt}: <strong>{cnt}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Tip link clicks */}
          {analyticsData.linkTypeBreakdown && Object.keys(analyticsData.linkTypeBreakdown).length > 0 && (
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-1 text-[var(--color-primary)]">📲 Tipuri de click-uri</h3>
              <p className="text-xs text-[var(--color-text-light)] mb-4">Pe ce au dat click utilizatorii</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(analyticsData.linkTypeBreakdown)
                  .sort((a: any, b: any) => b[1] - a[1])
                  .map(([lt, count]: any) => {
                    const icons: Record<string, string> = { phone: '📞', website: '🌐', maps: '🗺️', email: '✉️', necunoscut: '❓' };
                    const labels: Record<string, string> = { phone: 'Telefon', website: 'Website', maps: 'Harta', email: 'Email', necunoscut: 'Altele' };
                    return (
                      <div key={lt} className="bg-[var(--color-bg)] rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">{icons[lt] || '❓'}</div>
                        <div className="text-xl font-bold text-[var(--color-text-main)]">{count}</div>
                        <div className="text-xs text-[var(--color-text-light)]">{labels[lt] || lt}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 🔍 SEARCHES & KEYWORDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cautari in site */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-1 text-[var(--color-primary)]">🔍 Cautari in site</h3>
              <p className="text-xs text-[var(--color-text-light)] mb-4">Ce au cautat utilizatorii in bara de cautare</p>
              {analyticsData.topSearches.length === 0 ? (
                <p className="text-sm text-[var(--color-text-light)]">Nicio cautare inca</p>
              ) : (
                <div className="space-y-2">
                  {analyticsData.topSearches.slice(0, 8).map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                      <span className="text-sm font-medium truncate max-w-[200px]">{s.query}</span>
                      <span className="text-sm font-bold text-green-600 flex-shrink-0">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cuvinte cheie motoare de cautare */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-1 text-[var(--color-primary)]">🗝️ Cuvinte cheie</h3>
              <p className="text-xs text-[var(--color-text-light)] mb-4">Din Bing/Yahoo/DuckDuckGo — Google le ascunde</p>
              {(analyticsData.topKeywords || []).length === 0 ? (
                <div>
                  <p className="text-sm text-[var(--color-text-light)]">Niciun cuvant cheie disponibil</p>
                  <p className="text-xs text-gray-400 mt-2">Google nu permite accesul la cuvintele cheie organice. Datele apar doar daca cineva vine de pe Bing, Yahoo sau DuckDuckGo.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {analyticsData.topKeywords.map((k: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                      <span className="text-sm font-medium truncate max-w-[200px]">{k.keyword}</span>
                      <span className="text-sm font-bold text-purple-600 flex-shrink-0">{k.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Daily Details Panel */}
          {dayDetails && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--color-primary)]">📅 Details for {dayDetails.date}</h3>
                <button onClick={() => setDayDetails(null)} className="text-xl text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                  <p className="text-3xl font-bold text-blue-600">{dayDetails.totalVisits}</p>
                  <p className="text-xs text-gray-600 mt-1">Visits</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                  <p className="text-3xl font-bold text-purple-600">{dayDetails.totalClicks}</p>
                  <p className="text-xs text-gray-600 mt-1">Clicks</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                  <p className="text-3xl font-bold text-green-600">{dayDetails.totalSearches}</p>
                  <p className="text-xs text-gray-600 mt-1">Searches</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                  <p className="text-3xl font-bold text-orange-600">{Object.keys(dayDetails.countryBreakdown).length}</p>
                  <p className="text-xs text-gray-600 mt-1">Countries</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
