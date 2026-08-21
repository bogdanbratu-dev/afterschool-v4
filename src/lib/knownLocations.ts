// Zone/repere cunoscute din Bucuresti, cu coordonate aproximative. Acelasi principiu ca modul
// "adresa" din SearchBar.tsx (fara geocodare reala) - suficient de precis pentru a estima distanta
// pana la afterschool-uri/gradinite in chestionarul de potrivire.
export const KNOWN_LOCATIONS: Record<string, [number, number]> = {
  'piata victoriei': [44.4528, 26.0852],
  'piata unirii': [44.4268, 26.1025],
  'piata romana': [44.4466, 26.0970],
  'universitate': [44.4358, 26.1003],
  'tineretului': [44.4096, 26.1030],
  'dristor': [44.4223, 26.1280],
  'titan': [44.4147, 26.1454],
  'drumul taberei': [44.4219, 26.0186],
  'militari': [44.4306, 26.0106],
  'crangasi': [44.4480, 26.0340],
  'obor': [44.4500, 26.1200],
  'pantelimon': [44.4410, 26.1480],
  'berceni': [44.3940, 26.1060],
  'rahova': [44.4110, 26.0710],
  'cotroceni': [44.4330, 26.0620],
  'floreasca': [44.4600, 26.0960],
  'dorobanti': [44.4520, 26.0900],
  'aviatorilor': [44.4560, 26.0850],
  'domenii': [44.4660, 26.0600],
  'pajura': [44.4730, 26.0670],
  'colentina': [44.4600, 26.1250],
  'iancului': [44.4400, 26.1200],
  'stefan cel mare': [44.4520, 26.1050],
  'mosilor': [44.4420, 26.1080],
};

// Centre aproximative de sector, folosite cand parintele alege doar sectorul (fara zona/strada).
export const SECTOR_CENTERS: Record<string, [number, number]> = {
  '1': [44.4610, 26.0850],
  '2': [44.4470, 26.1300],
  '3': [44.4180, 26.1450],
  '4': [44.3900, 26.1250],
  '5': [44.4100, 26.0700],
  '6': [44.4300, 26.0300],
};

const BUCHAREST_CENTER: [number, number] = [44.4268, 26.1025];

export function geocodeApprox(input: string, sector?: string): { lat: number; lng: number; resolved: boolean } {
  const normalized = input.toLowerCase().trim();
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (normalized.includes(key)) return { lat: coords[0], lng: coords[1], resolved: true };
  }
  if (sector && SECTOR_CENTERS[sector]) {
    const [lat, lng] = SECTOR_CENTERS[sector];
    return { lat, lng, resolved: true };
  }
  return { lat: BUCHAREST_CENTER[0], lng: BUCHAREST_CENTER[1], resolved: false };
}
