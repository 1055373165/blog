import { useEffect, useRef, useState } from 'react';

/* ──────────────────────────────────────────────────────────
   AmbientPlayer
   A minimal, cinematic floating music player, mounted once at
   the app root so it keeps playing across route changes and in
   background tabs. Starts 1.5s after entry; if the browser
   blocks unmuted autoplay, it starts on the user's first
   gesture anywhere on the page (pointer, touch or key) or when
   the tab becomes visible. A visitor who paused it stays paused
   on later visits, and the playback position survives reloads.
   ────────────────────────────────────────────────────────── */

const TRACK = {
  src: '/between-worlds.mp3',
  title: 'Between Worlds',
  artist: 'Roger Subirana',
};

const AUTOPLAY_DELAY_MS = 1500;
const VOLUME = 0.35;
/* '0' once the visitor has paused the music themselves */
const PREF_KEY = 'ambient-player:enabled';
/* Playback position within this tab, so a full page reload resumes mid-track */
const POSITION_KEY = 'ambient-player:position';
const POSITION_SAVE_INTERVAL_MS = 2000;

function pausedByUser(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === '0';
  } catch {
    return false;
  }
}

function writePref(enabled: boolean) {
  try {
    localStorage.setItem(PREF_KEY, enabled ? '1' : '0');
  } catch {
    // storage unavailable (private mode etc.) — preference just isn't remembered
  }
}

function readPosition(): number {
  try {
    return Number(sessionStorage.getItem(POSITION_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writePosition(seconds: number) {
  try {
    sessionStorage.setItem(POSITION_KEY, String(Math.floor(seconds)));
  } catch {
    // ignore
  }
}

export default function AmbientPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  /* Set once the visitor uses the player; autoplay retries stop from then on */
  const userChoseRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visible, setVisible] = useState(false);

  /* ── Fade-in entrance ───────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  /* ── Sync state with native audio events; remember position ── */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    let lastSaved = 0;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      const now = Date.now();
      if (now - lastSaved < POSITION_SAVE_INTERVAL_MS) return;
      lastSaved = now;
      writePosition(a.currentTime);
    };
    const onPageHide = () => {
      if (a.src) writePosition(a.currentTime);
    };
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('timeupdate', onTime);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('timeupdate', onTime);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  /* ── Safe play / pause (handles pending play promise) ─ */
  const safePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = VOLUME;
    // 首次播放才真正加载音频，并从本标签页上次的位置接着放
    if (!a.src) {
      a.src = TRACK.src;
      const resumeAt = readPosition();
      if (resumeAt > 0) {
        a.addEventListener('loadedmetadata', () => {
          if (resumeAt < a.duration) a.currentTime = resumeAt;
        }, { once: true });
      }
      a.load();
    }
    try {
      playPromiseRef.current = a.play();
      await playPromiseRef.current;
    } catch {
      // Autoplay blocked or play was aborted — the gesture fallback retries
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

  /* ── Autoplay 1.5s after entry; fall back to the 1st gesture ─── */
  useEffect(() => {
    // 访客自己暂停过音乐，就尊重这个选择，不再自动播放
    if (pausedByUser()) return;

    const timer = setTimeout(() => {
      if (!userChoseRef.current) void safePlay();
    }, AUTOPLAY_DELAY_MS);

    /* 浏览器只在"已有用户手势"后才允许有声播放，且手势不限于点击。
       捕获阶段监听，避免被子元素的 stopPropagation 吞掉。 */
    const GESTURES = ['pointerdown', 'touchstart', 'keydown'] as const;

    const onGesture = (e: Event) => {
      const a = audioRef.current;
      if (!a) return;
      if (userChoseRef.current || !a.paused) { detach(); return; }
      // 播放器自身有独立的 toggle 处理，避免"点一下播、再点一下停"抵消
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-ambient-player]')) return;
      void safePlay();
      detach();
    };

    /* 页面在后台打开时 play() 可能被拒；等页面真正可见时再试一次。
       已经在播放的音乐切到后台后照常播放，这里不会暂停它。 */
    const onVisible = () => {
      const a = audioRef.current;
      if (userChoseRef.current) { detach(); return; }
      if (document.visibilityState === 'visible' && a?.paused) void safePlay();
    };

    const detach = () => {
      GESTURES.forEach((type) =>
        document.removeEventListener(type, onGesture, true),
      );
      document.removeEventListener('visibilitychange', onVisible);
    };

    GESTURES.forEach((type) =>
      document.addEventListener(type, onGesture, true),
    );
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      detach();
      clearTimeout(timer);
    };
  }, []);

  /* ── Toggle play/pause ──────────────────────────────── */
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    userChoseRef.current = true;
    if (a.paused) {
      writePref(true);
      safePlay();
    } else {
      writePref(false);
      safePause();
    }
  };

  return (
    <>
      {/* src 在首次播放时通过 safePlay 注入，页面加载阶段不下载音频 */}
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
