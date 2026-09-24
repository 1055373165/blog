/* ──────────────────────────────────────────────────────────
   articleNavigation
   Long articles render progressively, so a heading may not be
   in the DOM yet when the TOC (or a "continue reading" prompt)
   wants to jump to it. scrollToHeading scrolls directly when the
   heading exists and otherwise asks the renderer to reveal it;
   the renderer renders that chunk and then scrolls.
   ────────────────────────────────────────────────────────── */

export const REVEAL_HEADING_EVENT = 'article:reveal-heading';

/* Beyond this distance smooth scrolling just animates through content nobody reads */
const SMOOTH_SCROLL_MAX_PX = 2 * 900;
/* After a long jump, keep the target in place while nearby content settles */
const PIN_DURATION_MS = 2_000;
const PIN_TOLERANCE_PX = 2;
const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/* A reveal requested before the renderer has mounted (it is lazy-loaded) */
let pendingReveal: string | null = null;

export function takePendingReveal(): string | null {
  const id = pendingReveal;
  pendingReveal = null;
  return id;
}

let cancelPin: (() => void) | null = null;

/**
 * Holds `el` at its scroll-margin offset for a short time. Images and code
 * blocks around the target keep loading after a long jump and would push it
 * away; any user scroll input ends the pin immediately.
 */
function pinElement(el: HTMLElement) {
  cancelPin?.();
  const desiredTop = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const deadline = performance.now() + PIN_DURATION_MS;
  let raf = 0;

  const stop = () => {
    cancelAnimationFrame(raf);
    USER_SCROLL_EVENTS.forEach((type) => window.removeEventListener(type, stop, true));
    if (cancelPin === stop) cancelPin = null;
  };
  const tick = () => {
    if (!el.isConnected || performance.now() > deadline) return stop();
    const drift = el.getBoundingClientRect().top - desiredTop;
    if (Math.abs(drift) > PIN_TOLERANCE_PX) window.scrollBy({ top: drift, behavior: 'instant' });
    raf = requestAnimationFrame(tick);
  };

  USER_SCROLL_EVENTS.forEach((type) => window.addEventListener(type, stop, { capture: true, passive: true }));
  cancelPin = stop;
  raf = requestAnimationFrame(tick);
}

/**
 * Scrolls a heading to the top. Long jumps (and `instant`, used for initial
 * positioning such as #hash or revealing an unrendered chunk) are instant and
 * then pinned while surrounding content settles; short hops scroll smoothly.
 */
export function scrollElementIntoView(el: HTMLElement, { instant = false } = {}) {
  cancelPin?.(); // 新的跳转优先于上一次跳转的固定
  const far = instant || Math.abs(el.getBoundingClientRect().top) > SMOOTH_SCROLL_MAX_PX;
  el.scrollIntoView({
    block: 'start',
    // 'instant' 而不是 'auto'：<html> 上有 scroll-behavior: smooth，'auto' 仍会平滑滚动，
    // 长距离动画期间上方内容仍在渲染、目标位置会漂移
    behavior: far ? 'instant' : 'smooth',
  });
  if (far) pinElement(el);
}

export function scrollToHeading(id: string, options: { instant?: boolean } = {}) {
  const el = document.getElementById(id);
  if (el) {
    scrollElementIntoView(el, options);
    return;
  }
  pendingReveal = id;
  window.dispatchEvent(new CustomEvent(REVEAL_HEADING_EVENT));
}
