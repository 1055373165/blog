import { useCallback, useEffect, useRef, useState } from 'react';
import type { OutlineItem } from './useActiveHeading';

/* ──────────────────────────────────────────────────────────
   useResumeReading
   Remembers the last heading the reader reached in a long
   article so the next visit can offer to jump back to it.
   ────────────────────────────────────────────────────────── */

const STORAGE_PREFIX = 'reading-position:';
/* Only start recording once the reader has actually scrolled into the article */
const TRACK_AFTER_SCROLL_PX = 400;
const SAVE_DEBOUNCE_MS = 1_000;

export interface SavedPosition {
  id: string;
  text: string;
  at: number;
}

function readPosition(key: string): SavedPosition | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as SavedPosition) : null;
  } catch {
    return null;
  }
}

function writePosition(key: string, pos: SavedPosition) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(pos));
  } catch {
    // storage unavailable — position just isn't remembered
  }
}

/**
 * Returns a callback to feed the active heading id into, and renders
 * the "continue reading" prompt when a saved position exists.
 */
export function useResumeReading(articleKey: string | undefined, outline: OutlineItem[] | undefined) {
  const [saved, setSaved] = useState<SavedPosition | null>(null);
  const tracking = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    tracking.current = false;
    if (!articleKey || !outline || outline.length === 0) {
      setSaved(null);
      return;
    }
    const pos = readPosition(articleKey);
    // 只在确实读到了第一个标题之后才提示
    const index = pos ? outline.findIndex((h) => h.id === pos.id) : -1;
    setSaved(index > 0 ? pos : null);

    const onScroll = () => {
      if (window.scrollY > TRACK_AFTER_SCROLL_PX) {
        tracking.current = true;
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer.current);
    };
  }, [articleKey, outline]);

  const onActiveHeading = useCallback(
    (id: string) => {
      if (!articleKey || !tracking.current) return;
      const heading = outline?.find((h) => h.id === id);
      if (!heading) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => writePosition(articleKey, { id, text: heading.text, at: Date.now() }),
        SAVE_DEBOUNCE_MS
      );
    },
    [articleKey, outline]
  );

  const dismiss = useCallback(() => setSaved(null), []);

  return { saved, dismiss, onActiveHeading };
}
