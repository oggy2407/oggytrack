import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GLASS_SETTINGS,
  computeScaledDimensions,
  deriveGlassCssVariables,
  isSafeImageDataUrl,
  normalizeGlassSettings,
} from './wallpaperGlass';

test('normalizeGlassSettings returns defaults and clamps out-of-range sliders', () => {
  const defaults = normalizeGlassSettings(undefined);
  assert.deepEqual(defaults, DEFAULT_GLASS_SETTINGS);

  const clamped = normalizeGlassSettings({
    backgroundMode: 'photo',
    applyPhotoToLanding: true,
    glassOpacity: 4,
    glassBlur: 99,
    photoDimmer: 98,
    photoBlur: -5,
  });
  assert.equal(clamped.backgroundMode, 'photo');
  assert.equal(clamped.applyPhotoToLanding, true);
  assert.equal(clamped.glassOpacity, 16);
  assert.equal(clamped.glassBlur, 32);
  assert.equal(clamped.photoDimmer, 85);
  assert.equal(clamped.photoBlur, 0);
});

test('isSafeImageDataUrl accepts base64 raster formats and rejects SVG or external URLs', () => {
  const validPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const validWebp =
    'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';

  assert.equal(isSafeImageDataUrl(validPng), true);
  assert.equal(isSafeImageDataUrl(validWebp), true);
  assert.equal(isSafeImageDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), false);
  assert.equal(isSafeImageDataUrl('https://example.com/photo.jpg'), false);
  assert.equal(isSafeImageDataUrl('javascript:alert(1)'), false);
  assert.equal(isSafeImageDataUrl(''), false);
});

test('computeScaledDimensions preserves aspect ratio without upscaling small photos', () => {
  assert.deepEqual(computeScaledDimensions(3840, 2160, 1920, 1080), {
    width: 1920,
    height: 1080,
  });
  assert.deepEqual(computeScaledDimensions(1000, 2000, 1920, 1080), {
    width: 540,
    height: 1080,
  });
  assert.deepEqual(computeScaledDimensions(800, 600, 1920, 1080), {
    width: 800,
    height: 600,
  });
});

test('deriveGlassCssVariables switches to photo mode only when a custom photo exists', () => {
  const withoutPhoto = deriveGlassCssVariables(
    { backgroundMode: 'photo', glassOpacity: 35, glassBlur: 20, photoDimmer: 50, photoBlur: 4 },
    false
  );
  assert.equal(withoutPhoto.activeBgMode, 'space');

  const withPhoto = deriveGlassCssVariables(
    { backgroundMode: 'photo', glassOpacity: 35, glassBlur: 20, photoDimmer: 50, photoBlur: 4 },
    true
  );
  assert.equal(withPhoto.activeBgMode, 'photo');
  assert.equal(withPhoto.cssVars['--oggy-glass-alpha'], '0.35');
  assert.equal(withPhoto.cssVars['--oggy-glass-blur'], '20px');
  assert.equal(withPhoto.cssVars['--oggy-photo-dimmer'], '0.5');
  assert.equal(withPhoto.cssVars['--oggy-photo-blur'], '4px');
});
