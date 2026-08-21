import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/userAuth';
import { writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import crypto from 'crypto';

const MAX_IMAGE_MB = 8;
const MAX_VIDEO_MB = 200;
const MAX_ATTACHMENT_MB = 8;

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null; // 'photo', 'video' or 'attachment'

    if (!file) return NextResponse.json({ error: 'Niciun fisier' }, { status: 400 });

    const isVideo = type === 'video';
    const isAttachment = type === 'attachment';
    const maxMb = isVideo ? MAX_VIDEO_MB : isAttachment ? MAX_ATTACHMENT_MB : MAX_IMAGE_MB;
    const maxBytes = maxMb * 1024 * 1024;

    if (file.size > maxBytes) {
      return NextResponse.json({ error: `Fisierul este prea mare (max ${maxMb}MB)` }, { status: 400 });
    }

    const allowedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideo = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    // atasament de outreach (meniu etc.) - PDF/Word pe langa imagini uzuale
    const allowedAttachment = [
      ...allowedImage,
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowed = isVideo ? allowedVideo : isAttachment ? allowedAttachment : allowedImage;

    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Format de fisier nesupорtat' }, { status: 400 });
    }

    const ext = extname(file.name) || (isVideo ? '.mp4' : '.jpg');
    const filename = `${crypto.randomBytes(12).toString('hex')}${ext}`;
    const folder = isVideo ? 'videos' : isAttachment ? 'attachments' : 'photos';
    const dir = join(process.cwd(), 'public', 'uploads', folder);

    mkdirSync(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(join(dir, filename), buffer);

    const url = `/uploads/${folder}/${filename}`;
    return NextResponse.json({ url, originalName: file.name });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
