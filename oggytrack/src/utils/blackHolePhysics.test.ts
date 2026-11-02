import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLACK_HOLE_CONSTANTS,
  computeBlackHoleWorkspacePose,
  computeDopplerFactor,
  generateKeplerianParticles,
  sampleAccretionSpectrum,
} from './blackHolePhysics';

test('computeDopplerFactor boosts approaching plasma and dims receding plasma', () => {
  const approaching = computeDopplerFactor(0.48, 0.92);
  const transverse = computeDopplerFactor(0.48, 0.0);
  const receding = computeDopplerFactor(0.48, -0.92);

  assert.ok(approaching > 1.45, `expected strong blueshift > 1.45, got ${approaching}`);
  assert.ok(transverse < 1.0, `expected transverse time-dilation < 1.0, got ${transverse}`);
  assert.ok(receding < 0.72, `expected redshift < 0.72, got ${receding}`);
  assert.ok(approaching > transverse && transverse > receding);
});

test('sampleAccretionSpectrum shifts from hot bright inner ISCO rim to warm crimson outer disk', () => {
  const innerApproaching = sampleAccretionSpectrum(0.04, 1.55);
  const outerReceding = sampleAccretionSpectrum(0.92, 0.68);

  assert.ok(innerApproaching.r >= innerApproaching.g && innerApproaching.g >= innerApproaching.b);
  assert.ok(innerApproaching.b > outerReceding.b + 0.25, 'inner beamed plasma has hotter blue-white core');
  assert.ok(outerReceding.r > outerReceding.g && outerReceding.g >= outerReceding.b);
});

test('computeBlackHoleWorkspacePose offsets desktop right of sidebar and bounds mobile disk inside portrait frustum', () => {
  const desktopExpanded = computeBlackHoleWorkspacePose({
    viewportWidth: 1440,
    viewportHeight: 900,
    sidebarCollapsed: false,
    activePage: 'dashboard',
    scrollY: 0,
  });
  const desktopCollapsed = computeBlackHoleWorkspacePose({
    viewportWidth: 1440,
    viewportHeight: 900,
    sidebarCollapsed: true,
    activePage: 'dashboard',
    scrollY: 0,
  });

  assert.equal(desktopExpanded.isMobile, false);
  assert.ok(
    desktopExpanded.x > desktopCollapsed.x,
    'expanded sidebar shifts black hole further right to stay centered in <main>'
  );
  assert.ok(desktopExpanded.scale >= 0.9 && desktopExpanded.scale <= 1.05);

  const mobileHero = computeBlackHoleWorkspacePose({
    viewportWidth: 390,
    viewportHeight: 844,
    sidebarCollapsed: false,
    activePage: 'dashboard',
    scrollY: 0,
  });

  assert.equal(mobileHero.isMobile, true);
  assert.equal(mobileHero.x, 0);

  // Verify accretion outer radius scaled on mobile stays comfortably inside portrait frustum half-width
  const halfFovRad = (BLACK_HOLE_CONSTANTS.CAMERA_FOV_DEG * 0.5 * Math.PI) / 180;
  const mobileFrustumHalfW =
    BLACK_HOLE_CONSTANTS.CAMERA_Z * Math.tan(halfFovRad) * (390 / 844);
  const apparentOuterDiskHalfW = BLACK_HOLE_CONSTANTS.ACCRETION_OUTER_RADIUS * mobileHero.scale * 0.58;
  assert.ok(
    apparentOuterDiskHalfW < mobileFrustumHalfW,
    `expected scaled mobile disk (${apparentOuterDiskHalfW}) < frustum half-width (${mobileFrustumHalfW})`
  );
});

test('generateKeplerianParticles obeys Keplerian angular velocity ordering (inner faster than outer)', () => {
  const particles = generateKeplerianParticles(120, 1.4, 4.9);
  assert.equal(particles.length, 120);

  const sorted = [...particles].sort((a, b) => a.radius - b.radius);
  const innermost = sorted[0];
  const outermost = sorted[sorted.length - 1];

  assert.ok(innermost.radius >= 1.4 && outermost.radius <= 4.9);
  assert.ok(
    innermost.angularSpeed > outermost.angularSpeed * 2.5,
    'inner ISCO plasma orbits significantly faster than outer dust'
  );
  assert.ok(innermost.temperature > outermost.temperature);
});
