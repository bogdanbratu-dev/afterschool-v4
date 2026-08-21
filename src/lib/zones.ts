// Cele ~43 de zone/cartiere cunoscute ale Bucurestiului, cu centroid aproximativ. Sursa unica de
// adevar pentru "in ce zona cade un punct" - extras din api/admin/saturation/route.ts (care il
// folosea inline) ca sa poata fi reutilizat si de src/lib/zoneInsights.ts (widgetul public
// "Potentialul zonei" de pe /promovare). Zonele nu sunt unitati administrative exacte, doar puncte
// de reper cunoscute, la fel ca `data/bucharest-neighborhoods.json` (vezi src/lib/cartiere.ts) -
// cele doua liste coexista intentionat, servesc scopuri diferite (saturatie admin vs. cartier SEO).
export const ZONE_CENTROIDS: [string, number, number][] = [
  ['Drumul Taberei', 44.4219, 26.0186],
  ['Militari', 44.4306, 26.0106],
  ['Berceni', 44.3940, 26.1060],
  ['Titan', 44.4147, 26.1454],
  ['Colentina', 44.4600, 26.1250],
  ['Pantelimon', 44.4410, 26.1480],
  ['Rahova', 44.4110, 26.0710],
  ['Ferentari', 44.4000, 26.0750],
  ['Floreasca', 44.4600, 26.0960],
  ['Dorobanti', 44.4520, 26.0900],
  ['Aviatorilor', 44.4560, 26.0850],
  ['Baneasa', 44.4970, 26.0840],
  ['Pipera', 44.5040, 26.1020],
  ['Tei', 44.4560, 26.1200],
  ['Vitan', 44.4170, 26.1200],
  ['Dristor', 44.4223, 26.1280],
  ['Obor', 44.4500, 26.1200],
  ['Crangasi', 44.4480, 26.0340],
  ['Cotroceni', 44.4330, 26.0620],
  ['Grozavesti', 44.4380, 26.0580],
  ['Iancului', 44.4400, 26.1200],
  ['Vatra Luminoasa', 44.4350, 26.1350],
  ['Unirii', 44.4268, 26.1025],
  ['Universitate', 44.4358, 26.1003],
  ['Piata Victoriei', 44.4528, 26.0852],
  ['Piata Romana', 44.4466, 26.0970],
  ['Domenii', 44.4660, 26.0600],
  ['Herastrau', 44.4680, 26.0830],
  ['Pajura', 44.4730, 26.0670],
  ['Bucurestii Noi', 44.4800, 26.0600],
  ['13 Septembrie', 44.4260, 26.0730],
  ['Tineretului', 44.4096, 26.1030],
  ['Stefan cel Mare', 44.4520, 26.1050],
  ['Mosilor', 44.4420, 26.1080],
  ['Gara de Nord', 44.4452, 26.0796],
  ['Brancoveanu', 44.3960, 26.1080],
  ['Camil Ressu', 44.4210, 26.1420],
  ['Ghencea', 44.4100, 26.0290],
  ['Voluntari', 44.4900, 26.1700],
  ['Otopeni', 44.5440, 26.0640],
  ['Popesti-Leordeni', 44.3880, 26.1600],
  ['Giurgiului', 44.3870, 26.0960],
  ['Sisesti', 44.4900, 26.0530],
];

// Cel mai apropiat centroid, cu o corectie 0.7 pe longitudine (Bucurestiul e mai lat decat inalt
// in km reali la aceasta latitudine) - aceeasi aproximare simpla foloseste si dashboard-ul admin.
export function getZone(lat: number, lng: number): string {
  let best = ZONE_CENTROIDS[0][0];
  let bestDist = Infinity;
  for (const [name, zlat, zlng] of ZONE_CENTROIDS) {
    const dlat = lat - zlat;
    const dlng = (lng - zlng) * 0.7;
    const dist = dlat * dlat + dlng * dlng;
    if (dist < bestDist) { bestDist = dist; best = name; }
  }
  return best;
}

export function findZoneCentroid(name: string): [number, number] | null {
  const found = ZONE_CENTROIDS.find((z) => z[0].toLowerCase() === name.toLowerCase());
  return found ? [found[1], found[2]] : null;
}
