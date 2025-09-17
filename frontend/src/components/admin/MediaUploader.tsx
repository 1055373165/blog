import { useState, useRef, useCallback } from 'react';
import { 
  CloudArrowUpIcon, 
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  VideoCameraIcon,
  DocumentIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { blogApi } from '../../services/blogApi';

interface MediaFile {
  file: File;
  url: string;
  filename: string;
  size: number;
  duration?: number;
  mime_type: string;
  type: 'audio' | 'video';
}

interface MediaUploaderProps {
  onFileUpload: (mediaFile: MediaFile) => void;
  onError: (error: string) => void;
  acceptedTypes?: string[];
  maxSize?: number; // MB
  className?: string;
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

export default function MediaUploader({
  onFileUpload,
  onError,
  acceptedTypes = ['audio/*', 'video/*'],
  maxSize = 500, // 500MB default
  className = ''
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 验证文件类型和大小
  const validateFile = (file: File): boolean => {
    // 检查文件大小
    if (file.size > maxSize * 1024 * 1024) {
      onError(`文件大小不能超过 ${maxSize}MB`);
      return false;
    }

    // 检查文件类型
    const isAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      onError('不支持的文件格式');
      return false;
    }

    return true;
  };

  // 获取媒体信息
  const getMediaInfo = (file: File): Promise<{ duration?: number; type: 'audio' | 'video' }> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      
      if (file.type.startsWith('audio/')) {
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
          resolve({ 
            duration: audio.duration, 
            type: 'audio' 
          });
          URL.revokeObjectURL(url);
        });
        audio.addEventListener('error', () => {
          resolve({ type: 'audio' });
          URL.revokeObjectURL(url);
        });
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.addEventListener('loadedmetadata', () => {
          resolve({ 
            duration: video.duration, 
            type: 'video' 
          });
          URL.revokeObjectURL(url);
        });
        video.addEventListener('error', () => {
          resolve({ type: 'video' });
          URL.revokeObjectURL(url);
        });
        video.src = url;
      } else {
        resolve({ type: 'audio' }); // 默认
        URL.revokeObjectURL(url);
      }
    });
  };

  // 处理文件选择
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (!validateFile(file)) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // 获取媒体信息
      const mediaInfo = await getMediaInfo(file);

      // 上传文件
      const uploadResult = await blogApi.uploadMedia(file, (progress) => {
        setUploadProgress(progress);
      });

      // 创建预览对象
      const mediaFile: MediaFile = {
        file,
        url: uploadResult.url,
        filename: uploadResult.filename,
        size: uploadResult.size,
        duration: uploadResult.duration || mediaInfo.duration,
        mime_type: uploadResult.mime_type,
        type: mediaInfo.type
      };

      setPreview(mediaFile);
      onFileUpload(mediaFile);

    } catch (error) {
      onError(error instanceof Error ? error.message : '上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onFileUpload, onError, maxSize, acceptedTypes]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // 播放控制
  const togglePlayback = () => {
    if (!preview) return;

    const media = preview.type === 'audio' ? audioRef.current : videoRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
    } else {
      media.play();
    }
    setIsPlaying(!isPlaying);
  };

  // 清除预览
  const clearPreview = () => {
    setPreview(null);
    setIsPlaying(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={clsx('w-full', className)}>
      {!preview ? (
        // 上传区域
        <div
          className={clsx(
            'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
            isDragging
              ? 'border-media-video-400 bg-media-video-50 dark:bg-media-video-900/20'
              : uploading
              ? 'border-gray-300 bg-gray-50 dark:bg-gray-800'
              : 'border-gray-300 hover:border-media-video-400 hover:bg-media-video-50/50 dark:hover:bg-media-video-900/10 cursor-pointer'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={uploading}
          />

          {uploading ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-media-video-100 dark:bg-media-video-800 rounded-full flex items-center justify-center">
                <CloudArrowUpIcon className="w-8 h-8 text-media-video-600 dark:text-media-video-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">上传中...</p>
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-media-video-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {Math.round(uploadProgress)}%
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-media-video-100 dark:bg-media-video-800 rounded-full flex items-center justify-center">
                <CloudArrowUpIcon className="w-8 h-8 text-media-video-600 dark:text-media-video-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  拖拽文件到此处或点击上传
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  支持音频和视频文件，最大 {maxSize}MB
                </p>
              </div>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
                <div className="flex items-center">
                  <SpeakerWaveIcon className="w-4 h-4 mr-1" />
                  音频文件
                </div>
                <div className="flex items-center">
                  <VideoCameraIcon className="w-4 h-4 mr-1" />
                  视频文件
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // 预览区域
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* 预览头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                preview.type === 'audio'
                  ? 'bg-media-audio-100 dark:bg-media-audio-800 text-media-audio-600 dark:text-media-audio-400'
                  : 'bg-media-video-100 dark:bg-media-video-800 text-media-video-600 dark:text-media-video-400'
              )}>
                {preview.type === 'audio' ? (
                  <SpeakerWaveIcon className="w-5 h-5" />
                ) : (
                  <VideoCameraIcon className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-64">
                  {preview.filename}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(preview.size)}
                  {preview.duration && ` • ${formatDuration(preview.duration)}`}
                  {` • ${preview.type === 'audio' ? '音频' : '视频'}`}
                </p>
              </div>
            </div>
            <button
              onClick={clearPreview}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* 媒体预览 */}
          <div className="p-4">
            {preview.type === 'audio' ? (
              <div className="space-y-4">
                <audio
                  ref={audioRef}
                  src={preview.url}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                <div className="bg-gradient-to-br from-media-audio-50 to-media-audio-100 dark:from-media-audio-800 dark:to-media-audio-700 rounded-lg p-6 text-center">
                  <SpeakerWaveIcon className="w-16 h-16 text-media-audio-400 mx-auto mb-4" />
                  <p className="text-sm text-media-audio-600 dark:text-media-audio-300">音频文件</p>
                </div>
                <div className="flex items-center justify-center">
                  <button
                    onClick={togglePlayback}
                    className="flex items-center justify-center w-12 h-12 bg-media-audio-500 hover:bg-media-audio-600 text-white rounded-full transition-colors"
                  >
                    {isPlaying ? (
                      <PauseIcon className="w-6 h-6" />
                    ) : (
                      <PlayIcon className="w-6 h-6 ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  src={preview.url}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full max-h-64 rounded-lg bg-black"
                  controls
                />
              </div>
            )}
          </div>

          {/* 文件信息 */}
          <div className="px-4 pb-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">文件名：</span>
                  <span className="text-gray-900 dark:text-white">{preview.filename}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">类型：</span>
                  <span className="text-gray-900 dark:text-white">{preview.mime_type}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">大小：</span>
                  <span className="text-gray-900 dark:text-white">{formatFileSize(preview.size)}</span>
                </div>
                {preview.duration && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">时长：</span>
                    <span className="text-gray-900 dark:text-white">{formatDuration(preview.duration)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}