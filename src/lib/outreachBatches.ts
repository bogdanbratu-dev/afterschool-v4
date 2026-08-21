import type Database from 'better-sqlite3';

export interface GroupData<T> { count: number; items: T[] }

// Grupare generica: 'toate' (tot Bucurestiul) + un grup per valoare de cheie.
export function buildGroups<T>(items: T[], keyFn: (item: T) => string): Record<string, GroupData<T>> {
  const groups: Record<string, GroupData<T>> = { toate: { count: items.length, items } };
  for (const item of items) {
    const k = keyFn(item);
    if (!groups[k]) groups[k] = { count: 0, items: [] };
    groups[k].count++;
    groups[k].items.push(item);
  }
  return groups;
}

const TABLE_BY_LISTING_TYPE: Record<string, string> = {
  afterschool: 'afterschools',
  club: 'clubs',
  kindergarten: 'kindergartens',
  professional: 'professionals',
  caterer: 'caterers',
};

// Cartierul/sectorul propriu al partenerului (derivat din anuntul lui original,
// legat prin microsites.listing_type + listing_id), folosit ca 2 din cele 3 batch-uri implicite.
export function getOwnLocation(db: Database.Database, ms: Record<string, unknown>): { sector: string | null; neighborhood: string | null } {
  const table = TABLE_BY_LISTING_TYPE[ms.listing_type as string];
  if (!table) return { sector: null, neighborhood: null };
  try {
    const row = db.prepare(`SELECT sector, neighborhood FROM ${table} WHERE id = ?`).get(ms.listing_id) as { sector: number | null; neighborhood: string | null } | undefined;
    if (!row) return { sector: null, neighborhood: null };
    return { sector: row.sector != null ? String(row.sector) : null, neighborhood: row.neighborhood || null };
  } catch {
    return { sector: null, neighborhood: null };
  }
}

export interface SavedBatch<T> {
  id: number;
  name: string;
  filterType: 'sector' | 'neighborhood';
  values: string[];
  count: number;
  items: T[];
}

// Batch-uri personalizate salvate de partener (combinatii de cartiere/sectoare alese de el).
// Calculate live pe lista curenta de items, nu pe un snapshot - reflecta emailurile noi aparute.
export function getSavedBatches<T>(
  db: Database.Database,
  partnerMsId: number,
  targetType: string,
  items: T[],
  sectorKeyFn: (item: T) => string,
  neighborhoodKeyFn: (item: T) => string | null,
): SavedBatch<T>[] {
  const rows = db.prepare(
    'SELECT id, name, filter_type, values_json FROM outreach_batches WHERE partner_ms_id = ? AND target_type = ? ORDER BY created_at DESC'
  ).all(partnerMsId, targetType) as Array<{ id: number; name: string; filter_type: string; values_json: string }>;

  return rows.map((r) => {
    let values: string[] = [];
    try { values = JSON.parse(r.values_json); } catch { values = []; }
    const valueSet = new Set(values);
    const filterType = r.filter_type as 'sector' | 'neighborhood';
    const matched = items.filter((item) => {
      const key = filterType === 'sector' ? sectorKeyFn(item) : (neighborhoodKeyFn(item) || 'necunoscut');
      return valueSet.has(key);
    });
    return { id: r.id, name: r.name, filterType, values, count: matched.length, items: matched };
  });
}
