// src/scraper.ts
import 'dotenv/config';
import { db } from './db';
import {
  fetchGroupMembersFromForum,
  fetchMemberRps,
  ForumMemberInfo,
} from './forumApi';

/**
 * Sync un groupe unique :
 * - récupère les membres du groupe sur le forum (pagination gérée dans forumApi)
 * - met à jour / crée les Member correspondants
 * - gère les changements de groupe (forumId unique)
 *
 * @param groupId ID interne du Group (Prisma)
 * @param seenForumIds Set global des forumId vus dans ce run (pour nettoyage global à la fin)
 */
export async function syncGroup(
  groupId: string,
  seenForumIds: Set<string>
): Promise<void> {
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) {
    console.error(`Groupe introuvable en base pour id=${groupId}`);
    return;
  }

  console.log(`=== Sync groupe "${group.name}" (forumId=${group.forumId}) ===`);

  // 1) Récupérer tous les membres du groupe côté forum
  let forumMembers: ForumMemberInfo[] = [];
  try {
    forumMembers = await fetchGroupMembersFromForum(group.forumId);
  } catch (e) {
    console.error(
      `Erreur lors de la récupération des membres du groupe forumId=${group.forumId}`,
      e
    );
    return;
  }

  // Exclure La Doyenne (u1) au niveau forum
  forumMembers = forumMembers.filter((m) => m.forumId !== '1');

  console.log(`→ ${forumMembers.length} membres trouvés sur le forum pour "${group.name}"`);

  // 2) Sync DB <-> Forum
  //    Logique : un forumId = un Member global, qui peut changer de groupId
  for (const fm of forumMembers) {
    // Marquer ce forumId comme "vu" dans ce run (utilisé pour le nettoyage global après tous les groupes)
    seenForumIds.add(fm.forumId);

    const existing = await db.member.findFirst({
      where: { forumId: fm.forumId },
    });

    if (!existing) {
      // Nouveau membre global
      await db.member.create({
        data: {
          forumId: fm.forumId,
          username: fm.username,
          profileUrl: fm.profileUrl,
          groupId: group.id,
        },
      });
      console.log(`+ Nouveau membre: ${fm.username} (u${fm.forumId}) dans ${group.name}`);
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

  // 3) Mise à jour des points (RPs) pour les membres de ce groupe
  const membersInGroup = await db.member.findMany({
    where: { groupId: group.id },
  });

  const now = new Date();

  for (const member of membersInGroup) {
    try {
      // Adapte si ta fonction prend profileUrl
      const currentRps = await fetchMemberRps(member.profileUrl);

      const previous = member.lastPoints;
      const hasChanged = previous === null || previous !== currentRps;

      await db.member.update({
        where: { id: member.id },
        data: {
          lastPoints: currentRps,
          lastScanAt: now,
          lastChangeAt: hasChanged ? now : member.lastChangeAt,
        },
      });

      if (hasChanged) {
        console.log(
          `★ Points changés pour ${member.username}: ${previous ?? 0} → ${currentRps}`
        );
      } else {
        console.log(
          `= Aucun changement pour ${member.username}: ${currentRps} RPs`
        );
      }
    } catch (e) {
      console.error(
        `❌ Impossible de récupérer les points pour ${member.username} (u${member.forumId})`,
        e
      );
    }
  }

  console.log(`=== Fin du sync groupe "${group.name}" ===`);
}

/**
 * Sync tous les groupes :
 * - construit un Set de tous les forumId vus dans ce run
 * - supprime de la DB les membres qui n’apparaissent dans AUCUN groupe
 */
export async function syncAllGroups(): Promise<void> {
  const groups = await db.group.findMany();
  if (!groups.length) {
    console.log('Aucun groupe en base, lance d’abord le seed.');
    return;
  }

  const seenForumIds = new Set<string>();

  // 1) Sync de chaque groupe
  for (const g of groups) {
    await syncGroup(g.id, seenForumIds);
  }

  // 2) Nettoyage global : supprimer les membres qui n'apparaissent plus dans aucun groupe suivi
  const allMembers = await db.member.findMany();

  for (const m of allMembers) {
    // La Doyenne doit être ignorée de toute façon
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
}
