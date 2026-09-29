"use client";

import React, { useState, useRef, useEffect } from "react";

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: string;
  onSave: (newImage: string) => void;
}

export default function ProfilePictureModal({
  isOpen,
  onClose,
  currentImage,
  onSave,
}: ProfilePictureModalProps) {
  const [imageSrc, setImageSrc] = useState(currentImage);
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewCanvasUrl, setPreviewCanvasUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setImageSrc(currentImage);
    setZoom(1);
    setPosX(0);
    setPosY(0);
  }, [currentImage, isOpen]);

  // Update real-time cropped preview using canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Circular clipping for preview
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Calculate source rect with zoom and offset
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawWidth = size * zoom;
    let drawHeight = (size / imgAspect) * zoom;
    if (imgAspect < 1) {
      drawHeight = size * zoom;
      drawWidth = size * imgAspect * zoom;
    }

    const drawX = (size - drawWidth) / 2 + (posX * size) / 100;
    const drawY = (size - drawHeight) / 2 + (posY * size) / 100;

    try {
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      const dataUrl = canvas.toDataURL("image/png");
      setPreviewCanvasUrl(dataUrl);
    } catch {
      // Cross-origin image fallback
      setPreviewCanvasUrl(null);
    }
    ctx.restore();
  }, [imageSrc, zoom, posX, posY, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setZoom(1);
          setPosX(0);
          setPosY(0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.7));

  // Drag interaction to position picture
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - posX, y: e.clientY - posY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = Math.max(Math.min(e.clientX - dragStart.x, 80), -80);
    const newY = Math.max(Math.min(e.clientY - dragStart.y, 80), -80);
    setPosX(newX);
    setPosY(newY);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - posX, y: e.touches[0].clientY - posY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const newX = Math.max(Math.min(e.touches[0].clientX - dragStart.x, 80), -80);
    const newY = Math.max(Math.min(e.touches[0].clientY - dragStart.y, 80), -80);
    setPosX(newX);
    setPosY(newY);
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleSave = () => {
    const finalUrl = previewCanvasUrl || imageSrc;
    onSave(finalUrl);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-pic-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#18181c] text-white border border-[var(--surface-border)] rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">crop</span>
            </div>
            <div>
              <h3 id="edit-pic-title" className="font-display text-base font-bold text-white">
                Adjust Profile Picture
              </h3>
              <p className="font-serif text-xs text-white/60">
                Crop, zoom, and reposition your scholar avatar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Hidden Canvas for Cropping */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Interactive Workspace */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center mb-6">
          {/* Left: Interactive Crop Box */}
          <div className="flex flex-col items-center">
            <span className="font-display text-[11px] uppercase tracking-wider text-[#d4af37] font-semibold mb-2">
              Crop &amp; Position Area
            </span>
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className="w-48 h-48 rounded-xl bg-black/60 border border-[#d4af37]/50 relative overflow-hidden flex items-center justify-center cursor-move select-none shadow-inner touch-none"
              title="Drag picture to reposition"
            >
              {/* Circular Target Overlay Guide */}
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-[#d4af37]/70 rounded-full m-2 z-10" />

              {/* The movable/scalable image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Profile Crop Target"
                crossOrigin="anonymous"
                className="max-w-none transition-transform pointer-events-none"
                style={{
                  transform: `translate(${posX}px, ${posY}px) scale(${zoom})`,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
            <span className="font-serif text-[11px] text-white/50 mt-1.5">
              Click &amp; drag inside box to reposition
            </span>
          </div>

          {/* Right: Preview & Controls */}
          <div className="flex flex-col items-center sm:items-start space-y-4">
            {/* Live Circular Preview */}
            <div className="flex items-center gap-3 w-full pb-3 border-b border-white/10">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#d4af37] shadow-sm relative shrink-0 bg-black/40">
                {previewCanvasUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewCanvasUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    style={{
                      transform: `scale(${zoom}) translate(${posX / 2}px, ${posY / 2}px)`,
                    }}
                  />
                )}
              </div>
              <div>
                <span className="font-display text-xs font-bold text-white block">
                  Avatar Preview
                </span>
                <span className="font-serif text-[11px] text-white/60">
                  Header &amp; Profile display size
                </span>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display text-[11px] uppercase tracking-wider text-white/70 font-semibold">
                  Zoom Level
                </span>
                <span className="font-mono text-xs text-[#d4af37] font-bold">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0.7"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[#d4af37] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  +
                </button>
              </div>
            </div>

            {/* Position Adjustment Sliders */}
            <div className="w-full space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] font-display uppercase tracking-wider text-white/70 font-semibold">
                <span>Horizontal (X)</span>
                <span className="font-mono text-[10px] text-white/50">{Math.round(posX)}px</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                value={posX}
                onChange={(e) => setPosX(parseInt(e.target.value))}
                className="w-full accent-[#d4af37] cursor-pointer"
              />

              <div className="flex items-center justify-between text-[11px] font-display uppercase tracking-wider text-white/70 font-semibold">
                <span>Vertical (Y)</span>
                <span className="font-mono text-[10px] text-white/50">{Math.round(posY)}px</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                value={posY}
                onChange={(e) => setPosY(parseInt(e.target.value))}
                className="w-full accent-[#d4af37] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 hover:border-[#d4af37] text-white/80 hover:text-white font-display text-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">upload</span>
              <span>Upload New Photo</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-white/20 text-white/80 hover:bg-white/10 font-display text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 rounded-full bg-[#d4af37] hover:bg-[#e9c349] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
