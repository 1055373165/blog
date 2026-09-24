import { useEffect, useState } from 'react';

export interface OutlineItem {
  id: string;
  text: string;
  level: number;
}

/* A heading counts as "current" once it is within this distance of the viewport top */
const ACTIVE_OFFSET_PX = 100;
/* Coalesce DOM mutations (progressive rendering, <details> toggles) before rebinding */
const REBIND_DELAY_MS = 200;

/**
 * Tracks which outline heading the reader is in. Headings of a long
 * article appear progressively, so the observer binds to whichever
 * heading elements exist and re-binds (debounced) as more are rendered.
 */
export function useActiveHeading(items: OutlineItem[], contentSelector: string): string {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (items.length === 0) return;
    const visible = new Map<string, number>();
    const observed = new Set<string>();

    const pickFromLayout = () => {
      // 无可见标题时（位于两个标题之间的长段落），取视口上方最近的一个
      let current = '';
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= ACTIVE_OFFSET_PX) current = item.id;
        else break;
      }
      if (current) setActiveId(current);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
          else visible.delete(id);
        }
        if (visible.size > 0) {
          let top = '';
          let topY = Infinity;
          visible.forEach((y, id) => {
            if (y < topY) {
              topY = y;
              top = id;
            }
          });
          setActiveId(top);
        } else {
          pickFromLayout();
        }
      },
      { rootMargin: `-${ACTIVE_OFFSET_PX}px 0px -66%`, threshold: 0 }
    );

    const bind = () => {
      for (const item of items) {
        if (observed.has(item.id)) continue;
        const el = document.getElementById(item.id);
        if (el) {
          observer.observe(el);
          observed.add(item.id);
        }
      }
    };
    bind();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const container = document.querySelector(contentSelector);
    const mutations = new MutationObserver(() => {
      if (observed.size === items.length) return;
      clearTimeout(timer);
      timer = setTimeout(bind, REBIND_DELAY_MS);
    });
    if (container) mutations.observe(container, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      mutations.disconnect();
      observer.disconnect();
    };
  }, [items, contentSelector]);

  return activeId;
}
