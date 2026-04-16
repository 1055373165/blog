import { useEffect, useRef, useCallback } from 'react';
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext';
import type { PreparedTextWithSegments, LayoutCursor } from '@chenglou/pretext';

/* ──────────────────────────────────────────────────────────
   CinematicHero
   Two-part hero: editorial text with pretext.js dynamic
   layout on top, cinematic video with soft mask below.
   ────────────────────────────────────────────────────────── */

/* ─── Full text of 前赤壁赋 ─────────────────────────────── */
const FULL_TEXT = [
  `壬戌之秋，七月既望，苏子与客泛舟游于赤壁之下。清风徐来，水波不兴。举酒属客，诵明月之诗，歌窈窕之章。少焉，月出于东山之上，徘徊于斗牛之间。白露横江，水光接天。纵一苇之所如，凌万顷之茫然。浩浩乎如冯虚御风，而不知其所止；飘飘乎如遗世独立，羽化而登仙。`,
  `于是饮酒乐甚，扣舷而歌之。歌曰："桂棹兮兰桨，击空明兮溯流光。渺渺兮予怀，望美人兮天一方。"客有吹洞箫者，倚歌而和之。其声呜呜然，如怨如慕，如泣如诉，余音袅袅，不绝如缕。舞幽壑之潜蛟，泣孤舟之嫠妇。`,
  `苏子愀然，正襟危坐而问客曰："何为其然也？"客曰："\u2018月明星稀，乌鹊南飞\u2019，此非曹孟德之诗乎？西望夏口，东望武昌，山川相缪，郁乎苍苍，此非孟德之困于周郎者乎？方其破荆州，下江陵，顺流而东也，舳舻千里，旌旗蔽空，酾酒临江，横槊赋诗，固一世之雄也，而今安在哉？况吾与子渔樵于江渚之上，侣鱼虾而友麋鹿，驾一叶之扁舟，举匏樽以相属。寄蜉蝣于天地，渺沧海之一粟。哀吾生之须臾，羡长江之无穷。挟飞仙以遨游，抱明月而长终。知不可乎骤得，托遗响于悲风。"`,
  `苏子曰："客亦知夫水与月乎？逝者如斯，而未尝往也；盈虚者如彼，而卒莫消长也。盖将自其变者而观之，则天地曾不能以一瞬；自其不变者而观之，则物与我皆无尽也，而又何羡乎！且夫天地之间，物各有主，苟非吾之所有，虽一毫而莫取。惟江上之清风，与山间之明月，耳得之而为声，目遇之而成色，取之无禁，用之不竭，是造物者之无尽藏也，而吾与子之所共适。"`,
  `客喜而笑，洗盏更酌。肴核既尽，杯盘狼籍。相与枕藉乎舟中，不知东方之既白。`,
].join('\n');

/* ─── Pretext layout constants ──────────────────────────── */
const BODY_FONT = '16px "Noto Serif SC", "Songti SC", "SimSun", serif';
const LINE_HEIGHT = 34;
const GUTTER = 32;
const COL_MAX_W = 860;
const MIN_SLOT_W = 30;
const ORB_R = 50;
const LERP = 0.10;
const VIDEO_FADE = 0.5;

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
      `font:${BODY_FONT};line-height:${LINE_HEIGHT}px;color:#3a3a3a;` +
      `letter-spacing:0.06em;transition:transform 0.15s ease;`;
    parent.appendChild(el);
    pool.push(el);
  }
  for (let i = 0; i < pool.length; i++) pool[i].style.display = i < n ? '' : 'none';
}

/* ─── Component ─────────────────────────────────────────── */
export default function CinematicHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

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

  /* ── Pretext interactive layout ─────────────────────── */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;
    let animId = 0;

    /* orb element */
    const orbEl = document.createElement('div');
    orbEl.style.cssText =
      `position:absolute;border-radius:50%;pointer-events:none;z-index:10;will-change:transform;` +
      `background:radial-gradient(circle at 40% 40%,rgba(180,160,100,0.25),rgba(160,140,90,0.08) 55%,transparent 70%);` +
      `box-shadow:0 0 40px 12px rgba(180,160,100,0.12);` +
      `width:${ORB_R * 2}px;height:${ORB_R * 2}px;opacity:0;transition:opacity 0.5s ease;`;
    stage.appendChild(orbEl);

    const orb = { x: -999, y: -999 };
    const target = { x: -999, y: -999 };
    let mouseActive = false;
    const linePool: HTMLDivElement[] = [];

    const onPointerMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
      if (!mouseActive) { orb.x = target.x; orb.y = target.y; }
      mouseActive = true;
      orbEl.style.opacity = '1';
    };
    const onPointerLeave = () => { mouseActive = false; orbEl.style.opacity = '0'; };
    stage.addEventListener('pointerenter', onPointerMove);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerleave', onPointerLeave);

    const boot = async () => {
      try {
      await document.fonts.ready;
      if (cancelled) return;
      const prepared = prepareWithSegments(FULL_TEXT, BODY_FONT, { wordBreak: 'keep-all' });
      console.log('[pretext] prepared ok, segments:', prepared.segments?.length);

      function frame() {
        if (cancelled) return;
        if (mouseActive) {
          orb.x += (target.x - orb.x) * LERP;
          orb.y += (target.y - orb.y) * LERP;
        }
        const sw = stage!.clientWidth;
        const sh = stage!.clientHeight;
        const colW = Math.min(COL_MAX_W, sw - GUTTER * 2);
        const colX = (sw - colW) / 2;
        const lines = layoutLines(
          prepared, colX, 0, colW, sh,
          mouseActive ? orb.x : -9999, mouseActive ? orb.y : -9999, ORB_R, mouseActive,
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
      } catch (err) { console.error('[pretext] boot failed:', err); }
    };
    boot();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      stage.removeEventListener('pointerenter', onPointerMove);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerleave', onPointerLeave);
      linePool.forEach((el) => el.remove());
      orbEl.remove();
    };
  }, []);

  return (
    <>
      {/* ═══ Part 1: Editorial Text (white) ═══════════════ */}
      <section className="w-full bg-white">
        {/* ── Title & Author ───────────────────────────── */}
        <div className="animate-fade-rise pt-24 pb-4 text-center">
          <h1 className="font-serif-cn text-2xl font-light tracking-[0.25em] text-gray-800 sm:text-3xl">
            前赤壁赋
          </h1>
          <p className="animate-fade-rise-delay mt-2 font-serif-cn text-sm tracking-[0.3em] text-gray-400">
            宋 · 苏轼
          </p>
          <div className="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>

        {/* ── Pretext stage — full text reflows around cursor ── */}
        <div
          ref={stageRef}
          className="relative mx-auto cursor-crosshair"
          style={{ height: '460px', maxWidth: '920px' }}
        />
      </section>

      {/* ═══ Part 2: Cinematic Video Window (dark) ════════ */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-gray-50 via-gray-900 to-gray-950 py-16">
        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-black/30 ring-1 ring-white/10">
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
      </section>
    </>
  );
}
