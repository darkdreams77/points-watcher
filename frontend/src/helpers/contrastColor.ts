// Choisit noir ou blanc selon la luminance relative du fond (WCAG),
// pour garantir un contraste correct quelle que soit la couleur —
// les couleurs de groupe/statut elles-mêmes restent inchangées.
export function getContrastText(hex: string): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return '#FFFFFF';

  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;

  const linear = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

  return luminance > 0.45 ? '#171310' : '#FFFFFF';
}
