import { AppSettings, PrimaryColor } from '../types/oggytrack';

export interface WorkspaceAccentPreset {
  id: Exclude<PrimaryColor, 'custom'>;
  name: string;
  baseHex: string;
  secondaryHex: string;
  description: string;
}

export interface DerivedAccentPalette {
  id: PrimaryColor;
  name: string;
  accent300: string;
  accent400: string;
  accent500: string;
  accent600: string;
  accent950: string;
  accentSecondary: string;
  accentInk: '#020617' | '#ffffff';
}

export interface ColorSwatchOption {
  id: string;
  name: string;
  hex: string;
}

export const DARK_CANVAS_HEX = '#090d16';

export const WORKSPACE_ACCENT_PRESETS: WorkspaceAccentPreset[] = [
  {
    id: 'emerald',
    name: 'Emerald Mint',
    baseHex: '#10b981',
    secondaryHex: '#0d9488',
    description: 'Signature crisp emerald',
  },
  {
    id: 'teal',
    name: 'Lagoon Teal',
    baseHex: '#14b8a6',
    secondaryHex: '#0891b2',
    description: 'Calm aqua & seafoam',
  },
  {
    id: 'cyan',
    name: 'Cyber Cyan',
    baseHex: '#06b6d4',
    secondaryHex: '#0284c7',
    description: 'Bright ice cyan',
  },
  {
    id: 'sky',
    name: 'Ocean Sky',
    baseHex: '#38bdf8',
    secondaryHex: '#2563eb',
    description: 'Clear horizon blue',
  },
  {
    id: 'blue',
    name: 'Electric Blue',
    baseHex: '#2563eb',
    secondaryHex: '#4f46e5',
    description: 'Deep cobalt blue',
  },
  {
    id: 'indigo',
    name: 'Deep Indigo',
    baseHex: '#4f46e5',
    secondaryHex: '#7c3aed',
    description: 'Focused academic indigo',
  },
  {
    id: 'violet',
    name: 'Royal Violet',
    baseHex: '#7c3aed',
    secondaryHex: '#9333ea',
    description: 'Rich amethyst violet',
  },
  {
    id: 'fuchsia',
    name: 'Neon Berry',
    baseHex: '#c026d3',
    secondaryHex: '#db2777',
    description: 'Vibrant orchid magenta',
  },
  {
    id: 'rose',
    name: 'Coral Rose',
    baseHex: '#e11d48',
    secondaryHex: '#ea580c',
    description: 'Warm ruby crimson',
  },
  {
    id: 'amber',
    name: 'Solar Amber',
    baseHex: '#f59e0b',
    secondaryHex: '#ea580c',
    description: 'Warm golden amber',
  },
];

export const SUBJECT_COLOR_SWATCHES: ColorSwatchOption[] = [
  { id: 'emerald', name: 'Emerald', hex: '#10b981' },
  { id: 'teal', name: 'Teal', hex: '#14b8a6' },
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4' },
  { id: 'sky', name: 'Sky Blue', hex: '#0ea5e9' },
  { id: 'blue', name: 'Royal Blue', hex: '#3b82f6' },
  { id: 'indigo', name: 'Indigo', hex: '#6366f1' },
  { id: 'violet', name: 'Violet', hex: '#8b5cf6' },
  { id: 'fuchsia', name: 'Fuchsia', hex: '#d946ef' },
  { id: 'pink', name: 'Pink', hex: '#ec4899' },
  { id: 'rose', name: 'Coral Rose', hex: '#f43f5e' },
  { id: 'orange', name: 'Tangerine', hex: '#f97316' },
  { id: 'amber', name: 'Amber Gold', hex: '#f59e0b' },
];

export function normalizeHexColor(input: string | undefined | null, fallback = '#10b981'): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  const shortMatch = /^#?([0-9a-fA-F]{3})$/.exec(trimmed);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const fullMatch = /^#?([0-9a-fA-F]{6})$/.exec(trimmed);
  if (fullMatch) {
    return `#${fullMatch[1].toLowerCase()}`;
  }
  return fallback;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHexColor(hex).slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function channelToHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0');
}

export function mixHexColors(hexA: string, hexB: string, weightB: number): string {
  const w = Math.max(0, Math.min(1, weightB));
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = a.r * (1 - w) + b.r * w;
  const g = a.g * (1 - w) + b.g * w;
  const bl = a.b * (1 - w) + b.b * w;
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(bl)}`;
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableOnAccentColor(bgHex: string): '#020617' | '#ffffff' {
  const darkInk: '#020617' = '#020617';
  const lightInk: '#ffffff' = '#ffffff';
  return getContrastRatio(bgHex, darkInk) >= getContrastRatio(bgHex, lightInk)
    ? darkInk
    : lightInk;
}

/**
 * Ensures button background has >= 4.6:1 WCAG AA contrast with its chosen text ink,
 * and text accent (`accent400`) has >= 5.0:1 contrast on `#090d16` dark canvas.
 */
export function deriveAccentPalette(
  primaryColor: PrimaryColor = 'emerald',
  customHex?: string
): DerivedAccentPalette {
  const preset = WORKSPACE_ACCENT_PRESETS.find((p) => p.id === primaryColor);
  const rawBase =
    primaryColor === 'custom'
      ? normalizeHexColor(customHex, '#10b981')
      : preset?.baseHex || '#10b981';

  let accent500 = rawBase;
  let accentInk = getReadableOnAccentColor(accent500);

  // Nudge mid-luminance custom colors out of the narrow 4.41:1 dead-zone so button contrast >= 4.6:1
  if (getContrastRatio(accent500, accentInk) < 4.6) {
    const lighterCandidate = mixHexColors(accent500, '#ffffff', 0.14);
    const darkerCandidate = mixHexColors(accent500, '#000000', 0.16);
    if (getContrastRatio(lighterCandidate, '#020617') >= 4.6) {
      accent500 = lighterCandidate;
      accentInk = '#020617';
    } else {
      accent500 = darkerCandidate;
      accentInk = '#ffffff';
    }
  }

  // Ensure text highlight (`accent400`) is clearly legible (>= 5.2:1) on `#090d16`
  let accent400 = mixHexColors(rawBase, '#ffffff', 0.24);
  let safetySteps = 0;
  while (getContrastRatio(accent400, DARK_CANVAS_HEX) < 5.2 && safetySteps < 8) {
    accent400 = mixHexColors(accent400, '#ffffff', 0.18);
    safetySteps += 1;
  }

  const accent300 = mixHexColors(accent400, '#ffffff', 0.28);
  const accent600 = mixHexColors(accent500, '#020617', 0.18);
  const accent950 = mixHexColors(accent500, '#020617', 0.82);
  const accentSecondary = preset
    ? preset.secondaryHex
    : mixHexColors(accent500, '#38bdf8', 0.35);

  return {
    id: primaryColor,
    name: preset ? preset.name : `Custom (${rawBase.toUpperCase()})`,
    accent300,
    accent400,
    accent500,
    accent600,
    accent950,
    accentSecondary,
    accentInk,
  };
}

export function pickNextSubjectColor(existingColors: string[]): string {
  const used = new Set(existingColors.map((c) => normalizeHexColor(c)));
  const unused = SUBJECT_COLOR_SWATCHES.find((s) => !used.has(normalizeHexColor(s.hex)));
  if (unused) return unused.hex;
  return SUBJECT_COLOR_SWATCHES[existingColors.length % SUBJECT_COLOR_SWATCHES.length].hex;
}

export function applyWorkspaceAccentToRoot(
  rootStyle: { setProperty: (property: string, value: string) => void },
  settings: Pick<AppSettings, 'primaryColor' | 'customHex' | 'accentColor'>
): DerivedAccentPalette {
  const palette = deriveAccentPalette(
    settings.primaryColor || 'emerald',
    settings.customHex || settings.accentColor
  );
  rootStyle.setProperty('--accent-color', palette.accent500);
  rootStyle.setProperty('--oggy-accent-300', palette.accent300);
  rootStyle.setProperty('--oggy-accent-400', palette.accent400);
  rootStyle.setProperty('--oggy-accent-500', palette.accent500);
  rootStyle.setProperty('--oggy-accent-600', palette.accent600);
  rootStyle.setProperty('--oggy-accent-950', palette.accent950);
  rootStyle.setProperty('--oggy-accent-secondary', palette.accentSecondary);
  rootStyle.setProperty('--oggy-accent-ink', palette.accentInk);
  return palette;
}
