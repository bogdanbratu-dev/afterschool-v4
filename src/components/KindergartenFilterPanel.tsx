'use client';

interface FilterPanelProps {
  filters: {
    type: string;
    priceMax: string;
    dropoffTime: string;
    pickupMin: string;
    activities: string[];
    sector: string;
    radiusKm: string;
    onlyAvailable: boolean;
  };
  onFilterChange: (filters: FilterPanelProps['filters']) => void;
  hasLocation?: boolean;
}

const ALL_ACTIVITIES = [
  'Engleza', 'Arte', 'Muzica', 'Sport', 'Dans', 'Inot',
  'Robotica', 'Logopedie', 'Balet', 'Karate', 'Teatru', 'Gimnastica',
];

const RADIUS_OPTIONS = ['1', '2', '3', '5', '10', '15', '20'];

export default function KindergartenFilterPanel({ filters, onFilterChange, hasLocation }: FilterPanelProps) {
  const toggleActivity = (activity: string) => {
    const current = filters.activities;
    if (current.includes(activity)) {
      onFilterChange({ ...filters, activities: current.filter(a => a !== activity) });
    } else {
      onFilterChange({ ...filters, activities: [...current, activity] });
    }
  };

  return (
    <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] p-5">
      <h3 className="font-semibold text-lg mb-4 text-[var(--color-text-main)]">Filtre</h3>

      {/* Type */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
          Tip
        </label>
        <div className="flex flex-wrap gap-2">
          {[['', 'Toate'], ['gradinita', 'Gradinite'], ['cresa', 'Crese']].map(([value, label]) => (
            <button
              key={value}
              onClick={() => onFilterChange({ ...filters, type: value })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filters.type === value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-main)] hover:bg-[var(--color-border)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Radius - only relevant when a location is selected */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
          Raza de cautare
        </label>
        {!hasLocation && (
          <p className="text-xs text-amber-600 mb-2">Cauta dupa o adresa pentru a activa acest filtru</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange({ ...filters, radiusKm: '' })}
            disabled={!hasLocation}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !filters.radiusKm
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg)] text-[var(--color-text-main)] hover:bg-[var(--color-border)]'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Oricare
          </button>
          {RADIUS_OPTIONS.map((km) => (
            <button
              key={km}
              onClick={() => onFilterChange({ ...filters, radiusKm: km })}
              disabled={!hasLocation}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filters.radiusKm === km
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-main)] hover:bg-[var(--color-border)]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
          Pret maxim (lei/luna)
        </label>
        <input
          type="range"
          min="400"
          max="4000"
          step="50"
          value={filters.priceMax || '2500'}
          onChange={(e) => onFilterChange({ ...filters, priceMax: e.target.value })}
          className="w-full accent-[var(--color-primary)]"
        />
        <div className="flex justify-between text-sm text-[var(--color-text-light)] mt-1">
          <span>400 lei</span>
          <span className="font-semibold text-[var(--color-primary)]">
            {filters.priceMax ? `${filters.priceMax} lei` : 'Oricare'}
          </span>
          <span>4000 lei</span>
        </div>
      </div>

      {/* Dropoff time */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
          Ora la care aduci copilul
        </label>
        <p className="text-xs text-[var(--color-text-light)] mb-2">La ce ora ai nevoie sa il duci dimineata?</p>
        <select
          value={filters.dropoffTime}
          onChange={(e) => onFilterChange({ ...filters, dropoffTime: e.target.value })}
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text-main)]"
        >
          <option value="">Oricare</option>
          <option value="07:00">07:00</option>
          <option value="07:30">07:30</option>
          <option value="08:00">08:00</option>
          <option value="08:30">08:30</option>
          <option value="09:00">09:00</option>
        </select>
      </div>

      {/* Pickup min */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
          Program minim pana la ora
        </label>
        <p className="text-xs text-[var(--color-text-light)] mb-2">La ce ora poti cel mai devreme sa-ti iei copilul?</p>
        <select
          value={filters.pickupMin}
          onChange={(e) => onFilterChange({ ...filters, pickupMin: e.target.value })}
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text-main)]"
        >
          <option value="">Oricare</option>
          <option value="16:00">16:00</option>
          <option value="16:30">16:30</option>
          <option value="17:00">17:00</option>
          <option value="17:30">17:30</option>
          <option value="18:00">18:00</option>
          <option value="18:30">18:30</option>
          <option value="19:00">19:00</option>
        </select>
      </div>

      {/* Sector */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
          Sector
        </label>
        <select
          value={filters.sector}
          onChange={(e) => onFilterChange({ ...filters, sector: e.target.value })}
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text-main)]"
        >
          <option value="">Toate sectoarele</option>
          <option value="1">Sector 1</option>
          <option value="2">Sector 2</option>
          <option value="3">Sector 3</option>
          <option value="4">Sector 4</option>
          <option value="5">Sector 5</option>
          <option value="6">Sector 6</option>
        </select>
      </div>

      {/* Availability */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
          Locuri disponibile
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={filters.onlyAvailable}
            onChange={(e) => onFilterChange({ ...filters, onlyAvailable: e.target.checked })}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-text-main)] group-hover:text-[var(--color-primary)] transition-colors">
            Arata doar cu locuri disponibile
          </span>
        </label>
      </div>

      {/* Activities */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
          Optionale
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_ACTIVITIES.map((activity) => (
            <button
              key={activity}
              onClick={() => toggleActivity(activity)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filters.activities.includes(activity)
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-main)] hover:bg-[var(--color-border)]'
              }`}
            >
              {activity}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.type || filters.priceMax || filters.dropoffTime || filters.pickupMin || filters.activities.length > 0 || filters.sector || filters.radiusKm || filters.onlyAvailable) && (
        <button
          onClick={() => onFilterChange({ type: '', priceMax: '', dropoffTime: '', pickupMin: '', activities: [], sector: '', radiusKm: '', onlyAvailable: false })}
          className="mt-4 w-full py-2 text-sm text-[var(--color-danger)] border border-[var(--color-danger)] rounded-lg hover:bg-red-50 transition-colors"
        >
          Sterge filtrele
        </button>
      )}
    </div>
  );
}
