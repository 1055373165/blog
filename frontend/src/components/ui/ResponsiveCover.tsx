import { useState } from 'react';
import { clsx } from 'clsx';
import { getCoverSrcSet, getThumbnailUrl } from '../../utils/imageUtils';

interface ResponsiveCoverProps {
  src: string;
  alt: string;
  /** Rendered width hint for the browser to pick a srcset candidate. */
  sizes: string;
  /** Above-the-fold image: load eagerly with high fetch priority. */
  priority?: boolean;
  width: number;
  height: number;
  className?: string;
}

/* 加载阶段：srcset 多尺寸 → 400w 缩略图 → 原图。
   多尺寸由后端后台补齐，个别尚未生成时逐级回退，保证不出现破图。 */
type Stage = 'srcset' | 'thumbnail' | 'original';

/**
 * Article cover that never downloads the multi-MB original when a resized
 * variant exists. Fades in once decoded over a neutral skeleton.
 */
export default function ResponsiveCover({
  src,
  alt,
  sizes,
  priority = false,
  width,
  height,
  className,
}: ResponsiveCoverProps) {
  const srcSet = getCoverSrcSet(src);
  const thumbnail = getThumbnailUrl(src);
  const [stage, setStage] = useState<Stage>(srcSet ? 'srcset' : 'original');
  const [loaded, setLoaded] = useState(false);

  const handleError = () => {
    if (stage === 'srcset') setStage(thumbnail ? 'thumbnail' : 'original');
    else if (stage === 'thumbnail') setStage('original');
  };

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" aria-hidden="true" />
      )}
      <img
        key={stage}
        src={stage === 'srcset' || stage === 'thumbnail' ? thumbnail! : src}
        srcSet={stage === 'srcset' ? srcSet! : undefined}
        sizes={stage === 'srcset' ? sizes : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={clsx(
          'absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-500 ease-out',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
      />
    </>
  );
}
