import { useEffect, useRef, useCallback } from 'react';

/* ──────────────────────────────────────────────────────────
   CinematicHero
   Fullscreen hero with looping video, smooth fade-in/out,
   and editorial typography. Navigation is handled by the
   site-wide FloatingNavigation — this is pure content.
   ────────────────────────────────────────────────────────── */

export default function CinematicHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);

  /* ── Seamless fade-loop logic ────────────────────────── */
  const FADE_DURATION = 0.5; // seconds

  const tick = useCallback(() => {
    const v = videoRef.current;
    if (!v || v.paused) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const { currentTime, duration } = v;

    if (duration && Number.isFinite(duration)) {
      if (currentTime < FADE_DURATION) {
        v.style.opacity = String(Math.min(currentTime / FADE_DURATION, 1));
      } else if (currentTime > duration - FADE_DURATION) {
        v.style.opacity = String(
          Math.max((duration - currentTime) / FADE_DURATION, 0),
        );
      } else {
        v.style.opacity = '1';
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.style.opacity = '0';

    const handleEnded = () => {
      v.style.opacity = '0';
      setTimeout(() => {
        v.currentTime = 0;
        v.play().catch(() => {});
      }, 100);
    };

    v.addEventListener('ended', handleEnded);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      v.removeEventListener('ended', handleEnded);
      cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-white">
      {/* ── Video background layer (z-0) ──────────────── */}
      <div
        className="absolute z-0 right-0 bottom-0 left-0"
        style={{ top: '300px' }}
      >
        <video
          ref={videoRef}
          src="/hero-video.mp4"
          muted
          playsInline
          autoPlay
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: 0 }}
        />

        {/* gradient overlays on video */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
      </div>

      {/* ── Hero content (z-10) ───────────────────────── */}
      <div
        className="relative z-10 flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingTop: '6rem', paddingBottom: '10rem' }}
      >
        {/* Description */}
        <p className="animate-fade-rise max-w-3xl font-serif-cn text-sm font-normal leading-[2.2] tracking-widest text-[#3a3a3a] sm:text-base">
          寄蜉蝣于天地，渺沧海之一粟。哀吾生之须臾，羡长江之无穷。挟飞仙以遨游，抱明月而长终。苟非吾之所有，虽一毫而莫取。惟江上之清风，与山间之明月，耳得之而为声，目遇之而成色，取之无禁，用之不竭，是造物者之无尽藏也。
        </p>
      </div>
    </section>
  );
}
