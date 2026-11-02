import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DARK_CANVAS_HEX,
  SUBJECT_COLOR_SWATCHES,
  WORKSPACE_ACCENT_PRESETS,
  applyWorkspaceAccentToRoot,
  deriveAccentPalette,
  getContrastRatio,
  normalizeHexColor,
  pickNextSubjectColor,
} from './colorPalette';

test('normalizeHexColor handles 3-digit, 6-digit, and invalid hex inputs cleanly', () => {
  assert.equal(normalizeHexColor('#ABC'), '#aabbcc');
  assert.equal(normalizeHexColor('38BDF8'), '#38bdf8');
  assert.equal(normalizeHexColor('not-a-color', '#10b981'), '#10b981');
  assert.equal(normalizeHexColor('', '#f43f5e'), '#f43f5e');
});

test('every workspace accent preset meets WCAG AA contrast for buttons and dark canvas text', () => {
  assert.ok(WORKSPACE_ACCENT_PRESETS.length >= 10);

  for (const preset of WORKSPACE_ACCENT_PRESETS) {
    const palette = deriveAccentPalette(preset.id);
    const buttonContrast = getContrastRatio(palette.accent500, palette.accentInk);
    const textOnDarkContrast = getContrastRatio(palette.accent400, DARK_CANVAS_HEX);

    assert.ok(
      buttonContrast >= 4.5,
      `${preset.name} button contrast ${buttonContrast.toFixed(2)} must be >= 4.5:1`
    );
    assert.ok(
      textOnDarkContrast >= 4.5,
      `${preset.name} text-on-dark contrast ${textOnDarkContrast.toFixed(2)} must be >= 4.5:1`
    );
  }
});

test('custom hex colors including extreme dark, mid, and bright values maintain WCAG AA contrast', () => {
  const customSamples = ['#000000', '#ffffff', '#777777', '#8b5cf6', '#ff6b35', '#1e293b'];

  for (const hex of customSamples) {
    const palette = deriveAccentPalette('custom', hex);
    const buttonContrast = getContrastRatio(palette.accent500, palette.accentInk);
    const textContrast = getContrastRatio(palette.accent400, DARK_CANVAS_HEX);

    assert.ok(
      buttonContrast >= 4.5,
      `Custom ${hex} button contrast ${buttonContrast.toFixed(2)} must be >= 4.5:1`
    );
    assert.ok(
      textContrast >= 4.5,
      `Custom ${hex} text contrast ${textContrast.toFixed(2)} must be >= 4.5:1`
    );
  }
});

test('pickNextSubjectColor selects unused colors before cycling', () => {
  assert.equal(SUBJECT_COLOR_SWATCHES.length, 12);
  const first = pickNextSubjectColor([]);
  assert.equal(first, SUBJECT_COLOR_SWATCHES[0].hex);

  const second = pickNextSubjectColor([first]);
  assert.equal(second, SUBJECT_COLOR_SWATCHES[1].hex);
  assert.notEqual(first, second);
});

test('applyWorkspaceAccentToRoot writes expected CSS custom properties', () => {
  const vars: Record<string, string> = {};
  const mockStyle = {
    setProperty(key: string, val: string) {
      vars[key] = val;
    },
  };

  const applied = applyWorkspaceAccentToRoot(mockStyle, {
    primaryColor: 'violet',
    accentColor: '#7c3aed',
  });

  assert.equal(vars['--oggy-accent-500'], applied.accent500);
  assert.equal(vars['--oggy-accent-400'], applied.accent400);
  assert.equal(vars['--oggy-accent-ink'], applied.accentInk);
});
