// src/test-group.ts
import 'dotenv/config';
import { fetchGroupMembersFromForum } from '../forumApi';

async function run() {
  const members = await fetchGroupMembersFromForum('463-franklin-house');
  console.log('Membres trouvés :', members.length);
  console.log(members.slice(0, 5));
}

run().catch(console.error);
