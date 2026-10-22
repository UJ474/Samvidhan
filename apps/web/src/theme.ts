export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceElevated: string;
  ink: string;
  inkSoft: string;
  inkSubtle: string;
  border: string;
  legislature: string;
  executive: string;
  judiciary: string;
  chakra: string;
  right: string;
  wrong: string;
  gold: string;
}

export const LIGHT_THEME: ThemeTokens = {
  bg: '#F3ECDD',
  surface: '#FBF7EE',
  surfaceElevated: '#FFFFFF',
  ink: '#16213A',
  inkSoft: '#4A5470',
  inkSubtle: '#7E8BA8',
  border: '#16213A',
  legislature: '#D9731A',
  executive: '#FBF7EE',
  judiciary: '#1E6B49',
  chakra: '#243B8C',
  right: '#1E6B49',
  wrong: '#B3261E',
  gold: '#B8860B',
};

export const DARK_THEME: ThemeTokens = {
  bg: '#0F1626',
  surface: '#18233B',
  surfaceElevated: '#212F4D',
  ink: '#F3ECDD',
  inkSoft: '#B9BFD0',
  inkSubtle: '#6A7592',
  border: '#F3ECDD',
  legislature: '#E88A33',
  executive: '#23304D',
  judiciary: '#3A9B6E',
  chakra: '#7C93E8',
  right: '#3A9B6E',
  wrong: '#E5655C',
  gold: '#E5B13A',
};

export const ORGAN_COLORS: Record<'Legislature' | 'Executive' | 'Judiciary', { bg: string; text: string; border: string }> = {
  Legislature: { bg: '#D9731A', text: '#FFFFFF', border: '#16213A' },
  Executive: { bg: '#FBF7EE', text: '#16213A', border: '#16213A' },
  Judiciary: { bg: '#1E6B49', text: '#FFFFFF', border: '#16213A' },
};
