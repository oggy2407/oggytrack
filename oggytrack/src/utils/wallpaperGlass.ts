import { AppSettings } from '../types/oggytrack';

export const WALLPAPER_STORAGE_KEY = 'oggytrack_custom_wallpaper';

export type BackgroundMode = 'space' | 'photo';

export interface NormalizedGlassSettings {
  backgroundMode: BackgroundMode;
  applyPhotoToLanding: boolean;
  glassOpacity: number; // 16..82 (%)
  glassBlur: number; // 0..32 (px)
  photoDimmer: number; // 15..85 (%)
  photoBlur: number; // 0..24 (px)
}

export const DEFAULT_GLASS_SETTINGS: NormalizedGlassSettings = {
  backgroundMode: 'space',
  applyPhotoToLanding: false,
  glassOpacity: 38,
  glassBlur: 18,
  photoDimmer: 46,
  photoBlur: 0,
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

/**
 * Normalizes and clamps background wallpaper & glassmorphism settings.
 */
export function normalizeGlassSettings(
  settings?: Partial<AppSettings> | null
): NormalizedGlassSettings {
  const mode: BackgroundMode = settings?.backgroundMode === 'photo' ? 'photo' : 'space';
  return {
    backgroundMode: mode,
    applyPhotoToLanding: Boolean(settings?.applyPhotoToLanding),
    glassOpacity: clampNumber(
      settings?.glassOpacity,
      16,
      82,
      DEFAULT_GLASS_SETTINGS.glassOpacity
    ),
    glassBlur: clampNumber(
      settings?.glassBlur,
      0,
      32,
      DEFAULT_GLASS_SETTINGS.glassBlur
    ),
    photoDimmer: clampNumber(
      settings?.photoDimmer,
      15,
      85,
      DEFAULT_GLASS_SETTINGS.photoDimmer
    ),
    photoBlur: clampNumber(
      settings?.photoBlur,
      0,
      24,
      DEFAULT_GLASS_SETTINGS.photoBlur
    ),
  };
}

const SAFE_RASTER_DATA_URL_RE =
  /^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/i;

/**
 * Validates that a wallpaper string is a safe base64-encoded raster image data URL.
 * Rejects SVG (script injection surface), javascript: URLs, and external tracking URLs.
 */
export function isSafeImageDataUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 32 || trimmed.length > 4_500_000) return false;
  return SAFE_RASTER_DATA_URL_RE.test(trimmed);
}

/**
 * Computes aspect-ratio-preserving dimensions bounded within maxWidth x maxHeight.
 * Never upscales small images.
 */
export function computeScaledDimensions(
  width: number,
  height: number,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): { width: number; height: number } {
  const safeW = Math.max(1, Math.round(width || 1));
  const safeH = Math.max(1, Math.round(height || 1));
  const scale = Math.min(1, maxWidth / safeW, maxHeight / safeH);
  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
  };
}

export interface DerivedGlassVariables {
  activeBgMode: BackgroundMode;
  cssVars: Record<string, string>;
}

/**
 * Derives live CSS custom properties for glassy surfaces and custom photo backdrops.
 */
export function deriveGlassCssVariables(
  rawSettings: Partial<AppSettings> | null | undefined,
  hasCustomPhoto: boolean
): DerivedGlassVariables {
  const normalized = normalizeGlassSettings(rawSettings);
  const activeBgMode: BackgroundMode =
    normalized.backgroundMode === 'photo' && hasCustomPhoto ? 'photo' : 'space';

  const alphaStart = Number((normalized.glassOpacity / 100).toFixed(3));
  const alphaEnd = Number(Math.min(0.9, (normalized.glassOpacity + 11) / 100).toFixed(3));
  const panelAlpha = Number(Math.min(0.9, (normalized.glassOpacity + 6) / 100).toFixed(3));
  const borderAlpha = Number(
    Math.min(0.36, 0.14 + (82 - normalized.glassOpacity) * 0.002).toFixed(3)
  );
  const sheenAlpha = Number(
    Math.min(0.18, 0.06 + (82 - normalized.glassOpacity) * 0.0012).toFixed(3)
  );

  return {
    activeBgMode,
    cssVars: {
      '--oggy-glass-alpha': String(alphaStart),
      '--oggy-glass-alpha-end': String(alphaEnd),
      '--oggy-glass-panel-alpha': String(panelAlpha),
      '--oggy-glass-border-alpha': String(borderAlpha),
      '--oggy-glass-sheen-alpha': String(sheenAlpha),
      '--oggy-glass-blur': `${normalized.glassBlur}px`,
      '--oggy-photo-dimmer': String(Number((normalized.photoDimmer / 100).toFixed(3))),
      '--oggy-photo-blur': `${normalized.photoBlur}px`,
    },
  };
}

let cachedSoftwareGl: boolean | null = null;

function isSoftwareWebGlRenderer(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') {
    cachedSoftwareGl = false;
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '');
    cachedSoftwareGl = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = false;
    return false;
  }
}

/**
 * Applies glassmorphic CSS custom properties and data attributes to <html>.
 */
export function applyGlassAppearanceToRoot(
  docEl: HTMLElement,
  settings: Partial<AppSettings> | null | undefined,
  hasCustomPhoto: boolean
): void {
  const normalized = normalizeGlassSettings(settings);
  const { activeBgMode, cssVars } = deriveGlassCssVariables(normalized, hasCustomPhoto);

  Object.entries(cssVars).forEach(([prop, value]) => {
    docEl.style.setProperty(prop, value);
  });

  docEl.dataset.bgMode = activeBgMode;
  const enableBackdrop =
    normalized.glassBlur > 0 && (activeBgMode === 'photo' || !isSoftwareWebGlRenderer());
  docEl.dataset.glassBackdrop = enableBackdrop ? 'on' : 'off';
}

/**
 * Compresses an uploaded raster image file on the client via an offscreen <canvas>
 * so high-resolution photos fit comfortably inside browser localStorage without quota errors.
 */
export async function compressImageFileToDataUrl(file: File): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error('Selected photo file is empty.');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Photo exceeds the 20 MB limit. Please choose a smaller image.');
  }
  const mime = (file.type || '').toLowerCase();
  if (mime === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    throw new Error('Please choose a raster photo format (JPG, PNG, WebP, AVIF, or GIF).');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error('Could not decode this image file. Try a JPG, PNG, or WebP photo.'));
      element.src = objectUrl;
    });

    const renderPass = (maxW: number, maxH: number, quality: number): string => {
      const dims = computeScaledDimensions(
        img.naturalWidth || img.width || 1600,
        img.naturalHeight || img.height || 900,
        maxW,
        maxH
      );
      const canvas = document.createElement('canvas');
      canvas.width = dims.width;
      canvas.height = dims.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Browser canvas context is unavailable.');
      }
      ctx.drawImage(img, 0, 0, dims.width, dims.height);

      const webp = canvas.toDataURL('image/webp', quality);
      if (webp.startsWith('data:image/webp;base64,')) {
        return webp;
      }
      return canvas.toDataURL('image/jpeg', quality);
    };

    let result = renderPass(1920, 1080, 0.82);
    if (result.length > 1_600_000) {
      result = renderPass(1440, 900, 0.72);
    }
    if (result.length > 1_600_000) {
      result = renderPass(1280, 720, 0.62);
    }

    if (!isSafeImageDataUrl(result)) {
      throw new Error('Processed photo could not be encoded safely.');
    }
    return result;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
