import { db } from './db';

export async function backupMembers() {
  console.log('💾 Backup members via Prisma...');

  const members = await db.member.findMany();

  if (!members.length) {
    console.log('💾 Aucun member en base, pas de backup.');
    return;
  }

  await db.memberBackup.createMany({
    data: members.map((m) => ({
      // on NE met PAS "id" ici → Prisma utilise @default(cuid())
      forumId: m.forumId,
      username: m.username,
      lastPoints: m.lastPoints,
      lastScanAt: m.lastScanAt,
      lastChangeAt: m.lastChangeAt,
      faceClaim: m.faceClaim,
      manualStatus: m.manualStatus,
      absenceEndDate: m.absenceEndDate,
      groupId: m.groupId,
      // backupAt: laissé vide → DEFAULT now()
    })),
  });

  console.log(`💾 Backup terminé : ${members.length} membres copiés.`);
}
