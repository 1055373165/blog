import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Blog } from '../types';
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
  ChevronDownIcon
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
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  // Mock 博客数据 - 实际应用中从API获取
  const [blog, setBlog] = useState<Blog | null>(null);
  
  useEffect(() => {
    // Mock API 调用
    const mockBlog: Blog = {
      id: 1,
      title: "深度学习在前端开发中的应用实践",
      slug: slug || "deep-learning-frontend",
      description: "探讨如何将深度学习技术融入现代前端开发流程，包括智能代码补全、自动化测试生成、性能优化建议等实际应用场景。我们将深入分析具体的实现方案和最佳实践。",
      content: "# 深度学习在前端开发中的应用实践\n\n随着AI技术的快速发展，深度学习正在革命性地改变前端开发的方式...",
      type: "video",
      media_url: "https://example.com/video.mp4",
      thumbnail: "https://picsum.photos/800/450?random=1",
      duration: 1845, // 30:45
      file_size: 157286400, // 150MB
      mime_type: "video/mp4",
      is_published: true,
      is_draft: false,
      published_at: "2024-01-15T10:30:00Z",
      views_count: 2341,
      likes_count: 89,
      is_liked: false,
      author: {
        id: 1,
        email: "author@example.com",
        name: "张三",
        avatar: "https://picsum.photos/40/40?random=1",
        is_admin: true,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      },
      author_id: 1,
      category_id: 1,
      category: {
        id: 1,
        name: "前端技术",
        slug: "frontend",
        description: "前端开发相关技术",
        articles_count: 25,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      },
      tags: [
        {
          id: 1,
          name: "深度学习",
          slug: "deep-learning",
          color: "#3B82F6",
          articles_count: 12,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        },
        {
          id: 2,
          name: "前端开发",
          slug: "frontend-dev",
          color: "#10B981",
          articles_count: 35,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        },
        {
          id: 3,
          name: "AI应用",
          slug: "ai-application",
          color: "#8B5CF6",
          articles_count: 8,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        }
      ],
      meta_title: "深度学习在前端开发中的应用实践 - 技术博客",
      meta_description: "探讨深度学习技术在现代前端开发中的实际应用场景和实现方案",
      meta_keywords: "深度学习,前端开发,AI应用,智能代码,自动化测试",
      created_at: "2024-01-15T08:00:00Z",
      updated_at: "2024-01-15T10:30:00Z"
    };
    
    setBlog(mockBlog);
    setLikesCount(mockBlog.likes_count);
    setViewsCount(mockBlog.views_count);
    setIsLiked(mockBlog.is_liked || false);
    setIsLoading(false);
  }, [slug]);
  
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
  
  // 播放控制
  const togglePlayPause = () => {
    const media = blog?.type === 'audio' ? audioRef.current : videoRef.current;
    if (!media) return;
    
    if (isPlaying) {
      media.pause();
    } else {
      media.play();
    }
    setIsPlaying(!isPlaying);
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
  
  // 交互功能
  const toggleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    // 实际应用中调用API
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
                <img
                  src={blog.author.avatar}
                  alt={blog.author.name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="font-medium">{blog.author.name}</span>
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
            <div className="relative">
              {blog.type === 'audio' ? (
                <div className="relative aspect-video bg-gradient-to-br from-media-audio-100 to-media-audio-200 dark:from-media-audio-800 dark:to-media-audio-700 flex items-center justify-center">
                  <audio
                    ref={audioRef}
                    src={blog.media_url}
                    preload="metadata"
                    className="hidden"
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
                  poster={blog.thumbnail}
                  preload="metadata"
                  className="w-full aspect-video bg-black"
                  onClick={togglePlayPause}
                />
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
              {blog.tags.map((tag) => (
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