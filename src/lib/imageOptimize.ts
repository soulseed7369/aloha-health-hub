/**
 * Client-side image optimization: resize + convert to WebP before upload.
 * Uses the Canvas API — no external dependencies.
 */

/** Max dimension (width or height) for uploaded photos. */
const MAX_DIMENSION = 1200;

/** WebP quality (0–1). 0.82 ≈ JPEG 85% quality at ~30% smaller file size. */
const WEBP_QUALITY = 0.82;

/** Maximum file size in bytes (5 MB). */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Optimize an image file: resize to MAX_DIMENSION, convert to WebP.
 * Returns a new File object ready for upload.
 *
 * Falls back to the original file if Canvas or WebP encoding isn't available
 * (extremely unlikely in any modern browser).
 */
export async function optimizeImage(file: File): Promise<File> {
  // Validate input
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size must be less than 5 MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`
    );
  }

  // Already a small WebP? Skip processing.
  if (file.type === 'image/webp' && file.size < 200_000) return file;

  // GIFs lose animation when drawn to canvas — return as-is.
  if (file.type === 'image/gif') return file;

  return new Promise<File>((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl); // prevent memory leak
      try {
        // First: crop to a centered 1:1 square
        let { width, height } = img;
        const squareSize = Math.min(width, height);
        const offsetX = (width - squareSize) / 2;
        const offsetY = (height - squareSize) / 2;

        // Then: resize the square to MAX_DIMENSION if needed
        let finalSize = squareSize;
        if (finalSize > MAX_DIMENSION) {
          finalSize = MAX_DIMENSION;
        }

        const canvas = document.createElement('canvas');
        canvas.width = finalSize;
        canvas.height = finalSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(blobUrl); resolve(file); return; } // fallback

        // Draw the centered square crop from the original image, scaled to finalSize
        ctx.drawImage(img, offsetX, offsetY, squareSize, squareSize, 0, 0, finalSize, finalSize);

        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            // Build a new File with .webp extension
            const baseName = file.name.replace(/\.[^.]+$/, '');
            const optimized = new File([blob], `${baseName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(optimized);
          },
          'image/webp',
          WEBP_QUALITY,
        );
      } catch {
        resolve(file); // fallback on any canvas error
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load image for optimization.'));
    };
    img.src = blobUrl;
  });
}

/**
 * Optimize multiple image files in parallel.
 */
export async function optimizeImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(optimizeImage));
}
