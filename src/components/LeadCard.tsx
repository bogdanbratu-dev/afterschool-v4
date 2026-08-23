'use client';

export interface Lead {
  id: number;
  listing_type: string;
  listing_id: number;
  listing_name: string;
  parent_name: string;
  parent_phone: string;
  message: string | null;
  status: string;
  created_at: number;
  source: string | null;
  match_context: string | null;
  owner_phone: string | null;
  owner_email: string | null;
}

interface Props {
  lead: Lead;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  onMarkSeen: (id: number) => void;
  onForwardEmail: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function LeadCard({ lead, selected, onToggleSelect, onMarkSeen, onForwardEmail, onDelete }: Props) {
  const waText = encodeURIComponent(`Bună ziua! Aveți o cerere nouă de informații prin ActivKids.ro.\n\nNume: ${lead.parent_name}\nTelefon: ${lead.parent_phone}${lead.message ? `\nMesaj: "${lead.message}"` : ''}\n\nVă rugăm să îi contactați.`);
  const ownerPhone = lead.owner_phone?.replace(/\s/g, '').replace(/^0/, '40');
  const listingUrl = lead.listing_type === 'afterschool' ? `/afterschool` : `/activitati`;

  return (
    <div className={`border rounded-xl p-4 ${lead.status === 'new' ? 'border-purple-300 bg-purple-50' : 'border-[var(--color-border)]'} ${selected ? 'ring-2 ring-purple-400' : ''}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(lead.id)} className="mt-1 flex-shrink-0 cursor-pointer w-4 h-4" />
        <div className="flex-1 min-w-0">
          {/* Parinte */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {lead.status === 'new' && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">Nou</span>}
            {lead.status === 'forwarded' && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">Trimis</span>}
            <span className="font-semibold text-sm">{lead.parent_name}</span>
            <a href={`tel:${lead.parent_phone}`} className="text-sm text-[var(--color-primary)] font-medium">{lead.parent_phone}</a>
            <span className="text-xs text-[var(--color-text-light)]">{new Date(lead.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {lead.message && <p className="text-xs italic text-[var(--color-text-light)] mb-2">"{lead.message}"</p>}
          {/* Listare */}
          <div className="flex items-center gap-2 flex-wrap text-xs mt-1 pt-2 border-t border-[var(--color-border)]">
            <span className="text-[var(--color-text-light)]">Pentru:</span>
            <a href={listingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--color-primary)] hover:underline">{lead.listing_name}</a>
            <span className="text-[var(--color-text-light)]">({lead.listing_type})</span>
            {lead.owner_phone && <a href={`tel:${lead.owner_phone}`} className="text-[var(--color-text-light)] hover:text-[var(--color-primary)]">📞 {lead.owner_phone}</a>}
            {lead.owner_email && <a href={`mailto:${lead.owner_email}`} className="text-[var(--color-text-light)] hover:text-[var(--color-primary)]">✉ {lead.owner_email}</a>}
          </div>
        </div>
        {/* Actiuni */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {lead.status === 'new' && (
            <button onClick={() => onMarkSeen(lead.id)} className="text-xs px-3 py-1.5 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-100">
              Marchează văzut
            </button>
          )}
          {ownerPhone && (
            <a href={`https://wa.me/${ownerPhone}?text=${waText}`} target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-center">
              WhatsApp owner
            </a>
          )}
          {lead.owner_email && (
            <button onClick={() => onForwardEmail(lead.id)} className="text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
              Email owner
            </button>
          )}
          <button onClick={() => onDelete(lead.id)} className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
            Șterge
          </button>
        </div>
      </div>
    </div>
  );
}
