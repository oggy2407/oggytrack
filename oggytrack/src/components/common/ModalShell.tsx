import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
}

/**
 * Viewport-level accessible modal rendered via React Portal into document.body
 * so parent containers, overflow scrollbars, or CSS transforms can never clip
 * or misalign modal headers, labels, or form fields.
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  title,
  subtitle,
  onClose,
  maxWidthClass = 'max-w-lg',
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="min-h-full flex items-center justify-center p-4 sm:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className={`w-full ${maxWidthClass} bg-slate-900 border border-white/15 rounded-2xl shadow-2xl text-slate-100 overflow-hidden animate-fade-in`}
        >
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-white/10 bg-slate-900/95">
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-white leading-snug">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
