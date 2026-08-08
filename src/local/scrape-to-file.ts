// src/scrape-to-file.ts
import 'dotenv/config';
import { promises as fs } from 'fs';
import { db } from '../db';
// import { getYesterdayMidnightParisFromScan } from './time'; // ta fonction de date
import { fetchGroupMembersFromForum, fetchMemberProfile } from '../forumApi';
import type { Group, Member } from '@prisma/client';
import { getUtcMidnightOfUtcDate } from '../utils/formatDate';

async function main() {
  // 1) instant du scan (même logique que la prod)
  const scanInstant = new Date();

  // 2) lire tous les groupes en base (lecture SEULE)
  const groups: Group[] = await db.group.findMany();

  const result: any[] = [];

  for (const group of groups) {
    console.log(`🔎 Scrape groupe ${group.name} (${group.forumId})...`);

    // 3) scraping de la page de groupe (sans points)
    const forumMembers = await fetchGroupMembersFromForum(group.forumId);
    // type : ce que tu as déjà, par ex. [{ forumId, username, profileUrl, ... }]

    const groupBlock: any = {
      groupId: group.id,
      groupName: group.name,
      groupForumId: group.forumId,
      scanInstant,
      members: [] as any[],
    };

    for (const fm of forumMembers) {
      // 4) lecture du membre en DB (lecture seule)
      const existing: Member | null = await db.member.findUnique({
        where: { forumId: fm.forumId },
      });

      // 5) scraping du profil pour récupérer les points + le face claim
      let scrapedPoints: number | null = null;
      let scrapedFaceClaim: string | null = null;
      try {
        const profile = await fetchMemberProfile(fm.profileUrl);
        scrapedPoints = profile.points;
        scrapedFaceClaim = profile.faceClaim;
      } catch (err) {
        console.error(
          `⚠ Erreur en scrapant le profil ${fm.profileUrl}:`,
          (err as Error).message
        );
      }

      const currentLastPoints = existing?.lastPoints ?? null;
      const currentLastChangeAt = existing?.lastChangeAt ?? null;

      const shouldUpdate =
        existing !== null &&
        scrapedPoints !== null &&
        scrapedPoints !== currentLastPoints;

      const computedLastChangeAt = shouldUpdate
        ? getUtcMidnightOfUtcDate(scanInstant)
        : currentLastChangeAt;

      groupBlock.members.push({
        forumId: fm.forumId,
        username: fm.username,
        profileUrl: fm.profileUrl,

        // ce qui vient du scraping actuel
        scrapedPoints,
        scrapedFaceClaim,
        // ce qui est en DB
        currentLastPoints,
        currentLastChangeAt,
        currentFaceClaim: existing?.faceClaim ?? null,

        // ce que la prod écrirait
        shouldUpdate,
        computedLastChangeAt,

        currentManualStatus: existing?.manualStatus ?? null,
      });
    }

    result.push(groupBlock);
  }

  // 6) écrire le résultat dans un fichier
  const outFile = 'scrape-dry-run.json';
  await fs.writeFile(outFile, JSON.stringify(result, null, 2), 'utf8');

  console.log(`✅ Dry-run terminé, données écrites dans ${outFile}`);
}

main().catch((err) => {
  console.error('Erreur dans scrape-to-file:', err);
  process.exit(1);
});
