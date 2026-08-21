// Deriva sector + cartier din lat/lng, ca sa ramana corecte la orice scriere noua (aprobare
// listare, editare din admin) - nu doar prin scripturi batch rulate manual ad-hoc.
import fs from 'fs';
import path from 'path';
import { calculateDistance } from './distance';

interface NeighborhoodPoint { name: string; lat: number; lon: number; }

let neighborhoodsCache: NeighborhoodPoint[] | null = null;

function loadNeighborhoods(): NeighborhoodPoint[] {
  if (!neighborhoodsCache) {
    const filePath = path.join(process.cwd(), 'data', 'bucharest-neighborhoods.json');
    neighborhoodsCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return neighborhoodsCache!;
}

// Cartierele nu sunt unitati administrative cu poligoane exacte, deci "cel mai apropiat punct
// numit" e la fel de corect ca orice metoda bazata pe poligon (vezi scripts/enrich-neighborhoods.js).
export function nearestNeighborhood(lat?: number | null, lng?: number | null): string | null {
  if (!lat || !lng) return null;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const n of loadNeighborhoods()) {
    const d = calculateDistance(lat, lng, n.lat, n.lon);
    if (d < bestDist) { bestDist = d; best = n.name; }
  }
  return best;
}

const NOMINATIM_UA = 'activkids.ro-geo/1.0 (contact: bogdan.bratu@dontpayfull.com)';

// Reverse-geocoding Nominatim - Sector apare fie sub address.city_district, fie sub
// address.district dupa caz, deci scanam toate valorile in loc sa ne bazam pe o cheie fixa
// (vezi scripts/fix-sectors-geocode.js unde a fost gasit acest bug).
export async function geocodeSector(lat?: number | null, lng?: number | null): Promise<number | null> {
  if (!lat || !lng) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_UA } });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address || {};
    for (const v of Object.values(addr)) {
      if (typeof v !== 'string') continue;
      const m = v.match(/Sector\s*([1-6])\b/i);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  } catch {
    return null;
  }
}

// Sector verificat prin geocodare cand e posibil (coordonatele sunt sursa de adevar), cu
// fallback la valoarea trimisa manual doar daca geocodarea nu da niciun rezultat (ex. Ilfov,
// sau eroare de retea) - previne cazuri gen sector introdus gresit la o adresa reala.
export async function resolveSector(lat: number | null | undefined, lng: number | null | undefined, fallback: number | null): Promise<number | null> {
  const geocoded = await geocodeSector(lat, lng);
  return geocoded ?? fallback ?? null;
}
