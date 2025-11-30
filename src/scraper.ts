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

  forumMembers = forumMembers.filter((m) => m.forumId !== '1');

  if (forumMembers.length === 0) {
    console.error(
      `❌ 0 membre trouvé pour le groupe "${group.name}" (forumId=${group.forumId}). On ABANDONNE le sync de ce groupe.`
    );
    // Très important : on ne touche pas seenForumIds
    return;
  }

  console.log(
    `→ ${forumMembers.length} membres trouvés sur le forum pour "${group.name}"`
  );

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

  // 3) Mise à jour des points (RPs) pour les membres de ce groupe
  const membersInGroup = await db.member.findMany({
    where: { groupId: group.id },
  });

  function getYesterdayMidnight(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

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
          lastChangeAt: hasChanged
            ? getYesterdayMidnight()
            : member.lastChangeAt,
        },
      });

      if (hasChanged) {
        console.log(
          `★ Points changés pour ${member.username}: ${
            previous ?? 0
          } → ${currentRps}`
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

  // Concurrence limitée côté groupes (ex: 3 groupes à la fois)
  const concurrency = 3;
  for (let i = 0; i < groups.length; i += concurrency) {
    const slice = groups.slice(i, i + concurrency);
    await Promise.all(slice.map((g) => syncGroup(g.id, seenForumIds)));
  }

  // for (const g of groups) {
  //   await syncGroup(g.id, seenForumIds);
  // }

  // Si on n'a vu personne, c'est qu'il y a un problème global (cookie, auth, etc.)
  if (seenForumIds.size === 0) {
    console.error(
      '❌ Aucun forumId vu pendant ce run. On SKIP le nettoyage pour éviter de supprimer toute la base. Vérifie le cookie / la connexion.'
    );
    return;
  }

  const allMembers = await db.member.findMany();

  for (const m of allMembers) {
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
