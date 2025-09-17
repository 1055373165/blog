import { useState, useRef, useEffect } from 'react';
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface MediaPlayerProps {
  src: string;
  type: 'audio' | 'video';
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
}

// 格式化时长
function formatDuration(seconds: number): string {
  if (seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

export default function MediaPlayer({
  src,
  type,
  poster,
  className = '',
  autoPlay = false,
  controls = true,
  onTimeUpdate,
  onDurationChange,
  onEnded
}: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);

  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // 隐藏控制栏的定时器
  const hideControlsAfterDelay = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && type === 'video') {
        setShowControls(false);
      }
    }, 3000);
  };

  // 显示控制栏
  const showControlsTemporarily = () => {
    setShowControls(true);
    if (type === 'video') {
      hideControlsAfterDelay();
    }
  };

  // 媒体事件处理
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleTimeUpdate = () => {
      const time = media.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    };

    const handleDurationChange = () => {
      const dur = media.duration;
      setDuration(dur);
      onDurationChange?.(dur);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleLoadStart = () => setLoading(true);
    const handleLoadedData = () => setLoading(false);

    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('loadedmetadata', handleDurationChange);
    media.addEventListener('ended', handleEnded);
    media.addEventListener('loadstart', handleLoadStart);
    media.addEventListener('loadeddata', handleLoadedData);

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('loadedmetadata', handleDurationChange);
      media.removeEventListener('ended', handleEnded);
      media.removeEventListener('loadstart', handleLoadStart);
      media.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [onTimeUpdate, onDurationChange, onEnded]);

  // 播放/暂停控制
  const togglePlayPause = () => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
    } else {
      media.play();
    }
    setIsPlaying(!isPlaying);
  };

  // 进度条控制
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const media = mediaRef.current;
    if (!media || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    media.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // 快进/快退
  const skipTime = (seconds: number) => {
    const media = mediaRef.current;
    if (!media) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    media.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // 音量控制
  const handleVolumeChange = (newVolume: number) => {
    const media = mediaRef.current;
    if (!media) return;

    setVolume(newVolume);
    media.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  // 静音切换
  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;

    if (isMuted) {
      media.volume = volume;
      setIsMuted(false);
    } else {
      media.volume = 0;
      setIsMuted(true);
    }
  };

  // 全屏控制
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          if (type === 'video') {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, volume, isMuted, type]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative bg-black rounded-lg overflow-hidden focus:outline-none',
        type === 'video' && 'aspect-video',
        className
      )}
      tabIndex={0}
      onMouseMove={showControlsTemporarily}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying && type === 'video') {
          hideControlsAfterDelay();
        }
      }}
    >
      {/* 媒体元素 */}
      {type === 'audio' ? (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={src}
          autoPlay={autoPlay}
          className="hidden"
        />
      ) : (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          className="w-full h-full object-contain"
          onClick={togglePlayPause}
        />
      )}

      {/* 音频可视化背景 */}
      {type === 'audio' && (
        <div className="absolute inset-0 bg-gradient-to-br from-media-audio-500/20 to-media-audio-700/20 flex items-center justify-center">
          {poster ? (
            <img
              src={poster}
              alt="Audio cover"
              className="w-full h-full object-cover opacity-30"
            />
          ) : (
            <div className="text-center">
              <SpeakerWaveIcon className="w-24 h-24 text-media-audio-400 mx-auto mb-4" />
              <p className="text-white/80 text-lg font-medium">音频播放器</p>
            </div>
          )}
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 控制栏 */}
      {controls && (
        <div
          className={clsx(
            'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-all duration-300',
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}
        >
          {/* 进度条 */}
          <div className="mb-4">
            <div
              ref={progressRef}
              onClick={handleSeek}
              className="relative h-1 bg-white/30 rounded-full cursor-pointer group"
            >
              <div
                className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-200"
                style={{ width: `${progressPercentage}%` }}
              />
              <div
                className="absolute top-1/2 w-3 h-3 bg-white rounded-full transform -translate-y-1/2 transition-all duration-200 opacity-0 group-hover:opacity-100"
                style={{ left: `calc(${progressPercentage}% - 6px)` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/80 mt-1">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* 快退 */}
              <button
                onClick={() => skipTime(-10)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="快退10秒"
              >
                <BackwardIcon className="w-5 h-5 text-white" />
              </button>

              {/* 播放/暂停 */}
              <button
                onClick={togglePlayPause}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                title={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? (
                  <PauseIcon className="w-6 h-6 text-white" />
                ) : (
                  <PlayIcon className="w-6 h-6 text-white ml-0.5" />
                )}
              </button>

              {/* 快进 */}
              <button
                onClick={() => skipTime(10)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="快进10秒"
              >
                <ForwardIcon className="w-5 h-5 text-white" />
              </button>

              {/* 音量控制 */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title={isMuted ? '取消静音' : '静音'}
                >
                  {isMuted || volume === 0 ? (
                    <SpeakerXMarkIcon className="w-5 h-5 text-white" />
                  ) : (
                    <SpeakerWaveIcon className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer slider"
                  title="音量控制"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* 全屏按钮（仅视频） */}
              {type === 'video' && (
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title={isFullscreen ? '退出全屏' : '全屏'}
                >
                  {isFullscreen ? (
                    <ArrowsPointingInIcon className="w-5 h-5 text-white" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-5 h-5 text-white" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 中央播放按钮（视频暂停时显示） */}
      {type === 'video' && !isPlaying && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlayPause}
            className="w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          >
            <PlayIcon className="w-8 h-8 text-white ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}