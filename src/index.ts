import { DateTime } from 'luxon';
import { syncAllGroups } from './scraper';

async function main() {
  const now = DateTime.now().setZone('Europe/Paris');
  const env = process.env.ENV;

  // Vérification : minuit FR ?
  if (now.hour !== 0 && env !== 'local') {
    console.log(
      `⏭  Pas minuit en France (${now.toFormat(
        'HH:mm'
      )}), scraping annulé. Prochain check dans 1h.`
    );
    return;
  }

  console.log(
    `🛠️ Scrap local OU 🕛 Il est minuit en France (${now.toISO()}), lancement du scraping...`
  );
  await syncAllGroups();
  console.log('✔ Scraping terminé !');
}

main().catch((err) => {
  console.error("Erreur lors de l'exécution du scraping :", err);
  process.exit(1);
});
