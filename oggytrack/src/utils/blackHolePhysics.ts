export interface BlackHoleWorkspacePoseInput {
  viewportWidth: number;
  viewportHeight: number;
  sidebarCollapsed: boolean;
  activePage: string;
  scrollY: number;
}

export interface BlackHoleWorkspacePose {
  x: number;
  y: number;
  scale: number;
  pitch: number;
  yaw: number;
  roll: number;
  isMobile: boolean;
}

export interface KeplerianParticleSeed {
  radius: number;
  angle: number;
  heightOffset: number;
  angularSpeed: number;
  temperature: number;
  sizeScale: number;
}

export const BLACK_HOLE_CONSTANTS = {
  SCHWARZSCHILD_RADIUS: 1.0,
  PHOTON_SHADOW_RADIUS: (3 * Math.sqrt(3)) / 2, // ~2.598076 * r_s
  ACCRETION_INNER_RADIUS: 1.38,
  ACCRETION_OUTER_RADIUS: 4.95,
  CAMERA_FOV_DEG: 42,
  CAMERA_Z: 9.0,
} as const;

const PAGE_ORBIT_MAP: Record<
  string,
  { dx: number; dy: number; pitch: number; yaw: number; roll: number }
> = {
  dashboard: { dx: 0.0, dy: 0.0, pitch: 0.245, yaw: 0.0, roll: -0.165 },
  todo: { dx: 0.14, dy: 0.06, pitch: 0.22, yaw: 0.12, roll: -0.12 },
  timetable: { dx: -0.1, dy: 0.04, pitch: 0.27, yaw: -0.1, roll: -0.19 },
  attendance: { dx: 0.08, dy: -0.04, pitch: 0.235, yaw: 0.08, roll: -0.15 },
  exams: { dx: -0.08, dy: 0.08, pitch: 0.26, yaw: -0.08, roll: -0.21 },
  assignments: { dx: 0.12, dy: -0.02, pitch: 0.25, yaw: 0.1, roll: -0.14 },
  holidays: { dx: -0.06, dy: 0.05, pitch: 0.215, yaw: -0.06, roll: -0.17 },
  subjects: { dx: 0.06, dy: 0.03, pitch: 0.255, yaw: 0.06, roll: -0.18 },
  calendar: { dx: -0.12, dy: 0.02, pitch: 0.24, yaw: -0.12, roll: -0.13 },
  analytics: { dx: 0.1, dy: 0.06, pitch: 0.275, yaw: 0.09, roll: -0.2 },
  settings: { dx: 0.0, dy: 0.08, pitch: 0.23, yaw: 0.04, roll: -0.16 },
};

export function clampBH(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Relativistic special-relativistic Doppler factor:
 * delta = 1 / (gamma * (1 - beta * cosTheta))
 * Approaching plasma (cosTheta > 0) is blueshifted and relativistically beamed (delta > 1);
 * receding plasma (cosTheta < 0) is redshifted and dimmed (delta < 1).
 */
export function computeDopplerFactor(beta: number, cosTheta: number): number {
  const safeBeta = clampBH(beta, 0, 0.68);
  const safeCos = clampBH(cosTheta, -1, 1);
  const gamma = 1 / Math.sqrt(Math.max(1e-4, 1 - safeBeta * safeBeta));
  return 1 / (gamma * (1 - safeBeta * safeCos));
}

/**
 * Maps normalized radial distance across the accretion disk [0 = inner ISCO, 1 = outer dust rim]
 * and relativistic Doppler factor into linear-ish [0..1] RGB plasma emission values.
 */
export function sampleAccretionSpectrum(
  normRadius: number,
  dopplerFactor: number
): { r: number; g: number; b: number } {
  const u = clampBH(normRadius, 0, 1);
  const d = clampBH(dopplerFactor, 0.45, 2.2);

  // Novikov-Thorne inspired radial temperature falloff (hot inner rim -> amber mid -> crimson outer)
  const baseTemp = Math.pow(1 - u * 0.82, 1.35) * (0.72 + 0.28 * d);
  const beamedIntensity = Math.pow(d, 2.15);

  const r = clampBH((0.98 * baseTemp + 0.34 * (1 - u)) * beamedIntensity, 0, 1.6);
  const g = clampBH(
    (0.68 * Math.pow(baseTemp, 1.35) + 0.08 * (1 - u * 0.85) + 0.14 * Math.max(0, d - 1)) *
      beamedIntensity,
    0,
    1.45
  );
  const b = clampBH((0.42 * Math.pow(baseTemp, 2.15) + 0.22 * Math.max(0, d - 1.05)) * beamedIntensity, 0, 1.35);

  return {
    r: clampBH(r, 0, 1),
    g: clampBH(g, 0, 1),
    b: clampBH(b, 0, 1),
  };
}

/**
 * Computes responsive 3D framing for the Black Hole behind the authenticated workspace
 * so the Event Horizon, Photon Ring, and Gargantua accretion wings stay centered in the
 * visible content area on Desktop (accounting for the left sidebar) and fit cleanly inside
 * narrow portrait Mobile screens without clipping.
 */
export function computeBlackHoleWorkspacePose(
  input: BlackHoleWorkspacePoseInput
): BlackHoleWorkspacePose {
  const safeW = Math.max(320, input.viewportWidth || 1440);
  const safeH = Math.max(420, input.viewportHeight || 900);
  const aspect = safeW / safeH;
  const isMobile = safeW < 768;

  const pageOrbit = PAGE_ORBIT_MAP[input.activePage] || PAGE_ORBIT_MAP.dashboard;
  const scrollNorm = clampBH((input.scrollY || 0) / 900, 0, 1.5);

  if (isMobile) {
    // Portrait frustum half-width at z=0 with camera at z=9, fov=42deg is ~3.455 * aspect.
    // Scaling proportional to aspect keeps the full ~4.95-unit accretion disk within mobile bounds.
    const mobileScale = clampBH(aspect * 1.12, 0.46, 0.78);
    return {
      x: clampBH(pageOrbit.dx * 0.35, -0.22, 0.22),
      y: clampBH(0.38 + pageOrbit.dy * 0.5 - scrollNorm * 0.22, -0.35, 0.65),
      scale: mobileScale,
      pitch: pageOrbit.pitch + scrollNorm * 0.04,
      yaw: pageOrbit.yaw,
      roll: pageOrbit.roll,
      isMobile: true,
    };
  }

  // Desktop: offset X slightly right so the Black Hole centers inside <main> (right of Sidebar)
  const sidebarPx = input.sidebarCollapsed ? 80 : 256;
  const halfFovRad = (BLACK_HOLE_CONSTANTS.CAMERA_FOV_DEG * 0.5 * Math.PI) / 180;
  const worldHalfH = BLACK_HOLE_CONSTANTS.CAMERA_Z * Math.tan(halfFovRad);
  const worldFullW = worldHalfH * 2 * aspect;
  const sidebarCenterShift = ((sidebarPx * 0.5) / safeW) * worldFullW;

  const desktopScale = clampBH(Math.min(1.02, aspect * 0.68), 0.72, 1.04);

  return {
    x: clampBH(sidebarCenterShift * 0.78 + pageOrbit.dx, 0.12, 1.25),
    y: clampBH(0.24 + pageOrbit.dy - scrollNorm * 0.26, -0.45, 0.55),
    scale: desktopScale,
    pitch: pageOrbit.pitch + scrollNorm * 0.045,
    yaw: pageOrbit.yaw,
    roll: pageOrbit.roll,
    isMobile: false,
  };
}

/**
 * Generates deterministic Keplerian orbital seeds (omega proportional to r^(-3/2))
 * for 3D infalling plasma embers spiraling around the Black Hole equatorial plane.
 */
export function generateKeplerianParticles(
  count: number,
  innerRadius: number = BLACK_HOLE_CONSTANTS.ACCRETION_INNER_RADIUS,
  outerRadius: number = BLACK_HOLE_CONSTANTS.ACCRETION_OUTER_RADIUS
): KeplerianParticleSeed[] {
  const safeCount = Math.max(1, Math.floor(count));
  const span = Math.max(0.2, outerRadius - innerRadius);
  const particles: KeplerianParticleSeed[] = [];

  let seed = 0x6d2b79f5;
  const nextRand = () => {
    seed = Math.imul(seed ^ (seed >>> 15), seed | 1);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), seed | 61);
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = 0; i < safeCount; i++) {
    // Bias radial distribution inward toward the bright ISCO / photon ring
    const u = Math.pow(nextRand(), 1.45);
    const radius = innerRadius + u * span;
    const angle = nextRand() * Math.PI * 2;
    const thickness = 0.035 + 0.11 * u;
    const heightOffset = (nextRand() - 0.5) * 2 * thickness;
    const angularSpeed = 1.65 / Math.pow(radius, 1.5);
    const temperature = clampBH(1 - u * 0.88, 0.08, 1);
    const sizeScale = 0.55 + nextRand() * 0.9;

    particles.push({
      radius,
      angle,
      heightOffset,
      angularSpeed,
      temperature,
      sizeScale,
    });
  }

  return particles;
}
