import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARS_STOPS_X,
  MARS_STOPS_Y,
  MARS_STOPS_S,
  MARS_ENTRY_DURATION,
  MARS_ENTRY_START_Y,
  sampleStops,
  computeResponsiveMarsPose,
  computeEntryOffset,
  sampleMarsSurface,
  generateMarsMarkerPositions,
} from './marsChoreography';

test('sampleStops reproduces exact keyframe values and smoothstep midpoints', () => {
  assert.equal(sampleStops(MARS_STOPS_X, 0), 0);
  assert.equal(sampleStops(MARS_STOPS_X, 0.32), -3.1);
  assert.equal(sampleStops(MARS_STOPS_X, 0.64), 3.2);
  assert.equal(sampleStops(MARS_STOPS_X, 1), 0);

  assert.equal(sampleStops(MARS_STOPS_Y, 0), -4.5);
  assert.equal(sampleStops(MARS_STOPS_S, 0), 2.15);

  // Midpoint t=0.5 of smoothstep is 0.5 -> midpoint between 0 and -3.1 is -1.55
  const mid = sampleStops(MARS_STOPS_X, 0.16);
  assert.ok(Math.abs(mid - -1.55) < 1e-6);
});

test('computeResponsiveMarsPose keeps desktop keyframes intact and bounds mobile lateral swing within frustum', () => {
  const desktopHero = computeResponsiveMarsPose(0, 1440, 900);
  assert.equal(desktopHero.sideScale, 1);
  assert.equal(desktopHero.x, 0);
  assert.equal(desktopHero.y, -4.5);
  assert.equal(desktopHero.scale, 2.15);

  const desktopSwing = computeResponsiveMarsPose(0.64, 1440, 900);
  assert.ok(Math.abs(desktopSwing.x - 3.2) < 1e-6);

  // Mobile portrait (390x844): camera half-width at z=0 is ~1.345 world units
  const mobileHero = computeResponsiveMarsPose(0, 390, 844);
  assert.ok(mobileHero.scale < desktopHero.scale && mobileHero.scale > 1.45);
  assert.ok(mobileHero.y >= -4.5 && mobileHero.y < -4.2);

  const mobileLeft = computeResponsiveMarsPose(0.32, 390, 844);
  const mobileRight = computeResponsiveMarsPose(0.64, 390, 844);
  assert.ok(Math.abs(mobileLeft.x) < 1.15, `mobileLeft.x=${mobileLeft.x} should stay in portrait view`);
  assert.ok(Math.abs(mobileRight.x) < 1.15, `mobileRight.x=${mobileRight.x} should stay in portrait view`);
});

test('computeEntryOffset eases upward over ENTRY_DURATION and skips under reducedMotion', () => {
  assert.equal(computeEntryOffset(0, true), 0);
  assert.equal(computeEntryOffset(0, false), MARS_ENTRY_START_Y);
  const half = computeEntryOffset(MARS_ENTRY_DURATION * 0.5, false);
  assert.ok(half > MARS_ENTRY_START_Y && half < 0);
  assert.equal(computeEntryOffset(MARS_ENTRY_DURATION, false), 0);
  assert.equal(computeEntryOffset(MARS_ENTRY_DURATION + 1, false), 0);
});

test('sampleMarsSurface produces seamless longitudinal wrap, rusty iron-oxide regolith, Valles Marineris canyon, and polar ice caps', () => {
  // Exact wrap continuity at -PI and +PI
  const seamLeft = sampleMarsSurface(-Math.PI, 0.2);
  const seamRight = sampleMarsSurface(Math.PI, 0.2);
  assert.equal(seamLeft.r, seamRight.r);
  assert.equal(seamLeft.g, seamRight.g);
  assert.equal(seamLeft.b, seamRight.b);
  assert.ok(Math.abs(seamLeft.height - seamRight.height) < 1e-9);

  // Equatorial Martian regolith has iron-oxide red/ochre dominance (R > G > B)
  const plain = sampleMarsSurface(0.2, 0.1);
  assert.equal(plain.isPolarIce, false);
  assert.ok(plain.r > plain.g && plain.g > plain.b, `Expected rusty R>G>B, got ${plain.r},${plain.g},${plain.b}`);

  // North & South poles have bright CO2/H2O polar ice caps
  const northPole = sampleMarsSurface(0, 1.5);
  const southPole = sampleMarsSurface(0, -1.5);
  assert.equal(northPole.isPolarIce, true);
  assert.equal(southPole.isPolarIce, true);
  assert.ok(northPole.r > 210 && northPole.g > 205 && northPole.b > 200);

  // Olympus Mons peak stands significantly higher than Valles Marineris canyon floor
  const olympus = sampleMarsSurface(-2.33, 0.32);
  const vallesFloor = sampleMarsSurface(-1.22, -0.19);
  assert.ok(olympus.height > vallesFloor.height + 0.2);

  // Markers sit cleanly on lifted sphere radius
  const markers = generateMarsMarkerPositions(60, 1.95);
  assert.equal(markers.length, 60);
  const expectedR = 1.95 * 1.014;
  for (const m of markers) {
    const dist = Math.hypot(m.x, m.y, m.z);
    assert.ok(Math.abs(dist - expectedR) < 1e-5);
  }
});
