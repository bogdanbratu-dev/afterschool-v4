"use client";
import { useState, useEffect, useCallback } from "react";

interface CollabRow {
  id: number;
  from_type: string; from_id: number;
  to_type: string; to_id: number;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: number;
  counterpart_name: string;
  counterpart_phone: string | null;
  counterpart_email: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  afterschool: 'After School', professional: 'Colaborator', caterer: 'Catering', club: 'Activitate', kindergarten: 'Gradinita / Cresa',
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-gray-100 text-gray-500',
  };
  const label: Record<string, string> = { pending: 'In asteptare', accepted: 'Acceptat', declined: 'Refuzat' };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${map[status] || ''}`}>{label[status] || status}</span>;
}

export default function CollaborationsTab() {
  const [data, setData] = useState<{ received: CollabRow[]; sent: CollabRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/user/collaborations');
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const respond = async (id: number, status: 'accepted' | 'declined') => {
    setBusy(id);
    await fetch('/api/user/collaborations', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setBusy(null);
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-sm text-gray-500 py-6 text-center">Nu s-au putut incarca colaborarile.</p>;

  const Contact = ({ row }: { row: CollabRow }) => (
    (row.status === 'accepted' && (row.counterpart_phone || row.counterpart_email)) ? (
      <div className="mt-1 flex flex-wrap gap-2 text-xs">
        {row.counterpart_phone && <a href={`tel:${row.counterpart_phone}`} className="text-indigo-600 hover:underline">{row.counterpart_phone}</a>}
        {row.counterpart_email && <a href={`mailto:${row.counterpart_email}`} className="text-indigo-600 hover:underline">{row.counterpart_email}</a>}
      </div>
    ) : null
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Primite */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">Cereri primite <span className="text-sm font-normal text-gray-400">({data.received.length})</span></h2>
        {data.received.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center bg-gray-50 rounded-xl">Nicio cerere primita.</p>
        ) : (
          <div className="space-y-2">
            {data.received.map(row => (
              <div key={row.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{row.counterpart_name} <span className="text-xs font-normal text-gray-400">({TYPE_LABEL[row.from_type] || row.from_type})</span></p>
                    {row.message && <p className="text-sm text-gray-600 mt-1">{row.message}</p>}
                    <Contact row={row} />
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                {row.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => respond(row.id, 'accepted')} disabled={busy === row.id}
                      className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg">Accepta</button>
                    <button onClick={() => respond(row.id, 'declined')} disabled={busy === row.id}
                      className="px-4 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium rounded-lg">Refuza</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trimise */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">Cereri trimise <span className="text-sm font-normal text-gray-400">({data.sent.length})</span></h2>
        {data.sent.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center bg-gray-50 rounded-xl">Nicio cerere trimisa. Foloseste tab-ul de Colaboratori pentru a trimite cereri.</p>
        ) : (
          <div className="space-y-2">
            {data.sent.map(row => (
              <div key={row.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{row.counterpart_name} <span className="text-xs font-normal text-gray-400">({TYPE_LABEL[row.to_type] || row.to_type})</span></p>
                    {row.message && <p className="text-sm text-gray-600 mt-1">{row.message}</p>}
                    <Contact row={row} />
                  </div>
                  <StatusBadge status={row.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
