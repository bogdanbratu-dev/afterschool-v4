import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Niciun fisier primit' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Tip fisier invalid. Acceptat: JPG, PNG, WEBP, GIF' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `banner_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const filepath = path.join(process.cwd(), 'public', 'banners', filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return NextResponse.json({ url: `/banners/${filename}` });
}
