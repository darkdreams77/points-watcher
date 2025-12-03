import 'dotenv/config';
import { db } from '../db';

async function run() {
  console.log('💾 Backup manuel en cours...');

  const members = await db.member.findMany();

  if (!members.length) {
    console.log('❗ Aucun membre trouvé en base. Backup annulé.');
    process.exit(0);
  }

  await db.memberBackup.createMany({
    data: members.map((m) => ({
      // on laisse Prisma générer 'id' via @default(cuid())
      forumId: m.forumId,
      username: m.username,
      lastPoints: m.lastPoints,
      lastScanAt: m.lastScanAt,
      lastChangeAt: m.lastChangeAt,
      manualStatus: m.manualStatus,
      groupId: m.groupId,
      // backupAt laissé vide → DEFAULT now()
    })),
  });

  console.log(`💾 Backup terminé : ${members.length} membres sauvegardés.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erreur lors du backup manuel :', err);
  process.exit(1);
});
