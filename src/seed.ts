import 'dotenv/config';
import { db } from './db';

async function main() {
  const groups = [
    { forumId: '3-adams-house', name: 'Adams House' },
    { forumId: '464-bizuts-adams-house', name: 'Bizuts Adams House' },
    { forumId: '463-franklin-house', name: 'Franklin House' },
    { forumId: '465-bizuts-franklin-house', name: 'Bizuts Franklin House' },
    { forumId: '432-kirkland-house', name: 'Kirkland House' },
    { forumId: '466-bizuts-kirkland-house', name: 'Bizuts Kirkland House' },
    { forumId: '4-pforzheimer-house', name: 'Pforzheimer House' },
    { forumId: '467-bizuts-pforzheimer-house', name: 'Bizuts Pforzheimer House' },
    { forumId: '7-students', name: 'Students' },
    { forumId: '401-dark-rises', name: 'Dark Rises' },
    { forumId: '390-fire-starter', name: 'Fire Starter' },
    { forumId: '388-i-want-it-i-got-it', name: 'I want it, I got it' },
    { forumId: '389-love-shot', name: 'Love Shot' },
    { forumId: '391-wrecked-souls', name: 'Wrecked Souls' },
  ];

  for (const g of groups) {
    const group = await db.group.upsert({
      where: { id: g.name },
      update: { name: g.name },
      create: {
        id: g.name,
        forumId: g.forumId,
        name: g.name,
      },
    });

    console.log('Groupe en base :', group.name);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
