export interface KeyframeStop {
  p: number;
  v: number;
}

export const MARS_STOPS_X: KeyframeStop[] = [
  { p: 0, v: 0 },
  { p: 0.32, v: -3.1 },
  { p: 0.64, v: 3.2 },
  { p: 1, v: 0 },
];

export const MARS_STOPS_Y: KeyframeStop[] = [
  { p: 0, v: -4.5 },
  { p: 0.32, v: 0.55 },
  { p: 0.64, v: 0.45 },
  { p: 1, v: 0.15 },
];

export const MARS_STOPS_S: KeyframeStop[] = [
  { p: 0, v: 2.15 },
  { p: 0.32, v: 1.0 },
  { p: 0.64, v: 0.92 },
  { p: 1, v: 1.12 },
];

export const MARS_ENTRY_DURATION = 1.9;
export const MARS_ENTRY_START_Y = -6.5;

export function clampVal(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerpVal(a: number, b: number, t: number): number {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return a + (b - a) * t;
}

/**
 * Piecewise smoothstep interpolation across keyframe stops [{ p, v }].
 */
export function sampleStops(stops: KeyframeStop[], rawP: number): number {
  if (stops.length === 0) return 0;
  const p = clampVal(rawP, stops[0].p, stops[stops.length - 1].p);

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (p >= a.p && p <= b.p) {
      const span = b.p - a.p;
      if (span <= 1e-6 || p === b.p) return b.v;
      if (p === a.p) return a.v;
      const t = clampVal((p - a.p) / span, 0, 1);
      const smooth = t * t * (3 - 2 * t);
      return lerpVal(a.v, b.v, smooth);
    }
  }

  return stops[stops.length - 1].v;
}

export interface ResponsiveMarsPose {
  x: number;
  y: number;
  scale: number;
  sideScale: number;
}

/**
 * Computes scroll-driven Mars position & uniform scale calibrated for both
 * wide desktop viewports (1440x900) and narrow portrait mobile screens (390x844).
 */
export function computeResponsiveMarsPose(
  scrollProgress: number,
  viewportWidth: number,
  viewportHeight: number
): ResponsiveMarsPose {
  const p = clampVal(scrollProgress, 0, 1);
  const safeW = Math.max(viewportWidth, 280);
  const safeH = Math.max(viewportHeight, 360);
  const aspect = safeW / safeH;

  // On desktop (>= 1200px, aspect >= 1.54), sideScale = 1.0 matching exact reference keyframes.
  // On portrait mobile (e.g. aspect ~0.46), cap lateral swing so Mars stays inside camera frustum.
  const desktopSide = clampVal(safeW / 1200, 0.22, 1.0);
  const frustumBoundSide = clampVal(aspect * 0.65, 0.22, 1.0);
  const sideScale = Math.min(desktopSide, frustumBoundSide);

  // Smooth mobile blend (0 on >= 960px desktop, 1 on <= 420px mobile)
  const mobileBlend = clampVal((960 - safeW) / 540, 0, 1);

  const baseX = sampleStops(MARS_STOPS_X, p);
  const baseY = sampleStops(MARS_STOPS_Y, p);
  const baseS = sampleStops(MARS_STOPS_S, p);

  // At hero (p ~ 0) on narrow portrait phones, keep Mars low (-4.42) and scale ~1.58
  // so the glowing Martian horizon sits right below the hero subtitle & CTAs without crowding text.
  const heroWeight = 1 - clampVal(p / 0.32, 0, 1);
  const yMobileAdjust = mobileBlend * heroWeight * 0.08;
  const scaleFactor = 1 - mobileBlend * 0.26;

  return {
    x: baseX * sideScale,
    y: baseY + yMobileAdjust,
    scale: baseS * scaleFactor,
    sideScale,
  };
}

/**
 * One-time cubic-eased float-up entrance offset when Mars finishes initializing.
 */
export function computeEntryOffset(elapsedSec: number, reducedMotion: boolean): number {
  if (reducedMotion || elapsedSec >= MARS_ENTRY_DURATION) {
    return 0;
  }
  const t = clampVal(elapsedSec / MARS_ENTRY_DURATION, 0, 1);
  const eased = 1 - Math.pow(1 - t, 3);
  return MARS_ENTRY_START_Y * (1 - eased);
}

/* --------------------------------------------------------------------------
 * Deterministic 3D Spherical Mars Topography & Albedo Generator
 * Evaluates strictly on 3D unit-sphere coordinates (nx, ny, nz) so equirectangular
 * textures have zero longitudinal seam at u = 0/1 and zero polar pinching.
 * -------------------------------------------------------------------------- */

function hash3(ix: number, iy: number, iz: number): number {
  let h = Math.imul(ix | 0, 374761393);
  h = (h + Math.imul(iy | 0, 668265263)) | 0;
  h = (h + Math.imul(iz | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h & 0x7fffffff) / 1073741823.5 - 1.0;
}

function valueNoise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const c000 = hash3(ix, iy, iz);
  const c100 = hash3(ix + 1, iy, iz);
  const c010 = hash3(ix, iy + 1, iz);
  const c110 = hash3(ix + 1, iy + 1, iz);
  const c001 = hash3(ix, iy, iz + 1);
  const c101 = hash3(ix + 1, iy, iz + 1);
  const c011 = hash3(ix, iy + 1, iz + 1);
  const c111 = hash3(ix + 1, iy + 1, iz + 1);

  const x00 = lerpVal(c000, c100, ux);
  const x10 = lerpVal(c010, c110, ux);
  const x01 = lerpVal(c001, c101, ux);
  const x11 = lerpVal(c011, c111, ux);

  const y0 = lerpVal(x00, x10, uy);
  const y1 = lerpVal(x01, x11, uy);

  return lerpVal(y0, y1, uz);
}

function fbm3D(x: number, y: number, z: number, octaves = 5): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise3D(x * freq, y * freq, z * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

function sphericalGaussian(
  nx: number,
  ny: number,
  nz: number,
  lonCenter: number,
  latCenter: number,
  angularWidth: number
): number {
  const clat = Math.cos(latCenter);
  const cx = clat * Math.cos(lonCenter);
  const cy = Math.sin(latCenter);
  const cz = clat * Math.sin(lonCenter);
  const dot = clampVal(nx * cx + ny * cy + nz * cz, -1, 1);
  const angle = Math.acos(dot);
  const ratio = angle / angularWidth;
  return Math.exp(-ratio * ratio);
}

export interface MarsSurfaceSample {
  r: number; // 0..255 sRGB
  g: number; // 0..255 sRGB
  b: number; // 0..255 sRGB
  height: number; // 0..1 normalized elevation
  outpostGlow: number; // 0..1 night-side research colony glow
  isPolarIce: boolean;
}

const CRATER_CENTERS: Array<{ nx: number; ny: number; nz: number; radius: number; depth: number }> =
  (() => {
    const list: Array<{ nx: number; ny: number; nz: number; radius: number; depth: number }> = [];
    // Deterministic Fibonacci-jittered craters across Mars
    const count = 58;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      if (Math.abs(y) > 0.88) continue;
      const rProj = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i + hash3(i, 13, 37) * 0.45;
      const nx = Math.cos(theta) * rProj;
      const nz = Math.sin(theta) * rProj;
      const radius = 0.045 + Math.abs(hash3(i, 71, 19)) * 0.11;
      const depth = 0.14 + Math.abs(hash3(i, 29, 97)) * 0.22;
      list.push({ nx, ny: y, nz, radius, depth });
    }
    return list;
  })();

export function sampleMarsSurface(lonRad: number, latRad: number): MarsSurfaceSample {
  const cosLat = Math.cos(latRad);
  const nx = cosLat * Math.cos(lonRad);
  const ny = Math.sin(latRad);
  const nz = cosLat * Math.sin(lonRad);

  // Multi-scale regolith noise
  const continent = fbm3D(nx * 2.1 + 3.4, ny * 2.1 - 1.2, nz * 2.1 + 5.1, 5);
  const detail = fbm3D(nx * 9.5 - 4.1, ny * 9.5 + 2.7, nz * 9.5 - 1.9, 4);
  const micro = valueNoise3D(nx * 26.0, ny * 26.0, nz * 26.0);

  // Martian dichotomy: southern cratered highlands vs smooth northern lowlands (Vastitas Borealis)
  let elevation = 0.5 + continent * 0.26 + detail * 0.1 + micro * 0.035 - ny * 0.12;

  // Tharsis volcanic bulge + Olympus Mons shield volcano & summit caldera
  const tharsisBulge = sphericalGaussian(nx, ny, nz, -1.85, 0.08, 0.55);
  const olympusShield = sphericalGaussian(nx, ny, nz, -2.33, 0.32, 0.13);
  const olympusCaldera = sphericalGaussian(nx, ny, nz, -2.33, 0.32, 0.028);
  const ascraeusMons = sphericalGaussian(nx, ny, nz, -1.82, 0.2, 0.085);
  const pavonisMons = sphericalGaussian(nx, ny, nz, -1.97, 0.01, 0.08);
  const arsiaMons = sphericalGaussian(nx, ny, nz, -2.11, -0.15, 0.09);

  elevation +=
    tharsisBulge * 0.18 +
    olympusShield * 0.34 -
    olympusCaldera * 0.16 +
    (ascraeusMons + pavonisMons + arsiaMons) * 0.22;

  // Valles Marineris equatorial canyon system (4,000 km tectonic rift)
  const canyonLonDist = Math.atan2(Math.sin(lonRad + 1.22), Math.cos(lonRad + 1.22));
  const canyonWarp = detail * 0.045;
  const canyonLatDist = latRad + 0.19 + canyonWarp - canyonLonDist * 0.08;
  const inCanyonLon = Math.exp(-Math.pow(canyonLonDist / 0.42, 4));
  const inCanyonLat = Math.exp(-Math.pow(canyonLatDist / 0.048, 2));
  const vallesTrench = inCanyonLon * inCanyonLat;
  elevation -= vallesTrench * 0.38;

  // Hellas Planitia giant impact basin (southern hemisphere)
  const hellasBasin = sphericalGaussian(nx, ny, nz, 1.22, -0.74, 0.34);
  elevation -= hellasBasin * 0.28;

  // Syrtis Major dark volcanic basalt shield
  const syrtisMajor = sphericalGaussian(nx, ny, nz, 1.16, 0.16, 0.32);
  const acidaliaPlanitia = sphericalGaussian(nx, ny, nz, -0.52, 0.72, 0.36);

  // Smooth C-infinity impact craters (bowl + gentle raised ejecta rim, zero step artifacts)
  let craterRimBoost = 0;
  for (let i = 0; i < CRATER_CENTERS.length; i++) {
    const c = CRATER_CENTERS[i];
    const dot = clampVal(nx * c.nx + ny * c.ny + nz * c.nz, -1, 1);
    const approxDistSq = 2 * (1 - dot);
    const maxR = c.radius * 1.8;
    if (approxDistSq < maxR * maxR) {
      const uSq = approxDistSq / (c.radius * c.radius);
      const bowl = Math.exp(-uSq * 2.6) * c.depth * 0.42;
      const rim = uSq * Math.exp(-uSq * 1.35) * c.depth * 0.28;
      elevation += rim - bowl;
      craterRimBoost += rim * 0.8;
    }
  }

  elevation = clampVal(elevation, 0.02, 0.99);

  // Authentic Martian regolith palette (butterscotch-ochre highlands & dark ferrous basalt plains)
  const darkBasaltWeight = clampVal(
    syrtisMajor * 0.78 +
      acidaliaPlanitia * 0.58 +
      vallesTrench * 0.58 +
      clampVal(0.47 - elevation + detail * 0.2, 0, 0.58),
    0,
    0.92
  );

  const brightR = 224 + detail * 24 + craterRimBoost * 42;
  const brightG = 136 + detail * 20 + elevation * 16 + craterRimBoost * 30;
  const brightB = 90 + detail * 14 + craterRimBoost * 20;

  const basaltR = 104 + detail * 16;
  const basaltG = 66 + detail * 11;
  const basaltB = 54 + detail * 9;

  let r = lerpVal(brightR, basaltR, darkBasaltWeight);
  let g = lerpVal(brightG, basaltG, darkBasaltWeight);
  let b = lerpVal(brightB, basaltB, darkBasaltWeight);

  // High-altitude volcanic summit dust on Olympus & Tharsis peaks
  const peakHighlight = clampVal((elevation - 0.75) * 2.4, 0, 1);
  r = lerpVal(r, 240, peakHighlight * 0.48);
  g = lerpVal(g, 174, peakHighlight * 0.48);
  b = lerpVal(b, 132, peakHighlight * 0.48);

  // North & South Polar CO2 / Water Ice Caps with spiral trough modulation
  const absLat = Math.abs(latRad);
  const spiralMod =
    Math.sin(lonRad * 5 + absLat * 18) * 0.028 + continent * 0.055 + detail * 0.022;
  const iceThreshold = 1.3 + spiralMod;
  const isPolarIce = absLat > iceThreshold;

  if (absLat > iceThreshold - 0.05) {
    const iceBlend = clampVal((absLat - (iceThreshold - 0.05)) / 0.07, 0, 1);
    const trough = 0.95 + 0.05 * cosLat * Math.sin(lonRad * 5 + absLat * 20);
    r = lerpVal(r, 248 * trough, iceBlend);
    g = lerpVal(g, 240 * trough, iceBlend);
    b = lerpVal(b, 234 * trough, iceBlend);
    elevation = lerpVal(elevation, 0.88, iceBlend * 0.6);
  }

  // Night-side Martian research outposts & Valles Marineris habitat transit lights
  let outpostGlow = 0;
  if (!isPolarIce) {
    const outpostCluster =
      vallesTrench * 0.85 +
      olympusShield * 0.55 +
      syrtisMajor * 0.35 +
      sphericalGaussian(nx, ny, nz, 2.4, -0.09, 0.14) * 0.65 + // Gale / Elysium corridor
      sphericalGaussian(nx, ny, nz, 1.35, 0.32, 0.14) * 0.6; // Jezero research hub
    const sparkle = clampVal((micro - 0.32) * 2.6, 0, 1);
    outpostGlow = clampVal(outpostCluster * sparkle * 1.35, 0, 1);
  }

  return {
    r: Math.round(clampVal(r, 0, 255)),
    g: Math.round(clampVal(g, 0, 255)),
    b: Math.round(clampVal(b, 0, 255)),
    height: elevation,
    outpostGlow,
    isPolarIce,
  };
}

export interface MarsSurfaceMarker {
  x: number;
  y: number;
  z: number;
  seed: number;
}

/**
 * Generates deterministic surface radar-ping coordinates across non-polar Martian landmarks.
 */
export function generateMarsMarkerPositions(
  count: number,
  planetRadius: number
): MarsSurfaceMarker[] {
  const markers: MarsSurfaceMarker[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const liftedR = planetRadius * 1.014;

  let idx = 0;
  while (markers.length < count && idx < count * 4) {
    const t = (idx + 0.5) / (count * 1.25);
    const frac = t - Math.floor(t);
    // Keep markers between -62 deg and +62 deg latitude (non-polar Martian regions)
    const y = (frac * 2 - 1) * 0.86;
    const lat = Math.asin(clampVal(y, -0.95, 0.95));
    const lon = ((golden * idx * 7.3) % (Math.PI * 2)) - Math.PI;
    const sample = sampleMarsSurface(lon, lat);

    if (!sample.isPolarIce) {
      const cosLat = Math.cos(lat);
      // Match Three.js SphereGeometry UV/coordinate mapping:
      // phi = (u) * 2PI, x = -R * cos(phi) * sin(theta), y = R * cos(theta), z = R * sin(phi) * sin(theta)
      const x = cosLat * Math.cos(lon) * liftedR;
      const py = Math.sin(lat) * liftedR;
      const z = cosLat * Math.sin(lon) * liftedR;
      const seed = Math.abs(hash3(idx, 53, 101)) * Math.PI * 2;
      markers.push({ x, y: py, z, seed });
    }
    idx++;
  }

  return markers;
}
