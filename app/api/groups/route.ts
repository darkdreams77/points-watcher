import { NextResponse } from 'next/server';
import { db } from '../../../src/db';

export async function GET() {
  try {
    const groups = await db.group.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      groups.map((g) => ({
        id: g.id,
        forumId: g.forumId,
        name: g.name,
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}