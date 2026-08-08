// src/scraper.ts
import 'dotenv/config';
import { db } from './db';
import {
  fetchGroupMembersFromForum,
  fetchMemberProfile,
  ForumMemberInfo,
} from './forumApi';
import { backupMembers } from './backup';
import { getUtcMidnightOfUtcDate } from './utils/formatDate';
import type { Member } from '@prisma/client';

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

const MAX_ROUNDS = 5;
const ROUND_BACKOFF_MS = 15000;

/**
 * Récupère la liste des membres d'un groupe côté forum et synchronise
 * les lignes Member correspondantes (création, changement de groupe,
 * pseudo/URL à jour). Ne touche pas aux points — cf syncMemberPoints.
 *
 * @returns true si le groupe a été listé avec succès, false s'il faut le
 *          retenter à un prochain round.
 */
async function syncGroupRoster(
  groupId: string,
  seenForumIds: Set<string>
): Promise<boolean> {
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) {
    console.error(`Groupe introuvable en base pour id=${groupId}`);
    return false;
  }

  console.log(`=== Sync roster "${group.name}" (forumId=${group.forumId}) ===`);

  let forumMembers: ForumMemberInfo[];
  try {
    forumMembers = await fetchGroupMembersFromForum(group.forumId);
  } catch (e) {
    console.error(
      `Erreur lors de la récupération des membres du groupe forumId=${group.forumId}`,
      e
    );
    return false;
  }

  forumMembers = forumMembers.filter((m) => m.forumId !== '1');
  const previousCount = await db.member.count({ where: { groupId } });

  if (forumMembers.length === 0 && previousCount > 0) {
    console.error(
      `⚠ 0 membre trouvé pour ${groupId} alors qu'il y en avait ${previousCount} en base. On suppose un problème de scraping et on retentera ce groupe.`
    );
    return false;
  }

  console.log(
    `→ ${forumMembers.length} membres trouvés sur le forum pour "${group.name}"`
  );

  for (const fm of forumMembers) {
    seenForumIds.add(fm.forumId);

    const existing = await db.member.findFirst({
      where: { forumId: fm.forumId },
    });

    if (!existing) {
      await db.member.create({
        data: {
          forumId: fm.forumId,
          username: fm.username,
          profileUrl: fm.profileUrl,
          groupId: group.id,
        },
      });
      console.log(
        `+ Nouveau membre: ${fm.username} (u${fm.forumId}) dans ${group.name}`
      );
    } else {
      const updates: {
        username?: string;
        profileUrl?: string;
        groupId?: string;
      } = {};

      if (existing.username !== fm.username) {
        updates.username = fm.username;
      }
      if (existing.profileUrl !== fm.profileUrl) {
        updates.profileUrl = fm.profileUrl;
      }
      if (existing.groupId !== group.id) {
        updates.groupId = group.id;
        console.log(
          `⇄ Changement de groupe pour ${existing.username} (u${existing.forumId}): ` +
            `groupId=${existing.groupId} → ${group.id} (${group.name})`
        );
      }

      if (Object.keys(updates).length > 0) {
        await db.member.update({
          where: { id: existing.id },
          data: updates,
        });
      }
    }
  }

  console.log(`=== Fin du sync roster "${group.name}" ===`);
  return true;
}

/**
 * Récupère les points + face claim d'un membre et met à jour la DB.
 * @returns true si la synchro a réussi, false s'il faut retenter.
 */
async function syncMemberPoints(member: Member): Promise<boolean> {
  try {
    const { points: currentRps, faceClaim } = await fetchMemberProfile(
      member.profileUrl
    );

    const previous = member.lastPoints;
    const hasChanged = previous === null || previous !== currentRps;
    const now = new Date();

    const data: {
      lastPoints: number;
      faceClaim: string | null;
      lastScanAt: Date;
      lastChangeAt: Date | null;
      manualStatus?: null;
    } = {
      lastPoints: currentRps,
      faceClaim,
      lastScanAt: now,
      lastChangeAt: hasChanged
        ? getUtcMidnightOfUtcDate(now)
        : member.lastChangeAt,
    };

    if (hasChanged && member.manualStatus === 'toDelete') {
      data.manualStatus = null;
    }

    await db.member.update({ where: { id: member.id }, data });

    if (hasChanged) {
      console.log(
        `★ Points changés pour ${member.username}: ${previous ?? 0} → ${currentRps}`
      );
    } else {
      console.log(`= Aucun changement pour ${member.username}: ${currentRps} RPs`);
    }

    return true;
  } catch (e) {
    console.error(
      `❌ Impossible de récupérer les points pour ${member.username} (u${member.forumId})`,
      e
    );
    return false;
  }
}

export interface ScrapeResult {
  failedGroupNames: string[];
  failedMemberNames: string[];
  totalGroups: number;
  totalMembers: number;
}

/**
 * Sync tous les groupes, avec retry multi-round jusqu'à couverture
 * complète (ou épuisement de MAX_ROUNDS) :
 * - round 1 : tous les groupes / tous les membres
 * - rounds suivants : uniquement ce qui a échoué au round précédent
 */
export async function syncAllGroups(): Promise<ScrapeResult> {
  const groups = await db.group.findMany();
  if (!groups.length) {
    console.log('Aucun groupe en base, lance d’abord le seed.');
    return { failedGroupNames: [], failedMemberNames: [], totalGroups: 0, totalMembers: 0 };
  }

  const seenForumIds = new Set<string>();

  // --- Phase 1 : rosters (avec retry) ---
  let pendingGroupIds = groups.map((g) => g.id);
  const concurrency = 3;

  for (let round = 1; round <= MAX_ROUNDS && pendingGroupIds.length > 0; round++) {
    if (round > 1) {
      console.log(
        `↻ Round ${round}/${MAX_ROUNDS} — nouvel essai pour ${pendingGroupIds.length} groupe(s)`
      );
      await sleep(ROUND_BACKOFF_MS);
    }

    const stillFailing: string[] = [];
    for (let i = 0; i < pendingGroupIds.length; i += concurrency) {
      const slice = pendingGroupIds.slice(i, i + concurrency);
      const results = await Promise.all(
        slice.map((gid) => syncGroupRoster(gid, seenForumIds))
      );
      results.forEach((ok, idx) => {
        if (!ok) stillFailing.push(slice[idx]);
      });
    }
    pendingGroupIds = stillFailing;
  }

  const failedGroupNames = groups
    .filter((g) => pendingGroupIds.includes(g.id))
    .map((g) => g.name);

  if (seenForumIds.size === 0) {
    console.error(
      '❌ Aucun forumId vu pendant ce run. On SKIP le nettoyage pour éviter de supprimer toute la base. Vérifie le cookie / la connexion.'
    );
    return {
      failedGroupNames,
      failedMemberNames: [],
      totalGroups: groups.length,
      totalMembers: 0,
    };
  }

  // --- Phase 2 : points de tous les membres connus (avec retry) ---
  const allMembers = await db.member.findMany();
  let pendingMemberIds = new Set(allMembers.map((m) => m.id));

  for (let round = 1; round <= MAX_ROUNDS && pendingMemberIds.size > 0; round++) {
    if (round > 1) {
      console.log(
        `↻ Round ${round}/${MAX_ROUNDS} — nouvel essai pour ${pendingMemberIds.size} membre(s)`
      );
      await sleep(ROUND_BACKOFF_MS);
    }

    const targets = allMembers.filter((m) => pendingMemberIds.has(m.id));
    const stillFailing = new Set<string>();

    for (const member of targets) {
      const ok = await syncMemberPoints(member);
      if (!ok) stillFailing.add(member.id);
    }

    pendingMemberIds = stillFailing;
  }

  const failedMemberNames = allMembers
    .filter((m) => pendingMemberIds.has(m.id))
    .map((m) => m.username);

  // --- Nettoyage : uniquement si tous les groupes ont été listés avec succès ---
  if (failedGroupNames.length > 0) {
    console.error(
      `❌ ${failedGroupNames.length} groupe(s) n'ont pas pu être listés (${failedGroupNames.join(', ')}). On ANNULE le nettoyage pour protéger la base.`
    );
    return {
      failedGroupNames,
      failedMemberNames,
      totalGroups: groups.length,
      totalMembers: allMembers.length,
    };
  }

  await backupMembers();

  const currentMembers = await db.member.findMany();
  for (const m of currentMembers) {
    if (m.forumId === '1') {
      await db.member.delete({ where: { id: m.id } }).catch(() => {});
      continue;
    }

    if (!seenForumIds.has(m.forumId)) {
      console.log(
        `- Suppression du membre ${m.username} (u${m.forumId}) : il n'apparaît dans aucun groupe scrappé`
      );
      await db.member.delete({ where: { id: m.id } });
    }
  }

  return {
    failedGroupNames,
    failedMemberNames,
    totalGroups: groups.length,
    totalMembers: allMembers.length,
  };
}
