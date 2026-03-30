'use client';

import { useState, useEffect } from 'react';

interface GAData {
  stats: {
    sessions: number;
    activeUsers: number;
    pageViews: number;
    bounceRate: number;
    avgSessionDuration: number;
    newUsers: number;
  };
  topPages: { path: string; title: string; views: number; users: number; avgDuration: number }[];
  topSources: { source: string; medium: string; sessions: number; users: number }[];
  topCountries: { country: string; users: number }[];
  topCities: { city: string; users: number }[];
  landingPages: { page: string; sessions: number; bounceRate: number; avgDuration: number }[];
}

function fmtDuration(seconds: number) {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtPct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

export default function GASection() {
  const [data, setData] = useState<GAData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState(7);

  const load = async (d: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/ga?days=${d}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Eroare');
      setData(json);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(days); }, []);

  const applyDays = (d: number) => { setDays(d); load(d); };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-primary)]">📊 Google Analytics</h2>
          <p className="text-sm text-[var(--color-text-light)] mt-1">Date reale din GA4</p>
        </div>
        <div className="flex gap-2">
          {[1, 7, 30, 90].map(d => (
            <button key={d} onClick={() => applyDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                days === d ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {d === 1 ? 'Azi' : `${d}z`}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">Eroare: {error}</p>
          <p className="text-red-500 text-sm mt-1">Verifica ca Google Analytics Data API este activata in Google Cloud Console.</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Utilizatori', value: data.stats.activeUsers, icon: '👥', color: 'text-blue-700', bg: 'from-blue-50 to-blue-100', border: 'border-blue-200' },
              { label: 'Sesiuni', value: data.stats.sessions, icon: '🖥️', color: 'text-purple-700', bg: 'from-purple-50 to-purple-100', border: 'border-purple-200' },
              { label: 'Pageviews', value: data.stats.pageViews, icon: '📄', color: 'text-green-700', bg: 'from-green-50 to-green-100', border: 'border-green-200' },
              { label: 'Noi', value: data.stats.newUsers, icon: '✨', color: 'text-orange-700', bg: 'from-orange-50 to-orange-100', border: 'border-orange-200' },
              { label: 'Bounce rate', value: fmtPct(data.stats.bounceRate), icon: '↩️', color: 'text-red-700', bg: 'from-red-50 to-red-100', border: 'border-red-200' },
              { label: 'Timp/sesiune', value: fmtDuration(data.stats.avgSessionDuration), icon: '⏱️', color: 'text-teal-700', bg: 'from-teal-50 to-teal-100', border: 'border-teal-200' },
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-xl p-4 shadow-sm`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Top Pages + Landing Pages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Pages */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-4 text-[var(--color-primary)]">📄 Top Pagini</h3>
              {data.topPages.length === 0 ? (
                <p className="text-sm text-[var(--color-text-light)]">Nicio pagina inca</p>
              ) : (() => {
                const max = Math.max(...data.topPages.map(p => p.views), 1);
                return data.topPages.map((p, i) => (
                  <div key={p.path} className="py-2.5 border-b border-[var(--color-border)] last:border-0">
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[var(--color-primary)] mr-1">#{i + 1}</span>
                        <span className="text-sm truncate">{p.path}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-500">
                        <span>{fmtDuration(p.avgDuration)}</span>
                        <span className="font-bold text-gray-700">{p.views}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" style={{ width: `${p.views / max * 100}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Landing Pages (intrare in site) */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-1 text-[var(--color-primary)]">🚪 Pagini de intrare</h3>
              <p className="text-xs text-[var(--color-text-light)] mb-4">Prima pagina vizitata de fiecare user</p>
              {data.landingPages.length === 0 ? (
                <p className="text-sm text-[var(--color-text-light)]">Nicio data inca</p>
              ) : (() => {
                const max = Math.max(...data.landingPages.map(p => p.sessions), 1);
                return data.landingPages.map((p, i) => (
                  <div key={p.page} className="py-2.5 border-b border-[var(--color-border)] last:border-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-sm truncate min-w-0">{p.page || '/'}</span>
                      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-500">
                        <span>bounce: {fmtPct(p.bounceRate)}</span>
                        <span>{fmtDuration(p.avgDuration)}</span>
                        <span className="font-bold text-gray-700">{p.sessions}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full" style={{ width: `${p.sessions / max * 100}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Sources + Geo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Sources */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-4 text-[var(--color-primary)]">🔗 Surse trafic</h3>
              {data.topSources.length === 0 ? (
                <p className="text-sm text-[var(--color-text-light)]">Nicio sursa inca</p>
              ) : (() => {
                const max = Math.max(...data.topSources.map(s => s.sessions), 1);
                const icons: Record<string, string> = { google: '🔍', '(direct)': '⭐', facebook: '👍', instagram: '📸', bing: '🔎', youtube: '▶️' };
                return data.topSources.map(s => {
                  const label = s.source === '(direct)' ? 'Direct' : `${s.source} / ${s.medium}`;
                  return (
                    <div key={`${s.source}-${s.medium}`} className="py-2.5 border-b border-[var(--color-border)] last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex-shrink-0">{icons[s.source] || '🌐'}</span>
                          <span className="text-sm truncate">{label}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                          <span className="text-gray-500">{s.users} users</span>
                          <span className="font-bold text-gray-700">{s.sessions}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" style={{ width: `${s.sessions / max * 100}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Geo */}
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-bold mb-4 text-[var(--color-primary)]">🗺️ Locatie</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Tari</p>
                  {data.topCountries.map(c => (
                    <div key={c.country} className="flex justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
                      <span className="text-sm truncate">{c.country}</span>
                      <span className="text-sm font-bold text-gray-600 ml-2">{c.users}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Orase</p>
                  {data.topCities.map(c => (
                    <div key={c.city} className="flex justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
                      <span className="text-sm truncate">{c.city}</span>
                      <span className="text-sm font-bold text-gray-600 ml-2">{c.users}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
