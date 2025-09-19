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

  return (
    <Link to={`/blog/${blog.slug}`} className="block group">
      <Card
        ref={cardRef}
        variant="outlined"
        hoverable
        animated
        className="w-full h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/80"
      >
        {/* Image Thumbnail */}
        {blog.thumbnail && variant !== 'compact' && (
          <div className="relative overflow-hidden rounded-t-lg aspect-video">
            <img 
              src={blog.thumbnail} 
              alt={blog.title} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute top-3 right-3 flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-black/40 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">
                <ClockIcon className="w-3 h-3" />
                <span>{formatDuration(blog.duration)}</span>
              </div>
              <div className="flex items-center space-x-1 bg-black/40 text-white p-1.5 rounded-full text-xs backdrop-blur-sm">
                {blog.type === 'audio' ? <SpeakerWaveIcon className="w-3.5 h-3.5" /> : <VideoCameraIcon className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col flex-1 p-5">
          {/* Category & Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-3 min-h-[24px]">
            {showCategory && blog.category && (
              <span className="inline-block bg-slate-200/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium">
                {blog.category.name}
              </span>
            )}
            {showTags && blog.tags && blog.tags.slice(0, 2).map(tag => (
              <span key={tag.id} className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">#{tag.name}</span>
            ))}
          </div>

          {/* Title */}
          <h2 className={clsx(
            'font-semibold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors',
            {
              'text-lg': variant === 'default',
              'text-base': variant === 'compact',
              'text-xl': variant === 'featured',
            }
          )}>
            {blog.title}
          </h2>

          {/* Description */}
          {variant !== 'compact' && blog.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-2 flex-grow">
              {blog.description}
            </p>
          )}

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 min-w-0">
                {/* <img src={blog.author.avatar_url} alt={blog.author.name} className="w-5 h-5 rounded-full mr-2 flex-shrink-0" /> */}
                <span className="truncate">{blog.author.name}</span>
                <span className="mx-2 flex-shrink-0">•</span>
                <time className="flex-shrink-0">{formatDate(blog.published_at || blog.created_at)}</time>
              </div>
              {showStats && (
                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center">
                    <EyeIcon className="w-3.5 h-3.5 mr-1" />
                    {blog.views_count || 0}
                  </span>
                  <span className="flex items-center">
                    <HeartIcon className={clsx('w-3.5 h-3.5 mr-1', blog.is_liked && 'text-red-500 fill-current')} />
                    {blog.likes_count || 0}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}