import { DateTime } from 'luxon';

export function formatDateParis(value: string | null): string {
  if (!value) return '-';

  return DateTime.fromISO(value) // lit le timestamp stocké en DB (UTC)
    .setZone('Europe/Paris') // convertit en heure française
    .toFormat('dd LLL yyyy'); // format lisible (ex: 30 nov 2025)
}

export function formatDateWithHours(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
