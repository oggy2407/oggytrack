import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eraser, Pencil, X } from 'lucide-react';

interface NotebookScribblePadProps {
  scribbleDataUrl: string | null;
  photoDataUrl: string | null;
  onChangeScribble: (dataUrl: string | null) => void;
  onChangePhoto: (dataUrl: string | null) => void;
}

const INK_SWATCHES = [
  { id: 'blue', label: 'Blue ink', hex: '#2a2f55', bgClass: 'bg-[#2a2f55]' },
  { id: 'red', label: 'Red ink', hex: '#d4504c', bgClass: 'bg-[#d4504c]' },
  { id: 'green', label: 'Green ink', hex: '#2e9e5b', bgClass: 'bg-[#2e9e5b]' },
  { id: 'chalk', label: 'Chalk', hex: '#f2efe4', bgClass: 'bg-[#f2efe4]' },
] as const;

export const NotebookScribblePad: React.FC<NotebookScribblePadProps> = ({
  scribbleDataUrl,
  photoDataUrl,
  onChangeScribble,
  onChangePhoto,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDrawingRef = useRef(false);

  const [drawActive, setDrawActive] = useState(false);
  const [inkHex, setInkHex] = useState<string>(INK_SWATCHES[0].hex);
  const [eraseMode, setEraseMode] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!scribbleDataUrl) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = scribbleDataUrl;
  }, [scribbleDataUrl]);

  const getPointerCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0] as const;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width) / Math.max(1, rect.width);
    const y = ((e.clientY - rect.top) * canvas.height) / Math.max(1, rect.height);
    return [x, y] as const;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    isDrawingRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    const [x, y] = getPointerCoords(e);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = eraseMode ? 'destination-out' : 'source-over';
    ctx.strokeStyle = inkHex;
    ctx.lineWidth = eraseMode ? 18 : 3.2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y);
    ctx.stroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const [x, y] = getPointerCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finishStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChangeScribble(canvas.toDataURL('image/png'));
  };

  const handleClearScribble = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChangeScribble(null);
  };

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 640 / Math.max(img.width, img.height));
        const offscreen = document.createElement('canvas');
        offscreen.width = Math.max(1, Math.round(img.width * scale));
        offscreen.height = Math.max(1, Math.round(img.height * scale));
        const octx = offscreen.getContext('2d');
        if (octx) {
          octx.drawImage(img, 0, 0, offscreen.width, offscreen.height);
          onChangePhoto(offscreen.toDataURL('image/jpeg', 0.82));
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const showHint = !photoDataUrl && !scribbleDataUrl;

  return (
    <div className="w-full sm:w-[270px] shrink-0">
      <div className="relative h-36 rounded-lg border-2 border-dashed border-current/55 bg-black/[0.03] overflow-hidden -rotate-1">
        {photoDataUrl && (
          <img
            src={photoDataUrl}
            alt="Pinned notebook snapshot"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}

        <canvas
          ref={canvasRef}
          width={480}
          height={256}
          aria-label="Scribble pad"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          className={`relative z-10 w-full h-full ${
            drawActive ? 'cursor-crosshair touch-none' : 'pointer-events-none'
          }`}
        />

        {showHint && (
          <p className="nb-hand pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-lg opacity-70">
            Add a photo or scribble here
          </p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="nb-btn inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 shrink-0" />
          <span>Photo</span>
        </button>

        {photoDataUrl && (
          <button
            type="button"
            onClick={() => onChangePhoto(null)}
            aria-label="Remove pinned photo"
            className="nb-btn inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            <span>Photo</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setDrawActive((prev) => !prev)}
          aria-pressed={drawActive}
          className={`${
            drawActive ? 'nb-btn-primary' : 'nb-btn'
          } inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer`}
        >
          <Pencil className="w-3.5 h-3.5 shrink-0" />
          <span>Scribble</span>
        </button>

        <button
          type="button"
          onClick={handleClearScribble}
          className="nb-btn rounded-lg px-2.5 py-1 text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
        >
          Clear
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelected}
          aria-label="Upload notebook photo"
          className="hidden"
        />
      </div>

      {drawActive && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 animate-fade-in">
          {INK_SWATCHES.map((swatch) => {
            const selected = !eraseMode && inkHex === swatch.hex;
            return (
              <button
                key={swatch.id}
                type="button"
                aria-label={swatch.label}
                aria-pressed={selected}
                title={swatch.label}
                onClick={() => {
                  setInkHex(swatch.hex);
                  setEraseMode(false);
                }}
                className={`w-6 h-6 rounded-md border-2 transition-transform cursor-pointer shrink-0 ${
                  swatch.bgClass
                } ${selected ? 'scale-110 border-current' : 'border-black/30 opacity-85 hover:opacity-100'}`}
              />
            );
          })}

          <button
            type="button"
            onClick={() => setEraseMode((prev) => !prev)}
            aria-pressed={eraseMode}
            className={`${
              eraseMode ? 'nb-btn-primary' : 'nb-btn'
            } inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer`}
          >
            <Eraser className="w-3.5 h-3.5 shrink-0" />
            <span>Erase</span>
          </button>
        </div>
      )}
    </div>
  );
};
