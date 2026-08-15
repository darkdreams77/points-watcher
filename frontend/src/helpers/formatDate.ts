import { DateTime } from 'luxon';

export function formatDateParis(value: string | null): string {
  if (!value) return '-';

  return DateTime.fromISO(value) // lit le timestamp stocké en DB (UTC)
    .setZone('Europe/Paris') // convertit en heure française
    .setLocale('fr') // format toujours en français, indépendamment du navigateur
    .toFormat('dd LLLL yyyy'); // format lisible (ex: 30 novembre 2025)
}

export function formatDateNoYear(value: string | null): string {
  if (!value) return '-';

  return DateTime.fromISO(value)
    .setZone('Europe/Paris')
    .setLocale('fr')
    .toFormat('dd LLLL');
}

export function formatDateWithHours(value: string | null): string {
  if (!value) return '-';

  return DateTime.fromISO(value)
    .setZone('Europe/Paris')
    .setLocale('fr')
    .toFormat('dd LLLL yyyy, HH:mm');
}
