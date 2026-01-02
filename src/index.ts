import { DateTime } from 'luxon';
import { syncAllGroups } from './scraper';

async function main() {
  const now = DateTime.now().setZone('Europe/Paris');
  const env = process.env.ENV;

  const isMidnightFR = now.hour === 0;
  const isSunday20hFR = now.weekday === 7 && now.hour === 20;
  const isLocal = env === 'local';

  if (!isLocal && !isMidnightFR && !isSunday20hFR) {
    console.log(
      `⏭  Pas l'heure (FR). Actuel: ${now.toFormat(
        'cccc HH:mm'
      )} — scraping annulé.`
    );
    return;
  }

  console.log(
    isLocal
      ? '🛠️ ENV=local → scraping forcé'
      : isSunday20hFR
      ? '🕗 Dimanche 20h en France → scraping hebdomadaire'
      : '🕛 Minuit en France → scraping quotidien'
  );

  console.log(`📅 Heure FR: ${now.toISO()}`);

  await syncAllGroups();

  console.log('✔ Scraping terminé !');
}

main().catch((err) => {
  console.error("Erreur lors de l'exécution du scraping :", err);
  process.exit(1);
});
