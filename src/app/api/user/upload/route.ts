import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/userAuth';
import { writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import crypto from 'crypto';

const MAX_IMAGE_MB = 8;
const MAX_VIDEO_MB = 200;

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null; // 'photo' or 'video'

    if (!file) return NextResponse.json({ error: 'Niciun fisier' }, { status: 400 });

    const isVideo = type === 'video';
    const maxBytes = (isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024;

    if (file.size > maxBytes) {
      return NextResponse.json({ error: `Fisierul este prea mare (max ${isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB}MB)` }, { status: 400 });
    }

    const allowedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideo = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    const allowed = isVideo ? allowedVideo : allowedImage;

    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Format de fisier nesupорtat' }, { status: 400 });
    }

    const ext = extname(file.name) || (isVideo ? '.mp4' : '.jpg');
    const filename = `${crypto.randomBytes(12).toString('hex')}${ext}`;
    const folder = isVideo ? 'videos' : 'photos';
    const dir = join(process.cwd(), 'public', 'uploads', folder);

    mkdirSync(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(join(dir, filename), buffer);

    const url = `/uploads/${folder}/${filename}`;
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
