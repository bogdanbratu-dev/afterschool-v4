import { NextResponse } from 'next/server';
import { runScheduledCycle } from '@/lib/fbAutoPost';

// Endpoint de cron pentru auto-postarea pe Facebook, declansat extern (cron-job.org) des (ex.
// din ora in ora) - motorul insusi decide daca e cazul sa posteze, in functie de fereastra
// orara/interval minim/cap zilnic configurate din admin (vezi src/lib/fbAutoPost.ts).
// Secret separat de CRON_SECRET (folosit de /api/cron pt scraping), ca sa nu depindem de un
// secret existent care ar putea fi negresit/nesetat.
const FB_AUTOPOST_CRON_SECRET = process.env.FB_AUTOPOST_CRON_SECRET;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (!FB_AUTOPOST_CRON_SECRET || secret !== FB_AUTOPOST_CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runScheduledCycle();
  return NextResponse.json(result);
}
