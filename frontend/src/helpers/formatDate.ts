import { DateTime } from 'luxon';

export function formatDateParis(value: string | null): string {
  if (!value) return '-';

  return DateTime.fromISO(value) // lit le timestamp stocké en DB (UTC)
    .setZone('Europe/Paris') // convertit en heure française
    .setLocale('fr') // format toujours en français, indépendamment du navigateur
    .toFormat('dd LLL yyyy'); // format lisible (ex: 30 nov 2025)
}

export function formatDateWithHours(value: string | null): string {
  if (!value) return '-';

  return DateTime.fromISO(value)
    .setZone('Europe/Paris')
    .setLocale('fr')
    .toFormat('dd LLL yyyy, HH:mm');
}
