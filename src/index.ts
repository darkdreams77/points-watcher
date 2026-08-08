import { DateTime } from 'luxon';
import { syncAllGroups, ScrapeResult } from './scraper';
import { sendDiscordAlert } from './discord';
import { db } from './db';

type RunKind = 'daily' | 'weekly';

function buildResultMessage(
  kind: RunKind,
  targetDate: string,
  result: ScrapeResult
): string {
  const lines = [
    `❌ Scraping **${kind}** du ${targetDate} incomplet après plusieurs tentatives.`,
  ];

  if (result.failedGroupNames.length > 0) {
    lines.push(
      `Groupes non listés (${result.failedGroupNames.length}) : ${result.failedGroupNames.join(', ')}`
    );
  }

  if (result.failedMemberNames.length > 0) {
    lines.push(
      `Membres non scrappés (${result.failedMemberNames.length}/${result.totalMembers}) : ${result.failedMemberNames.slice(0, 30).join(', ')}${result.failedMemberNames.length > 30 ? '…' : ''}`
    );
  }

  return lines.join('\n');
}

async function runTracked(kind: RunKind, targetDate: string): Promise<void> {
  await db.scrapeRun.upsert({
    where: { kind_targetDate: { kind, targetDate } },
    create: { kind, targetDate, status: 'running' },
    update: { status: 'running', startedAt: new Date(), finishedAt: null, error: null },
  });

  try {
    const result = await syncAllGroups();
    const hasFailures =
      result.failedGroupNames.length > 0 || result.failedMemberNames.length > 0;

    if (hasFailures) {
      const message = buildResultMessage(kind, targetDate, result);
      console.error(message);
      await db.scrapeRun.update({
        where: { kind_targetDate: { kind, targetDate } },
        data: { status: 'failed', finishedAt: new Date(), error: message },
      });
      await sendDiscordAlert(message);
    } else {
      await db.scrapeRun.update({
        where: { kind_targetDate: { kind, targetDate } },
        data: { status: 'success', finishedAt: new Date() },
      });
      console.log(`✔ Scraping ${kind} du ${targetDate} terminé sans erreur.`);
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    const message = `❌ Le scraping **${kind}** du ${targetDate} a crashé : ${errorMessage}`;
    console.error(message, e);
    await db.scrapeRun.update({
      where: { kind_targetDate: { kind, targetDate } },
      data: { status: 'failed', finishedAt: new Date(), error: message },
    });
    await sendDiscordAlert(message);
    throw e;
  }
}

async function main() {
  const now = DateTime.now().setZone('Europe/Paris');
  const env = process.env.ENV;
  const isLocal = env === 'local';

  if (isLocal) {
    console.log('🛠️ ENV=local → scraping forcé (sans tracking ni alerte)');
    await syncAllGroups();
    console.log('✔ Scraping terminé !');
    return;
  }

  console.log(`📅 Heure FR: ${now.toISO()}`);

  const todayKey = now.toISODate()!;
  const isSunday = now.weekday === 7;

  const dailyRun = await db.scrapeRun.findUnique({
    where: { kind_targetDate: { kind: 'daily', targetDate: todayKey } },
  });
  const dailyDue = !dailyRun || dailyRun.status !== 'success';

  const weeklyRun = await db.scrapeRun.findUnique({
    where: { kind_targetDate: { kind: 'weekly', targetDate: todayKey } },
  });
  const weeklyDue =
    isSunday && now.hour >= 20 && (!weeklyRun || weeklyRun.status !== 'success');

  // Le run de minuit est censé se déclencher à l'heure 0. S'il n'a
  // toujours pas réussi une heure plus tard, le tick cron a probablement
  // été retardé ou sauté (ex: incident GitHub Actions) — on prévient
  // avant de retenter, plutôt que de rattraper silencieusement.
  if (now.hour === 1 && dailyDue) {
    await sendDiscordAlert(
      `⚠️ Le scraping quotidien de minuit (${todayKey}) n'a pas eu lieu à l'heure prévue. Nouvelle tentative en cours...`
    );
  }

  if (!dailyDue && !weeklyDue) {
    console.log(
      `⏭ Rien à faire pour l'instant (FR ${now.toFormat('cccc HH:mm')}).`
    );
    return;
  }

  if (dailyDue) {
    console.log(`🕛 Run quotidien dû pour ${todayKey}`);
    await runTracked('daily', todayKey);
  }

  if (weeklyDue) {
    console.log(`🕗 Run hebdomadaire dû pour ${todayKey}`);
    await runTracked('weekly', todayKey);
  }

  console.log('✔ Cycle de scraping terminé !');
}

main().catch((err) => {
  console.error("Erreur lors de l'exécution du scraping :", err);
  process.exit(1);
});
