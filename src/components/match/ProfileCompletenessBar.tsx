type CompletenessListing = {
  activities?: string | null;
  description?: string | null;
  price_min?: number | null;
  age_min?: number | null;
  pickup_time?: string | null;
  end_time?: string | null;
  schedule?: string | null;
  phone?: string | null;
};

function computeCompleteness(listing: CompletenessListing): number {
  const checks = [
    !!(listing.activities?.trim() || listing.description?.trim()),
    listing.price_min !== null && listing.price_min !== undefined,
    listing.age_min !== null && listing.age_min !== undefined,
    !!(listing.end_time?.trim() || listing.pickup_time?.trim() || listing.schedule?.trim()),
    !!listing.phone?.trim(),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export default function ProfileCompletenessBar({ listing }: { listing: CompletenessListing }) {
  const pct = computeCompleteness(listing);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400';

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-amber-900">Profil completat {pct}%</span>
        <span className="text-amber-700">🎯 Potrivire</span>
      </div>
      <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-amber-700">
        Profilurile complete (activități, preț, vârstă, program, telefon) apar mai des și mai sus în recomandările din Potrivire.
      </p>
    </div>
  );
}
