// Parser pentru exporturile CSV din Meta Ads Manager (Raportare > Export > .csv). Nu exista o
// librarie CSV in proiect, iar exporturile Meta au campuri simple (fara linii multiple in interiorul
// unei celule), deci un parser minimal, tolerant la ghilimele si virgule in interiorul campurilor,
// e suficient. Numele coloanelor difera in functie de coloanele alese la export si de moneda contului
// (ex. "Amount spent (RON)" vs "Amount spent (EUR)"), de aceea potrivirea se face pe alias-uri, nu pe
// nume exact.

import { stripDiacritics } from './slug';

export interface ParsedAdCsvRow {
  campaignName: string | null;
  adSetName: string | null;
  dateStart: string | null;
  dateStop: string | null;
  amountSpentLei: number | null;
  impressions: number | null;
  reach: number | null;
  linkClicks: number | null;
  ctrPct: number | null;
  cpcLei: number | null;
  cpmLei: number | null;
  results: number | null;
  costPerResultLei: number | null;
}

// Fiecare camp are o lista de fragmente de header acceptate (comparatie case-insensitive, fara
// diacritice, substring). Exportul Meta Ads Manager in limba romana foloseste antete complet diferite
// de varianta engleza si de primele alias-uri scrise aici (ex. "Numele campaniei", "Inceputul
// raportarii"), verificat pe un export real 2026-08-17.
const FIELD_ALIASES: Record<keyof ParsedAdCsvRow, string[]> = {
  campaignName: ['campaign name', 'nume campanie', 'numele campaniei'],
  adSetName: ['ad set name', 'nume set de anunturi', 'nume set anunturi'],
  dateStart: ['reporting starts', 'data inceput', 'inceputul raportarii'],
  dateStop: ['reporting ends', 'data sfarsit', 'terminarea raportarii'],
  amountSpentLei: ['amount spent', 'suma cheltuita'],
  impressions: ['impressions', 'afisari'],
  reach: ['reach', 'acoperire'],
  linkClicks: ['link clicks', 'clicuri pe link', 'clickuri pe link'],
  ctrPct: ['ctr (link click-through rate)', 'ctr (rata click-through)', 'ctr'],
  cpcLei: ['cpc (cost per link click)', 'cpc (cost per click)', 'cpc'],
  cpmLei: ['cpm (cost per 1,000 impressions)', 'cpm'],
  results: ['results', 'rezultate'],
  costPerResultLei: ['cost per results', 'cost per result', 'cost per rezultat'],
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',' || ch === ';') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.,-]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseAdCsv(csvText: string): ParsedAdCsvRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerCells = splitCsvLine(lines[0]).map((h) => stripDiacritics(h));

  const columnForField: Partial<Record<keyof ParsedAdCsvRow, number>> = {};
  for (const field of Object.keys(FIELD_ALIASES) as (keyof ParsedAdCsvRow)[]) {
    const aliases = FIELD_ALIASES[field];
    const idx = headerCells.findIndex((h) => aliases.some((a) => h.includes(a)));
    if (idx !== -1) columnForField[field] = idx;
  }

  const rows: ParsedAdCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.every((c) => !c)) continue;

    const get = (field: keyof ParsedAdCsvRow) => {
      const idx = columnForField[field];
      return idx === undefined ? undefined : cells[idx];
    };

    rows.push({
      campaignName: get('campaignName') || null,
      adSetName: get('adSetName') || null,
      dateStart: get('dateStart') || null,
      dateStop: get('dateStop') || null,
      amountSpentLei: toNumber(get('amountSpentLei')),
      impressions: toNumber(get('impressions')),
      reach: toNumber(get('reach')),
      linkClicks: toNumber(get('linkClicks')),
      ctrPct: toNumber(get('ctrPct')),
      cpcLei: toNumber(get('cpcLei')),
      cpmLei: toNumber(get('cpmLei')),
      results: toNumber(get('results')),
      costPerResultLei: toNumber(get('costPerResultLei')),
    });
  }

  return rows;
}
