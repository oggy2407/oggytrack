import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const boxSizeClass =
    size === 'sm'
      ? 'w-8 h-8 rounded-lg'
      : size === 'lg'
        ? 'w-10 h-10 rounded-xl'
        : 'w-9 h-9 rounded-xl';

  const svgSizeClass =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-[19px] h-[19px]';

  const textSizeClass =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';

  return (
    <span className={`inline-flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      <span
        className={`${boxSizeClass} relative bg-accent-500 text-accent-ink ring-1 ring-inset ring-white/25 shadow-md shadow-black/30 inline-flex items-center justify-center shrink-0`}
        aria-hidden="true"
      >
        <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/18 to-transparent pointer-events-none" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${svgSizeClass} relative z-10 shrink-0`}
        >
          {/* Mortarboard crown */}
          <path d="M2.5 9.5L12 4.75L21.5 9.5L12 14.25L2.5 9.5Z" />
          {/* Tassel */}
          <path d="M21.5 9.5V14.5" />
          {/* Academic progress / upward track base */}
          <path d="M6.5 12V16.25C6.5 17.9 9 19.25 12 19.25C15 19.25 17.5 17.9 17.5 16.25V12" />
        </svg>
      </span>

      {showText && (
        <span
          className={`font-bold ${textSizeClass} tracking-tight leading-snug whitespace-nowrap shrink-0`}
        >
          <span className="text-white">oggy</span>
          <span className="text-accent-400">track</span>
        </span>
      )}
    </span>
  );
};
