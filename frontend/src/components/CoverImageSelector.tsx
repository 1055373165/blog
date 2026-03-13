import React, { useState, useEffect, useCallback } from 'react'
import { coverApi, uploadApi } from '../api'

interface CoverImage {
  name: string
  url: string
  relative_path: string
  size: number
  mod_time: string
  is_default: boolean
}

interface CoverImageSelectorProps {
  value: string
  onChange: (url: string) => void
  className?: string
}

export const CoverImageSelector: React.FC<CoverImageSelectorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const [coverImages, setCoverImages] = useState<CoverImage[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [batchUploading, setBatchUploading] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentFile: '', failed: [] as string[] })
  const [showSelector, setShowSelector] = useState(false)
  const [customUrl, setCustomUrl] = useState(value || '')
  const [activeTab, setActiveTab] = useState<'url' | 'local' | 'upload'>('url')

  // 加载封面图片列表
  const loadCoverImages = useCallback(async () => {
    try {
      setLoading(true)
      const response = await coverApi.getCoverImages()
      const images = Array.isArray(response?.data?.images) ? response.data.images : []
      setCoverImages(images)
    } catch (error) {
      console.error('加载封面图片失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始化加载
  useEffect(() => {
    if (showSelector && activeTab === 'local') {
      loadCoverImages()
    }
  }, [showSelector, activeTab, loadCoverImages])

  // 处理文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setUploading(true)
      setUploadProgress(0)

      const response = await coverApi.uploadCoverImage(file, (progress) => {
        setUploadProgress(progress)
      })

      if (response.data) {
        const newImageUrl = response.data.url
        onChange(newImageUrl)
        setCustomUrl(newImageUrl)
        setShowSelector(false)
        // 重新加载图片列表
        await loadCoverImages()
      }
    } catch (error) {
      console.error('上传封面图片失败:', error)
      alert('上传失败，请重试')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [onChange, loadCoverImages])

  // 支持的图片格式
  const isImageFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) return true
    const supported = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.ico']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return supported.includes(ext)
  }, [])

  // 批量上传多个文件
  const handleBatchUpload = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => isImageFile(f) && f.size <= 10 * 1024 * 1024)
    if (imageFiles.length === 0) {
      alert('未找到支持的图片文件（JPG、PNG、GIF、WebP 等，最大 10MB）')
      return
    }

    setBatchUploading(true)
    const failed: string[] = []
    let lastUrl = ''

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      setBatchProgress({ current: i + 1, total: imageFiles.length, currentFile: file.name, failed })
      try {
        const response = await coverApi.uploadCoverImage(file, (progress) => {
          setUploadProgress(progress)
        })
        if (response.data) {
          lastUrl = response.data.url
        }
      } catch (error) {
        console.error(`上传失败: ${file.name}`, error)
        failed.push(file.name)
      }
    }

    // 上传完成后选中最后一张成功的图片
    if (lastUrl) {
      onChange(lastUrl)
      setCustomUrl(lastUrl)
    }
    await loadCoverImages()
    setBatchUploading(false)
    setUploadProgress(0)
    setBatchProgress({ current: 0, total: 0, currentFile: '', failed: [] })

    if (failed.length > 0) {
      alert(`${imageFiles.length - failed.length} 张上传成功，${failed.length} 张上传失败：\n${failed.join('\n')}`)
    } else {
      alert(`全部 ${imageFiles.length} 张图片上传成功！`)
    }
  }, [onChange, loadCoverImages, isImageFile])

  // 处理拖拽上传
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => isImageFile(file))
    
    if (imageFiles.length > 1) {
      handleBatchUpload(imageFiles)
    } else if (imageFiles.length === 1) {
      handleFileUpload(imageFiles[0])
    }
  }, [handleFileUpload, handleBatchUpload, isImageFile])

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化时间
  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleDateString('zh-CN')
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 当前封面预览 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          封面图片
        </label>
        
        {/* 选择器按钮 */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setShowSelector(!showSelector)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {showSelector ? '收起选择器' : '选择封面图片'}
          </button>
          
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setCustomUrl('')
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              清除封面
            </button>
          )}
        </div>

        {/* 当前封面预览 */}
        {value && (
          <div className="mb-4">
            <img
              src={value}
              alt="封面预览"
              className="w-full max-w-md h-48 object-cover rounded-xl border border-gray-300 dark:border-gray-600 shadow-soft"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <p className="text-sm text-gray-500 mt-2">当前封面: {value}</p>
          </div>
        )}
      </div>

      {/* 封面选择器 */}
      {showSelector && (
        <div className="border border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-white dark:bg-gray-800">
          {/* 标签页 */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'url'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              URL 输入
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('local')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'local'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              本地图片
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              上传图片
            </button>
          </div>

          {/* URL 输入标签页 */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="输入图片URL，如：https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange(customUrl)
                    setShowSelector(false)
                  }}
                  disabled={!customUrl.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  确认使用
                </button>
                <button
                  type="button"
                  onClick={() => setCustomUrl('')}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  清空
                </button>
              </div>
            </div>
          )}

          {/* 本地图片标签页 */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-500">加载中...</p>
                </div>
              ) : (coverImages?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>暂无本地封面图片</p>
                  <p className="text-sm mt-1">请先上传一些图片到封面库</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                  {(coverImages ?? []).map((image) => (
                    <div
                      key={image.name}
                      className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                        value === image.url
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        onChange(image.url)
                        setCustomUrl(image.url)
                        setShowSelector(false)
                      }}
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-24 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/api/placeholder/150/100'
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 text-white text-xs text-center p-2">
                          <p className="font-medium truncate">{image.name}</p>
                          <p>{formatFileSize(image.size)}</p>
                          <p>{formatTime(image.mod_time)}</p>
                        </div>
                      </div>
                      {image.is_default && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                          默认
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <button
                type="button"
                onClick={loadCoverImages}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                刷新图片列表
              </button>
            </div>
          )}

          {/* 上传图片标签页 */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* 拖拽上传区域 */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
              >
                <div className="space-y-4">
                  <div className="text-4xl text-gray-400">📸</div>
                  <div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      拖拽图片或文件夹到这里上传
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      支持单张、多张图片或整个文件夹批量上传
                    </p>
                  </div>
                  
                  {/* 单文件选择 */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(file)
                      }
                    }}
                    className="hidden"
                    id="cover-upload-input"
                  />

                  {/* 多文件选择 */}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      if (files.length > 1) {
                        handleBatchUpload(files)
                      } else if (files.length === 1) {
                        handleFileUpload(files[0])
                      }
                      e.target.value = ''
                    }}
                    className="hidden"
                    id="cover-upload-multi-input"
                  />

                  {/* 文件夹选择 */}
                  <input
                    type="file"
                    // @ts-expect-error webkitdirectory is non-standard
                    webkitdirectory=""
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      if (files.length > 0) {
                        handleBatchUpload(files)
                      }
                      e.target.value = ''
                    }}
                    className="hidden"
                    id="cover-upload-folder-input"
                  />
                  
                  <div className="flex flex-wrap justify-center gap-3">
                    <label
                      htmlFor="cover-upload-input"
                      className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors font-medium text-sm"
                    >
                      选择单张图片
                    </label>
                    <label
                      htmlFor="cover-upload-multi-input"
                      className="inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors font-medium text-sm"
                    >
                      选择多张图片
                    </label>
                    <label
                      htmlFor="cover-upload-folder-input"
                      className="inline-block px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors font-medium text-sm"
                    >
                      选择文件夹
                    </label>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    支持 JPG、PNG、GIF、WebP 等常用图片格式，单文件最大 10MB
                  </p>
                </div>
              </div>

              {/* 单文件上传进度 */}
              {uploading && !batchUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>上传进度</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* 批量上传进度 */}
              {batchUploading && (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between text-sm font-medium">
                    <span>批量上传中...</span>
                    <span>{batchProgress.current} / {batchProgress.total}</span>
                  </div>
                  {/* 总体进度 */}
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                  {/* 当前文件 */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                    <span className="truncate">正在上传: {batchProgress.currentFile}</span>
                  </div>
                  {/* 当前文件进度 */}
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  {batchProgress.failed.length > 0 && (
                    <p className="text-xs text-red-500">
                      已失败 {batchProgress.failed.length} 张
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CoverImageSelector
