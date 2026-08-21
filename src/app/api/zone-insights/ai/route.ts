import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCircSchool, lookupStreet } from '@/lib/circumscriptii';
import { findZoneCentroid } from '@/lib/zones';
import { computeZoneInsights, clampRadiusKm, type BusinessType } from '@/lib/zoneInsights';
import { isBotUserAgent } from '@/lib/botDetection';
import { allow, clientIp } from '@/lib/rateLimit';

// POST /api/zone-insights/ai - interpretare scrisa de Claude peste raportul determinist. NU accepta
// cifre calculate de la client: primeste doar parametrii de intrare (zona/adresa, raza, tip) si
// recalculeaza tot raportul server-side, exact ca GET /api/zone-insights, inainte sa cheme Claude -
// altfel un client rau-intentionat ar putea trimite orice text catre AI ca sa-l foloseasca gratuit
// ca proxy catre Claude. Singurul endpoint din proiect cu cost real pe apel, deci singurul cu
// rate limiting (vezi CLAUDE.md: restul rutelor publice nu au niciunul).
const ANTHROPIC_MODEL = 'claude-sonnet-5';
const VALID_TYPES: BusinessType[] = ['afterschool', 'kindergarten', 'club'];

const PER_IP_LIMIT = 5;
const PER_IP_WINDOW_MS = 60 * 60 * 1000; // 1 ora
const GLOBAL_DAILY_LIMIT = 200;
const GLOBAL_WINDOW_MS = 24 * 60 * 60 * 1000;

async function callAnthropic(systemPrompt: string, userMessage: string): Promise<{ text: string } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY lipseste din env.' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    const data = await res.json();
    if (!res.ok || data?.error) return { error: data?.error?.message || `HTTP ${res.status}` };
    const text = Array.isArray(data.content) ? data.content.map((b: { text?: string }) => b.text || '').join('').trim() : '';
    if (!text) return { error: 'Raspuns gol de la Claude.' };
    return { text };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function buildSystemPrompt(factSheet: string): string {
  return `Esti un asistent care interpreteaza date reale despre o zona din Bucuresti pentru
proprietarul unui afterschool/gradinita/club care ia in calcul sa faca reclama acolo.

Foloseste EXCLUSIV cifrele din fisa de fapte de mai jos. Nu inventa nicio cifra, niciun procent,
nicio estimare care nu apare deja in fisa. Nu mentiona date demografice (populatie, natalitate,
venit) - nu exista in fisa si nu trebuie presupuse.

Scrie maxim 4 fraze, in romana, ton sobru si direct, fara emoji, fara caracterul em dash (—).
Structura: 1-2 fraze despre ce arata cifrele (cerere vs concurenta), apoi o concluzie practica.

Fisa de fapte:
${factSheet}`;
}

export async function POST(request: Request) {
  const ua = request.headers.get('user-agent') || '';
  if (isBotUserAgent(ua)) {
    return NextResponse.json({ error: 'Cerere refuzata.' }, { status: 403 });
  }

  const ip = clientIp(request);
  if (!allow(`zone-ai:${ip}`, PER_IP_LIMIT, PER_IP_WINDOW_MS)) {
    return NextResponse.json({ error: 'Ai atins limita de cereri pentru interpretarea AI. Incearca din nou peste o ora.' }, { status: 429 });
  }
  if (!allow('zone-ai:global', GLOBAL_DAILY_LIMIT, GLOBAL_WINDOW_MS)) {
    return NextResponse.json({ error: 'Interpretarea AI e indisponibila temporar (limita zilnica atinsa). Raportul cu cifre ramane disponibil.' }, { status: 429 });
  }

  let body: {
    type?: string; radiusKm?: number; clubCategory?: string | null;
    budget?: number | null; zone?: string; address?: string; circSchoolId?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalid.' }, { status: 400 });
  }

  const type = body.type as BusinessType | undefined;
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Tip de afacere invalid.' }, { status: 400 });
  }
  const radiusKm = clampRadiusKm(body.radiusKm);
  const clubCategory = type === 'club' ? (body.clubCategory ?? null) : null;
  const budgetLei = body.budget ?? null;

  const db = getDb();
  let lat: number | null = null;
  let lng: number | null = null;
  let zoneLabel = '';
  let sector: number | undefined;

  if (body.zone) {
    const centroid = findZoneCentroid(body.zone);
    if (centroid) { [lat, lng] = centroid; zoneLabel = body.zone; }
  } else if (body.circSchoolId) {
    const circSchool = getCircSchool(db, body.circSchoolId);
    if (circSchool?.lat != null && circSchool?.lng != null) {
      lat = circSchool.lat; lng = circSchool.lng; zoneLabel = circSchool.name; sector = circSchool.sector ?? undefined;
    }
  } else if (body.address) {
    const lookup = lookupStreet(db, body.address);
    if (lookup.matches.length === 1) {
      const circSchool = getCircSchool(db, lookup.matches[0].circ_school_id);
      if (circSchool?.lat != null && circSchool?.lng != null) {
        lat = circSchool.lat; lng = circSchool.lng; zoneLabel = body.address.trim(); sector = circSchool.sector ?? undefined;
      }
    }
  }

  if (lat == null || lng == null) {
    return NextResponse.json({ error: 'Zona nu a putut fi rezolvata.' }, { status: 400 });
  }

  const report = computeZoneInsights(db, { lat, lng, zoneLabel, radiusKm, businessType: type, clubCategory, budgetLei, sector });

  const systemPrompt = buildSystemPrompt(report.factSheet);
  const result = await callAnthropic(systemPrompt, 'Scrie interpretarea conform cerintelor de mai sus.');

  // La orice eroare (fara cheie, retea, raspuns gol) cadem pe textul determinist deja calculat -
  // acelasi principiu ca upgradeWithAI din fbAutoPost.ts, userul nu vede niciodata o eroare goala.
  const narrative = 'error' in result ? report.narrative : result.text;

  return NextResponse.json({ narrative, aiGenerated: !('error' in result) });
}
