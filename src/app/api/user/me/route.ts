import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/userAuth';

export async function GET() {
  const user = await getUserSession();
  if (!user) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, ...user });
}
