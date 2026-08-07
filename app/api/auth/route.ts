import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  if (!process.env.AUTH_PASSWORD || !process.env.AUTH_SECRET) {
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
  }

  const { password } = await req.json();

  if (password !== process.env.AUTH_PASSWORD) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth_token', process.env.AUTH_SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
