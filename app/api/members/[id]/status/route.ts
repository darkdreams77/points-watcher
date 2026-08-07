import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { status }: { status: 'absent' | 'toDelete' | null } = await request.json();

  if (status !== 'absent' && status !== 'toDelete' && status !== null)
    return NextResponse.json({ error: 'Status invalide' }, { status: 400 });

  const member = await db.member.update({
    where: { id },
    data: {
      manualStatus: status,
    },
  });

  return NextResponse.json(member);
}