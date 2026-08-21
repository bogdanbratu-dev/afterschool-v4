import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import {
  getAutoPostConfig,
  saveAutoPostConfig,
  runManualTestPost,
  previewPost,
  getRecentLog,
  queuePosts,
  queueCustomPost,
  getQueue,
  markQueuedAsPosted,
  discardQueued,
  regenerateQueuedPost,
} from '@/lib/fbAutoPost';
import { getEligiblePoolStats, searchAnchorsByName } from '@/lib/fbPostComposer';
import type { FbPostTemplate, CustomAnchorType } from '@/lib/fbPostComposer';

// GET - config curent + jurnal recent + progres rotatie (pt tabul admin fbautopost).
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }
  return NextResponse.json({
    config: getAutoPostConfig(),
    log: getRecentLog(20),
    queue: getQueue(),
    poolStats: getEligiblePoolStats(),
    hasCredentials: !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN),
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
  });
}

// POST - actiuni: salveaza config, previzualizeaza (fara publicare), sau posteaza acum (test,
// publica real pe Pagina).
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const body = await request.json();
  const action = body?.action;

  if (action === 'save-config') {
    saveAutoPostConfig({
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      minIntervalMin: typeof body.minIntervalMin === 'number' ? body.minIntervalMin : undefined,
      dailyCap: typeof body.dailyCap === 'number' ? body.dailyCap : undefined,
      hoursStart: typeof body.hoursStart === 'number' ? body.hoursStart : undefined,
      hoursEnd: typeof body.hoursEnd === 'number' ? body.hoursEnd : undefined,
    });
    return NextResponse.json({ ok: true, config: getAutoPostConfig() });
  }

  if (action === 'preview') {
    const template = validTemplate(body.template);
    const post = await previewPost(template);
    if (!post) {
      return NextResponse.json({ error: 'Niciun rand eligibil gasit pentru previzualizare.' }, { status: 404 });
    }
    return NextResponse.json({ post });
  }

  if (action === 'post-now') {
    const template = validTemplate(body.template);
    const result = await runManualTestPost(template);
    return NextResponse.json(result);
  }

  if (action === 'queue-generate') {
    const count = typeof body.count === 'number' && body.count > 0 ? Math.min(body.count, 10) : 2;
    const posts = await queuePosts(count);
    return NextResponse.json({ ok: true, generated: posts.length, queue: getQueue() });
  }

  if (action === 'queue-mark-posted') {
    const id = typeof body.id === 'number' ? body.id : undefined;
    if (!id) return NextResponse.json({ error: 'id lipsa.' }, { status: 400 });
    const ok = markQueuedAsPosted(id);
    return NextResponse.json({ ok, queue: getQueue() });
  }

  if (action === 'queue-discard') {
    const id = typeof body.id === 'number' ? body.id : undefined;
    if (!id) return NextResponse.json({ error: 'id lipsa.' }, { status: 400 });
    const ok = discardQueued(id);
    return NextResponse.json({ ok, queue: getQueue() });
  }

  if (action === 'search-anchor') {
    const anchorType = validAnchorType(body.anchorType);
    const q = typeof body.q === 'string' ? body.q : '';
    if (!anchorType) return NextResponse.json({ error: 'anchorType invalid.' }, { status: 400 });
    return NextResponse.json({ results: searchAnchorsByName(anchorType, q) });
  }

  if (action === 'queue-regenerate') {
    const id = typeof body.id === 'number' ? body.id : undefined;
    const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
    if (!id) return NextResponse.json({ error: 'id lipsa.' }, { status: 400 });
    if (!instruction) return NextResponse.json({ error: 'Instructiunea lipseste.' }, { status: 400 });
    const result = await regenerateQueuedPost(id, instruction);
    if (!result.ok) return NextResponse.json({ error: result.error || 'Regenerarea a esuat.' }, { status: 502 });
    return NextResponse.json({ ok: true, text: result.text, queue: getQueue() });
  }

  if (action === 'queue-generate-custom') {
    const anchorType = validAnchorType(body.anchorType);
    const anchorId = typeof body.anchorId === 'number' ? body.anchorId : undefined;
    if (!anchorType || !anchorId) return NextResponse.json({ error: 'anchorType/anchorId invalid.' }, { status: 400 });
    const post = await queueCustomPost(anchorType, anchorId);
    if (!post) return NextResponse.json({ error: 'Nu am gasit ancora ceruta.' }, { status: 404 });
    return NextResponse.json({ ok: true, post, queue: getQueue() });
  }

  return NextResponse.json({ error: 'Actiune necunoscuta.' }, { status: 400 });
}

function validTemplate(value: unknown): FbPostTemplate | undefined {
  return value === 'A' || value === 'B' || value === 'C' ? value : undefined;
}

function validAnchorType(value: unknown): CustomAnchorType | undefined {
  return value === 'afterschool' || value === 'kindergarten' ? value : undefined;
}
