import { db } from "./db";
import { fetchGroupMembersFromForum, fetchMemberPoints } from "./forumApi";

export async function syncGroupMembers(groupId: string) {
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) throw new Error(`Group ${groupId} not found in DB.`);

  // 1) Récupérer la liste actuelle des membres du groupe sur le forum
  const forumMembers = await fetchGroupMembersFromForum(group.forumId);
  const now = new Date();

  for (const fm of forumMembers) {
    const existing = await db.member.findFirst({
      where: {
        groupId: group.id,
        forumId: fm.forumId,
      },
    });

    if (!existing) {
      // Nouveau membre dans ce groupe
      await db.member.create({
        data: {
          forumId: fm.forumId,
          username: fm.username,
          profileUrl: fm.profileUrl,
          groupId: group.id,
          lastPoints: null,
          lastScanAt: null,
          lastChangeAt: null,
        },
      });
    } else {
      // Mettre à jour le username / profileUrl si ça a changé
      if (existing.username !== fm.username || existing.profileUrl !== fm.profileUrl) {
        await db.member.update({
          where: { id: existing.id },
          data: {
            username: fm.username,
            profileUrl: fm.profileUrl,
          },
        });
      }
    }
  }

  // 2) Récupérer tous les membres en base pour ce groupe, scraper leurs points
  const members = await db.member.findMany({ where: { groupId: group.id } });

  for (const m of members) {
    try {
      const currentPoints = await fetchMemberPoints(m.profileUrl);
      const lastPoints = m.lastPoints;
      const hasChanged = lastPoints === null ? true : currentPoints !== lastPoints;

      await db.member.update({
        where: { id: m.id },
        data: {
          lastPoints: currentPoints,
          lastScanAt: now,
          lastChangeAt: hasChanged ? now : m.lastChangeAt,
        },
      });

      // logging optionnel
      if (hasChanged) {
        console.log(
          `[${group.name}] ${m.username}: points ${lastPoints} → ${currentPoints}`
        );
      }
    } catch (err) {
      console.error(`Erreur pour ${m.username} (${m.profileUrl}) :`, err);
    }
  }
}
