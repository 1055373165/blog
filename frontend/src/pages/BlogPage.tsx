import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Blog } from '../types';
import { blogApi } from '../services/blogApi';
import { formatDate, formatFileSize } from '../utils';
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  VideoCameraIcon,
  EyeIcon,
  HeartIcon,
  ShareIcon,
  ClockIcon,
  DocumentIcon,
  ArrowLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';

// 格式化时长（秒转为 mm:ss 或 hh:mm:ss）
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

export default function BlogPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  // 媒体播放状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  // 博客交互状态
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [showDescription, setShowDescription] = useState(true);
  
  // 音频文件播放状态
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.7);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioFileRef = useRef<HTMLAudioElement>(null); // 额外音频文件ref
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  // 博客数据
  const [blog, setBlog] = useState<Blog | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const loadBlog = async () => {
      if (!slug) {
        navigate('/blogs');
        return;
      }

      setIsLoading(true);
      try {
        const response = await blogApi.getBlogBySlug(slug);
        console.log('Fetched blog data:', response); // DEBUG: Log fetched data
        console.log('Response type:', typeof response); // DEBUG: Check type
        console.log('Response keys:', response ? Object.keys(response) : 'null'); // DEBUG: Check keys
        setBlog(response);
        setLikesCount(response?.likes_count || 0);
        setViewsCount(response?.views_count || 0);
        setIsLiked(response?.is_liked || false);

        // 记录浏览量
        if (response?.id) {
          await blogApi.viewBlog(response.id);
        }
      } catch (error) {
        console.error('加载博客失败:', error);
        navigate('/blogs');
      } finally {
        setIsLoading(false);
      }
    };

    loadBlog();
  }, [slug, navigate]);
  
  // 媒体事件处理
  useEffect(() => {
    const media = blog?.type === 'audio' ? audioRef.current : videoRef.current;
    if (!media) return;
    
    const updateTime = () => setCurrentTime(media.currentTime);
    const updateDuration = () => setDuration(media.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleLoadedData = () => setIsLoading(false);
    
    media.addEventListener('timeupdate', updateTime);
    media.addEventListener('loadedmetadata', updateDuration);
    media.addEventListener('ended', handleEnded);
    media.addEventListener('loadstart', handleLoadStart);
    media.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      media.removeEventListener('timeupdate', updateTime);
      media.removeEventListener('loadedmetadata', updateDuration);
      media.removeEventListener('ended', handleEnded);
      media.removeEventListener('loadstart', handleLoadStart);
      media.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [blog]);

  // 组件卸载时清理播放状态
  useEffect(() => {
    return () => {
      const audioEl = audioRef.current;
      const videoEl = videoRef.current;

      if (audioEl && !audioEl.paused) {
        audioEl.pause();
      }
      if (videoEl && !videoEl.paused) {
        videoEl.pause();
      }

      setIsPlaying(false);
      setCurrentTime(0);
    };
  }, []);

  // 键盘快捷键：左右方向键快退/快进 10 秒
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
      if (isTyping) return; // 避免影响输入框

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipTime(-10);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipTime(10);
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentTime, duration, blog, isPlaying]);

  // 监听全屏状态变化
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const requestFullscreen = async () => {
    const el: any = (blog?.type === 'video' ? videoRef.current : containerRef.current) as any;
    if (!el) return;
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
  };

  const exitFullscreen = async () => {
    const doc: any = document as any;
    if (document.exitFullscreen) return document.exitFullscreen();
    if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen();
    if (doc.msExitFullscreen) return doc.msExitFullscreen();
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await exitFullscreen();
    } else {
      await requestFullscreen();
    }
  };
  
  // 播放控制
  const togglePlayPause = async () => {
    const media = blog?.type === 'audio' ? audioRef.current : videoRef.current;
    if (!media || !document.contains(media)) {
      console.warn('Media element not found or not in document');
      return;
    }

    if (isPlaying) {
      try {
        media.pause();
        setIsPlaying(false);
      } catch (error) {
        console.error('Pause failed:', error);
        setIsPlaying(false);
      }
    } else {
      try {
        // 确保媒体元素已加载
        if (media.readyState < 2) {
          console.log('Media not ready, loading...');
          media.load();
          // 等待元数据加载
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Load timeout')), 5000);
            media.addEventListener('loadedmetadata', () => {
              clearTimeout(timeout);
              resolve(void 0);
            }, { once: true });
            media.addEventListener('error', () => {
              clearTimeout(timeout);
              reject(new Error('Load failed'));
            }, { once: true });
          });
        }

        await media.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Playback failed:', error);
        setIsPlaying(false);

        // 如果是AbortError，可能是因为快速切换导致的
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Play request was interrupted, retrying...');
          // 短暂延迟后重试
          setTimeout(() => {
            if (media && document.contains(media) && !isPlaying) {
              media.play().catch(e => console.error('Retry failed:', e));
            }
          }, 100);
        }
      }
    }
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const media = blog?.type === 'audio' ? audioRef.current : videoRef.current;
    if (!media || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    media.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const skipTime = (seconds: number) => {
    const media = blog?.type === 'audio' ? audioRef.current : videoRef.current;
    if (!media) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    media.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const handleVolumeChange = (newVolume: number) => {
    const media = blog?.type === 'audio' ? audioRef.current : videoRef.current;
    if (!media) return;
    
    setVolume(newVolume);
    media.volume = newVolume;
    setIsMuted(newVolume === 0);
  };
  
  const toggleMute = () => {
    const media = blog?.type === 'audio' ? audioRef.current : videoRef.current;
    if (!media) return;
    
    if (isMuted) {
      media.volume = volume;
      setIsMuted(false);
    } else {
      media.volume = 0;
      setIsMuted(true);
    }
  };
  
  const changePlaybackRate = (rate: number) => {
    const media = blog?.type === 'audio' ? audioRef.current : videoRef.current;
    if (!media) return;
    
    media.playbackRate = rate;
    setPlaybackRate(rate);
  };

  // 音频文件播放控制
  const toggleAudioPlayPause = () => {
    const audioFile = audioFileRef.current;
    if (!audioFile) return;

    if (isAudioPlaying) {
      audioFile.pause();
      setIsAudioPlaying(false);
    } else {
      audioFile.play();
      setIsAudioPlaying(true);
    }
  };

  const handleAudioSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audioFile = audioFileRef.current;
    if (!audioFile) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * audioDuration;
    audioFile.currentTime = newTime;
    setAudioCurrentTime(newTime);
  };

  const handleAudioVolumeChange = (newVolume: number) => {
    const audioFile = audioFileRef.current;
    if (!audioFile) return;
    
    setAudioVolume(newVolume);
    audioFile.volume = newVolume;
    setIsAudioMuted(newVolume === 0);
  };

  const toggleAudioMute = () => {
    const audioFile = audioFileRef.current;
    if (!audioFile) return;
    
    if (isAudioMuted) {
      audioFile.volume = audioVolume;
      setIsAudioMuted(false);
    } else {
      audioFile.volume = 0;
      setIsAudioMuted(true);
    }
  };
  
  // 交互功能
  const toggleLike = async () => {
    if (!blog?.id) return;

    try {
      const response = await blogApi.likeBlog(blog.id);
      setIsLiked(response.is_liked);
      setLikesCount(response.likes_count);
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: blog?.title,
        text: blog?.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // 显示复制成功提示
    }
  };
  
  if (isLoading || !blog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blog-50 via-white to-blog-100/30 dark:from-blog-950 dark:via-blog-900 dark:to-blog-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-blog-200 dark:bg-blog-700 rounded mb-6"></div>
            <div className="aspect-video bg-blog-200 dark:bg-blog-700 rounded-lg mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-blog-200 dark:bg-blog-700 rounded w-3/4"></div>
              <div className="h-4 bg-blog-200 dark:bg-blog-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 确保blog存在后再计算相关值
  if (!blog) {
    return null;
  }
  
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blog-50 via-white to-blog-100/30 dark:from-blog-950 dark:via-blog-900 dark:to-blog-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* 返回按钮 */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/blogs')}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blog-600 dark:text-blog-400 hover:text-blog-700 dark:hover:text-blog-300 transition-colors duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回博客列表
          </button>
        </div>
        
        {/* 博客标题和元信息 */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className={clsx(
              'flex items-center justify-center w-8 h-8 rounded-full',
              blog.type === 'audio'
                ? 'bg-media-audio-100 dark:bg-media-audio-800/30 text-media-audio-600 dark:text-media-audio-400'
                : 'bg-media-video-100 dark:bg-media-video-800/30 text-media-video-600 dark:text-media-video-400'
            )}>
              {blog.type === 'audio' ? (
                <SpeakerWaveIcon className="w-4 h-4" />
              ) : (
                <VideoCameraIcon className="w-4 h-4" />
              )}
            </div>
            <span className={clsx(
              'text-sm font-medium px-3 py-1 rounded-md',
              blog.type === 'audio'
                ? 'bg-media-audio-100 dark:bg-media-audio-900/30 text-media-audio-700 dark:text-media-audio-300'
                : 'bg-media-video-100 dark:bg-media-video-900/30 text-media-video-700 dark:text-media-video-300'
            )}>
              {blog.type === 'audio' ? '音频博客' : '视频博客'}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold text-blog-900 dark:text-blog-100 mb-4">
            {blog.title}
          </h1>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-6 text-sm text-blog-600 dark:text-blog-400">
              <div className="flex items-center space-x-2">
                {blog.author?.avatar ? (
                  <img
                    src={blog.author.avatar}
                    alt={blog.author?.name || '匿名用户'}
                    className="w-6 h-6 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blog-300 dark:bg-blog-700 text-white dark:text-blog-200 flex items-center justify-center text-xs">
                    {(blog.author?.name?.[0] || '匿')}
                  </div>
                )}
                <span className="font-medium">{blog.author?.name || '匿名用户'}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <ClockIcon className="w-4 h-4" />
                <span>{formatDate(blog.published_at || blog.created_at)}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <ClockIcon className="w-4 h-4" />
                <span>{formatDuration(blog.duration)}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <span>{formatFileSize(blog.file_size)}</span>
              </div>
              
              {blog.category && (
                <Link
                  to={`/category/${blog.category.slug}`}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blog-100 dark:bg-blog-800/50 text-blog-700 dark:text-blog-300 rounded-md hover:bg-blog-200 dark:hover:bg-blog-700/70 transition-colors"
                >
                  <DocumentIcon className="w-3 h-3 mr-1" />
                  {blog.category.name}
                </Link>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 text-sm text-blog-500 dark:text-blog-400">
                <EyeIcon className="w-4 h-4" />
                <span>{viewsCount.toLocaleString()}</span>
              </div>
              
              <button
                onClick={toggleLike}
                className="flex items-center space-x-1 text-sm transition-colors duration-200 hover:scale-105"
              >
                {isLiked ? (
                  <HeartSolidIcon className="w-4 h-4 text-red-500" />
                ) : (
                  <HeartIcon className="w-4 h-4 text-blog-500 dark:text-blog-400 hover:text-red-500" />
                )}
                <span className={isLiked ? 'text-red-500' : 'text-blog-500 dark:text-blog-400'}>
                  {likesCount}
                </span>
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center space-x-1 text-sm text-blog-500 dark:text-blog-400 hover:text-blog-600 dark:hover:text-blog-300 transition-colors duration-200"
              >
                <ShareIcon className="w-4 h-4" />
                <span>分享</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* 媒体播放器 */}
        <div className="mb-8">
          <div className={clsx(
            'rounded-lg overflow-hidden shadow-xl',
            blog.type === 'audio'
              ? 'bg-gradient-to-br from-media-audio-50 to-media-audio-100 dark:from-media-audio-900 dark:to-media-audio-800'
              : 'bg-gradient-to-br from-media-video-50 to-media-video-100 dark:from-media-video-900 dark:to-media-video-800'
          )}>
            
            {/* 媒体元素 */}
            <div className="relative" ref={containerRef}>
              {blog.type === 'audio' ? (
                <div className="relative aspect-video bg-gradient-to-br from-media-audio-100 to-media-audio-200 dark:from-media-audio-800 dark:to-media-audio-700 flex items-center justify-center">
                  <audio
                    ref={audioRef}
                    src={blog.media_url}
                    preload="metadata"
                    className="hidden"
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={(e) => console.error('Audio Error:', e, 'URL:', blog.media_url)}
                  />
                  {blog.thumbnail && (
                    <img
                      src={blog.thumbnail}
                      alt={blog.title}
                      className="w-full h-full object-cover opacity-30"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <SpeakerWaveIcon className="w-24 h-24 text-media-audio-400 dark:text-media-audio-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-media-audio-700 dark:text-media-audio-300">
                        音频博客
                      </h3>
                    </div>
                  </div>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={blog.media_url}
                  className="w-full aspect-video bg-black"
                  playsInline
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onError={(e) => console.error('Video Error:', e, 'URL:', blog.media_url)}
                >
                  Your browser does not support the video tag.
                </video>
              )}
              
              {/* 播放按钮覆盖 */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer" onClick={togglePlayPause}>
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all duration-200">
                    <PlayIcon className="w-8 h-8 text-blog-700 ml-1" />
                  </div>
                </div>
              )}
            </div>
            
            {/* 媒体控制栏 */}
            <div className="p-4 space-y-4">
              {/* 进度条 */}
              <div className="space-y-2">
                <div
                  ref={progressRef}
                  onClick={handleSeek}
                  className="relative h-2 bg-blog-200 dark:bg-blog-700 rounded-full cursor-pointer group"
                >
                  <div
                    className={clsx(
                      'absolute top-0 left-0 h-full rounded-full transition-all duration-200',
                      blog.type === 'audio'
                        ? 'bg-media-audio-500 dark:bg-media-audio-400'
                        : 'bg-media-video-500 dark:bg-media-video-400'
                    )}
                    style={{ width: `${progressPercentage}%` }}
                  />
                  <div
                    className={clsx(
                      'absolute top-1/2 w-4 h-4 rounded-full border-2 border-white transform -translate-y-1/2 transition-all duration-200 opacity-0 group-hover:opacity-100',
                      blog.type === 'audio'
                        ? 'bg-media-audio-500 dark:bg-media-audio-400 shadow-media-audio-200'
                        : 'bg-media-video-500 dark:bg-media-video-400 shadow-media-video-200'
                    )}
                    style={{ left: `calc(${progressPercentage}% - 8px)` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-blog-500 dark:text-blog-400 tabular-nums">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>
              
              {/* 控制按钮 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => skipTime(-10)}
                    className="p-2 rounded-full hover:bg-blog-100 dark:hover:bg-blog-800 transition-colors duration-200"
                  >
                    <BackwardIcon className="w-5 h-5 text-blog-600 dark:text-blog-400" />
                  </button>
                  
                  <button
                    onClick={togglePlayPause}
                    className={clsx(
                      'p-3 rounded-full text-white shadow-lg hover:scale-105 transition-all duration-200',
                      blog.type === 'audio'
                        ? 'bg-media-audio-500 hover:bg-media-audio-600'
                        : 'bg-media-video-500 hover:bg-media-video-600'
                    )}
                  >
                    {isPlaying ? (
                      <PauseIcon className="w-6 h-6" />
                    ) : (
                      <PlayIcon className="w-6 h-6 ml-0.5" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => skipTime(10)}
                    className="p-2 rounded-full hover:bg-blog-100 dark:hover:bg-blog-800 transition-colors duration-200"
                  >
                    <ForwardIcon className="w-5 h-5 text-blog-600 dark:text-blog-400" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* 倍速控制 */}
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-blog-500 dark:text-blog-400">倍速:</span>
                    <select
                      value={playbackRate}
                      onChange={(e) => changePlaybackRate(Number(e.target.value))}
                      className="text-xs bg-transparent text-blog-600 dark:text-blog-400 border-none outline-none cursor-pointer"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={0.75}>0.75x</option>
                      <option value={1}>1x</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                  </div>
                  
                  {/* 全屏切换 */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-full hover:bg-blog-100 dark:hover:bg-blog-800 transition-colors duration-200"
                    title={isFullscreen ? '退出全屏' : '全屏'}
                  >
                    {isFullscreen ? (
                      <ArrowsPointingInIcon className="w-5 h-5 text-blog-600 dark:text-blog-400" />
                    ) : (
                      <ArrowsPointingOutIcon className="w-5 h-5 text-blog-600 dark:text-blog-400" />
                    )}
                  </button>
                  
                  {/* 音量控制 */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleMute}
                      className="p-1 rounded hover:bg-blog-100 dark:hover:bg-blog-800 transition-colors duration-200"
                    >
                      {isMuted || volume === 0 ? (
                        <SpeakerXMarkIcon className="w-4 h-4 text-blog-600 dark:text-blog-400" />
                      ) : (
                        <SpeakerWaveIcon className="w-4 h-4 text-blog-600 dark:text-blog-400" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-16 h-1 bg-blog-200 dark:bg-blog-700 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 音频文件播放器 */}
        {blog.audio_url && (
          <div className="bg-white dark:bg-blog-900 rounded-lg shadow-sm border border-blog-200/50 dark:border-blog-700/50 overflow-hidden mb-8">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <SpeakerWaveIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" />
                <h3 className="text-lg font-semibold text-blog-900 dark:text-blog-100">
                  音频文件
                </h3>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
                {/* 音频元素 */}
                <audio
                  ref={audioFileRef}
                  src={blog.audio_url}
                  preload="metadata"
                  onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration || 0)}
                  onTimeUpdate={(e) => setAudioCurrentTime(e.currentTarget.currentTime)}
                  onPlay={() => setIsAudioPlaying(true)}
                  onPause={() => setIsAudioPlaying(false)}
                  onEnded={() => setIsAudioPlaying(false)}
                />
                
                {/* 进度条 */}
                <div className="mb-4">
                  <div
                    className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full cursor-pointer group"
                    onClick={handleAudioSeek}
                  >
                    <div
                      className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-200"
                      style={{ width: `${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mt-1">
                    <span>{formatDuration(audioCurrentTime)}</span>
                    <span>{formatDuration(audioDuration)}</span>
                  </div>
                </div>
                
                {/* 控制按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={toggleAudioPlayPause}
                      className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors duration-200"
                    >
                      {isAudioPlaying ? (
                        <PauseIcon className="w-5 h-5" />
                      ) : (
                        <PlayIcon className="w-5 h-5" />
                      )}
                    </button>
                    
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      {blog.audio_duration && `时长: ${formatDuration(blog.audio_duration)}`}
                    </div>
                  </div>
                  
                  {/* 音量控制 */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleAudioMute}
                      className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors duration-200"
                    >
                      {isAudioMuted || audioVolume === 0 ? (
                        <SpeakerXMarkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <SpeakerWaveIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isAudioMuted ? 0 : audioVolume}
                      onChange={(e) => handleAudioVolumeChange(Number(e.target.value))}
                      className="w-16 h-1 bg-blue-200 dark:bg-blue-700 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 博客内容 */}
        <div className="bg-white dark:bg-blog-900 rounded-lg shadow-sm border border-blog-200/50 dark:border-blog-700/50 overflow-hidden">
          
          {/* 描述部分 */}
          <div className="p-6 border-b border-blog-200/50 dark:border-blog-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-blog-900 dark:text-blog-100">描述</h2>
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="p-1 rounded hover:bg-blog-100 dark:hover:bg-blog-800 transition-colors duration-200"
              >
                {showDescription ? (
                  <ChevronUpIcon className="w-4 h-4 text-blog-500 dark:text-blog-400" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4 text-blog-500 dark:text-blog-400" />
                )}
              </button>
            </div>
            
            {showDescription && (
              <div className="text-blog-700 dark:text-blog-300 leading-relaxed">
                {blog.description}
              </div>
            )}
          </div>
          
          {/* 标签 */}
          <div className="p-6 border-b border-blog-200/50 dark:border-blog-700/50">
            <h3 className="text-sm font-medium text-blog-500 dark:text-blog-400 mb-3">标签</h3>
            <div className="flex flex-wrap gap-2">
              {blog.tags?.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 hover:scale-105 bg-blog-100/80 dark:bg-blog-800/60 text-blog-600 dark:text-blog-400 border border-blog-200/50 dark:border-blog-700/50 hover:bg-blog-200 dark:hover:bg-blog-700/80"
                  style={{ backgroundColor: tag.color ? `${tag.color}15` : undefined }}
                >
                  <span className="text-blog-500 dark:text-blog-500 mr-1">#</span>
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
          
          {/* 内容 */}
          {blog.content && (
            <div className="p-6">
              <h3 className="text-sm font-medium text-blog-500 dark:text-blog-400 mb-4">相关内容</h3>
              <div className="prose prose-blog dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: blog.content.replace(/\n/g, '<br>') }} />
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}