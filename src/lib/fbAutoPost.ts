// Motorul de auto-postare pe Pagina de Facebook. Compune textul via fbPostComposer.ts, publica
// prin Graph API oficial (POST /{page-id}/feed), respecta o cadenta rezonabila (interval minim
// intre postari, cap zilnic, fereastra orara) si actualizeaza rotatia "cutie cu bile" pe
// entitatea ancora dupa fiecare postare reusita.
//
// VPS-ul ruleaza in UTC (confirmat 2026-07-19), deci fereastra orara si capul zilnic se
// calculeaza in timezone-ul Europe/Bucharest (cu DST corect, nu offset fix), nu in ora
// serverului.

import { getDb } from './db';
import {
  composePost,
  composeForAnchor,
  pickRandomTemplate,
  getFactSheetForAnchor,
  ctaClosing,
  type ComposedPost,
  type FbPostTemplate,
  type CustomAnchorType,
  type AnchorType,
  type MentionedEntity,
  type AnchorFactSheet,
} from './fbPostComposer';

const GRAPH_API_VERSION = 'v21.0';
const ANTHROPIC_MODEL = 'claude-sonnet-5';

const DEFAULTS = {
  enabled: false,
  minIntervalMin: 360, // minim 6 ore intre postari
  dailyCap: 2,
  hoursStart: 10,
  hoursEnd: 20,
};

export interface AutoPostConfig {
  enabled: boolean;
  minIntervalMin: number;
  dailyCap: number;
  hoursStart: number;
  hoursEnd: number;
}

function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

function setSetting(key: string, value: string) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

// parseInt intoarce NaN cand setarea nu exista inca (primul run, inainte de orice salvare din
// admin) - "|| default" ar rezolva NaN dar ar suprascrie gresit si un 0 legitim (ex. ora 0 pt
// hoursStart), deci verificam explicit NaN.
function getIntSetting(key: string, def: number): number {
  const raw = getSetting(key);
  if (raw === null) return def;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? def : n;
}

export function getAutoPostConfig(): AutoPostConfig {
  const raw = getSetting('fb_autopost_enabled');
  return {
    enabled: raw === 'true',
    minIntervalMin: getIntSetting('fb_autopost_min_interval_min', DEFAULTS.minIntervalMin),
    dailyCap: getIntSetting('fb_autopost_daily_cap', DEFAULTS.dailyCap),
    hoursStart: getIntSetting('fb_autopost_hours_start', DEFAULTS.hoursStart),
    hoursEnd: getIntSetting('fb_autopost_hours_end', DEFAULTS.hoursEnd),
  };
}

export function saveAutoPostConfig(config: Partial<AutoPostConfig>) {
  if (config.enabled !== undefined) setSetting('fb_autopost_enabled', config.enabled ? 'true' : 'false');
  if (config.minIntervalMin !== undefined) setSetting('fb_autopost_min_interval_min', String(config.minIntervalMin));
  if (config.dailyCap !== undefined) setSetting('fb_autopost_daily_cap', String(config.dailyCap));
  if (config.hoursStart !== undefined) setSetting('fb_autopost_hours_start', String(config.hoursStart));
  if (config.hoursEnd !== undefined) setSetting('fb_autopost_hours_end', String(config.hoursEnd));
}

function romaniaHour(date: Date): number {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Bucharest', hour: 'numeric', hour12: false });
  return parseInt(fmt.format(date), 10) % 24;
}

function romaniaDateKey(date: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(date);
}

function getDailyCount(now: Date): number {
  const today = romaniaDateKey(now);
  const storedDate = getSetting('fb_autopost_daily_date');
  if (storedDate !== today) return 0;
  return parseInt(getSetting('fb_autopost_daily_count') || '0', 10) || 0;
}

function bumpDailyCount(now: Date) {
  const today = romaniaDateKey(now);
  const current = getDailyCount(now);
  setSetting('fb_autopost_daily_date', today);
  setSetting('fb_autopost_daily_count', String(current + 1));
}

export interface CadenceCheck {
  allowed: boolean;
  reason?: string;
}

// Verifica fereastra orara, intervalul minim de la ultima postare si capul zilnic. Nu se aplica
// pentru postarile manuale de test din admin (acelea sunt o actiune explicita a userului).
export function checkCadence(config: AutoPostConfig, now = new Date()): CadenceCheck {
  if (!config.enabled) return { allowed: false, reason: 'Auto-postarea e dezactivata.' };

  const hour = romaniaHour(now);
  const inWindow = config.hoursStart <= config.hoursEnd
    ? hour >= config.hoursStart && hour < config.hoursEnd
    : hour >= config.hoursStart || hour < config.hoursEnd;
  if (!inWindow) {
    return { allowed: false, reason: `In afara ferestrei orare (${config.hoursStart}:00-${config.hoursEnd}:00, ora Romaniei).` };
  }

  const lastAtRaw = getSetting('fb_autopost_last_at');
  if (lastAtRaw) {
    const lastAt = parseInt(lastAtRaw, 10);
    const minutesSince = (now.getTime() - lastAt) / 60000;
    if (minutesSince < config.minIntervalMin) {
      return { allowed: false, reason: `Interval minim neatins (${Math.round(minutesSince)}/${config.minIntervalMin} min de la ultima postare).` };
    }
  }

  const dailyCount = getDailyCount(now);
  if (dailyCount >= config.dailyCap) {
    return { allowed: false, reason: `Cap zilnic atins (${dailyCount}/${config.dailyCap}).` };
  }

  return { allowed: true };
}

interface PublishResult {
  success: boolean;
  fbPostId?: string;
  error?: string;
}

async function publishToFacebook(message: string): Promise<PublishResult> {
  const pageId = process.env.FB_PAGE_ID;
  const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !accessToken) {
    return { success: false, error: 'FB_PAGE_ID sau FB_PAGE_ACCESS_TOKEN lipsesc din env.' };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message, access_token: accessToken }).toString(),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data?.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, fbPostId: data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function logPost(post: ComposedPost, result: PublishResult) {
  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO fb_post_log (posted_at, generated_at, template, anchor_type, anchor_id, mentioned_json, message, fb_post_id, status, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    now,
    now,
    post.template,
    post.anchorType,
    post.anchorId,
    JSON.stringify(post.mentioned),
    post.text,
    result.fbPostId || null,
    result.success ? 'sent' : 'error',
    result.error || null
  );
}

function markAnchorPromoted(post: ComposedPost) {
  const db = getDb();
  const table = post.anchorType === 'afterschool' ? 'afterschools' : post.anchorType === 'club' ? 'clubs' : 'kindergartens';
  db.prepare(`UPDATE ${table} SET fb_last_promoted_at = ? WHERE id = ?`).run(Date.now(), post.anchorId);
}

export interface RunResult {
  posted: boolean;
  reason?: string;
  post?: ComposedPost;
  fbPostId?: string;
  error?: string;
}

// Apelat de cron (/api/cron/fb-post). Respecta activare/fereastra/interval/cap.
export async function runScheduledCycle(): Promise<RunResult> {
  const config = getAutoPostConfig();
  const now = new Date();
  const cadence = checkCadence(config, now);
  if (!cadence.allowed) {
    return { posted: false, reason: cadence.reason };
  }

  const template = pickRandomTemplate();
  const composed = composePost(template) || composePost(fallbackTemplate(template)) || composePost(fallbackTemplate(fallbackTemplate(template)));
  if (!composed) {
    return { posted: false, reason: 'Niciun rand eligibil (complet) gasit in nicio verticala.' };
  }
  const post = await upgradeWithAI(composed);

  const result = await publishToFacebook(post.text);
  logPost(post, result);
  if (result.success) {
    markAnchorPromoted(post);
    setSetting('fb_autopost_last_at', String(now.getTime()));
    bumpDailyCount(now);
    return { posted: true, post, fbPostId: result.fbPostId };
  }
  return { posted: false, reason: 'Publicarea a esuat.', error: result.error, post };
}

// Fallback ramane doar intre A/B (club nu mai e ancora principala in rotatia automata, vezi
// pickRandomTemplate din fbPostComposer.ts) - daca verticala aleasa nu are niciun rand eligibil,
// incercam cealalta, niciodata C.
function fallbackTemplate(t: FbPostTemplate): FbPostTemplate {
  return t === 'A' ? 'B' : 'A';
}

// Declansat manual din admin ("Posteaza acum (test)"). Publica real, indiferent de fereastra/
// interval/cap (e o actiune explicita a userului), dar tot actualizeaza contoarele ca sa nu
// distorsioneze cadenta urmatoarei postari programate.
export async function runManualTestPost(template?: FbPostTemplate): Promise<RunResult> {
  const chosen = template || pickRandomTemplate();
  const composed = composePost(chosen) || composePost(fallbackTemplate(chosen)) || composePost(fallbackTemplate(fallbackTemplate(chosen)));
  if (!composed) {
    return { posted: false, reason: 'Niciun rand eligibil (complet) gasit in nicio verticala.' };
  }
  const post = await upgradeWithAI(composed);

  const result = await publishToFacebook(post.text);
  logPost(post, result);
  if (result.success) {
    markAnchorPromoted(post);
    setSetting('fb_autopost_last_at', String(Date.now()));
    bumpDailyCount(new Date());
    return { posted: true, post, fbPostId: result.fbPostId };
  }
  return { posted: false, reason: 'Publicarea a esuat.', error: result.error, post };
}

// Previzualizare: compune textul (inclusiv strat AI optional) fara sa publice si fara sa atinga
// rotatia (fb_last_promoted_at ramane neschimbat). Folosit de butonul "Previzualizeaza" din admin.
export async function previewPost(template?: FbPostTemplate): Promise<ComposedPost | null> {
  const chosen = template || pickRandomTemplate();
  const post = composePost(chosen) || composePost(fallbackTemplate(chosen)) || composePost(fallbackTemplate(fallbackTemplate(chosen)));
  if (!post) return null;
  return upgradeWithAI(post);
}

export function getRecentLog(limit = 20) {
  const db = getDb();
  return db.prepare('SELECT * FROM fb_post_log ORDER BY posted_at DESC LIMIT ?').all(limit);
}

export interface QueueRow {
  id: number;
  posted_at: number;
  generated_at: number | null;
  template: string;
  anchor_type: string;
  anchor_id: number;
  mentioned_json: string | null;
  message: string;
  status: string;
}

// Coada manuala: cat timp nu avem tokenul Graph API, userul posteaza el insusi pe Facebook
// (copiaza textul, publica manual din contul lui), apoi apasa "Am postat" ca sa marcheze randul.
// Ancora e marcata promovata la GENERARE (nu la marcarea ca postat), ca urmatoarea generare sa nu
// aleaga aceeasi ancora inainte ca userul sa apuce sa posteze coada curenta.
export async function queuePosts(count: number): Promise<ComposedPost[]> {
  // Selectia + marcarea rotatiei ruleaza mai intai, sincron, ca fiecare pas urmator din bucla sa
  // vada rotatia deja avansata (altfel doua ancore din acelasi lot ar putea coincide). Strat AI
  // (upgradeWithAI) e aplicat DUPA, in paralel, ca sa nu incetineasca/afecteze alegerea ancorelor.
  const selected: ComposedPost[] = [];
  for (let i = 0; i < count; i++) {
    const template = pickRandomTemplate();
    const post = composePost(template) || composePost(fallbackTemplate(template)) || composePost(fallbackTemplate(fallbackTemplate(template)));
    if (!post) continue;
    markAnchorPromoted(post);
    selected.push(post);
  }

  const upgraded = await Promise.all(selected.map(upgradeWithAI));

  const db = getDb();
  const results: ComposedPost[] = [];
  for (const post of upgraded) {
    const now = Date.now();
    db.prepare(
      `INSERT INTO fb_post_log (posted_at, generated_at, template, anchor_type, anchor_id, mentioned_json, message, fb_post_id, status, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'queued', NULL)`
    ).run(now, now, post.template, post.anchorType, post.anchorId, JSON.stringify(post.mentioned), post.text);
    results.push(post);
  }
  return results;
}

// Postare "la cerere" pentru o ancora specifica, aleasa manual (nu prin rotatie), ex. cand userul
// vrea sa promoveze chiar acum un afterschool/gradinita anume. Foloseste aceeasi coada/istoric ca
// generarea automata, deci restul fluxului (copiere, "Am postat", eliminare) e identic.
export async function queueCustomPost(anchorType: CustomAnchorType, anchorId: number): Promise<ComposedPost | null> {
  const composed = composeForAnchor(anchorType, anchorId);
  if (!composed) return null;
  markAnchorPromoted(composed);
  const post = await upgradeWithAI(composed);

  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO fb_post_log (posted_at, generated_at, template, anchor_type, anchor_id, mentioned_json, message, fb_post_id, status, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'queued', NULL)`
  ).run(now, now, post.template, post.anchorType, post.anchorId, JSON.stringify(post.mentioned), post.text);
  return post;
}

export function getQueue(): QueueRow[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM fb_post_log WHERE status = 'queued' ORDER BY id ASC`).all() as QueueRow[];
}

// Marcheaza un rand din coada ca postat manual pe Facebook de catre user (fara fb_post_id, nu a
// trecut prin API Graph). generated_at ramane neschimbat (imutabil), doar posted_at devine ora
// reala a postarii, ca istoricul din admin sa arate ambele momente.
export function markQueuedAsPosted(id: number): boolean {
  const db = getDb();
  const result = db.prepare(`UPDATE fb_post_log SET status = 'sent', posted_at = ? WHERE id = ? AND status = 'queued'`).run(Date.now(), id);
  return result.changes > 0;
}

// Anuleaza un rand din coada (userul nu vrea sa-l posteasca asa cum a iesit). Rotatia ramane
// avansata (ancora deja marcata promovata la generare) - simplificare acceptata.
export function discardQueued(id: number): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM fb_post_log WHERE id = ? AND status = 'queued'`).run(id);
  return result.changes > 0;
}

// Regenerare prin AI (Claude API): userul scrie o instructiune libera (ex. o corectie: "gradinita
// e de stat nu privata", "elimina mentiunea cartierului Centrul Vechi, nu exista") si primeste
// textul rescris. Regula stricta: Claude primeste DOAR fisa de fapte reale din DB pt. ancora
// respectiva (getFactSheetForAnchor), niciodata voie sa inventeze detalii noi - exact reactia la
// criza din 2026-07-21 (postare cu "gradinita privata" + cartier inexistent "Centrul Vechi").
function buildRegenerateSystemPrompt(factSheet: string, instruction: string, originalText: string): string {
  return `Esti un asistent care rescrie o postare pentru Pagina de Facebook a activkids.ro (director de afterschooluri, gradinite private, cluburi de activitati pentru copii din Bucuresti si Ilfov).

REGULA ABSOLUTA: foloseste DOAR faptele din lista de mai jos. Nu inventa nume de cartiere, tip de institutie, adrese, program, activitati, distante sau orice alt detaliu care nu apare explicit in lista. Daca un detaliu cerut de instructiune nu exista in lista, nu il inventa, ci formuleaza fara el sau spune ca nu poate fi confirmat. Aceasta regula se aplica si detaliilor care apar in textul actual de mai jos, dar NU apar in fisa de fapte: nu le pastra automat doar pentru ca erau deja acolo, elimina-le daca nu sunt confirmate (ex. "privata"/"de stat" nu e in fisa, deci nu afirma niciuna dintre variante).

Fapte confirmate despre listarea din aceasta postare:
${factSheet}

Textul actual al postarii (de rescris):
${originalText}

Instructiunea data de administrator pentru aceasta rescriere:
${instruction}

Cerinte de format si ton:
- Limba romana, ton cald, prietenos, modest, discret. Fara superlative, fara comenzi ferme ("nu rata", "da follow acum"), fara emoji.
- Niciodata caracterul em dash (--) in text.
- Paragrafe scurte, separate printr-o linie goala.
- Include obligatoriu URL-ul listarii din fisa de fapte, ca linie separata.
- Incheie cu o invitatie scurta si blanda spre pagina activkids.ro (nu o comanda).
- Raspunde DOAR cu textul final al postarii, fara explicatii suplimentare, fara ghilimele in jurul textului.`;
}

async function callAnthropic(systemPrompt: string, userMessage: string): Promise<{ text: string } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY lipseste din env.' };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    const data = await res.json();
    if (!res.ok || data?.error) {
      return { error: data?.error?.message || `HTTP ${res.status}` };
    }
    const text = Array.isArray(data.content)
      ? data.content.map((b: { text?: string }) => b.text || '').join('').trim()
      : '';
    if (!text) return { error: 'Raspuns gol de la Claude.' };
    return { text };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

const WEBSITE_FETCH_TIMEOUT_MS = 6000;
const WEBSITE_EXCERPT_MAX_CHARS = 3000;

// Extrage text brut de pe site-ul propriu al afacerii, folosit ca material optional pt. UN singur
// detaliu concret in postarea compusa de AI (vezi buildInitialComposeSystemPrompt). Niciodata
// descrierea auto-generata din coloana `description` a DB-ului - esantion 2026-07-21 a aratat ca
// suna repetitiv/boilerplate AI, exact ce userul a cerut sa evitam ("cuvinte fara sens").
async function fetchWebsiteExcerpt(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBSITE_FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ActivKidsBot/1.0; +https://activkids.ro)' },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType && !contentType.includes('text/html')) return null;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();
    return text ? text.slice(0, WEBSITE_EXCERPT_MAX_CHARS) : null;
  } catch {
    return null;
  }
}

// System prompt pt. compunerea initiala prin AI (imbunatateste textul determinist, nu il inlocuieste
// ca sursa de adevar - vezi upgradeWithAI). Reflecta cele 5 cerinte date de user 2026-07-22: highlight
// real de pe site, scoala/cartier+reper, fara clisee goale, activitati potrivite varstei DOAR din
// fapte confirmate, si un gand cald de final despre timp de joaca/familie/trafic.
function buildInitialComposeSystemPrompt(factSheet: AnchorFactSheet, websiteExcerpt: string | null): string {
  return `Esti un asistent care scrie o postare pentru Pagina de Facebook a activkids.ro (director de afterschooluri, gradinite private, cluburi de activitati pentru copii din Bucuresti si Ilfov). Postarea promoveaza o singura listare (ancora) catre parinti.

REGULA ABSOLUTA: foloseste DOAR faptele din lista de mai jos (nume, sector/cartier, program, activitati, scoala/cluburi apropiate, rating). Nu inventa nume de cartiere, tip de institutie (privat/de stat), adrese, program, distante sau orice alt detaliu care nu apare explicit in lista sau in extrasul de site de mai jos.

Fapte confirmate despre listarea din aceasta postare:
${factSheet.text}
${websiteExcerpt ? `\nExtras brut de pe site-ul propriu al afacerii (foloseste-l STRICT pentru un singur detaliu concret si real - o dotare, o metoda, o specializare mentionata explicit acolo; nu parafraza vag, nu inventa ce nu scrie clar in extras):\n${websiteExcerpt}\n` : ''}
Ce trebuie sa contina textul, in aceasta ordine logica (dar formulat natural, ca o postare, nu ca o lista cu titluri):
1. Prima propozitie incepe OBLIGATORIU cu numele listarii, urmat imediat de adresa - dar NU adresa completa: doar strada/bulevardul (fara numarul casei) si cartierul, daca apar in fapte (campul "Strada (partiala...)" si/sau "Cartier real"). Niciodata sectorul, numarul strazii sau alte detalii de adresa care nu apar explicit ca atare in fapte. Daca nu exista nici strada nici cartier in fapte, incepe doar cu numele, fara sa inventezi o zona.
2. Restul prezentarii listarii. Daca extrasul de site contine un detaliu concret si real, foloseste-l ca sa scoti in evidenta ceva bun despre listare. Daca nu exista extras sau nu contine nimic concret, sari peste acest detaliu - nu inventa unul si nu folosi cuvinte vagi fara continut real (ex. "o pagina linistita", "un loc primitor" fara nicio dovada). Textul trebuie sa para scris de un om care cunoaste orasul, nu de un AI.
3. Daca fisa contine o scoala apropiata, mentioneaz-o (relevant mai ales pt. afterschool), ca element secundar, dupa prezentarea principala a listarii.
4. Cateva activitati potrivite varstei copiilor din apropiere, DOAR din lista de cluburi apropiate confirmate in fapte (daca exista o astfel de lista) - mentionate explicit ca secundare/suplimentare fata de listarea principala, nu inventa alte activitati sau cluburi.
5. Incheie cu un gand cald si subtil, nu un sfat ferm: copiii au nevoie si de timp de joaca liber si de timp petrecut cu parintii, una-doua activitati sunt de obicei suficiente pentru un copil, iar activitatile alese aproape de casa lasa mai mult timp liber si mai putin pierdut in trafic.

Cerinte de format si ton:
- Limba romana, ton cald, prietenos, modest, discret. Fara superlative goale, fara clisee fara continut real, fara emoji.
- Niciodata caracterul em dash (--) in text.
- Paragrafe scurte, separate printr-o linie goala.
- NU include URL-ul listarii si NU adauga un CTA/invitatie de follow la final - acelea se adauga separat, dupa textul tau.
- Raspunde DOAR cu textul final al postarii (fara titlu, fara ghilimele, fara explicatii suplimentare).`;
}

// Compune textul initial prin AI, folosind fisa de fapte reale + extrasul de site ca material
// optional. Intoarce null la orice problema (fara cheie API, ancora negasita, apel esuat, raspuns
// gol) - apelantul (upgradeWithAI) cade mereu inapoi la textul determinist original.
async function composeInitialWithAI(post: ComposedPost): Promise<ComposedPost | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const factSheet = getFactSheetForAnchor(post.anchorType, post.anchorId, post.mentioned);
  if (!factSheet) return null;

  const websiteExcerpt = factSheet.website ? await fetchWebsiteExcerpt(factSheet.website) : null;
  const systemPrompt = buildInitialComposeSystemPrompt(factSheet, websiteExcerpt);
  const result = await callAnthropic(systemPrompt, 'Compune postarea conform cerintelor de mai sus.');
  if ('error' in result) return null;

  const body = result.text.trim();
  if (!body) return null;

  return { ...post, text: [body, ctaClosing(), factSheet.url].join('\n\n') };
}

// Strat optional peste compunerea determinista (composePost/composeForAnchor): incearca sa scrie un
// text mai variat si mai natural via Claude, cu acces doar la fapte reale din DB + extras de site.
// Compunerea determinista ramane mereu sursa de adevar pt. alegerea ancorei/rotatie - aceasta functie
// doar inlocuieste, opțional, textul randat, si cade silentios inapoi la textul determinist original
// la orice problema (fara cheie API, eroare retea, raspuns gol), ca sa nu blocheze niciodata fluxul.
async function upgradeWithAI(post: ComposedPost): Promise<ComposedPost> {
  try {
    const upgraded = await composeInitialWithAI(post);
    return upgraded || post;
  } catch {
    return post;
  }
}

export interface RegenerateResult {
  ok: boolean;
  text?: string;
  error?: string;
}

// Regenereaza un rand din coada (status 'queued') conform instructiunii userului. Actualizeaza
// doar `message` - template/anchor/mentioned_json/generated_at raman neschimbate, ca istoricul si
// rotatia sa nu fie afectate de o simpla rescriere de text.
export async function regenerateQueuedPost(id: number, instruction: string): Promise<RegenerateResult> {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM fb_post_log WHERE id = ? AND status = 'queued'`).get(id) as QueueRow | undefined;
  if (!row) return { ok: false, error: 'Randul nu a fost gasit sau nu mai e in coada.' };

  const mentioned: MentionedEntity[] = row.mentioned_json ? JSON.parse(row.mentioned_json) : [];
  const factSheet = getFactSheetForAnchor(row.anchor_type as AnchorType, row.anchor_id, mentioned);
  if (!factSheet) return { ok: false, error: 'Nu am gasit datele ancorei in baza de date.' };

  const systemPrompt = buildRegenerateSystemPrompt(factSheet.text, instruction, row.message);
  const result = await callAnthropic(systemPrompt, 'Rescrie postarea conform cerintelor de mai sus.');
  if ('error' in result) return { ok: false, error: result.error };

  db.prepare(`UPDATE fb_post_log SET message = ? WHERE id = ?`).run(result.text, id);
  return { ok: true, text: result.text };
}
