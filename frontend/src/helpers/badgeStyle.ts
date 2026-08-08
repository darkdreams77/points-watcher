// Dérive un style de badge "doux" (fond clair, bordure moyenne, texte
// foncé saturé) à partir d'une seule couleur de base, quelle que soit
// sa clarté d'origine — en clampant la luminosité en HSL plutôt qu'en
// mélangeant au blanc/noir, le résultat reste cohérent pour toutes les
// couleurs (pastel ou vives).

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): Hsl {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h *= 60;

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (n: number) =>
    Math.round(f(n) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

export interface BadgeColors {
  bg: string;
  border: string;
  text: string;
}

// En clair : pastille pastel (fond très clair, texte foncé saturé) — se
// fond dans une page claire. En sombre, le même traitement produit des
// autocollants clairs qui jurent sur le fond ; on inverse donc la
// direction du clamp de luminosité (fond sombre teinté, texte clair
// saturé) pour que le badge s'intègre à la surface sombre.
export function getBadgeColors(hex: string, mode: 'light' | 'dark' = 'light'): BadgeColors {
  const { h, s } = hexToHsl(hex);

  if (mode === 'dark') {
    const satForBg = Math.min(Math.max(s, 30), 65);
    const satForText = Math.max(s, 50);

    return {
      bg: hslToHex(h, satForBg, 22),
      border: hslToHex(h, satForBg, 40),
      text: hslToHex(h, satForText, 80),
    };
  }

  const satForBg = Math.min(s, 65);
  const satForText = Math.max(s, 45);

  return {
    bg: hslToHex(h, satForBg, 93),
    border: hslToHex(h, satForBg, 78),
    text: hslToHex(h, satForText, 30),
  };
}
