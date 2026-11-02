import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BLACK_HOLE_CONSTANTS,
  clampBH,
  computeBlackHoleWorkspacePose,
  generateKeplerianParticles,
} from '../../utils/blackHolePhysics';

export interface BlackHoleCanvasProps {
  activePage?: string;
  sidebarCollapsed?: boolean;
}

const SNOISE_GLSL = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

// Pre-allocated module-level scratch math objects (zero per-frame GC allocations)
const _projVec = new THREE.Vector3();
const _invGroupQuat = new THREE.Quaternion();
const _localCamQuat = new THREE.Quaternion();

function detectSoftwareGl(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const BlackHoleCanvas: React.FC<BlackHoleCanvasProps> = ({
  activePage = 'dashboard',
  sidebarCollapsed = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({ activePage, sidebarCollapsed });
  propsRef.current = { activePage, sidebarCollapsed };

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = detectSoftwareGl();

    const canvas = document.createElement('canvas');
    canvas.className = 'planet-canvas';
    canvas.dataset.scene = 'blackhole';
    canvas.setAttribute('aria-hidden', 'true');
    mountEl.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      return () => {
        if (canvas.parentNode === mountEl) {
          mountEl.removeChild(canvas);
        }
      };
    }

    let lastW = window.innerWidth;
    let lastH = window.innerHeight;
    const isMobileViewport = () => window.innerWidth < 768;

    const getTargetPixelRatio = () => {
      if (isSoftwareGl) return 1;
      const dpr = window.devicePixelRatio || 1;
      return isMobileViewport() ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
    };

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(getTargetPixelRatio());
    renderer.setSize(lastW, lastH, false);
    renderer.setClearColor(0x03050d, 1);

    const disposables: {
      geometries: THREE.BufferGeometry[];
      materials: THREE.Material[];
      textures: THREE.Texture[];
    } = {
      geometries: [],
      materials: [],
      textures: [],
    };

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03050d, 0.018);

    const camera = new THREE.PerspectiveCamera(
      BLACK_HOLE_CONSTANTS.CAMERA_FOV_DEG,
      lastW / Math.max(1, lastH),
      0.1,
      200
    );
    camera.position.set(0, 0, BLACK_HOLE_CONSTANTS.CAMERA_Z);

    // Mandatory studio environment map for metallic orbital relays & outer dust torus
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // Warm accretion core key light + cool deep-space HemisphereLight fill
    const accretionLight = new THREE.PointLight(0xffa458, 3.2, 28, 1.4);
    accretionLight.position.set(0, 0.2, 0.8);
    scene.add(accretionLight);

    const hemiFill = new THREE.HemisphereLight(0x6d92ff, 0x261009, 0.55);
    scene.add(hemiFill);

    // -------------------------------------------------------------------------
    // 1. Deep-Space Einstein-Lensed Nebula Backdrop (Full-Screen NDC Quad)
    // -------------------------------------------------------------------------
    const bgUniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(lastW, lastH) },
      uBhUv: { value: new THREE.Vector2(0.55, 0.54) },
    };

    const bgGeo = new THREE.PlaneGeometry(2, 2);
    const bgMat = new THREE.ShaderMaterial({
      uniforms: bgUniforms,
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        ${SNOISE_GLSL}
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uBhUv;

        void main() {
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 delta = vUv - uBhUv;
          delta.x *= aspect;
          float dist = length(delta);

          // Gravitational Einstein deflection warps distant nebula wisps around the BH
          float einsteinR = 0.22;
          vec2 lensedDir = delta / max(0.04, dist);
          vec2 warpedUv = vUv - lensedDir * (einsteinR * einsteinR) / (dist + 0.085);

          float t = uTime * 0.035;
          float neb1 = snoise(vec3(warpedUv * vec2(aspect * 2.1, 2.1), t));
          float neb2 = snoise(vec3(warpedUv * vec2(aspect * 4.3, 4.3) + 3.7, -t * 0.8));
          float nebula = smoothstep(-0.2, 0.85, neb1 * 0.62 + neb2 * 0.38);

          vec3 col = vec3(0.011, 0.017, 0.042);
          // Subtle cosmic dust lanes & Einstein ring halo glow
          float einsteinHalo = exp(-pow((dist - 0.24) / 0.14, 2.0)) * 0.28;
          col += vec3(0.08, 0.14, 0.30) * nebula * 0.42;
          col += vec3(0.32, 0.16, 0.07) * einsteinHalo * (0.55 + 0.45 * neb1);

          // Corner deep-space ambient vignette
          float vig = smoothstep(1.35, 0.25, length((vUv - 0.5) * vec2(aspect, 1.0)));
          col *= mix(0.72, 1.06, vig);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.frustumCulled = false;
    bgMesh.renderOrder = -10;
    scene.add(bgMesh);
    disposables.geometries.push(bgGeo);
    disposables.materials.push(bgMat);

    // -------------------------------------------------------------------------
    // 2. 3D Twinkling Multi-Temperature Starfield (1,450 Stars)
    // -------------------------------------------------------------------------
    const starCount = 1450;
    const starPositions = new Float32Array(starCount * 3);
    const starSeeds = new Float32Array(starCount * 3);
    let sSeed = 0x51f3a92d;
    const nextStarRand = () => {
      sSeed = Math.imul(sSeed ^ (sSeed >>> 15), sSeed | 1);
      sSeed ^= sSeed + Math.imul(sSeed ^ (sSeed >>> 7), sSeed | 61);
      return ((sSeed ^ (sSeed >>> 14)) >>> 0) / 4294967296;
    };

    for (let i = 0; i < starCount; i++) {
      const r = 24 + nextStarRand() * 48;
      const theta = nextStarRand() * Math.PI * 2;
      const phi = Math.acos(2 * nextStarRand() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = -Math.abs(r * Math.cos(phi)) - 4;
      starSeeds[i * 3] = nextStarRand() * 6.283;
      starSeeds[i * 3 + 1] = 0.55 + nextStarRand() * 1.25;
      starSeeds[i * 3 + 2] = nextStarRand(); // color temperature selector
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('aSeed', new THREE.BufferAttribute(starSeeds, 3));

    const starUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: getTargetPixelRatio() },
    };

    const starMat = new THREE.ShaderMaterial({
      uniforms: starUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 aSeed;
        varying vec3 vSeed;
        uniform float uPixelRatio;
        void main() {
          vSeed = aSeed;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp((1.5 + aSeed.y * 1.25) * uPixelRatio * (26.0 / max(8.0, -mv.z)), 1.0, 5.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        varying vec3 vSeed;
        uniform float uTime;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.05, d);
          float twinkle = 0.68 + 0.32 * sin(uTime * (1.1 + vSeed.y) + vSeed.x);
          vec3 warmStar = vec3(1.0, 0.86, 0.72);
          vec3 coolStar = vec3(0.78, 0.88, 1.0);
          vec3 col = mix(coolStar, warmStar, vSeed.z);
          gl_FragColor = vec4(col, core * twinkle * 0.88);
        }
      `,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    starPoints.renderOrder = -5;
    scene.add(starPoints);
    disposables.geometries.push(starGeo);
    disposables.materials.push(starMat);

    // -------------------------------------------------------------------------
    // 3. Composite Multi-Part 3D Black Hole System (THREE.Group — 8 Distinct Parts)
    // -------------------------------------------------------------------------
    const blackHoleGroup = new THREE.Group();
    scene.add(blackHoleGroup);

    const horizonRadius = 0.94;

    // Part 3A: Event Horizon Singularity Core (Pure Pitch-Black 3D Sphere Absorber)
    const horizonGeo = new THREE.SphereGeometry(horizonRadius, 64, 64);
    const horizonMat = new THREE.ShaderMaterial({
      depthTest: true,
      depthWrite: true,
      vertexShader: /* glsl */ `
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormalView = normalize(normalMatrix * normal);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          // Pure abyssal black interior with subtle sub-horizon photon-capture rim
          float ndv = max(0.0, dot(normalize(vNormalView), normalize(vViewDir)));
          float edge = pow(1.0 - ndv, 7.0);
          vec3 col = vec3(1.0, 0.58, 0.24) * edge * 0.18;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    horizonMesh.renderOrder = 1;
    blackHoleGroup.add(horizonMesh);
    disposables.geometries.push(horizonGeo);
    disposables.materials.push(horizonMat);

    // Part 3B: Primary Relativistic Equatorial Accretion Disk (3D Annular Plane)
    // Passes IN FRONT OF the Event Horizon on the near side and is naturally occluded
    // behind the Event Horizon on the far side via hardware depth buffer!
    const diskUniforms = {
      uTime: { value: 0 },
    };

    const diskInner = 1.12;
    const diskOuter = 3.38;
    const diskGeo = new THREE.RingGeometry(diskInner, diskOuter, 144, 24);
    diskGeo.rotateX(-Math.PI * 0.5);

    const diskMat = new THREE.ShaderMaterial({
      uniforms: diskUniforms,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vLocalPos;
        void main() {
          vLocalPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        ${SNOISE_GLSL}
        varying vec3 vLocalPos;
        uniform float uTime;

        void main() {
          float r = length(vLocalPos.xz);
          float u = clamp((r - 1.12) / (3.38 - 1.12), 0.0, 1.0);

          // Soft inner ISCO onset & smooth outer edge falloff
          float innerFade = smoothstep(0.0, 0.065, u);
          float outerFade = pow(1.0 - smoothstep(0.28, 1.0, u), 1.45);
          float radialMask = innerFade * outerFade;
          if (radialMask < 0.003) discard;

          float angle = atan(vLocalPos.z, vLocalPos.x);

          // Differential Keplerian shear: inner plasma orbits much faster than outer dust
          float keplerOmega = 2.35 / pow(max(1.08, r), 1.42);
          float swirledAngle = angle + uTime * keplerOmega - 3.6 * log(max(1.0, r));

          // Seamless cylindrical coordinates for noise (no atan branch-cut seam!)
          vec3 noiseCoord1 = vec3(cos(swirledAngle) * 2.6, sin(swirledAngle) * 2.6, r * 3.8 - uTime * 0.35);
          vec3 noiseCoord2 = vec3(cos(swirledAngle * 2.0) * 4.5, sin(swirledAngle * 2.0) * 4.5, r * 8.2 + uTime * 0.55);

          float n1 = snoise(noiseCoord1);
          float n2 = snoise(noiseCoord2);
          float rings = 0.5 + 0.5 * sin(r * 19.0 - uTime * 1.9 + n1 * 2.2);
          float filaments = clamp(0.58 + 0.32 * n1 + 0.22 * n2 + 0.18 * rings, 0.08, 1.35);

          // Relativistic Doppler beaming: left side (-X) approaches viewer, right side (+X) recedes
          float approachCos = clamp(-vLocalPos.x / max(0.8, r), -1.0, 1.0);
          float beta = 0.44 * pow(1.12 / max(1.12, r), 0.5);
          float gamma = inversesqrt(max(0.1, 1.0 - beta * beta));
          float doppler = 1.0 / (gamma * (1.0 - beta * approachCos));
          float beamBoost = pow(doppler, 2.35);

          // Novikov-Thorne thermal gradient: incandescent blue-white/gold inner ISCO -> amber -> crimson outer rim
          vec3 hotCore = vec3(1.0, 0.94, 0.82);
          vec3 midAmber = vec3(1.0, 0.53, 0.16);
          vec3 outerCrimson = vec3(0.62, 0.13, 0.04);

          vec3 baseCol = mix(hotCore, midAmber, smoothstep(0.0, 0.34, u));
          baseCol = mix(baseCol, outerCrimson, smoothstep(0.32, 0.92, u));
          // Subtle blueshift tint on strongly approaching inner rim
          baseCol += vec3(0.16, 0.24, 0.38) * max(0.0, doppler - 1.15) * (1.0 - u);

          float intensity = radialMask * filaments * beamBoost * 1.28;
          gl_FragColor = vec4(baseCol * intensity, clamp(intensity, 0.0, 1.0));
        }
      `,
    });
    const equatorialDiskMesh = new THREE.Mesh(diskGeo, diskMat);
    equatorialDiskMesh.renderOrder = 3;
    blackHoleGroup.add(equatorialDiskMesh);
    disposables.geometries.push(diskGeo);
    disposables.materials.push(diskMat);

    // Part 3C: Secondary Tilted Corona Plasma Sheet (Adds Volumetric Accretion Thickness)
    const coronaGeo = new THREE.RingGeometry(1.18, 2.85, 112, 8);
    coronaGeo.rotateX(-Math.PI * 0.5 + 0.055);
    coronaGeo.rotateZ(0.04);
    const coronaMesh = new THREE.Mesh(coronaGeo, diskMat);
    coronaMesh.scale.setScalar(0.98);
    coronaMesh.renderOrder = 3;
    blackHoleGroup.add(coronaMesh);
    disposables.geometries.push(coronaGeo);

    // Part 3D: Gravitationally-Lensed Gargantua Upper & Lower Einstein Arches + Photon Ring
    // View-aligned analytical lensing plane capturing light from the far side of the disk
    // bent over the northern and southern hemispheres of the Event Horizon!
    const lensUniforms = {
      uTime: { value: 0 },
      uDiskTilt: { value: 0.245 },
    };

    const lensPlaneGeo = new THREE.PlaneGeometry(7.2, 7.2);
    const lensPlaneMat = new THREE.ShaderMaterial({
      uniforms: lensUniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vPos;
        void main() {
          vPos = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        ${SNOISE_GLSL}
        varying vec2 vPos;
        uniform float uTime;
        uniform float uDiskTilt;

        void main() {
          float r = length(vPos);
          // Keep interior of Event Horizon shadow completely dark so central singularity stays crisp
          if (r < 0.915 || r > 3.55) discard;

          float shadowR = 0.955;
          float angle = atan(vPos.y, vPos.x);

          // Relativistic Doppler asymmetry: left limb (-X) approaches, right limb (+X) recedes
          float approachCos = clamp(-vPos.x / max(0.65, r), -1.0, 1.0);
          float doppler = mix(0.66, 1.48, approachCos * 0.5 + 0.5);

          // 1. Razor-sharp Inner Photon Ring (n >= 1 critical curve around shadow)
          float photonRing = exp(-pow((r - shadowR) / 0.036, 2.0)) * 1.35;
          float subPhotonGlow = exp(-pow((r - 1.02) / 0.14, 2.0)) * 0.42;

          // 2. Gravitationally-Lensed Upper Gargantua Arch (far-side top of disk bent over north pole)
          // Elliptical envelope wider horizontally so it joins seamlessly with the 3D equatorial disk limbs
          vec2 upperCoord = vec2(vPos.x * 0.76, max(0.0, vPos.y) * 1.08);
          float rUpper = length(upperCoord);
          float upperMask = smoothstep(0.02, 0.34, vPos.y)
            * smoothstep(0.88, 1.02, r)
            * exp(-pow(max(0.0, rUpper - 1.04) / 0.56, 1.65));

          // 3. Gravitationally-Lensed Lower Secondary Einstein Arch (underside of far disk bent under south pole)
          vec2 lowerCoord = vec2(vPos.x * 0.82, max(0.0, -vPos.y) * 1.24);
          float rLower = length(lowerCoord);
          float lowerMask = smoothstep(0.02, 0.28, -vPos.y)
            * smoothstep(0.88, 1.01, r)
            * exp(-pow(max(0.0, rLower - 1.01) / 0.38, 1.75)) * 0.85;

          // Swirling lensed plasma filaments streaming from left (approaching) across the arches to right
          float streamPhase = angle * 3.0 - uTime * 1.35 + r * 4.2;
          float turb = 0.68 + 0.32 * snoise(vec3(cos(streamPhase) * 2.2, sin(streamPhase) * 2.2, r * 3.5 - uTime * 0.4));
          float fineStreaks = 0.78 + 0.22 * sin(r * 26.0 - uTime * 2.2 + turb * 2.5);

          float archEnergy = (upperMask + lowerMask) * turb * fineStreaks;
          float totalEnergy = (photonRing + subPhotonGlow + archEnergy * 1.05) * doppler;

          // Outer warm atmospheric corona haze + smooth radial feather to exact zero before plane edge
          float outerCorona = smoothstep(0.92, 1.05, r) * exp(-max(0.0, r - 0.96) * 1.55) * 0.16;
          totalEnergy += outerCorona;
          totalEnergy *= smoothstep(3.42, 2.25, r);

          if (totalEnergy < 0.002) discard;

          vec3 ringHot = vec3(1.0, 0.95, 0.84);
          vec3 archGold = vec3(1.0, 0.56, 0.19);
          vec3 archRed = vec3(0.68, 0.17, 0.05);

          float radialT = clamp((r - shadowR) / 1.35, 0.0, 1.0);
          vec3 col = mix(ringHot, archGold, smoothstep(0.0, 0.28, radialT));
          col = mix(col, archRed, smoothstep(0.28, 0.95, radialT));
          col += vec3(0.14, 0.22, 0.36) * max(0.0, doppler - 1.12) * (1.0 - radialT);

          gl_FragColor = vec4(col * totalEnergy, clamp(totalEnergy, 0.0, 1.0));
        }
      `,
    });
    const lensedArchesMesh = new THREE.Mesh(lensPlaneGeo, lensPlaneMat);
    lensedArchesMesh.renderOrder = 2;
    blackHoleGroup.add(lensedArchesMesh);
    disposables.geometries.push(lensPlaneGeo);
    disposables.materials.push(lensPlaneMat);

    // Part 3E: Outer Cold Molecular Dust Torus (3D PBR Torus coplanar with Equatorial Disk)
    const dustTorusGeo = new THREE.TorusGeometry(2.95, 0.045, 16, 96);
    dustTorusGeo.rotateX(Math.PI * 0.5);
    const dustTorusMat = new THREE.MeshStandardMaterial({
      color: 0x3b170c,
      emissive: 0x290c04,
      emissiveIntensity: 0.35,
      roughness: 0.86,
      metalness: 0.14,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const dustTorusMesh = new THREE.Mesh(dustTorusGeo, dustTorusMat);
    dustTorusMesh.scale.set(1, 0.28, 1);
    dustTorusMesh.renderOrder = 2;
    blackHoleGroup.add(dustTorusMesh);
    disposables.geometries.push(dustTorusGeo);
    disposables.materials.push(dustTorusMat);

    // Part 3F: Twin Relativistic Blandford-Znajek Polar Synchrotron Jets (Volumetric Soft-Edge Cones)
    const jetUniforms = {
      uTime: { value: 0 },
    };
    const jetGeo = new THREE.ConeGeometry(0.46, 3.4, 32, 1, true);
    const jetMat = new THREE.ShaderMaterial({
      uniforms: jetUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormalView = normalize(normalMatrix * normal);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        uniform float uTime;
        void main() {
          // Soft Fresnel silhouette attenuation eliminates hard geometric cone edges
          float edgeSoft = pow(max(0.0, dot(normalize(vNormalView), normalize(vViewDir))), 2.2);
          float along = 1.0 - vUv.y;
          float axialFade = smoothstep(0.0, 0.22, along) * pow(1.0 - along, 2.2);
          float streak = 0.72 + 0.28 * sin(vUv.x * 37.699 + uTime * 2.1 - along * 7.0);
          vec3 synchCol = mix(vec3(0.98, 0.68, 0.38), vec3(0.48, 0.70, 1.0), along);
          float alpha = axialFade * edgeSoft * streak * 0.22;
          if (alpha < 0.002) discard;
          gl_FragColor = vec4(synchCol * alpha, alpha);
        }
      `,
    });

    const northJet = new THREE.Mesh(jetGeo, jetMat);
    northJet.position.set(0, 2.45, 0);
    northJet.rotation.z = Math.PI; // Tip points inward toward north pole
    northJet.renderOrder = 1;
    blackHoleGroup.add(northJet);

    const southJet = new THREE.Mesh(jetGeo, jetMat);
    southJet.position.set(0, -2.45, 0);
    southJet.renderOrder = 1;
    blackHoleGroup.add(southJet);

    disposables.geometries.push(jetGeo);
    disposables.materials.push(jetMat);

    // Part 3G: 420 Keplerian Infalling Plasma Embers (3D Orbiting Points)
    const keplerSeeds = generateKeplerianParticles(420, 1.18, 3.55);
    const emberCount = keplerSeeds.length;
    const emberBaseAttr = new Float32Array(emberCount * 4); // radius, initAngle, heightOffset, angularSpeed
    const emberMetaAttr = new Float32Array(emberCount * 2); // temperature, sizeScale
    const emberDummyPos = new Float32Array(emberCount * 3);

    for (let i = 0; i < emberCount; i++) {
      const p = keplerSeeds[i];
      emberBaseAttr[i * 4] = p.radius;
      emberBaseAttr[i * 4 + 1] = p.angle;
      emberBaseAttr[i * 4 + 2] = p.heightOffset;
      emberBaseAttr[i * 4 + 3] = p.angularSpeed;
      emberMetaAttr[i * 2] = p.temperature;
      emberMetaAttr[i * 2 + 1] = p.sizeScale;
      emberDummyPos[i * 3] = Math.cos(p.angle) * p.radius;
      emberDummyPos[i * 3 + 1] = p.heightOffset;
      emberDummyPos[i * 3 + 2] = Math.sin(p.angle) * p.radius;
    }

    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberDummyPos, 3));
    emberGeo.setAttribute('aOrbit', new THREE.BufferAttribute(emberBaseAttr, 4));
    emberGeo.setAttribute('aMeta', new THREE.BufferAttribute(emberMetaAttr, 2));

    const emberUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: getTargetPixelRatio() },
    };

    const emberMat = new THREE.ShaderMaterial({
      uniforms: emberUniforms,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec4 aOrbit;
        attribute vec2 aMeta;
        varying float vTemp;
        varying float vDoppler;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
          float r = aOrbit.x;
          float theta = aOrbit.y - uTime * aOrbit.w;
          vec3 orbPos = vec3(cos(theta) * r, aOrbit.z, sin(theta) * r);

          vTemp = aMeta.x;
          vDoppler = clamp(-orbPos.x / max(0.8, r), -1.0, 1.0);

          vec4 mv = modelViewMatrix * vec4(orbPos, 1.0);
          gl_PointSize = clamp(aMeta.y * 4.2 * uPixelRatio * (8.5 / max(2.5, -mv.z)), 1.2, 7.5);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        varying float vTemp;
        varying float vDoppler;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float glow = pow(1.0 - d * 2.0, 2.0);
          float beam = mix(0.55, 1.45, vDoppler * 0.5 + 0.5);
          vec3 col = mix(vec3(0.95, 0.34, 0.08), vec3(1.0, 0.92, 0.76), vTemp);
          gl_FragColor = vec4(col * glow * beam, glow * beam * 0.85);
        }
      `,
    });
    const emberPoints = new THREE.Points(emberGeo, emberMat);
    emberPoints.frustumCulled = false;
    emberPoints.renderOrder = 4;
    blackHoleGroup.add(emberPoints);
    disposables.geometries.push(emberGeo);
    disposables.materials.push(emberMat);

    // Part 3H: 24 Distant Stable-Orbit Metallic Micro-Relays (InstancedMesh)
    const relayCount = 24;
    const relayGeo = new THREE.IcosahedronGeometry(0.015, 1);
    const relayMat = new THREE.MeshStandardMaterial({
      color: 0xffd7b3,
      roughness: 0.22,
      metalness: 0.88,
    });
    const relayInstanced = new THREE.InstancedMesh(relayGeo, relayMat, relayCount);
    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    const dummyScale = new THREE.Vector3();
    const dummyEuler = new THREE.Euler();
    const tintColor = new THREE.Color();

    for (let i = 0; i < relayCount; i++) {
      const frac = i / relayCount;
      const r = 3.55 + (i % 5) * 0.22;
      const ang = frac * Math.PI * 2;
      dummyPos.set(
        Math.cos(ang) * r,
        ((i % 3) - 1) * 0.08,
        Math.sin(ang) * r
      );
      dummyEuler.set(i * 0.7, ang, i * 0.4);
      dummyQuat.setFromEuler(dummyEuler);
      const s = 0.85 + (i % 4) * 0.1;
      dummyScale.set(s, s * 0.7, s);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      relayInstanced.setMatrixAt(i, dummyMatrix);

      tintColor.setHSL(0.07 + (i % 3) * 0.02, 0.55, 0.62 + (i % 2) * 0.12);
      relayInstanced.setColorAt(i, tintColor);
    }
    relayInstanced.instanceMatrix.needsUpdate = true;
    if (relayInstanced.instanceColor) relayInstanced.instanceColor.needsUpdate = true;
    relayInstanced.computeBoundingSphere();
    blackHoleGroup.add(relayInstanced);
    disposables.geometries.push(relayGeo);
    disposables.materials.push(relayMat);

    // -------------------------------------------------------------------------
    // 4. Desktop Post-Processing Bloom (1-Pass Fast Path on Mobile & Software GL)
    // -------------------------------------------------------------------------
    let composer: EffectComposer | null = null;
    if (!isSoftwareGl && !isMobileViewport()) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(lastW, lastH),
        0.52,
        0.68,
        0.58
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Initialize pose immediately so first frame is accurately framed
    const initialPose = computeBlackHoleWorkspacePose({
      viewportWidth: lastW,
      viewportHeight: lastH,
      sidebarCollapsed: propsRef.current.sidebarCollapsed,
      activePage: propsRef.current.activePage,
      scrollY: 0,
    });

    let curX = initialPose.x;
    let curY = initialPose.y;
    let curScale = initialPose.scale;
    let curPitch = initialPose.pitch;
    let curYaw = initialPose.yaw;
    let curRoll = initialPose.roll;

    blackHoleGroup.position.set(curX, curY, 0);
    blackHoleGroup.scale.setScalar(curScale);
    blackHoleGroup.rotation.set(curPitch, curYaw, curRoll);

    // -------------------------------------------------------------------------
    // 5. Render Loop with Software-WebGL afterDraw(tick) Fence Pacing
    // -------------------------------------------------------------------------
    let frameId = 0;
    let timerId = 0;
    let disposed = false;
    let contextLost = false;
    let prevTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            timerId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            timerId = window.setTimeout(cb, 80);
          }
        };
        timerId = window.setTimeout(poll, 5);
      } else {
        timerId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (disposed) return;

      const now = performance.now();
      const dt = clampBH((now - prevTime) / 1000, 0.001, 0.1);
      prevTime = now;

      if (!contextLost) {
        const elapsed = prefersReducedMotion ? 2.4 : now * 0.001;

        const mainEl = document.querySelector('main');
        const scrollTop = (window.scrollY || 0) + (mainEl ? mainEl.scrollTop : 0);

        const targetPose = computeBlackHoleWorkspacePose({
          viewportWidth: lastW,
          viewportHeight: lastH,
          sidebarCollapsed: propsRef.current.sidebarCollapsed,
          activePage: propsRef.current.activePage,
          scrollY: scrollTop,
        });

        const dampFactor = prefersReducedMotion ? 1 : 1 - Math.exp(-4.2 * dt);
        curX += (targetPose.x - curX) * dampFactor;
        curY += (targetPose.y - curY) * dampFactor;
        curScale += (targetPose.scale - curScale) * dampFactor;
        curPitch += (targetPose.pitch - curPitch) * dampFactor;
        curYaw += (targetPose.yaw - curYaw) * dampFactor;
        curRoll += (targetPose.roll - curRoll) * dampFactor;

        // Subtle orbital breathing motion
        const breathY = prefersReducedMotion ? 0 : Math.sin(elapsed * 0.42) * 0.035;
        blackHoleGroup.position.set(curX, curY + breathY, 0);
        blackHoleGroup.scale.setScalar(curScale);
        blackHoleGroup.rotation.set(curPitch, curYaw, curRoll);

        // Keep lensed arches billboard facing camera inside blackHoleGroup's local space
        _invGroupQuat.copy(blackHoleGroup.quaternion).invert();
        _localCamQuat.multiplyQuaternions(_invGroupQuat, camera.quaternion);
        lensedArchesMesh.quaternion.copy(_localCamQuat);

        // Slowly rotate outer cold dust torus & distant relays in the equatorial XZ plane (around Y)
        dustTorusMesh.rotation.y = -elapsed * 0.11;
        relayInstanced.rotation.y = -elapsed * 0.09;
        starPoints.rotation.y = elapsed * 0.008;

        // Project Black Hole center to screen UV [0..1] for background Einstein star/nebula lensing
        _projVec.copy(blackHoleGroup.position).project(camera);
        bgUniforms.uBhUv.value.set(_projVec.x * 0.5 + 0.5, _projVec.y * 0.5 + 0.5);

        // Advance shader time uniforms
        bgUniforms.uTime.value = elapsed;
        starUniforms.uTime.value = elapsed;
        diskUniforms.uTime.value = elapsed;
        lensUniforms.uTime.value = elapsed;
        lensUniforms.uDiskTilt.value = curPitch;
        jetUniforms.uTime.value = elapsed;
        emberUniforms.uTime.value = elapsed;

        if (composer) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    const handleResize = () => {
      const nextW = window.innerWidth;
      const nextH = window.innerHeight;
      // Ignore minor mobile URL-bar height jitter (< 100px when width unchanged)
      if (nextW === lastW && Math.abs(nextH - lastH) < 100 && nextW < 768) {
        return;
      }
      lastW = nextW;
      lastH = nextH;

      camera.aspect = lastW / Math.max(1, lastH);
      camera.updateProjectionMatrix();

      const pr = getTargetPixelRatio();
      renderer.setPixelRatio(pr);
      renderer.setSize(lastW, lastH, false);
      bgUniforms.uResolution.value.set(lastW, lastH);
      starUniforms.uPixelRatio.value = pr;
      emberUniforms.uPixelRatio.value = pr;

      if (composer) {
        composer.setPixelRatio(pr);
        composer.setSize(lastW, lastH);
      }
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };

    const handleContextRestored = () => {
      contextLost = false;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      composer?.dispose();
      envTarget.dispose();
      relayInstanced.dispose();
      disposables.geometries.forEach((g) => g.dispose());
      disposables.materials.forEach((m) => m.dispose());
      disposables.textures.forEach((t) => t.dispose());
      renderer.dispose();

      if (canvas.parentNode === mountEl) {
        mountEl.removeChild(canvas);
      }
    };
  }, []);

  return <div ref={mountRef} className="planet-canvas-host" aria-hidden="true" />;
};
