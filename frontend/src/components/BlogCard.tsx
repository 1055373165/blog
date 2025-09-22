import { Link } from 'react-router-dom';
import { Blog } from '../types';
import { formatDate, formatFileSize } from '../utils';
import { useEffect, useRef, useState } from 'react';
import Card from './ui/Card';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon,
  VideoCameraIcon,
  EyeIcon,
  HeartIcon,
  ClockIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
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

interface BlogCardProps {
  blog: Blog;
  variant?: 'default' | 'compact' | 'featured';
  showCategory?: boolean;
  showTags?: boolean;
  showStats?: boolean;
}

export default function BlogCard({ 
  blog, 
  variant = 'default',
  showCategory = true,
  showTags = true,
  showStats = true
}: BlogCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(blog.duration || 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 获取卡片样式类
  const getCardClasses = () => {
    const baseClass = blog.type === 'audio' ? 'audio-card' : 'video-card';
    const sizeClass = {
      featured: 'premium-card-featured',
      compact: 'premium-card-compact',
      default: 'premium-card-default'
    }[variant];
    
    return `${baseClass} ${sizeClass} group`;
  };

  // 格式化时长显示
  const formatDurationDisplay = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 音频播放控制
  const togglePlayPause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (blog.type === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const titleClasses = {
    default: 'text-lg font-semibold text-blog-800 dark:text-blog-100 hover:text-blog-600 dark:hover:text-blog-300 line-clamp-2 mb-3 transition-all duration-300 group-hover:text-blog-700 dark:group-hover:text-blog-200',
    compact: 'text-base font-semibold text-blog-800 dark:text-blog-100 hover:text-blog-600 dark:hover:text-blog-300 line-clamp-2 mb-2 transition-all duration-300 group-hover:text-blog-700 dark:group-hover:text-blog-200',
    featured: 'text-xl font-bold text-blog-800 dark:text-blog-100 hover:text-blog-600 dark:hover:text-blog-300 line-clamp-2 mb-4 group-hover:text-blog-700 dark:group-hover:text-blog-200 transition-all duration-300',
  };

  return (
    <Card
      ref={cardRef}
      variant="elevated"
      size={variant === 'compact' ? 'sm' : variant === 'featured' ? 'lg' : 'md'}
      hoverable
      animated
      image={blog.thumbnail && variant !== 'compact' ? blog.thumbnail : undefined}
      imageAlt={blog.title}
      imagePosition={blog.thumbnail && variant !== 'compact' ? 'top' : undefined}
      className={clsx(getCardClasses(), 'flex flex-col h-full')}
    >
      {/* 隐藏的音频元素 */}
      {blog.type === 'audio' && (
        <audio
          ref={audioRef}
          src={blog.media_url}
          preload="metadata"
        />
      )}

      {/* 卡片主要内容区域 - 使用 flexbox 自动分布空间 */}
      <div className="flex flex-col h-full space-y-3">
        
        {/* Header: 类型标识 + 时长 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* 媒体类型图标 */}
            <div className={clsx(
              'flex items-center justify-center w-6 h-6 rounded-full',
              blog.type === 'audio' 
                ? 'bg-media-audio-100 dark:bg-media-audio-800/30 text-media-audio-600 dark:text-media-audio-400'
                : 'bg-media-video-100 dark:bg-media-video-800/30 text-media-video-600 dark:text-media-video-400'
            )}>
              {blog.type === 'audio' ? (
                <SpeakerWaveIcon className="w-3 h-3" />
              ) : (
                <VideoCameraIcon className="w-3 h-3" />
              )}
            </div>
            
            {/* 类型标签 */}
            <span className={clsx(
              'text-xs font-medium px-2 py-0.5 rounded-md',
              blog.type === 'audio'
                ? 'bg-media-audio-100 dark:bg-media-audio-900/30 text-media-audio-700 dark:text-media-audio-300'
                : 'bg-media-video-100 dark:bg-media-video-900/30 text-media-video-700 dark:text-media-video-300'
            )}>
              {blog.type === 'audio' ? '音频' : '视频'}
            </span>
          </div>
          
          {/* 时长 */}
          <div className="flex items-center space-x-1 text-xs text-blog-500 dark:text-blog-400">
            <ClockIcon className="w-3 h-3" />
            <span>{formatDurationDisplay(blog.duration)}</span>
          </div>
        </div>

        {/* 标题 - 确保充分空间显示 */}
        <h2 className={titleClasses[variant]}>
          <Link to={`/blog/${blog.slug}`} className="block transition-colors duration-300 leading-tight">
            {blog.title}
          </Link>
        </h2>

        {/* 描述 - 占用可用空间 */}
        {variant !== 'compact' && blog.description && (
          <p className="text-sm text-blog-600 dark:text-blog-400 line-clamp-3 flex-1 leading-relaxed">
            {blog.description}
          </p>
        )}

        {/* 播放控制（仅音频） */}
        {blog.type === 'audio' && variant !== 'compact' && (
          <div className="flex items-center space-x-3 py-2">
            <button
              onClick={togglePlayPause}
              className={clsx(
                'flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200',
                'bg-media-audio-500 hover:bg-media-audio-600 text-white',
                'hover:scale-110 active:scale-95'
              )}
            >
              {isPlaying ? (
                <PauseIcon className="w-4 h-4" />
              ) : (
                <PlayIcon className="w-4 h-4 ml-0.5" />
              )}
            </button>
            
            {/* 简化的进度条 */}
            <div className="flex-1 h-1 bg-media-audio-200 dark:bg-media-audio-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-media-audio-500 dark:bg-media-audio-400 transition-all duration-200"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </div>
            
            <span className="text-xs text-blog-500 dark:text-blog-400 tabular-nums">
              {formatDurationDisplay(currentTime)} / {formatDurationDisplay(duration)}
            </span>
          </div>
        )}

        {/* Spacer to push bottom content down */}
        <div className="flex-1"></div>

        {/* 底部区域 - 标签和分类 */}
        <div className="space-y-3 mt-auto">
          {/* 分类和标签 */}
          <div className="space-y-2">
            {/* 分类信息 - 只显示第一个分类 */}
            {showCategory && blog.categories && blog.categories.length > 0 && (
              <div className="flex items-center">
                <Link
                  to={`/category/${blog.categories[0].slug}`}
                  className={clsx(
                    'inline-flex items-center px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 hover:scale-105',
                    'bg-blog-100 dark:bg-blog-800/50 text-blog-700 dark:text-blog-300',
                    'border border-blog-200/50 dark:border-blog-700/50',
                    'hover:bg-blog-200 dark:hover:bg-blog-700/70'
                  )}
                >
                  <DocumentIcon className="w-3 h-3 mr-1" />
                  {blog.categories[0].name}
                </Link>
              </div>
            )}

            {/* 标签 */}
            {showTags && blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {blog.tags.slice(0, variant === 'compact' ? 2 : 3).map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/tag/${tag.slug}`}
                    className={clsx(
                      'inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded transition-all duration-200 hover:scale-105',
                      'bg-blog-100/80 dark:bg-blog-800/60 text-blog-600 dark:text-blog-400',
                      'border border-blog-200/50 dark:border-blog-700/50',
                      'hover:bg-blog-200 dark:hover:bg-blog-700/80'
                    )}
                    style={{ backgroundColor: tag.color ? `${tag.color}15` : undefined }}
                  >
                    <span className="text-blog-500 dark:text-blog-500 mr-1">#</span>
                    {tag.name}
                  </Link>
                ))}
                {blog.tags.length > (variant === 'compact' ? 2 : 3) && (
                  <span className="text-xs text-blog-500 dark:text-blog-400 px-1">
                    +{blog.tags.length - (variant === 'compact' ? 2 : 3)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 底部信息分隔线 */}
          <div className="border-t border-blog-200/50 dark:border-blog-700/50 pt-3">
            <div className="space-y-2">
              {/* 第一行：作者和时间 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-blog-500 dark:text-blog-400">
                  <span className="flex items-center font-medium">
                    <span className="w-2 h-2 bg-blog-400 dark:bg-blog-500 rounded-full mr-1.5" />
                    {blog.author.name}
                  </span>

                  <span className="text-blog-400 dark:text-blog-500">•</span>

                  <time className="flex items-center">
                    {formatDate(blog.published_at || blog.created_at)}
                  </time>
                </div>

                {/* 右侧：统计信息 */}
                {showStats && (
                  <div className="flex items-center space-x-3 text-xs text-blog-500 dark:text-blog-400">
                    <span className="flex items-center">
                      <EyeIcon className="w-3 h-3 mr-0.5" />
                      {blog.views_count || 0}
                    </span>
                    <span className="flex items-center">
                      <HeartIcon className={clsx(
                        'w-3 h-3 mr-0.5',
                        blog.is_liked ? 'text-red-500 fill-current' : ''
                      )} />
                      {blog.likes_count || 0}
                    </span>
                  </div>
                )}
              </div>

              {/* 第二行：文件大小和操作按钮 */}
              <div className="flex items-center justify-between">
                {/* 文件大小 */}
                {blog.file_size > 0 && variant !== 'compact' ? (
                  <div className="flex items-center text-xs text-blog-500 dark:text-blog-400">
                    <span className="flex items-center bg-blog-100 dark:bg-blog-800 px-2 py-0.5 rounded-md">
                      📁 {formatFileSize(blog.file_size)}
                    </span>
                  </div>
                ) : (
                  <div></div>
                )}

                {/* 操作按钮 */}
                <Link 
                  to={`/blog/${blog.slug}`}
                  className={clsx(
                    'inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 hover:scale-105',
                    blog.type === 'audio'
                      ? 'text-media-audio-600 dark:text-media-audio-400 bg-media-audio-50/50 dark:bg-media-audio-900/20 border border-media-audio-200/30 dark:border-media-audio-800/30 hover:bg-media-audio-100 dark:hover:bg-media-audio-900/40'
                      : 'text-media-video-600 dark:text-media-video-400 bg-media-video-50/50 dark:bg-media-video-900/20 border border-media-video-200/30 dark:border-media-video-800/30 hover:bg-media-video-100 dark:hover:bg-media-video-900/40'
                  )}
                >
                  <span>{blog.type === 'audio' ? '收听' : '观看'}</span>
                  <svg className="w-3 h-3 ml-1 transform transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Card>
  );
}