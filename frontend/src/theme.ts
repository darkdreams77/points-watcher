import {
  createTheme,
  type ThemeOptions,
  type PaletteMode,
} from '@mui/material/styles';

// Palette encre/périwinkle — volontairement différente du bleu MUI par
// défaut et des associations crème+serif / noir+néon trop vues.
const tokens = {
  dark: {
    bg: '#10131A',
    surface: '#1B1F2A',
    text: '#EDEFF4',
    textSecondary: '#9AA1B4',
    accent: '#7C8CFF',
  },
  light: {
    bg: '#F7F8FB',
    surface: '#FFFFFF',
    text: '#1B1F2A',
    textSecondary: '#5B6178',
    accent: '#4F5FE0',
  },
} as const;

export const statusColors = {
  light: {
    actif: '#4ADE80',
    absent: '#F5A524',
    enDanger: '#FB7185',
    toDelete: '#64748B',
  },
  dark: {
    actif: '#16A34A',
    absent: '#D97706',
    enDanger: '#E11D48',
    toDelete: '#475569',
  },
} as const;

export function getStatusColors(mode: PaletteMode) {
  return statusColors[mode];
}

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
      fontFamily: [
        'Work Sans',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Arial',
        'sans-serif',
      ].join(','),
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 8 },
  };
}

export function createAppTheme(mode: PaletteMode) {
  return createTheme(getDesignTokens(mode));
}
