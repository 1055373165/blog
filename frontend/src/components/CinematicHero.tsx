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
    <section className="w-full bg-white">
      {/* ── Editorial Text: 前赤壁赋 ─────────────────── */}
      <div className="animate-fade-rise mx-auto max-w-3xl px-8 pt-28 pb-14 sm:px-12">
        {/* Title & Author */}
        <header className="mb-10 text-center">
          <h1 className="font-serif-cn text-3xl font-light tracking-[0.25em] text-gray-800 sm:text-4xl">
            前赤壁赋
          </h1>
          <p className="mt-4 font-serif-cn text-base tracking-[0.3em] text-gray-400">
            宋 · 苏轼
          </p>
        </header>

        {/* Decorative divider */}
        <div className="mx-auto mb-10 h-px w-24 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

        {/* Body — pretext-inspired: justified, indented, generous leading */}
        <div className="space-y-5 font-serif-cn text-lg leading-[2.2] tracking-[0.08em] text-[#3a3a3a]" style={{ textAlign: 'justify' }}>
          <p style={{ textIndent: '2em' }}>
            壬戌之秋，七月既望，苏子与客泛舟游于赤壁之下。清风徐来，水波不兴。举酒属客，诵明月之诗，歌窈窕之章。少焉，月出于东山之上，徘徊于斗牛之间。白露横江，水光接天。纵一苇之所如，凌万顷之茫然。浩浩乎如冯虚御风，而不知其所止；飘飘乎如遗世独立，羽化而登仙。
          </p>
          <p style={{ textIndent: '2em' }}>
            于是饮酒乐甚，扣舷而歌之。歌曰："桂棹兮兰桨，击空明兮溯流光。渺渺兮予怀，望美人兮天一方。"客有吹洞箫者，倚歌而和之。其声呜呜然，如怨如慕，如泣如诉，余音袅袅，不绝如缕。舞幽壑之潜蛟，泣孤舟之嫠妇。
          </p>
          <p style={{ textIndent: '2em' }}>
            苏子愀然，正襟危坐而问客曰："何为其然也？"客曰："'月明星稀，乌鹊南飞'，此非曹孟德之诗乎？西望夏口，东望武昌，山川相缪，郁乎苍苍，此非孟德之困于周郎者乎？方其破荆州，下江陵，顺流而东也，舳舻千里，旌旗蔽空，酾酒临江，横槊赋诗，固一世之雄也，而今安在哉？况吾与子渔樵于江渚之上，侣鱼虾而友麋鹿，驾一叶之扁舟，举匏樽以相属。寄蜉蝣于天地，渺沧海之一粟。哀吾生之须臾，羡长江之无穷。挟飞仙以遨游，抱明月而长终。知不可乎骤得，托遗响于悲风。"
          </p>
          <p style={{ textIndent: '2em' }}>
            苏子曰："客亦知夫水与月乎？逝者如斯，而未尝往也；盈虚者如彼，而卒莫消长也。盖将自其变者而观之，则天地曾不能以一瞬；自其不变者而观之，则物与我皆无尽也，而又何羡乎！且夫天地之间，物各有主，苟非吾之所有，虽一毫而莫取。惟江上之清风，与山间之明月，耳得之而为声，目遇之而成色，取之无禁，用之不竭，是造物者之无尽藏也，而吾与子之所共适。"
          </p>
          <p style={{ textIndent: '2em' }}>
            客喜而笑，洗盏更酌。肴核既尽，杯盘狼籍。相与枕藉乎舟中，不知东方之既白。
          </p>
        </div>
      </div>

      {/* ── Cinematic Video — inset window ────────────── */}
      <div className="mx-auto max-w-7xl px-8 sm:px-12 lg:px-16 pb-4">
        <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-black/8">
          <div className="aspect-video bg-black/5">
            <video
              ref={videoRef}
              src="/hero-video.mp4"
              muted
              playsInline
              autoPlay
              className="h-full w-full object-cover transition-opacity duration-500"
              style={{ opacity: 0 }}
            />
          </div>

          {/* Subtle inner ring for "window frame" feel */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/[0.06]" />
        </div>
      </div>
    </section>
  );
}
