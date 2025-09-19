import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EyeIcon,
  CloudArrowUpIcon,
  SpeakerWaveIcon,
  VideoCameraIcon,
  TagIcon,
  FolderIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Blog, CreateBlogInput, UpdateBlogInput, Category, Tag } from '../../types';
import { blogApi } from '../../services/blogApi';
import { categoriesApi, tagsApi } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import MediaUploader from '../../components/admin/MediaUploader';
import ByteMDEditor from '../../components/ByteMDEditor';

interface MediaFile {
  file: File;
  url: string;
  filename: string;
  size: number;
  duration?: number;
  mime_type: string;
  type: 'audio' | 'video';
}

export default function BlogEditor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = id && id !== 'new';

  // 表单状态
  const [formData, setFormData] = useState<CreateBlogInput>({
    title: '',
    description: '',
    content: '',
    type: 'video',
    media_url: '',
    thumbnail: '',
    duration: 0,
    file_size: 0,
    mime_type: '',
    // 音频文件字段
    audio_url: '',
    audio_duration: 0,
    audio_file_size: 0,
    audio_mime_type: '',
    category_id: undefined,
    tag_ids: [],
    is_published: false,
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
  });

  // 媒体文件状态
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [audioFile, setAudioFile] = useState<MediaFile | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // UI状态
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'media' | 'settings' | 'seo'>('content');
  const [showPreview, setShowPreview] = useState(false);

  // 选项数据
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 加载博客数据（编辑模式）
  useEffect(() => {
    if (isEditing) {
      const loadBlog = async () => {
        try {
          setLoading(true);
          const blog = await blogApi.getBlog(Number(id));

          if (!blog) {
            setError('博客不存在');
            return;
          }

          setFormData({
            title: blog.title || '',
            description: blog.description || '',
            content: blog.content || '',
            type: blog.type,
            media_url: blog.media_url || '',
            thumbnail: blog.thumbnail || '',
            duration: blog.duration || 0,
            file_size: blog.file_size || 0,
            mime_type: blog.mime_type || '',
            // 音频文件字段
            audio_url: blog.audio_url || '',
            audio_duration: blog.audio_duration || 0,
            audio_file_size: blog.audio_file_size || 0,
            audio_mime_type: blog.audio_mime_type || '',
            category_id: blog.category_id,
            tag_ids: blog.tags ? blog.tags.map(tag => tag.id) : [],
            is_published: blog.is_published || false,
            meta_title: blog.meta_title || '',
            meta_description: blog.meta_description || '',
            meta_keywords: blog.meta_keywords || '',
          });

          setSelectedTags(blog.tags ? blog.tags.map(tag => tag.id.toString()) : []);

        } catch (error) {
          setError(error instanceof Error ? error.message : '加载博客失败');
        } finally {
          setLoading(false);
        }
      };

      loadBlog();
    }
  }, [isEditing, id]);

  // 加载分类和标签
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          categoriesApi.getCategories(),
          tagsApi.getTags()
        ]);
        setCategories(categoriesRes.data?.articles || categoriesRes.data || []);
        setTags(tagsRes.data?.articles || tagsRes.data || []);
      } catch (error) {
        console.error('加载分类和标签失败:', error);
      }
    };

    loadOptions();
  }, []);

  // 更新表单数据
  const updateFormData = (key: keyof CreateBlogInput, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // 处理媒体文件上传
  const handleMediaUpload = (file: MediaFile) => {
    setMediaFile(file);
    updateFormData('media_url', file.url);
    updateFormData('type', file.type);
    updateFormData('duration', file.duration || 0);
    updateFormData('file_size', file.size);
    updateFormData('mime_type', file.mime_type);
  };

  // 处理音频文件上传
  const handleAudioUpload = (file: MediaFile) => {
    setAudioFile(file);
    updateFormData('audio_url', file.url);
    updateFormData('audio_duration', file.duration || 0);
    updateFormData('audio_file_size', file.size);
    updateFormData('audio_mime_type', file.mime_type);
  };

  // 处理缩略图上传
  const handleThumbnailUpload = async (file: File) => {
    try {
      const result = await blogApi.uploadThumbnail(file);
      setThumbnailFile(file);
      updateFormData('thumbnail', result.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : '缩略图上传失败');
    }
  };

  // 处理标签选择
  const handleTagSelect = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    
    setSelectedTags(newSelectedTags);
    updateFormData('tag_ids', newSelectedTags.map(id => Number(id)));
  };

  // 表单验证
  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('请输入博客标题');
      return false;
    }

    if (!formData.media_url) {
      setError('请上传媒体文件');
      return false;
    }

    return true;
  };

  // 保存博客
  const handleSave = async (publish: boolean = false) => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);

      const submitData = {
        ...formData,
        is_published: publish,
        tag_ids: selectedTags.map(id => Number(id))
      };

      if (isEditing) {
        await blogApi.updateBlog(Number(id), { ...submitData, id: Number(id) });
      } else {
        await blogApi.createBlog(submitData);
      }

      navigate('/admin/blogs');
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/blogs')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? '编辑博客' : '创建博客'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isEditing ? '编辑音频或视频博客内容' : '创建新的音频或视频博客'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {formData.media_url && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              预览
            </button>
          )}
          
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            保存草稿
          </button>
          
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-go-600 hover:bg-go-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            {formData.is_published ? '更新并发布' : '发布'}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* 标签导航 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'content', name: '内容', icon: DocumentTextIcon },
              { key: 'media', name: '媒体', icon: VideoCameraIcon },
              { key: 'settings', name: '设置', icon: FolderIcon },
              { key: 'seo', name: 'SEO', icon: GlobeAltIcon },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={clsx(
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                  activeTab === tab.key
                    ? 'border-go-500 text-go-600 dark:text-go-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                )}
              >
                <tab.icon className={clsx(
                  'mr-2 h-5 w-5',
                  activeTab === tab.key
                    ? 'text-go-500 dark:text-go-400'
                    : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                )} />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* 内容标签 */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  博客标题 *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent"
                  placeholder="输入博客标题..."
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  博客描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent"
                  placeholder="输入博客描述..."
                />
              </div>

              {/* 内容编辑器 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  博客内容
                </label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <ByteMDEditor
                    value={formData.content || ''}
                    onChange={(value) => updateFormData('content', value)}
                    placeholder="输入博客的详细内容..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* 媒体标签 */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* 媒体文件上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  媒体文件 *
                </label>
                <MediaUploader
                  onFileUpload={handleMediaUpload}
                  onError={setError}
                  acceptedTypes={['audio/*', 'video/*']}
                  maxSize={500}
                />
              </div>

              {/* 缩略图上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  缩略图
                </label>
                <div className="space-y-4">
                  {formData.thumbnail && (
                    <div className="relative inline-block">
                      <img
                        src={formData.thumbnail}
                        alt="缩略图预览"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                      <button
                        onClick={() => updateFormData('thumbnail', '')}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleThumbnailUpload(file);
                      }}
                      className="hidden"
                      id="thumbnail-upload"
                    />
                    <label
                      htmlFor="thumbnail-upload"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                    >
                      <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                      上传缩略图
                    </label>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      推荐尺寸: 800x450px，支持 JPG、PNG 格式
                    </span>
                  </div>
                </div>
              </div>

              {/* 媒体信息显示 */}
              {mediaFile && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">主媒体信息</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">文件名：</span>
                      <span className="text-gray-900 dark:text-white">{mediaFile.filename}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">文件类型：</span>
                      <span className="text-gray-900 dark:text-white">{mediaFile.mime_type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">文件大小：</span>
                      <span className="text-gray-900 dark:text-white">
                        {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    {mediaFile.duration && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">时长：</span>
                        <span className="text-gray-900 dark:text-white">
                          {Math.floor(mediaFile.duration / 60)}:{Math.floor(mediaFile.duration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 音频文件上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  音频文件（可选）
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  为博客添加额外的音频文件，如背景音乐、语音解说等
                </p>
                <MediaUploader
                  onFileUpload={handleAudioUpload}
                  onError={setError}
                  acceptedTypes={['audio/*']}
                  maxSize={200}
                />
              </div>

              {/* 音频信息显示 */}
              {audioFile && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                    <SpeakerWaveIcon className="w-4 h-4 mr-2" />
                    音频文件信息
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 dark:text-blue-300">文件名：</span>
                      <span className="text-blue-900 dark:text-blue-100">{audioFile.filename}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-300">文件类型：</span>
                      <span className="text-blue-900 dark:text-blue-100">{audioFile.mime_type}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-300">文件大小：</span>
                      <span className="text-blue-900 dark:text-blue-100">
                        {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    {audioFile.duration && (
                      <div>
                        <span className="text-blue-700 dark:text-blue-300">时长：</span>
                        <span className="text-blue-900 dark:text-blue-100">
                          {Math.floor(audioFile.duration / 60)}:{Math.floor(audioFile.duration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 设置标签 */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* 分类选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  博客分类
                </label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => updateFormData('category_id', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-go-500 focus:border-transparent"
                >
                  <option value="">选择分类</option>
                  {categories && categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 标签选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  博客标签
                </label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {tags && tags.map(tag => (
                      <label key={tag.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag.id.toString())}
                          onChange={() => handleTagSelect(tag.id.toString())}
                          className="w-4 h-4 text-go-600 bg-gray-100 border-gray-300 rounded focus:ring-go-500 dark:focus:ring-go-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="ml-2 text-sm text-gray-900 dark:text-white">
                          {tag.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  选择适合的标签来帮助用户发现您的博客
                </p>
              </div>

              {/* 发布状态 */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => updateFormData('is_published', e.target.checked)}
                    className="w-4 h-4 text-go-600 bg-gray-100 border-gray-300 rounded focus:ring-go-500 dark:focus:ring-go-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                    立即发布此博客
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  发布后博客将在前台显示，未发布的博客将保存为草稿
                </p>
              </div>
            </div>
          )}

          {/* SEO标签 */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              {/* Meta标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SEO 标题
                </label>
                <input
                  type="text"
                  value={formData.meta_title || ''}
                  onChange={(e) => updateFormData('meta_title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent"
                  placeholder="SEO标题（留空将使用博客标题）"
                />
              </div>

              {/* Meta描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SEO 描述
                </label>
                <textarea
                  value={formData.meta_description || ''}
                  onChange={(e) => updateFormData('meta_description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent"
                  placeholder="SEO描述（留空将使用博客描述）"
                />
              </div>

              {/* Meta关键词 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SEO 关键词
                </label>
                <input
                  type="text"
                  value={formData.meta_keywords || ''}
                  onChange={(e) => updateFormData('meta_keywords', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent"
                  placeholder="用逗号分隔关键词"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  使用逗号分隔多个关键词，例如：技术,编程,教程
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}