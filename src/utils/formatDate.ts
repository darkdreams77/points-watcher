export function getUtcMidnightOfUtcDate(scanInstant: Date): Date {
  return new Date(
    Date.UTC(
      scanInstant.getUTCFullYear(),
      scanInstant.getUTCMonth(),
      scanInstant.getUTCDate()
    )
  );
}
