import { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ImageCropModalProps {
  /** The file to crop */
  file: File | null;
  /** Called with the cropped File, or null if cancelled */
  onConfirm: (croppedFile: File | null) => void;
  /** True if processing in progress */
  isOpen: boolean;
}

export default function ImageCropModal({ file, onConfirm, isOpen }: ImageCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Image state
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageNaturalWidth, setImageNaturalWidth] = useState(0);
  const [imageNaturalHeight, setImageNaturalHeight] = useState(0);

  // Pan and zoom state
  const [scale, setScale] = useState(1); // zoom level
  const [offsetX, setOffsetX] = useState(0); // pan x
  const [offsetY, setOffsetY] = useState(0); // pan y

  // Interaction state
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState(0);
  const [panStartY, setPanStartY] = useState(0);
  const [panStartOffsetX, setPanStartOffsetX] = useState(0);
  const [panStartOffsetY, setPanStartOffsetY] = useState(0);
  const [isCropping, setIsCropping] = useState(false);

  // Touch state for pinch zoom
  const [touchDistance, setTouchDistance] = useState(0);
  const [touchStartScale, setTouchStartScale] = useState(1);

  const CONTAINER_SIZE = 400; // px on desktop

  // Load image when file changes
  useEffect(() => {
    if (!file) {
      setImageSrc('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setImageSrc(e.target.result);
      }
    };
    reader.readAsDataURL(file);

    return () => {
      reader.abort();
    };
  }, [file]);

  // When image loads, reset pan/zoom
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageNaturalWidth(imageRef.current.naturalWidth);
      setImageNaturalHeight(imageRef.current.naturalHeight);
      setScale(1);
      setOffsetX(0);
      setOffsetY(0);
    }
  }, []);

  // Clamp pan so image always fills the crop area
  const clampOffset = useCallback(
    (x: number, y: number, zoomScale: number) => {
      const scaledWidth = imageNaturalWidth * zoomScale;
      const scaledHeight = imageNaturalHeight * zoomScale;

      // Max pan is when the scaled image edge aligns with container edge
      const maxX = Math.max(0, (scaledWidth - CONTAINER_SIZE) / 2);
      const maxY = Math.max(0, (scaledHeight - CONTAINER_SIZE) / 2);

      return {
        x: Math.max(-maxX, Math.min(x, maxX)),
        y: Math.max(-maxY, Math.min(y, maxY)),
      };
    },
    [imageNaturalWidth, imageNaturalHeight]
  );

  // Mouse pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStartX(e.clientX);
    setPanStartY(e.clientY);
    setPanStartOffsetX(offsetX);
    setPanStartOffsetY(offsetY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    const newX = panStartOffsetX + dx;
    const newY = panStartOffsetY + dy;
    const clamped = clampOffset(newX, newY, scale);
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Scroll to zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1; // scroll down = zoom out
    const newScale = Math.max(1, Math.min(scale * delta, 3));
    setScale(newScale);
    const clamped = clampOffset(offsetX, offsetY, newScale);
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  };

  // Touch pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single finger pan
      setIsPanning(true);
      setPanStartX(e.touches[0].clientX);
      setPanStartY(e.touches[0].clientY);
      setPanStartOffsetX(offsetX);
      setPanStartOffsetY(offsetY);
    } else if (e.touches.length === 2) {
      // Two finger pinch zoom
      setIsPanning(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setTouchDistance(Math.sqrt(dx * dx + dy * dy));
      setTouchStartScale(scale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const dx = e.touches[0].clientX - panStartX;
      const dy = e.touches[0].clientY - panStartY;
      const newX = panStartOffsetX + dx;
      const newY = panStartOffsetY + dy;
      const clamped = clampOffset(newX, newY, scale);
      setOffsetX(clamped.x);
      setOffsetY(clamped.y);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);
      if (touchDistance > 0) {
        const ratio = newDistance / touchDistance;
        const newScale = Math.max(1, Math.min(touchStartScale * ratio, 3));
        setScale(newScale);
        const clamped = clampOffset(offsetX, offsetY, newScale);
        setOffsetX(clamped.x);
        setOffsetY(clamped.y);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  // Crop to canvas
  const handleCrop = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current || !file) return;

    setIsCropping(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      // Canvas size = crop size (square)
      canvas.width = CONTAINER_SIZE;
      canvas.height = CONTAINER_SIZE;

      // Scaled image dimensions
      const scaledWidth = imageNaturalWidth * scale;
      const scaledHeight = imageNaturalHeight * scale;

      // Source rect in the scaled image space
      const srcX = -offsetX + (scaledWidth - CONTAINER_SIZE) / 2;
      const srcY = -offsetY + (scaledHeight - CONTAINER_SIZE) / 2;

      // Draw the cropped region
      ctx.drawImage(
        imageRef.current,
        srcX / scale,
        srcY / scale,
        CONTAINER_SIZE / scale,
        CONTAINER_SIZE / scale,
        0,
        0,
        CONTAINER_SIZE,
        CONTAINER_SIZE
      );

      // Export as WebP blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', 0.82);
      });

      if (!blob) throw new Error('Failed to create blob');

      // Create File
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const croppedFile = new File([blob], `${baseName}-cropped.webp`, {
        type: 'image/webp',
        lastModified: Date.now(),
      });

      onConfirm(croppedFile);
    } catch (err) {
      console.error('Crop error:', err);
      onConfirm(null);
    } finally {
      setIsCropping(false);
    }
  }, [imageNaturalWidth, imageNaturalHeight, scale, offsetX, offsetY, file, onConfirm]);

  const handleCancel = () => {
    onConfirm(null);
  };

  // Responsive container size
  const [containerSize, setContainerSize] = useState(CONTAINER_SIZE);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerSize(Math.min(width, CONTAINER_SIZE));
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Crop container with overlay */}
          <div
            ref={containerRef}
            className="relative bg-black"
            style={{
              width: '100%',
              maxWidth: containerSize,
              aspectRatio: '1',
              cursor: isPanning ? 'grabbing' : 'grab',
              overflow: 'hidden',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Image */}
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale})`,
                  transformOrigin: '0 0',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            )}

            {/* Semi-transparent overlay outside crop area */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                boxShadow: 'inset 0 0 0 9999px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Instructions */}
          <p className="text-xs text-muted-foreground text-center">
            Drag to pan · Scroll to zoom · Frame your shot in the square
          </p>

          {/* Canvas for processing (hidden) */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isCropping}>
              Cancel
            </Button>
            <Button onClick={handleCrop} disabled={isCropping} className="flex-1">
              {isCropping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Crop & Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
