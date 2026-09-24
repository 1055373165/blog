/**
 * Derives the thumbnail URL from a cover image URL.
 *
 * Backend thumbnail URL pattern (from cover.go):
 *   Root:        /uploads/cover/{filename}             → /uploads/cover/thumbnails/{filename}.jpg
 *   Categorized: /uploads/cover/{category}/{filename}  → /uploads/cover/thumbnails/{category}__{filename}.jpg
 *   Dev prefix:  /api/upload/cover/...                 → /api/upload/cover/thumbnails/...
 *
 * Returns null if the URL is not a recognized cover image URL.
 */
export function getThumbnailUrl(coverImageUrl: string): string | null {
  if (!coverImageUrl) return null;

  // Match both production and dev cover URL patterns
  // Production: https://domain/uploads/cover/... or /uploads/cover/...
  // Dev:        http://localhost:PORT/api/upload/cover/...  or /api/upload/cover/...
  const patterns = [
    /^(.*\/uploads\/cover)\/(.*)/,
    /^(.*\/api\/upload\/cover)\/(.*)/,
  ];

  for (const pattern of patterns) {
    const match = coverImageUrl.match(pattern);
    if (!match) continue;

    const base = match[1]; // e.g. "https://domain/uploads/cover"
    const rest = match[2]; // e.g. "梵高/cover_123.jpg" or "cover_123.jpg"

    // Split into segments to detect category vs root
    const segments = rest.split('/').filter(Boolean);

    let thumbnailKey: string;
    if (segments.length === 1) {
      // Root-level: /uploads/cover/{filename}
      thumbnailKey = segments[0];
    } else if (segments.length === 2) {
      // Categorized: /uploads/cover/{category}/{filename}
      thumbnailKey = `${segments[0]}__${segments[1]}`;
    } else {
      return null;
    }

    return `${base}/thumbnails/${thumbnailKey}.jpg`;
  }

  return null;
}

/** Widths the backend generates for every cover (see cover.go coverVariantWidths). */
const COVER_VARIANT_WIDTHS = [400, 800, 1200] as const;

/**
 * Builds a srcset of the backend's resized cover variants.
 *   400w  → {thumb}.jpg          (the legacy thumbnail)
 *   800w  → {thumb}.w800.jpg
 *   1200w → {thumb}.w1200.jpg
 *
 * Returns null if the URL is not a recognized cover image URL.
 */
export function getCoverSrcSet(coverImageUrl: string): string | null {
  const thumbnail = getThumbnailUrl(coverImageUrl);
  if (!thumbnail) return null;

  const stem = thumbnail.replace(/\.jpg$/, '');
  return COVER_VARIANT_WIDTHS.map((w) =>
    w === 400 ? `${thumbnail} ${w}w` : `${stem}.w${w}.jpg ${w}w`
  ).join(', ');
}

/**
 * Preload images in parallel using Promise.allSettled.
 * Returns when all images have either loaded or failed.
 */
export function preloadImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return Promise.resolve();

  return Promise.allSettled(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = url;
        })
    )
  ).then(() => {});
}
