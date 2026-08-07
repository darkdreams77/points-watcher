import { NextResponse } from 'next/server';
import { db } from '../../../src/db';

export async function GET() {
  const members = await db.member.findMany({
    include: {
      group: true,
    },
  });

  const payload = members.map((m) => ({
    id: m.id,
    forumId: m.forumId,
    username: m.username,
    lastPoints: m.lastPoints,
    lastScanAt: m.lastScanAt,
    lastChangeAt: m.lastChangeAt,
    manualStatus: m.manualStatus,
    profileUrl: m.profileUrl,
    groupId: m.groupId,
    groupName: m.group.name,
    groupForumId: m.group.forumId,
  }));

  return NextResponse.json(payload);
}