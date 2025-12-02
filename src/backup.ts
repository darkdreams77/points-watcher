import { db } from './db';

export async function backupMembers() {
  console.log('💾 Backup members...');

  // tu copies tous les membres actuels dans MemberBackup
  await db.$executeRaw`
    INSERT INTO "MemberBackup" (
      "forumId",
      "username",
      "lastPoints",
      "lastScanAt",
      "lastChangeAt",
      "manualStatus",
      "groupId",
      "backupAt"
    )
    SELECT
      m."forumId",
      m."username",
      m."lastPoints",
      m."lastScanAt",
      m."lastChangeAt",
      m."manualStatus",
      m."groupId",
      NOW()
    FROM "Member" m
  `;

  console.log('💾 Backup terminé.');
}
