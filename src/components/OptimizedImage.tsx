import { ImgHTMLAttributes } from "react";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
}

/**
 * OptimizedImage component for SEO and performance
 *
 * Features:
 * - Lazy loading by default (override with loading="eager")
 * - Async decoding to prevent blocking
 * - Width/height attributes to prevent CLS
 * - Automatic WebP transformation for Supabase Storage URLs
 * - Responsive sizing via sizes prop
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  sizes,
  className,
  ...props
}: OptimizedImageProps) {
  // Transform Supabase Storage URLs to use /render/image/ for on-the-fly transforms
  const optimizedSrc = optimizeSupabaseUrl(src, width, height);

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      sizes={sizes}
      className={className}
      {...props}
    />
  );
}

/**
 * Transform Supabase Storage URL to use render/image endpoint with WebP and quality params
 * Original: https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/PATH
 * Transformed: https://PROJECT.supabase.co/storage/v1/render/image/public/BUCKET/PATH?width=W&height=H&format=webp&quality=80
 */
function optimizeSupabaseUrl(
  url: string,
  width?: number,
  height?: number
): string {
  // Only transform Supabase Storage URLs
  if (!url || !url.includes("supabase.co/storage/v1")) {
    return url;
  }

  // Check if it's already using render/image
  if (url.includes("/render/image/")) {
    return url;
  }

  // Replace /object/public/ with /render/image/public/
  const optimized = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );

  // Build query params: always add format=webp&quality=80, plus dimensions if provided
  const params = new URLSearchParams();
  params.set("format", "webp");
  params.set("quality", "80");
  if (width) params.set("width", width.toString());
  if (height) params.set("height", height.toString());

  // Append params to URL, handling existing query strings
  const separator = optimized.includes("?") ? "&" : "?";
  return `${optimized}${separator}${params.toString()}`;
}
