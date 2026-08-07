import { NextResponse } from 'next/server';
import { db } from '../../../../../src/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const group = await db.group.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const members = await db.member.findMany({
      where: { groupId: id },
      orderBy: { lastChangeAt: 'desc' },
    });

    return NextResponse.json(
      members.map((m) => ({
        id: m.id,
        forumId: m.forumId,
        username: m.username,
        lastPoints: m.lastPoints,
        lastScanAt: m.lastScanAt,
        lastChangeAt: m.lastChangeAt,
        profileUrl: m.profileUrl,
        manualStatus: m.manualStatus,
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}