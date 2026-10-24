// Palette dell'avatar, limitata ai token del brand (letti da CSS a runtime) + toni della pelle.

export const SKIN_TONES = ['#f1c9a5', '#d9a47a', '#a8714a', '#6e4529'];

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function brandColors() {
  return {
    yellow: cssVar('--thunder-yellow', '#ffc20e'),
    navy: cssVar('--thunder-navy', '#0b1f3f'),
    blue: cssVar('--thunder-blue', '#1d4e9e'),
    white: cssVar('--thunder-white', '#f5f7fa'),
    steel: cssVar('--thunder-steel', '#8a94a6'),
  };
}
