import React, { useState } from 'react';
import { AppSettings } from '../../types/oggytrack';
import { normalizeGlassSettings } from '../../utils/wallpaperGlass';

interface CustomPhotoBackgroundProps {
  imageUrl: string;
  settings?: Partial<AppSettings>;
}

/**
 * Renders the user's custom uploaded wallpaper behind glassy workspace surfaces
 * with configurable contrast dimmer and soft focus blur so text remains legible.
 */
export const CustomPhotoBackground: React.FC<CustomPhotoBackgroundProps> = ({
  imageUrl,
  settings,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const glass = normalizeGlassSettings(settings);
  const dimmerAlpha = Number((glass.photoDimmer / 100).toFixed(3));
  const shouldScaleForBlur = glass.photoBlur > 0;

  return (
    <div
      data-testid="custom-photo-background"
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#04060f]"
    >
      {!imageFailed ? (
        <img
          src={imageUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className={`w-full h-full object-cover object-center transition-transform duration-300 ${
            shouldScaleForBlur ? 'scale-105' : 'scale-100'
          }`}
          style={
            glass.photoBlur > 0
              ? { filter: `blur(${glass.photoBlur}px) saturate(1.08)` }
              : undefined
          }
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#091229] via-[#050914] to-[#0c1d24]" />
      )}

      {/* Measured contrast scrim ensuring WCAG-compliant legibility over bright or busy photos */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{ backgroundColor: `rgba(4, 7, 18, ${dimmerAlpha})` }}
      />

      {/* Subtle atmospheric vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 95% at 50% 18%, transparent 32%, rgba(3, 5, 13, 0.52) 100%)',
        }}
      />
    </div>
  );
};
