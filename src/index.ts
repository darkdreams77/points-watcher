import "dotenv/config";
import { db } from "./db";
import { syncGroupMembers } from "./scraper";

async function main() {
  // Ex : tu peux stocker la liste des groupes que tu veux suivre dans la DB
  const groups = await db.group.findMany();

  if (groups.length === 0) {
    console.log("Aucun groupe en base. Ajoute-les via un seed ou manuellement.");
    return;
  }

  for (const g of groups) {
    console.log(`=== Sync groupe ${g.name} (forumId=${g.forumId}) ===`);
    await syncGroupMembers(g.id);
  }
}

main()
  .catch((err) => {
    console.error("Erreur dans le script principal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
