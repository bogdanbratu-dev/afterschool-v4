export function stripDiacritics(str: string): string {
  return str
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/[îí]/g, "i")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t");
}

export function toSlug(name: string, id: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/[îí]/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${id}`;
}

export function idFromSlug(slug: string): number {
  const parts = slug.split('-');
  return parseInt(parts[parts.length - 1], 10);
}

export function cleanAddressDisplay(address: string): string {
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length < 4) return address;

  // Find first segment that looks like an actual street address
  const streetRe = /^(Bd|Bulevardul|Str|Strada|[ŞŞS]os|[ŞS]oseaua|Aleea|Calea|Intrarea|Splaiul)/i;
  const streetIdx = parts.findIndex(p => streetRe.test(p));

  if (streetIdx > 0) {
    // Keep from street segment to end, max 3 segments
    return parts.slice(streetIdx, streetIdx + 3).join(', ');
  }

  // Fallback: keep last 3 segments (usually street + optional floor + city)
  return parts.slice(-3).join(', ');
}
