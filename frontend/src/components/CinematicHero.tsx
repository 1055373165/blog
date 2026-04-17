import { useEffect, useRef, useCallback, useState } from 'react';
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext';
import type { PreparedTextWithSegments, LayoutCursor } from '@chenglou/pretext';
import { poems } from '../constants/poems';

/* ──────────────────────────────────────────────────────────
   CinematicHero
   Two-part hero: editorial text with pretext.js dynamic
   layout on top, cinematic video with soft mask below.
   ────────────────────────────────────────────────────────── */

/* ─── Pretext layout constants ──────────────────────────── */
const BODY_FONT = '16px "Noto Serif SC", "Songti SC", "SimSun", serif';
const LINE_HEIGHT = 36;
const GUTTER = 16;
const COL_MAX_W = 600;
const MIN_SLOT_W = 30;
const ORB_R = 26;
const VIDEO_FADE = 0.5;

/* Chinese numerals for counter */
const CN_NUM = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾'];

/* Module-level orb position persisted across poem switches (content-space coords) */
let persistedOrb: { x: number; y: number } | null = null;

/* ─── Geometry: carve text around a circle ──────────────── */
type Iv = { left: number; right: number };

function carveSlots(base: Iv, blocked: Iv[]): Iv[] {
  let slots = [base];
  for (const iv of blocked) {
    const next: Iv[] = [];
    for (const s of slots) {
      if (iv.right <= s.left || iv.left >= s.right) { next.push(s); continue; }
      if (iv.left > s.left) next.push({ left: s.left, right: iv.left });
      if (iv.right < s.right) next.push({ left: iv.right, right: s.right });
    }
    slots = next;
  }
  return slots.filter((s) => s.right - s.left >= MIN_SLOT_W);
}

function circleIv(cx: number, cy: number, r: number, top: number, bot: number, pad: number): Iv | null {
  const t = top - pad, b = bot + pad;
  if (t >= cy + r || b <= cy - r) return null;
  const minDy = cy >= t && cy <= b ? 0 : cy < t ? t - cy : cy - b;
  if (minDy >= r) return null;
  const dx = Math.sqrt(r * r - minDy * minDy);
  return { left: cx - dx - pad, right: cx + dx + pad };
}

type LineInfo = { x: number; y: number; text: string };

function layoutLines(
  prepared: PreparedTextWithSegments,
  rx: number, ry: number, rw: number, rh: number,
  cx: number, cy: number, r: number, active: boolean,
): LineInfo[] {
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = ry;
  const lines: LineInfo[] = [];
  while (y + LINE_HEIGHT <= ry + rh) {
    const blocked: Iv[] = [];
    if (active) {
      const iv = circleIv(cx, cy, r, y, y + LINE_HEIGHT, 10);
      if (iv) blocked.push(iv);
    }
    const slots = carveSlots({ left: rx, right: rx + rw }, blocked);
    if (slots.length === 0) { y += LINE_HEIGHT; continue; }
    slots.sort((a, b) => a.left - b.left);
    let advanced = false;
    for (const slot of slots) {
      const line = layoutNextLine(prepared, cursor, slot.right - slot.left);
      if (!line) break;
      lines.push({ x: Math.round(slot.left), y: Math.round(y), text: line.text });
      cursor = line.end;
      advanced = true;
    }
    if (!advanced) break;
    y += LINE_HEIGHT;
  }
  return lines;
}

/* ─── DOM pool for text lines ───────────────────────────── */
function syncPool(pool: HTMLDivElement[], n: number, parent: HTMLElement) {
  while (pool.length < n) {
    const el = document.createElement('div');
    el.style.cssText =
      `position:absolute;white-space:pre;pointer-events:none;` +
      `font:${BODY_FONT};line-height:${LINE_HEIGHT}px;color:inherit;` +
      `letter-spacing:0.08em;font-feature-settings:"palt";`;
    parent.appendChild(el);
    pool.push(el);
  }
  for (let i = 0; i < pool.length; i++) pool[i].style.display = i < n ? '' : 'none';
}

/* ─── Transition timing ────────────────────────────────── */
const FADE_OUT = 200;
const BREATHE = 100;
const FADE_IN = 300;

/* ─── Component ─────────────────────────────────────────── */
export default function CinematicHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [textOpacity, setTextOpacity] = useState(1);
  const switchingRef = useRef(false);
  const poem = poems[currentIndex];

  /* ── Video fade-loop ────────────────────────────────── */
  const tick = useCallback(() => {
    const v = videoRef.current;
    if (!v || v.paused) { rafRef.current = requestAnimationFrame(tick); return; }
    const { currentTime, duration } = v;
    if (duration && Number.isFinite(duration)) {
      if (currentTime < VIDEO_FADE) v.style.opacity = String(Math.min(currentTime / VIDEO_FADE, 1));
      else if (currentTime > duration - VIDEO_FADE) v.style.opacity = String(Math.max((duration - currentTime) / VIDEO_FADE, 0));
      else v.style.opacity = '1';
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.style.opacity = '0';
    const handleEnded = () => {
      v.style.opacity = '0';
      setTimeout(() => { v.currentTime = 0; v.play().catch(() => {}); }, 100);
    };
    v.addEventListener('ended', handleEnded);
    rafRef.current = requestAnimationFrame(tick);
    return () => { v.removeEventListener('ended', handleEnded); cancelAnimationFrame(rafRef.current); };
  }, [tick]);

  /* ── Switch poem with fade transition ──────────────── */
  const switchTo = useCallback((idx: number) => {
    if (idx === currentIndex || switchingRef.current) return;
    switchingRef.current = true;
    setTextOpacity(0);
    setTimeout(() => {
      setCurrentIndex(idx);
      if (stageRef.current) stageRef.current.scrollTop = 0;
      setTimeout(() => {
        setTextOpacity(1);
        switchingRef.current = false;
      }, BREATHE);
    }, FADE_OUT);
  }, [currentIndex]);

  /* ── Pretext interactive layout (re-inits on poem change) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;
    let animId = 0;

    /* orb element — draggable moon */
    const orbEl = document.createElement('div');
    orbEl.style.cssText =
      `position:absolute;border-radius:50%;z-index:10;will-change:transform;touch-action:none;user-select:none;` +
      `background:radial-gradient(circle at 40% 40%,rgba(180,160,100,0.38),rgba(180,160,100,0.12) 55%,transparent 72%);` +
      `box-shadow:0 0 30px 8px rgba(180,160,100,0.18);` +
      `width:${ORB_R * 2}px;height:${ORB_R * 2}px;cursor:grab;`;
    orbEl.setAttribute('aria-label', '拖拽明月');
    orbEl.setAttribute('role', 'slider');
    stage.appendChild(orbEl);

    /* spacer to drive scrollHeight for overflow-y:auto */
    const spacer = document.createElement('div');
    spacer.style.cssText = 'pointer-events:none;width:1px;';
    stage.appendChild(spacer);

    /* Orb position in content-space; seeded from persisted (across switches)
       or default to top-right-ish resting spot */
    const stageW = stage.clientWidth;
    const defaultOrb = { x: Math.max(ORB_R + 8, stageW - ORB_R - 24), y: ORB_R + 20 };
    const orb = persistedOrb ? { ...persistedOrb } : defaultOrb;
    persistedOrb = { ...orb };
    const linePool: HTMLDivElement[] = [];

    /* ── Drag handlers ────────────────────────────────── */
    let dragging = false;
    let dragDx = 0;
    let dragDy = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      const rect = stage.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top + stage.scrollTop;
      dragDx = mx - orb.x;
      dragDy = my - orb.y;
      orbEl.style.cursor = 'grabbing';
      orbEl.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const rect = stage.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top + stage.scrollTop;
      const x = Math.max(ORB_R, Math.min(stage.clientWidth - ORB_R, mx - dragDx));
      const y = Math.max(ORB_R, my - dragDy);
      orb.x = x;
      orb.y = y;
      persistedOrb = { x, y };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      orbEl.style.cursor = 'grab';
      try { orbEl.releasePointerCapture(e.pointerId); } catch { /* no-op */ }
    };
    orbEl.addEventListener('pointerdown', onPointerDown);
    orbEl.addEventListener('pointermove', onPointerMove);
    orbEl.addEventListener('pointerup', onPointerUp);
    orbEl.addEventListener('pointercancel', onPointerUp);

    const boot = async () => {
      try {
      await document.fonts.ready;
      if (cancelled) return;
      const prepared = prepareWithSegments(poem.text, BODY_FONT, { wordBreak: 'keep-all' });

      /* One-shot layout WITHOUT orb to determine natural content height.
         This freezes the scroll area so orb can only carve within the text,
         never extend it (prevents "chasing infinite scroll" effect). */
      const sw0 = stage!.clientWidth;
      const colW0 = Math.min(COL_MAX_W, sw0 - GUTTER * 2);
      const SAFETY_H = 8000; /* enough for any reasonable text at this width */
      const naturalLines = layoutLines(prepared, GUTTER, 0, colW0, SAFETY_H, -9999, -9999, ORB_R, false);
      const naturalH = naturalLines.length > 0
        ? naturalLines[naturalLines.length - 1].y + LINE_HEIGHT + 16
        : 0;
      spacer.style.height = naturalH + 'px';

      function frame() {
        if (cancelled) return;
        const sw = stage!.clientWidth;
        const colW = Math.min(COL_MAX_W, sw - GUTTER * 2);
        const colX = GUTTER;
        /* Layout within naturalH bounds — orb lives in content-space, carves text */
        const lines = layoutLines(
          prepared, colX, 0, colW, naturalH,
          orb.x, orb.y, ORB_R, true,
        );
        syncPool(linePool, lines.length, stage!);
        for (let i = 0; i < lines.length; i++) {
          const el = linePool[i];
          el.textContent = lines[i].text;
          el.style.left = lines[i].x + 'px';
          el.style.top = lines[i].y + 'px';
        }
        orbEl.style.left = (orb.x - ORB_R) + 'px';
        orbEl.style.top = (orb.y - ORB_R) + 'px';
        animId = requestAnimationFrame(frame);
      }
      animId = requestAnimationFrame(frame);
      } catch (err) { console.error('[CinematicHero] pretext boot error:', err); }
    };
    boot();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      orbEl.removeEventListener('pointerdown', onPointerDown);
      orbEl.removeEventListener('pointermove', onPointerMove);
      orbEl.removeEventListener('pointerup', onPointerUp);
      orbEl.removeEventListener('pointercancel', onPointerUp);
      linePool.forEach((el) => el.remove());
      orbEl.remove();
      spacer.remove();
    };
  }, [currentIndex]);

  /* ── Keyboard navigation ────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') switchTo((currentIndex - 1 + poems.length) % poems.length);
      if (e.key === 'ArrowRight') switchTo((currentIndex + 1) % poems.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, switchTo]);

  return (
    <section className="w-full overflow-x-hidden pt-32 pb-16">
      <div className="flex flex-col gap-6 px-[6%] lg:flex-row lg:items-center lg:gap-[6%]">
        {/* ── Left: Cinematic Video (symmetric with text) ──────────────── */}
        <div className="animate-fade-rise lg:w-[41vw] shrink-0">
          <div className="relative overflow-hidden rounded-2xl">
            <video
              ref={videoRef}
              src="/hero-video.mp4"
              muted
              playsInline
              autoPlay
              className="block w-full"
              style={{ opacity: 0 }}
            />
          </div>
        </div>

        {/* ── Right: Editorial Text · 线装书脊 layout ─────────────── */}
        <div
          className="animate-fade-rise-delay lg:w-[41vw] shrink-0"
          style={{ opacity: textOpacity, transition: `opacity ${textOpacity === 0 ? FADE_OUT : FADE_IN}ms ease` }}
        >
          <div className="flex items-start gap-5">
            {/* ── Spine: vertical title & attribution ─── */}
            <div className="flex shrink-0 flex-col items-center border-r border-stone-200/80 dark:border-stone-700/60 pt-1 pr-4">
              <h1
                className="font-serif-cn text-[18px] font-normal tracking-[0.32em] text-stone-900 dark:text-stone-100"
                style={{ writingMode: 'vertical-rl' }}
              >
                {poem.title}
              </h1>
              <div className="my-4 h-6 w-px bg-gradient-to-b from-stone-400 dark:from-stone-500 to-transparent" />
              <p
                className="font-serif-cn text-[11px] tracking-[0.38em] text-stone-500 dark:text-stone-400"
                style={{ writingMode: 'vertical-rl' }}
              >
                {poem.dynasty} · {poem.author}
              </p>
            </div>

            {/* ── Body: pretext stage + switcher ─── */}
            <div className="min-w-0 flex-1">
              {/* Pretext stage — text reflows around the draggable moon */}
              <div
                ref={stageRef}
                className="hero-scroll-fade relative overflow-x-hidden text-stone-700 dark:text-stone-200"
                style={{ height: '480px', overflowY: 'auto' }}
              />

              {/* Editorial Switcher — prev · counter · next */}
              <div className="mt-6 flex items-center justify-between font-serif-cn">
                <button
                  onClick={() => switchTo((currentIndex - 1 + poems.length) % poems.length)}
                  className="group flex items-center gap-2 text-[12px] tracking-[0.25em] text-stone-400 dark:text-stone-500 transition-colors hover:text-stone-700 dark:hover:text-stone-200"
                  aria-label="上一篇"
                >
                  <span className="text-base transition-transform group-hover:-translate-x-0.5">◂</span>
                  <span className="hidden sm:inline">{poems[(currentIndex - 1 + poems.length) % poems.length].title}</span>
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] tracking-[0.4em] text-stone-500 dark:text-stone-400">
                    {CN_NUM[currentIndex + 1]} · {CN_NUM[poems.length]}
                  </span>
                </div>

                <button
                  onClick={() => switchTo((currentIndex + 1) % poems.length)}
                  className="group flex items-center gap-2 text-[12px] tracking-[0.25em] text-stone-400 dark:text-stone-500 transition-colors hover:text-stone-700 dark:hover:text-stone-200"
                  aria-label="下一篇"
                >
                  <span className="hidden sm:inline">{poems[(currentIndex + 1) % poems.length].title}</span>
                  <span className="text-base transition-transform group-hover:translate-x-0.5">▸</span>
                </button>
              </div>

              {/* Thin tick marks for direct jump */}
              <div className="mt-3 flex items-center justify-start gap-1.5">
                {poems.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => switchTo(i)}
                    aria-label={p.title}
                    title={`${p.dynasty} · ${p.author}《${p.title}》`}
                    className={`h-px transition-all duration-500 ${
                      i === currentIndex
                        ? 'w-8 bg-stone-800 dark:bg-stone-200'
                        : 'w-4 bg-stone-300 dark:bg-stone-600 hover:bg-stone-500 dark:hover:bg-stone-400 hover:w-6'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
