import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface MediaUploaderProps {
  onUpload: (url: string, alt?: string) => void;
  onClose: () => void;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

export function MediaUploader({
  onUpload,
  onClose,
  maxSize = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
}: MediaUploaderProps) {
  const [urlInput, setUrlInput] = useState('');
  const [altText, setAltText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');

  // Handle file upload
  const handleFileUpload = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      setError(`不支持的文件类型。支持: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`文件太大。最大支持 ${maxSize}MB`);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // TODO: Replace with actual upload endpoint
      // For now, create a local URL for demonstration
      const uploadUrl = URL.createObjectURL(file);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Use the uploaded URL
      onUpload(uploadUrl, altText || file.name);
      
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [acceptedTypes, maxSize, altText, onUpload]);

  // Handle URL input
  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      setError('请输入图片URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      setError('请输入有效的URL');
      return;
    }

    onUpload(urlInput.trim(), altText);
  };

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop: handleFileUpload,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxSize * 1024 * 1024,
    maxFiles: 1,
    disabled: uploading,
  });

  // Get dropzone border color based on state
  const getDropzoneBorderColor = () => {
    if (isDragAccept) return 'border-green-500 bg-green-50 dark:bg-green-900/20';
    if (isDragReject) return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (isDragActive) return 'border-primary-500 bg-primary-50 dark:bg-primary-900/20';
    return 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              添加图片
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center ${
                  activeTab === 'upload'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                上传文件
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center ${
                  activeTab === 'url'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                图片链接
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${getDropzoneBorderColor()}`}
              >
                <input {...getInputProps()} />
                
                {uploading ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">上传中...</p>
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{uploadProgress}%</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    
                    {isDragActive ? (
                      <div>
                        <p className="text-lg font-medium text-primary-600 dark:text-primary-400">
                          {isDragAccept ? '放开以上传文件' : '不支持的文件类型'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          拖拽图片到这里，或点击选择
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          支持 JPEG、PNG、GIF、WebP、SVG 格式，最大 {maxSize}MB
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* URL Tab */}
          {activeTab === 'url' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  图片链接
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="//example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUrlSubmit();
                    }
                  }}
                />
              </div>

              {/* URL Preview */}
              {urlInput.trim() && (
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">预览</p>
                  <img
                    src={urlInput}
                    alt="预览"
                    className="max-w-full h-auto max-h-48 mx-auto rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.display = 'block';
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Alt Text Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              替代文本 (可选)
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="描述图片内容，用于无障碍阅读..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              为图片添加描述有助于提升网站的无障碍性和SEO效果
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              取消
            </button>
            {activeTab === 'url' && (
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || uploading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                添加图片
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}