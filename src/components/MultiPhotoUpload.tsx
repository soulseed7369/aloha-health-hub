import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { optimizeImage } from '@/lib/imageOptimize';

export interface PhotoSlot {
  /** Public URL (already uploaded) */
  url: string;
  /** Local preview blob URL (not yet uploaded) */
  preview?: string;
  /** Raw file awaiting upload */
  file?: File;
}

interface MultiPhotoUploadProps {
  /** Existing photo URLs from the database */
  photos: string[];
  /** Index of the profile (avatar) photo */
  profileIndex: number;
  /** Max number of photos allowed */
  maxPhotos?: number;
  /** Called when photos or profileIndex changes */
  onChange: (photos: PhotoSlot[], profileIndex: number) => void;
  /** Whether upload is in progress */
  disabled?: boolean;
}

export default function MultiPhotoUpload({
  photos: initialPhotos,
  profileIndex: initialProfileIndex,
  maxPhotos = 3,
  onChange,
  disabled = false,
}: MultiPhotoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<PhotoSlot[]>([]);
  const [profileIdx, setProfileIdx] = useState(0);
  const [optimizing, setOptimizing] = useState(false);
  const initialized = useRef(false);
  // Track all preview blob URLs for proper cleanup on unmount
  const previewUrls = useRef<Set<string>>(new Set());

  // Initialize from props once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const filtered = initialPhotos.filter(Boolean);
    if (filtered.length > 0) {
      const initial = filtered.map(url => ({ url }));
      setSlots(initial);
      setProfileIdx(Math.min(initialProfileIndex, Math.max(initial.length - 1, 0)));
    }
    // For new practitioners with no photos, slots stays empty — they can add photos
  }, [initialPhotos, initialProfileIndex]);

  // Revoke all tracked preview blob URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.current.forEach(url => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    };
  }, []);

  const emitChange = useCallback((nextSlots: PhotoSlot[], nextIdx: number) => {
    onChange(nextSlots, nextIdx);
  }, [onChange]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remaining = maxPhotos - slots.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxPhotos} photos allowed.`);
      return;
    }
    const files = Array.from(fileList).slice(0, remaining);

    setOptimizing(true);
    try {
      const optimized: PhotoSlot[] = [];
      for (const f of files) {
        const opt = await optimizeImage(f);
        const preview = URL.createObjectURL(opt);
        previewUrls.current.add(preview); // track for cleanup
        optimized.push({
          url: '', // not uploaded yet
          preview,
          file: opt,
        });
      }
      const next = [...slots, ...optimized];
      setSlots(next);
      emitChange(next, profileIdx);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to process image.');
    } finally {
      setOptimizing(false);
      // Reset file input so re-selecting same file works
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const removed = slots[index];
    if (removed.preview) {
      URL.revokeObjectURL(removed.preview);
      previewUrls.current.delete(removed.preview);
    }
    const next = slots.filter((_, i) => i !== index);
    let nextIdx = profileIdx;
    if (index === profileIdx) nextIdx = 0;
    else if (index < profileIdx) nextIdx = profileIdx - 1;
    nextIdx = Math.min(nextIdx, Math.max(next.length - 1, 0));
    setSlots(next);
    setProfileIdx(nextIdx);
    emitChange(next, nextIdx);
  };

  const setAsProfile = (index: number) => {
    setProfileIdx(index);
    emitChange(slots, index);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {slots.map((slot, i) => {
          const src = slot.preview || slot.url;
          const isProfile = i === profileIdx;
          return (
            <div key={i} className="relative group">
              <img
                src={src}
                alt={`Photo ${i + 1}`}
                className={`w-24 h-24 rounded-lg object-cover border-2 transition-colors ${
                  isProfile ? 'border-teal-500 ring-2 ring-teal-500/30' : 'border-input'
                }`}
              />
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removePhoto(i)}
                disabled={disabled}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              {/* Profile star */}
              <button
                type="button"
                onClick={() => setAsProfile(i)}
                disabled={disabled}
                title={isProfile ? 'Profile photo' : 'Set as profile photo'}
                className={`absolute bottom-1 left-1 rounded-full w-6 h-6 flex items-center justify-center transition-all ${
                  isProfile
                    ? 'bg-teal-500 text-white'
                    : 'bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-teal-500 hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5" fill={isProfile ? 'currentColor' : 'none'} />
              </button>
              {/* Profile label */}
              {isProfile && (
                <span className="absolute -bottom-5 left-0 right-0 text-center text-[10px] font-medium text-teal-600">
                  Profile
                </span>
              )}
            </div>
          );
        })}

        {/* Add photo placeholder */}
        {slots.length < maxPhotos && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || optimizing}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-input bg-muted/50 flex flex-col items-center justify-center gap-1 hover:border-teal-400 hover:bg-teal-50 transition-colors disabled:opacity-50"
          >
            {optimizing ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="text-[10px] text-muted-foreground">
              {optimizing ? 'Optimizing…' : 'Add Photo'}
            </span>
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      <p className="text-xs text-muted-foreground">
        Up to {maxPhotos} photos · JPG, PNG, or WebP · Auto-optimized on upload · Star = profile photo
      </p>
    </div>
  );
}
