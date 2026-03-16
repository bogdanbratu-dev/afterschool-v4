'use client';

interface FilterPanelProps {
  filters: {
    priceMax: string;
    pickupTime: string;
    endTimeMin: string;
    activities: string[];
    sector: string;
    radiusKm: string;
    onlyAvailable: boolean;
  };
  onFilterChange: (filters: FilterPanelProps['filters']) => void;
  hasLocation?: boolean;
}

const ALL_ACTIVITIES = [
  'Teme', 'Engleza', 'Sport', 'Arte', 'Muzica', 'Robotica',
  'Programare', 'Stiinta', 'Teatru', 'Dans', 'Lectura',
  'Matematica', 'Pictura', 'Gatit', 'Jocuri',
];

const RADIUS_OPTIONS = ['1', '2', '3', '5', '10', '15', '20'];

export default function FilterPanel({ filters, onFilterChange, hasLocation }: FilterPanelProps) {
  const toggleActivity = (activity: string) => {
    const current = filters.activities;
    if (current.includes(activity)) {
      onFilterChange({ ...filters, activities: current.filter(a => a !== activity) });
    } else {
      onFilterChange({ ...filters, activities: [...current, activity] });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-5">
      <h3 className="font-semibold text-lg mb-4 text-[var(--color-text-main)]">Filtre</h3>

      {/* Radius - only relevant when a location is selected */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
          Raza de cautare
        </label>
        {!hasLocation && (
          <p className="text-xs text-amber-600 mb-2">Cauta dupa o scoala sau adresa pentru a activa acest filtru</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange({ ...filters, radiusKm: '' })}
            disabled={!hasLocation}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !filters.radiusKm
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-gray-100 text-[var(--color-text-light)] hover:bg-gray-200'
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
                  : 'bg-gray-100 text-[var(--color-text-light)] hover:bg-gray-200'
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

      {/* Pickup Time */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
          Ora de preluare de la scoala
        </label>
        <p className="text-xs text-[var(--color-text-light)] mb-2">La ce ora iti termina copilul cursurile?</p>
        <select
          value={filters.pickupTime}
          onChange={(e) => onFilterChange({ ...filters, pickupTime: e.target.value })}
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="">Oricare</option>
          <option value="11:00">11:00</option>
          <option value="11:30">11:30</option>
          <option value="12:00">12:00</option>
          <option value="12:30">12:30</option>
          <option value="13:00">13:00</option>
          <option value="13:30">13:30</option>
          <option value="14:00">14:00</option>
        </select>
      </div>

      {/* End Time */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
          Program minim pana la ora
        </label>
        <p className="text-xs text-[var(--color-text-light)] mb-2">La ce ora poti cel mai devreme sa-ti iei copilul?</p>
        <select
          value={filters.endTimeMin}
          onChange={(e) => onFilterChange({ ...filters, endTimeMin: e.target.value })}
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
          Activitati
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_ACTIVITIES.map((activity) => (
            <button
              key={activity}
              onClick={() => toggleActivity(activity)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filters.activities.includes(activity)
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-gray-100 text-[var(--color-text-light)] hover:bg-gray-200'
              }`}
            >
              {activity}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.priceMax || filters.pickupTime || filters.endTimeMin || filters.activities.length > 0 || filters.sector || filters.radiusKm || filters.onlyAvailable) && (
        <button
          onClick={() => onFilterChange({ priceMax: '', pickupTime: '', endTimeMin: '', activities: [], sector: '', radiusKm: '', onlyAvailable: false })}
          className="mt-4 w-full py-2 text-sm text-[var(--color-danger)] border border-[var(--color-danger)] rounded-lg hover:bg-red-50 transition-colors"
        >
          Sterge filtrele
        </button>
      )}
    </div>
  );
}
