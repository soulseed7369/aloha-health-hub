import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropModalProps {
  /** Image source (object URL or remote URL) to crop. Null closes the modal. */
  src: string | null;
  /** Filename used when producing the cropped File. */
  fileName?: string;
  /** Called when the user saves the crop. Receives the cropped image as a File. */
  onSave: (cropped: File) => void | Promise<void>;
  /** Called when the user cancels or closes the modal. */
  onClose: () => void;
  /** Aspect ratio. Defaults to 1 (square). */
  aspect?: number;
}

/**
 * Load an image URL into an HTMLImageElement. Supports cross-origin images
 * (e.g. Supabase public URLs) so the canvas doesn't taint.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * Produce a cropped image File from the source URL and the pixel crop rect
 * returned by react-easy-crop.
 */
async function cropToFile(src: string, pixelCrop: Area, fileName: string): Promise<File> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(
    img,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height,
  );
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95),
  );
  if (!blob) throw new Error('Failed to produce cropped image');
  const safeName = fileName.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], safeName, { type: 'image/jpeg' });
}

export default function ImageCropModal({
  src,
  fileName = 'photo.jpg',
  onSave,
  onClose,
  aspect = 1,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixelCrop, setPixelCrop] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset crop state when a new image is opened
  useEffect(() => {
    if (src) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setPixelCrop(null);
    }
  }, [src]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setPixelCrop(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!src || !pixelCrop) return;
    setSaving(true);
    try {
      const file = await cropToFile(src, pixelCrop, fileName);
      await onSave(file);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!src} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust photo</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-72 bg-black rounded-md overflow-hidden">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-1 pt-2">
          <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.01}
            onValueChange={(v) => setZoom(v[0])}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Drag to reposition · scroll or use slider to zoom
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!pixelCrop || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
