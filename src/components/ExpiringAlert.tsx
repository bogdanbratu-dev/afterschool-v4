'use client';
import { useState, useEffect } from 'react';

interface ExpiringItem {
  id: number;
  name: string;
  premium_expires_at: string;
  listing_type: string;
  table_name: string;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function ExpiringAlert() {
  const [items, setItems] = useState<ExpiringItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/admin/expiring').then(r => r.json()).then(setItems).catch(() => {});
  }, []);

  if (items.length === 0) return null;

  const expired = items.filter(i => daysUntil(i.premium_expires_at) < 0);
  const soon = items.filter(i => daysUntil(i.premium_expires_at) >= 0);

  return (
    <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-amber-400">
          ⚠ {expired.length > 0 && <span className="text-red-400">{expired.length} expirate</span>}
          {expired.length > 0 && soon.length > 0 && <span className="text-amber-400"> · </span>}
          {soon.length > 0 && <span className="text-amber-400">{soon.length} expiră în &lt;30 zile</span>}
        </span>
        <button onClick={() => setCollapsed(c => !c)} className="text-slate-400 hover:text-white text-xs px-2">
          {collapsed ? '▼ Arată' : '▲ Ascunde'}
        </button>
      </div>
      {!collapsed && (
        <div className="mt-2 space-y-1">
          {expired.map(i => {
            const d = daysUntil(i.premium_expires_at);
            return (
              <div key={i.table_name + i.id} className="flex items-center gap-3 text-sm">
                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">EXPIRAT {Math.abs(d)}z</span>
                <span className="text-white font-medium">{i.name}</span>
                <span className="text-slate-400 text-xs">{i.listing_type}</span>
                <span className="text-slate-500 text-xs">{i.premium_expires_at}</span>
              </div>
            );
          })}
          {soon.map(i => {
            const d = daysUntil(i.premium_expires_at);
            return (
              <div key={i.table_name + i.id} className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${d <= 7 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {d}z
                </span>
                <span className="text-white font-medium">{i.name}</span>
                <span className="text-slate-400 text-xs">{i.listing_type}</span>
                <span className="text-slate-500 text-xs">{i.premium_expires_at}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
