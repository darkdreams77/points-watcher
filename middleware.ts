import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (token !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/members/:id/status',
};
