import React, { useId } from 'react';
import { Check, Palette } from 'lucide-react';
import {
  SUBJECT_COLOR_SWATCHES,
  getReadableOnAccentColor,
  normalizeHexColor,
} from '../../utils/colorPalette';

interface ColorSwatchPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  compact?: boolean;
}

export const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({
  value,
  onChange,
  label = 'Color Tag',
  compact = false,
}) => {
  const customInputId = useId();
  const normalizedValue = normalizeHexColor(value, '#10b981');
  const isPresetSelected = SUBJECT_COLOR_SWATCHES.some(
    (s) => normalizeHexColor(s.hex) === normalizedValue
  );

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-white/80">{label}</span>
          <span className="text-[11px] font-mono text-white/55 uppercase tabular-nums">
            {normalizedValue}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {SUBJECT_COLOR_SWATCHES.map((swatch) => {
          const isSelected = normalizeHexColor(swatch.hex) === normalizedValue;
          const checkColor = getReadableOnAccentColor(swatch.hex);

          return (
            <button
              key={swatch.id}
              type="button"
              onClick={() => onChange(swatch.hex)}
              aria-label={`Select ${swatch.name} color (${swatch.hex})`}
              aria-pressed={isSelected}
              title={swatch.name}
              className={`${
                compact ? 'w-6 h-6' : 'w-7 h-7'
              } rounded-lg border flex items-center justify-center transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-white ${
                isSelected
                  ? 'border-white scale-110 shadow-md'
                  : 'border-white/15 opacity-85 hover:opacity-100 hover:scale-105'
              }`}
              style={{ backgroundColor: swatch.hex }}
            >
              {isSelected && (
                <Check
                  className="w-3.5 h-3.5 stroke-[3]"
                  style={{ color: checkColor }}
                />
              )}
            </button>
          );
        })}

        {/* Custom Hex Color Picker */}
        <label
          htmlFor={customInputId}
          title="Pick any custom color"
          className={`inline-flex items-center gap-1.5 px-2.5 ${
            compact ? 'h-6' : 'h-7'
          } rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            !isPresetSelected
              ? 'border-white bg-white/[0.12] text-white'
              : 'border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.08] text-white/75 hover:text-white'
          }`}
        >
          <span
            className="w-3.5 h-3.5 rounded-sm border border-white/30 shrink-0"
            style={{ backgroundColor: normalizedValue }}
          />
          <Palette className="w-3 h-3 shrink-0" />
          <span>Custom</span>
          <input
            id={customInputId}
            type="color"
            aria-label="Pick custom hex color"
            value={normalizedValue}
            onChange={(e) => onChange(normalizeHexColor(e.target.value, normalizedValue))}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
};
