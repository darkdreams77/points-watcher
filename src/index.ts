import 'dotenv/config';
import { db } from './db';
import { syncAllGroups } from './scraper';

async function main() {
  await syncAllGroups();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
