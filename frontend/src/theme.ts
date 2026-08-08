import { createTheme, type ThemeOptions, type PaletteMode } from '@mui/material/styles';

// Palette encre chaude + corail — inspirée de saveit.now : fond noir
// chaud (pas un noir bleuté), accent terracotta plutôt qu'un bleu
// générique de dashboard.
const tokens = {
  dark: {
    bg: '#0E0A09',
    surface: '#1C1512',
    text: '#F5EFEA',
    textSecondary: '#A79C94',
    accent: '#E8622E',
  },
  light: {
    bg: '#FAF6F3',
    surface: '#FFFFFF',
    text: '#231A16',
    textSecondary: '#6B5D54',
    accent: '#D9541F',
  },
} as const;

// Couleurs de statut/groupe volontairement laissées telles quelles —
// pas touchées par ce passage de design.
export const statusColors = {
  dark: {
    actif: '#4ADE80',
    absent: '#F5A524',
    enDanger: '#FB7185',
    toDelete: '#64748B',
  },
  light: {
    actif: '#16A34A',
    absent: '#D97706',
    enDanger: '#E11D48',
    toDelete: '#475569',
  },
} as const;

export function getStatusColors(mode: PaletteMode) {
  return statusColors[mode];
}

const bodyFont = [
  'Work Sans',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Arial',
  'sans-serif',
].join(',');

const displayFont = ['Fraunces', 'Georgia', 'serif'].join(',');

export function getDesignTokens(mode: PaletteMode): ThemeOptions {
  const t = tokens[mode];

  return {
    palette: {
      mode,
      background: { default: t.bg, paper: t.surface },
      text: { primary: t.text, secondary: t.textSecondary },
      primary: { main: t.accent },
    },
    typography: {
      fontFamily: bodyFont,
      h4: { fontFamily: displayFont, fontWeight: 500 },
      h5: { fontFamily: displayFont, fontWeight: 500 },
      h6: { fontFamily: displayFont, fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 999 },
        },
      },
    },
  };
}

export function createAppTheme(mode: PaletteMode) {
  return createTheme(getDesignTokens(mode));
}
