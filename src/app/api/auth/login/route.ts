import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { seedDatabase } from '@/lib/seed';

export async function POST(request: Request) {
  seedDatabase();
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: 'Username si parola sunt obligatorii' }, { status: 400 });
  }

  const success = await login(username, password);
  if (!success) {
    return NextResponse.json({ error: 'Username sau parola incorecta' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
