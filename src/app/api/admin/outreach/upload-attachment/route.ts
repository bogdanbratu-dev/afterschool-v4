import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { mkdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const MAX_MB = 8;
const ALLOWED = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Niciun fisier primit' }, { status: 400 });

  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Fisierul este prea mare (max ${MAX_MB}MB)` }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Format nesuportat. Acceptat: PDF, Word, JPG, PNG, WEBP, GIF' }, { status: 400 });
  }

  const ext = path.extname(file.name) || '.pdf';
  const filename = `${crypto.randomBytes(12).toString('hex')}${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', 'attachments');
  mkdirSync(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return NextResponse.json({ url: `/uploads/attachments/${filename}`, originalName: file.name });
}
