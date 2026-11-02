import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  clampVal,
  computeEntryOffset,
  computeResponsiveMarsPose,
  generateMarsMarkerPositions,
  sampleMarsSurface,
} from '../../utils/marsChoreography';

const CONFIG = {
  rimColor: '#ff9b73',
  rimPower: 2.35,
  nightLights: 2.4,
  terrainDepth: 0.36,
  terrainShade: 1.45,
  polarGlint: 0.42,
  glowColor: '#ff6238',
  glowIntensity: 2.05,
  planetRadius: 1.95,
  spin: 0.035,
  initRotation: 2.35, // Frames Valles Marineris, Tharsis & Olympus Mons prominently on entry
  tilt: 0.44, // Mars axial obliquity (~25.19 deg = 0.4396 rad)
  cloud1Height: 1.008,
  cloud1Opacity: 0.24,
  cloud1Spin: 0.055,
  cloud2Height: 1.03,
  cloud2Opacity: 0.18,
  cloud2Spin: 0.12,
  cloud3Height: 1.068,
  cloud3Opacity: 0.14,
  cloud3Spin: 0.085,
  bgColor: '#04091b',
  flameColor: '#c94b29',
  flameColor2: '#7ec4ff',
  flameAmt: 0.14,
  atmoColor: '#ffb598',
  atmoCount: 320,
  atmoSize: 20,
  atmoSpeed: 0.8,
  starColor: '#d6e4ff',
  starCount: 1400,
  starSize: 1.65,
  starFlicker: 1.0,
  markerColor: '#ffd27a',
  markerCount: 60,
  markerSize: 16,
  markerSpeed: 0.5,
};

function hexToVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
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

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
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

function buildMarsDataTextures(width: number, height: number): {
  albedoHeightTex: THREE.DataTexture;
  outpostTex: THREE.DataTexture;
} {
  const size = width * height;
  const albedoData = new Uint8Array(size * 4);
  const outpostData = new Uint8Array(size * 4);

  for (let y = 0; y < height; y++) {
    // DataTexture row 0 is bottom (v = 0 -> south pole -PI/2), row height-1 is north pole +PI/2
    const v = (y + 0.5) / height;
    const lat = (v - 0.5) * Math.PI;

    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      // Match Three.js SphereGeometry UV mapping: phi = u * 2*PI, px = -cos(phi), pz = sin(phi)
      // Equivalent unit-sphere lon where nx = cos(lon), nz = sin(lon): lon = PI - u * 2 * PI
      const lon = Math.PI - u * Math.PI * 2;
      const sample = sampleMarsSurface(lon, lat);

      const i4 = (y * width + x) * 4;
      albedoData[i4] = sample.r;
      albedoData[i4 + 1] = sample.g;
      albedoData[i4 + 2] = sample.b;
      albedoData[i4 + 3] = Math.round(sample.height * 255);

      const glow = Math.round(sample.outpostGlow * 255);
      outpostData[i4] = glow;
      outpostData[i4 + 1] = Math.round(glow * 0.68);
      outpostData[i4 + 2] = Math.round(glow * 0.34);
      outpostData[i4 + 3] = 255;
    }
  }

  const albedoHeightTex = new THREE.DataTexture(albedoData, width, height, THREE.RGBAFormat);
  albedoHeightTex.wrapS = THREE.RepeatWrapping;
  albedoHeightTex.wrapT = THREE.ClampToEdgeWrapping;
  albedoHeightTex.minFilter = THREE.LinearMipmapLinearFilter;
  albedoHeightTex.magFilter = THREE.LinearFilter;
  albedoHeightTex.generateMipmaps = true;
  albedoHeightTex.needsUpdate = true;

  const outpostTex = new THREE.DataTexture(outpostData, width, height, THREE.RGBAFormat);
  outpostTex.wrapS = THREE.RepeatWrapping;
  outpostTex.wrapT = THREE.ClampToEdgeWrapping;
  outpostTex.minFilter = THREE.LinearFilter;
  outpostTex.magFilter = THREE.LinearFilter;
  outpostTex.needsUpdate = true;

  return { albedoHeightTex, outpostTex };
}

function buildMartianDustTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const ny = y / size;
      for (let x = 0; x < size; x++) {
        const nx = x / size;
        // Tileable multi-harmonic dust bands
        const band =
          0.5 +
          0.26 * Math.sin(ny * Math.PI * 6 + Math.sin(nx * Math.PI * 4) * 0.9) +
          0.16 * Math.cos(nx * Math.PI * 8 - ny * Math.PI * 4) +
          0.08 * Math.sin((nx + ny) * Math.PI * 12);
        const alpha = clampVal((band - 0.38) * 1.65, 0, 1);
        const idx = (y * size + x) * 4;
        img.data[idx] = 255;
        img.data[idx + 1] = 214;
        img.data[idx + 2] = 186;
        img.data[idx + 3] = Math.round(alpha * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  return tex;
}

function createMartianMoonGroup(
  radius: number,
  colorHex: number,
  craterColorHex: number,
  elongation: [number, number, number],
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] }
): THREE.Group {
  const group = new THREE.Group();

  // Primary irregular asteroid body
  const bodyGeo = new THREE.IcosahedronGeometry(radius, 2);
  const pos = bodyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const lump =
      1 +
      0.14 * Math.sin(vx * 18 + vy * 11) +
      0.09 * Math.cos(vz * 23 - vx * 14);
    pos.setXYZ(
      i,
      vx * elongation[0] * lump,
      vy * elongation[1] * lump,
      vz * elongation[2] * lump
    );
  }
  bodyGeo.computeVertexNormals();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.88,
    metalness: 0.08,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(bodyMesh);

  // Secondary crater rim feature (e.g. Stickney crater on Phobos)
  const rimGeo = new THREE.TorusGeometry(radius * 0.42, radius * 0.075, 8, 20);
  const rimMat = new THREE.MeshStandardMaterial({
    color: craterColorHex,
    roughness: 0.58,
    metalness: 0.16,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.set(radius * elongation[0] * 0.78, radius * 0.12, 0);
  rimMesh.rotation.y = Math.PI * 0.5;
  group.add(rimMesh);

  disposables.geometries.push(bodyGeo, rimGeo);
  disposables.materials.push(bodyMat, rimMat);

  return group;
}

export const MarsPlanetCanvas: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = detectSoftwareGl();

    const canvas = document.createElement('canvas');
    canvas.className = 'planet-canvas';
    canvas.dataset.scene = 'mars';
    canvas.dataset.planet = 'mars';
    canvas.dataset.moons = 'phobos,deimos';
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
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(getTargetPixelRatio());
    renderer.setSize(lastW, lastH, false);
    renderer.shadowMap.enabled = false;

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
    scene.background = new THREE.Color(0x040816);
    scene.fog = new THREE.FogExp2(0x040816, 0.0032);

    // Studio environment map for realistic PBR response on polar caps & moons
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(40, lastW / Math.max(lastH, 1), 0.1, 200);
    camera.position.set(0, 0, 8);
    scene.add(camera);

    // Warm solar key light + cool deep-space hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0x7ca4ff, 0x2c120d, 0.55);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff0dd, 2.2);
    sunLight.position.set(-9, 2.2, 4.5);
    scene.add(sunLight);

    // 1. Deep-Space + Corner Nebula Flame Fullscreen Backdrop Quad
    const bgGeo = new THREE.PlaneGeometry(2, 2);
    const bgMat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        iTime: { value: 0 },
        uBg: { value: hexToVec3(CONFIG.bgColor) },
        uFlameA: { value: hexToVec3(CONFIG.flameColor) },
        uFlameB: { value: hexToVec3(CONFIG.flameColor2) },
        uFlameAmt: { value: CONFIG.flameAmt },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float iTime;
        uniform vec3 uBg;
        uniform vec3 uFlameA;
        uniform vec3 uFlameB;
        uniform float uFlameAmt;
        varying vec2 vUv;

        vec3 warp3d(vec3 pos, float t) {
          float curv = 0.8, a = 1.9, b = 0.7;
          pos *= 2.0;
          pos.x += curv * sin(t + a * pos.y) + t * b;
          pos.y += curv * cos(t + a * pos.x);
          pos.y += curv * sin(t + a * pos.z) + t * b;
          pos.z += curv * cos(t + a * pos.y);
          pos.z += curv * sin(t + a * pos.x) + t * b;
          pos.x += curv * cos(t + a * pos.z);
          return 0.5 + 0.5 * cos(pos.xyz + vec3(1.0, 2.0, 4.0));
        }

        void main() {
          vec2 uv = 2.0 * vUv - 1.0;
          vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime * 0.25), vec3(1.5));
          vec3 flame = 1.5 * uFlameA * w.x;
          flame *= w.y;
          flame += uFlameB * w.z;
          flame *= smoothstep(0.25, 1.0, abs(uv.y));
          float md = smoothstep(-0.7, 1.0, -uv.y * uv.x);
          flame *= md * md;
          vec3 bg = uBg * (1.0 - 0.4 * length(uv));
          gl_FragColor = vec4(bg + flame * uFlameAmt, 1.0);
        }
      `,
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.frustumCulled = false;
    bgMesh.renderOrder = -100;
    scene.add(bgMesh);
    disposables.geometries.push(bgGeo);
    disposables.materials.push(bgMat);

    // 2. Twinkling Deep-Space Starfield (1400 stars on r=90 sphere)
    const starPositions = new Float32Array(CONFIG.starCount * 3);
    const starSeeds = new Float32Array(CONFIG.starCount);
    const starBright = new Float32Array(CONFIG.starCount);
    for (let i = 0; i < CONFIG.starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 90;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      starSeeds[i] = Math.random() * Math.PI * 2;
      starBright[i] = 0.35 + Math.random() * 0.65;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('seed', new THREE.BufferAttribute(starSeeds, 1));
    starGeo.setAttribute('bright', new THREE.BufferAttribute(starBright, 1));

    const resVec = new THREE.Vector2(
      lastW * renderer.getPixelRatio(),
      lastH * renderer.getPixelRatio()
    );

    const starMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: CONFIG.starSize },
        uFlicker: { value: CONFIG.starFlicker },
        uColor: { value: hexToVec3(CONFIG.starColor) },
        uRes: { value: resVec },
      },
      vertexShader: /* glsl */ `
        attribute float seed;
        attribute float bright;
        uniform float uTime;
        uniform float uSize;
        uniform float uFlicker;
        uniform vec2 uRes;
        varying float vTw;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float tw = 0.6 + 0.4 * sin(uTime * uFlicker + seed);
          vTw = bright * tw;
          gl_PointSize = max(uSize * uRes.y / 900.0 * (90.0 / max(-mv.z, 1.0)), 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vTw;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float l = length(p);
          if (l > 0.5) discard;
          float core = smoothstep(0.5, 0.0, l);
          gl_FragColor = vec4(uColor, core * vTw);
        }
      `,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    starPoints.frustumCulled = false;
    starPoints.renderOrder = -50;
    scene.add(starPoints);
    disposables.geometries.push(starGeo);
    disposables.materials.push(starMat);

    // 3. Scroll-Driven World Group & Composite Multi-Part Mars Hierarchy
    const worldGroup = new THREE.Group();
    const initialPose = computeResponsiveMarsPose(0, lastW, lastH);
    const initialEntryY = computeEntryOffset(0, prefersReducedMotion);
    worldGroup.position.set(initialPose.x, initialPose.y + initialEntryY, 0);
    worldGroup.scale.setScalar(initialPose.scale);
    scene.add(worldGroup);

    // 3a. Atmosphere Halo Glow (Additive Billboard Plane)
    const glowGeo = new THREE.PlaneGeometry(2, 2);
    const glowMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uGlow: { value: hexToVec3(CONFIG.glowColor) },
        uIntensity: { value: CONFIG.glowIntensity },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uGlow;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.35);
          gl_FragColor = vec4(uGlow * a * uIntensity, a);
        }
      `,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.scale.setScalar(CONFIG.planetRadius * 2.42);
    glowMesh.renderOrder = -2;
    worldGroup.add(glowMesh);
    disposables.geometries.push(glowGeo);
    disposables.materials.push(glowMat);

    // 3b. Planet Group (Tilted to Mars's 25.19 deg obliquity)
    const planetGroup = new THREE.Group();
    planetGroup.rotation.z = CONFIG.tilt;
    planetGroup.rotation.y = CONFIG.initRotation;
    worldGroup.add(planetGroup);

    const texWidth = isSoftwareGl || isMobileViewport() ? 768 : 1024;
    const texHeight = texWidth >> 1;
    const { albedoHeightTex, outpostTex } = buildMarsDataTextures(texWidth, texHeight);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    albedoHeightTex.anisotropy = maxAniso;
    disposables.textures.push(albedoHeightTex, outpostTex);

    const marsSegments = isSoftwareGl ? 64 : isMobileViewport() ? 72 : 96;
    const marsGeo = new THREE.SphereGeometry(CONFIG.planetRadius, marsSegments, marsSegments);
    const marsMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAlbedoHeight: { value: albedoHeightTex },
        uOutpostMap: { value: outpostTex },
        uRimColor: { value: hexToVec3(CONFIG.rimColor) },
        uRimPower: { value: CONFIG.rimPower },
        uNightLights: { value: CONFIG.nightLights },
        uTerrainDepth: { value: CONFIG.terrainDepth },
        uTerrainShade: { value: CONFIG.terrainShade },
        uPolarGlint: { value: CONFIG.polarGlint },
      },
      vertexShader: /* glsl */ `
        varying vec2 vCustomUv;
        varying vec3 vObjPos;
        varying vec3 vViewNormal;
        varying vec3 vViewPosition;
        void main() {
          vCustomUv = uv;
          vObjPos = normalize(position);
          vViewNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        ${SNOISE_GLSL}
        uniform float uTime;
        uniform sampler2D uAlbedoHeight;
        uniform sampler2D uOutpostMap;
        uniform vec3 uRimColor;
        uniform float uRimPower;
        uniform float uNightLights;
        uniform float uTerrainDepth;
        uniform float uTerrainShade;
        uniform float uPolarGlint;

        varying vec2 vCustomUv;
        varying vec3 vObjPos;
        varying vec3 vViewNormal;
        varying vec3 vViewPosition;

        void main() {
          vec3 normalizedNormal = normalize(vViewNormal);
          vec3 viewDir = normalize(vViewPosition);

          vec4 sampleData = texture2D(uAlbedoHeight, vCustomUv);
          vec3 baseAlbedo = pow(sampleData.rgb, vec3(1.72));

          // Smooth filtered height + infinite-resolution 3D procedural micro-relief (zero texel stair-steps!)
          vec2 texStep = vec2(1.0 / 1024.0, 1.0 / 512.0);
          float hL = texture2D(uAlbedoHeight, vCustomUv - vec2(texStep.x, 0.0)).a;
          float hR = texture2D(uAlbedoHeight, vCustomUv + vec2(texStep.x, 0.0)).a;
          float hD = texture2D(uAlbedoHeight, vCustomUv - vec2(0.0, texStep.y)).a;
          float hU = texture2D(uAlbedoHeight, vCustomUv + vec2(0.0, texStep.y)).a;
          float smoothMacroH = 0.25 * (hL + hR + hD + hU);

          float microRidge = snoise(vObjPos * 22.0) * 0.045 + snoise(vObjPos * 64.0) * 0.018;
          float polarMask = smoothstep(0.72, 0.90, min(sampleData.r, min(sampleData.g, sampleData.b)));
          float terrH = smoothMacroH + microRidge * (1.0 - polarMask * 0.7);

          vec3 surfPos = -vViewPosition;
          vec3 sigX = dFdx(surfPos);
          vec3 sigY = dFdy(surfPos);
          vec3 vR1 = cross(sigY, normalizedNormal);
          vec3 vR2 = cross(normalizedNormal, sigX);
          float fDet = dot(sigX, vR1);
          vec3 vGrad = sign(fDet) * (dFdx(terrH) * vR1 + dFdy(terrH) * vR2);
          vec3 bumpedNormal = normalize(abs(fDet) * normalizedNormal - uTerrainDepth * 0.55 * vGrad);

          // Subtle fine regolith grain & drifting dust variation
          float dustWave = snoise(vObjPos * 14.0 + vec3(uTime * 0.5, -uTime * 0.3, uTime * 0.4));
          baseAlbedo += (1.0 - polarMask) * (microRidge * 0.28 + dustWave * 0.015) * vec3(0.45, 0.24, 0.14);

          vec3 viewSunDir = normalize(vec3(-0.88, 0.20, 0.42));
          float ndl = dot(normalizedNormal, viewSunDir);
          float dayAmt = smoothstep(-0.08, 0.36, ndl);
          float relief = dot(bumpedNormal, viewSunDir) - ndl;

          // Warm solar illumination + canyon/volcano relief contrast
          float diffuse = clamp(ndl * 0.88 + 0.14, 0.0, 1.0);
          vec3 litColor = baseAlbedo * (0.04 + diffuse * 1.24 * vec3(1.03, 0.98, 0.93));
          litColor *= clamp(1.0 + relief * uTerrainShade * dayAmt, 0.62, 1.48);

          // Night-side shadow + glowing Valles Marineris & Tharsis research outposts
          float nightFactor = smoothstep(0.18, -0.32, ndl);
          float lightsFactor = smoothstep(0.24, -0.36, ndl);
          litColor = mix(litColor, baseAlbedo * vec3(0.028, 0.024, 0.042), nightFactor * 0.84);

          vec3 outpostGlow = texture2D(uOutpostMap, vCustomUv).rgb * vec3(1.0, 0.74, 0.44) * uNightLights;
          litColor += outpostGlow * lightsFactor;

          // Solar specular glint on Martian polar CO2 / water ice caps
          vec3 halfDir = normalize(viewSunDir + viewDir);
          float ndh = max(dot(bumpedNormal, halfDir), 0.0);
          float iceGlint = pow(ndh, 85.0) * polarMask * dayAmt * uPolarGlint;
          litColor += iceGlint * vec3(1.0, 0.96, 0.90);

          // Warm peach-amber Martian atmospheric limb scattering
          float rim = 1.0 - max(dot(viewDir, normalizedNormal), 0.0);
          rim = pow(rim, uRimPower);
          rim = pow(rim, 1.35) * 0.68;
          float sunSideRim = mix(0.24, 1.0, smoothstep(-0.45, 0.45, ndl));
          vec3 rimLinear = pow(uRimColor, vec3(1.8));
          litColor = mix(litColor, rimLinear, clamp(rim * sunSideRim, 0.0, 0.82));

          gl_FragColor = vec4(litColor, 1.0);
        }
      `,
    });
    const marsMesh = new THREE.Mesh(marsGeo, marsMat);
    planetGroup.add(marsMesh);
    disposables.geometries.push(marsGeo);
    disposables.materials.push(marsMat);

    // 3c. Outer 3D Atmospheric Limb Scattering Shell (Soft Fresnel Haze Envelope)
    const limbGeo = new THREE.SphereGeometry(CONFIG.planetRadius * 1.036, 56, 56);
    const limbMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uLimbColor: { value: hexToVec3('#ff8559') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalV;
        varying vec3 vViewP;
        void main() {
          vNormalV = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewP = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uLimbColor;
        varying vec3 vNormalV;
        varying vec3 vViewP;
        void main() {
          vec3 n = normalize(vNormalV);
          vec3 v = normalize(vViewP);
          float fresnel = pow(clamp(0.62 - dot(-n, v), 0.0, 1.0), 2.6);
          float sunSide = smoothstep(-0.5, 0.45, dot(-n, normalize(vec3(-0.88, 0.20, 0.42))));
          float a = fresnel * mix(0.2, 0.85, sunSide);
          gl_FragColor = vec4(uLimbColor * a * 1.15, a);
        }
      `,
    });
    const limbMesh = new THREE.Mesh(limbGeo, limbMat);
    limbMesh.renderOrder = 1;
    planetGroup.add(limbMesh);
    disposables.geometries.push(limbGeo);
    disposables.materials.push(limbMat);

    // 3d. Golden Surface Radar-Ping Markers (60 Martian Landmark Pings)
    const markers = generateMarsMarkerPositions(CONFIG.markerCount, CONFIG.planetRadius);
    const markerPosArr = new Float32Array(markers.length * 3);
    const markerSeedArr = new Float32Array(markers.length);
    for (let i = 0; i < markers.length; i++) {
      markerPosArr[i * 3] = markers[i].x;
      markerPosArr[i * 3 + 1] = markers[i].y;
      markerPosArr[i * 3 + 2] = markers[i].z;
      markerSeedArr[i] = markers[i].seed;
    }
    const markerGeo = new THREE.BufferGeometry();
    markerGeo.setAttribute('position', new THREE.BufferAttribute(markerPosArr, 3));
    markerGeo.setAttribute('seed', new THREE.BufferAttribute(markerSeedArr, 1));

    const markerMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: hexToVec3(CONFIG.markerColor) },
        uSize: { value: CONFIG.markerSize },
        uSpeed: { value: CONFIG.markerSpeed },
        uRes: { value: resVec },
      },
      vertexShader: /* glsl */ `
        attribute float seed;
        uniform float uSize;
        uniform vec2 uRes;
        varying float vSeed;
        varying float vFade;
        void main() {
          vSeed = seed;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 vn = normalize(normalMatrix * normalize(position));
          vec3 vd = normalize(-mv.xyz);
          vFade = smoothstep(0.15, 0.5, dot(vn, vd));
          gl_PointSize = max(uSize * uRes.y / 900.0 * (7.0 / max(-mv.z, 1.0)), 2.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uSpeed;
        varying float vSeed;
        varying float vFade;
        void main() {
          if (vFade <= 0.001) discard;
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p) * 2.0;
          if (d > 1.0) discard;
          float core = smoothstep(0.30, 0.0, d) * 1.2;
          float ph = fract(uTime * uSpeed + vSeed);
          float ring = smoothstep(0.07, 0.0, abs(d - ph)) * (1.0 - ph);
          gl_FragColor = vec4(uColor, clamp(core + ring, 0.0, 1.0) * vFade);
        }
      `,
    });
    const markerPoints = new THREE.Points(markerGeo, markerMat);
    markerPoints.renderOrder = 3;
    marsMesh.add(markerPoints);
    disposables.geometries.push(markerGeo);
    disposables.materials.push(markerMat);

    // 3e. Martian Dust Veil & High-Altitude CO2 Cloud Shells (3 concentric layers)
    const cloudGroup = new THREE.Group();
    cloudGroup.rotation.z = CONFIG.tilt;
    worldGroup.add(cloudGroup);

    const dustTex = buildMartianDustTexture(256);
    disposables.textures.push(dustTex);

    const cloudTimeUniform = { value: 0 };
    const cloudLayerDefs = [
      {
        height: CONFIG.cloud1Height,
        opacity: CONFIG.cloud1Opacity,
        spin: CONFIG.cloud1Spin,
        ry: 0.0,
        phase: 0.0,
        tint: '#ffb085', // Low equatorial iron-oxide dust veil
      },
      {
        height: CONFIG.cloud2Height,
        opacity: CONFIG.cloud2Opacity,
        spin: CONFIG.cloud2Spin,
        ry: 2.2,
        phase: 13.0,
        tint: '#ffc8a6', // Mid-altitude dust streams
      },
      {
        height: CONFIG.cloud3Height,
        opacity: CONFIG.cloud3Opacity,
        spin: CONFIG.cloud3Spin,
        ry: 4.3,
        phase: 27.0,
        tint: '#dce8ff', // High-altitude Martian CO2 ice cirrus wisps
      },
    ];

    const cloudMeshes: Array<{ mesh: THREE.Mesh; spin: number }> = [];
    const cloudSegs = isSoftwareGl ? 40 : 56;
    cloudLayerDefs.forEach((layer, idx) => {
      const cGeo = new THREE.SphereGeometry(
        CONFIG.planetRadius * layer.height,
        cloudSegs,
        cloudSegs
      );
      const cMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uMap: { value: dustTex },
          uTime: cloudTimeUniform,
          uOpacity: { value: layer.opacity },
          uPhase: { value: layer.phase },
          uTint: { value: hexToVec3(layer.tint) },
        },
        vertexShader: /* glsl */ `
          varying vec2 vCloudUv;
          varying vec3 vNormalView;
          varying vec3 vViewPos;
          void main() {
            vCloudUv = uv * vec2(4.0, 3.0);
            vNormalView = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vViewPos = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          ${SNOISE_GLSL}
          uniform sampler2D uMap;
          uniform float uTime;
          uniform float uOpacity;
          uniform float uPhase;
          uniform vec3 uTint;
          varying vec2 vCloudUv;
          varying vec3 vNormalView;
          varying vec3 vViewPos;
          void main() {
            vec4 tex = texture2D(uMap, vCloudUv);
            float cloudNoise = 0.5 + 0.5 * snoise(vec3(
              vCloudUv.x * 5.0 + uTime * 1.0 + uPhase,
              vCloudUv.y * 5.0 - uTime * 1.8 + uPhase,
              uTime * 1.8 + uPhase
            ));
            vec3 nN = normalize(vNormalView);
            vec3 nV = normalize(vViewPos);
            float cloudNdv = max(dot(nN, nV), 0.0);
            float cloudEdge = pow(1.0 - cloudNdv, 2.8);
            float cloudMod = mix(cloudNoise * tex.a, 0.85, cloudEdge * 0.55);
            float cloudNdl = dot(nN, normalize(vec3(-0.88, 0.20, 0.42)));
            float cloudDay = 1.0 - smoothstep(0.30, -0.30, cloudNdl) * 0.88;
            float alpha = clamp(cloudMod * uOpacity * cloudDay, 0.0, 1.0);
            gl_FragColor = vec4(pow(uTint, vec3(2.0)), alpha);
          }
        `,
      });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      cMesh.rotation.y = layer.ry;
      cMesh.renderOrder = 2 + idx;
      cloudGroup.add(cMesh);
      cloudMeshes.push({ mesh: cMesh, spin: layer.spin });
      disposables.geometries.push(cGeo);
      disposables.materials.push(cMat);
    });

    // 3f. Mars's Natural Moons: Phobos & Deimos (Composite Sculpted Moons in Orbit)
    const phobosPivot = new THREE.Group();
    phobosPivot.rotation.z = 0.26;
    phobosPivot.rotation.x = 0.12;
    const phobosBody = createMartianMoonGroup(
      0.085,
      0x9b8274,
      0x6b564b,
      [1.32, 0.96, 1.08],
      disposables
    );
    phobosBody.position.set(CONFIG.planetRadius * 1.38, 0, 0);
    phobosPivot.add(phobosBody);
    worldGroup.add(phobosPivot);

    const deimosPivot = new THREE.Group();
    deimosPivot.rotation.z = -0.32;
    deimosPivot.rotation.x = -0.16;
    const deimosBody = createMartianMoonGroup(
      0.055,
      0xb69f8e,
      0x857062,
      [1.22, 0.92, 1.04],
      disposables
    );
    deimosBody.position.set(-CONFIG.planetRadius * 1.76, 0.15, 0);
    deimosPivot.add(deimosBody);
    worldGroup.add(deimosPivot);

    // 4. Ambient Cosmic Dust Motes (320 Points)
    const atmoPos = new Float32Array(CONFIG.atmoCount * 3);
    const atmoSizes = new Float32Array(CONFIG.atmoCount);
    const atmoSeeds = new Float32Array(CONFIG.atmoCount);
    for (let i = 0; i < CONFIG.atmoCount; i++) {
      atmoPos[i * 3] = Math.random() * 2 - 1;
      atmoPos[i * 3 + 1] = Math.random() * 2 - 1;
      atmoPos[i * 3 + 2] = Math.random() * 2 - 1;
      atmoSizes[i] = CONFIG.atmoSize * (0.4 + Math.random());
      atmoSeeds[i] = Math.random() * Math.PI * 2;
    }
    const atmoGeo = new THREE.BufferGeometry();
    atmoGeo.setAttribute('position', new THREE.BufferAttribute(atmoPos, 3));
    atmoGeo.setAttribute('size', new THREE.BufferAttribute(atmoSizes, 1));
    atmoGeo.setAttribute('seed', new THREE.BufferAttribute(atmoSeeds, 1));

    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: resVec },
        uColor: { value: hexToVec3(CONFIG.atmoColor) },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float seed;
        uniform float uTime;
        uniform vec2 uRes;
        varying float vA;
        vec3 warp(vec3 p, float t) {
          float c = 0.9, a = 1.9, b = 0.02, s = 0.05;
          p *= 2.0;
          p.x += c * sin(s * t + a * p.y) + t * b;
          p.y += c * cos(s * t + a * p.x);
          p.y += c * sin(s * t + a * p.z) + t * b;
          p.z += c * cos(s * t + a * p.y);
          p.z += c * sin(s * t + a * p.x) + t * b;
          p.x += c * cos(s * t + a * p.z);
          return cos(p + vec3(1.0, 2.0, 4.0));
        }
        void main() {
          vec3 v = position * 4.0 + warp(position, uTime) * 1.2;
          vec4 mv = modelViewMatrix * vec4(v, 1.0);
          float r = length(v);
          float farF = 1.0 - smoothstep(5.0, 6.5, r);
          float nearF = smoothstep(0.0, 0.5, -mv.z);
          vA = farF * nearF;
          gl_PointSize = size * uRes.y / 900.0 / max(-mv.z, 0.1);
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vA;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float l = length(p);
          if (l > 0.5) discard;
          float tex = smoothstep(0.5, 0.0, l);
          gl_FragColor = vec4(uColor * tex, tex * vA * 0.48);
        }
      `,
    });
    const atmoPoints = new THREE.Points(atmoGeo, atmoMat);
    atmoPoints.frustumCulled = false;
    atmoPoints.renderOrder = 10;
    scene.add(atmoPoints);
    disposables.geometries.push(atmoGeo);
    disposables.materials.push(atmoMat);

    // 5. Desktop Hardware GPU Bloom Composer (Mobile & Software-WebGL use fast 1-pass render)
    let composer: EffectComposer | null = null;
    if (!isSoftwareGl && !isMobileViewport()) {
      composer = new EffectComposer(renderer);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(lastW, lastH);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(
        new UnrealBloomPass(new THREE.Vector2(lastW, lastH), 0.28, 0.45, 0.78)
      );
      composer.addPass(new OutputPass());
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Scroll & Animation State (Zero allocations inside tick)
    let curP = 0;
    let curX = initialPose.x;
    let curY = initialPose.y;
    let curS = initialPose.scale;
    let spinPhase = 0;
    let planetTime = 0;
    let cloudTime = 0;
    let starTime = 0;
    let markerTime = 0;
    const mountTimeSec = performance.now() / 1000;
    let prevTimeSec = mountTimeSec;
    let lastDatasetWriteSec = 0;

    let frameId = 0;
    let timerId = 0;
    let contextLost = false;
    let disposed = false;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext | null;
      if (!gl || typeof gl.fenceSync !== 'function') {
        timerId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          timerId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          timerId = window.setTimeout(cb, 80);
        }
      };
      timerId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      if (contextLost) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const nowSec = performance.now() / 1000;
      const dt = Math.min(Math.max(nowSec - prevTimeSec, 0.001), 0.05);
      prevTimeSec = nowSec;

      const docEl = document.documentElement;
      const maxScroll = Math.max(docEl.scrollHeight - window.innerHeight, 1);
      const pTarget = clampVal(window.scrollY / maxScroll, 0, 1);

      if (prefersReducedMotion) {
        curP = pTarget;
      } else {
        curP += (pTarget - curP) * Math.min(1, dt * 4.5);
      }

      const targetPose = computeResponsiveMarsPose(curP, lastW, lastH);
      const dampK = prefersReducedMotion ? 1 : Math.min(1, dt * 3.2);
      curX += (targetPose.x - curX) * dampK;
      curY += (targetPose.y - curY) * dampK;
      curS += (targetPose.scale - curS) * dampK;

      const entryY = computeEntryOffset(nowSec - mountTimeSec, prefersReducedMotion);

      worldGroup.position.set(curX, curY + entryY, 0);
      worldGroup.scale.setScalar(curS);

      if (!prefersReducedMotion) {
        spinPhase += dt * CONFIG.spin;
        planetTime += dt / 12;
        cloudTime += dt / 20;
        starTime += dt;
        markerTime += dt;
      }

      planetGroup.rotation.y = CONFIG.initRotation + spinPhase + curP * Math.PI * 1.6;
      glowMesh.quaternion.copy(camera.quaternion);

      for (let i = 0; i < cloudMeshes.length; i++) {
        if (!prefersReducedMotion) {
          cloudMeshes[i].mesh.rotation.y += dt * cloudMeshes[i].spin;
        }
      }

      // Orbit Phobos & Deimos around Mars
      phobosPivot.rotation.y = 0.65 + spinPhase * 4.2 + curP * 1.8;
      deimosPivot.rotation.y = 2.1 + spinPhase * 1.6 + curP * 0.9;
      phobosBody.rotation.y += dt * 0.25;
      deimosBody.rotation.y += dt * 0.18;

      // Update shader uniforms
      marsMat.uniforms.uTime.value = planetTime;
      cloudTimeUniform.value = cloudTime;
      starMat.uniforms.uTime.value = starTime;
      markerMat.uniforms.uTime.value = markerTime;
      atmoPoints.position.copy(camera.position);
      atmoMat.uniforms.uTime.value = prefersReducedMotion ? 0 : nowSec * CONFIG.atmoSpeed * 8;
      bgMat.uniforms.iTime.value = prefersReducedMotion ? 0 : nowSec;

      if (nowSec - lastDatasetWriteSec > 0.15) {
        lastDatasetWriteSec = nowSec;
        canvas.dataset.scrollProgress = curP.toFixed(3);
        canvas.dataset.marsX = curX.toFixed(2);
      }

      if (composer && !isSoftwareGl) {
        composer.render();
      } else {
        renderer.render(scene, camera);
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
      // Ignore small mobile browser URL-bar height shifts (< 100px) when width is unchanged
      // so touch scrolling never stalls reallocating WebGL buffers mid-swipe
      if (nextW === lastW && nextW < 768 && Math.abs(nextH - lastH) < 100) {
        return;
      }
      lastW = nextW;
      lastH = nextH;

      camera.aspect = lastW / Math.max(lastH, 1);
      camera.updateProjectionMatrix();

      const pr = getTargetPixelRatio();
      renderer.setPixelRatio(pr);
      renderer.setSize(lastW, lastH, false);
      resVec.set(lastW * pr, lastH * pr);

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
