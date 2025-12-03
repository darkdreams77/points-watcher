import 'dotenv/config';
import { db } from '../db';

async function test() {
  const backups = await db.memberBackup.findMany();
  console.log(backups.length);
}

test();
