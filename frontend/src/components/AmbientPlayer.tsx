import { useEffect, useRef, useState } from 'react';

/* ──────────────────────────────────────────────────────────
   AmbientPlayer
   A minimal, cinematic floating music player. Sits quietly
   at the bottom-left of the viewport. Attempts autoplay on
   mount; if the browser blocks it, waits for the user's
   first click anywhere on the page to begin.
   ────────────────────────────────────────────────────────── */

const TRACK = {
  src: '/between-worlds.mp3',
  title: 'Between Worlds',
  artist: 'Roger Subirana',
};

export default function AmbientPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visible, setVisible] = useState(false);

  /* ── Fade-in entrance ───────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  /* ── Sync state with native audio events ────────────── */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
    };
  }, []);

  /* ── Safe play / pause (handles pending play promise) ─ */
  const safePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0.35;
    // 首次播放才真正加载，避免初始就下载 12MB 文件
    if (!a.src) {
      a.src = TRACK.src;
      a.load();
    }
    try {
      playPromiseRef.current = a.play();
      await playPromiseRef.current;
    } catch {
      // Autoplay blocked or play was aborted — ignore
    } finally {
      playPromiseRef.current = null;
    }
  };

  const safePause = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch {
        // play was aborted — expected when pausing quickly
      }
    }
    a.pause();
  };

  /* ── Defer autoplay attempt until idle; fall back to 1st click ─ */
  useEffect(() => {
    // 不在 mount 时立即播放——把昂贵的网络抢占推迟到主线程空闲后
    const idle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 3000 })
        : (cb: () => void) => setTimeout(cb, 2000);

    const handle = idle(() => {
      safePlay();
    });

    const onFirstClick = (e: MouseEvent) => {
      const a = audioRef.current;
      if (!a || !a.paused) return;
      // Skip clicks on the player itself — it has its own handler
      const target = e.target as HTMLElement;
      if (target.closest('[data-ambient-player]')) return;
      safePlay();
      document.removeEventListener('click', onFirstClick);
    };

    document.addEventListener('click', onFirstClick);
    return () => {
      document.removeEventListener('click', onFirstClick);
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(handle);
      } else {
        clearTimeout(handle as unknown as number);
      }
    };
  }, []);

  /* ── Toggle play/pause ──────────────────────────────── */
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) safePlay();
    else safePause();
  };

  return (
    <>
      {/* src 在首次播放时通过 safePlay 注入，避免初始页面就下载 12MB */}
      <audio ref={audioRef} loop preload="none" />

      <div
        data-ambient-player
        className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 rounded-full
          border border-black/[0.06] bg-white/70 px-4 py-2.5 shadow-lg backdrop-blur-xl
          transition-all duration-700 ease-out cursor-pointer select-none
          hover:bg-white/90 hover:shadow-xl
          ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        onClick={toggle}
        role="button"
        aria-label={isPlaying ? 'Pause music' : 'Play music'}
      >
        {/* ── Equalizer bars ─────────────────────────────── */}
        <div className="flex items-end gap-[3px] h-4 w-5">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-[#000000] transition-all duration-300"
              style={{
                height: isPlaying ? undefined : '3px',
                animation: isPlaying
                  ? `eqBar 1.2s ease-in-out ${i * 0.15}s infinite alternate`
                  : 'none',
              }}
            />
          ))}
        </div>

        {/* ── Track info ─────────────────────────────────── */}
        <div className="flex flex-col leading-none">
          <span className="font-display text-sm tracking-tight text-[#000000]">
            {TRACK.title}
          </span>
          <span className="font-body text-[10px] text-[#6F6F6F] mt-0.5">
            {TRACK.artist}
          </span>
        </div>

        {/* ── Play/Pause icon ────────────────────────────── */}
        <div className="ml-1 flex h-6 w-6 items-center justify-center">
          {isPlaying ? (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <rect x="0" y="0" width="4" height="14" rx="1" fill="#000000" />
              <rect x="8" y="0" width="4" height="14" rx="1" fill="#000000" />
            </svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <path d="M0 0.5L12 7L0 13.5V0.5Z" fill="#000000" />
            </svg>
          )}
        </div>
      </div>
    </>
  );
}
