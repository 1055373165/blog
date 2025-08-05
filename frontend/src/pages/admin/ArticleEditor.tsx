import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Article, CreateArticleInput, UpdateArticleInput, Category, Tag, Series } from '../../types';
import MarkdownEditor from '../../components/MarkdownEditor';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ArticleEditor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  // Form state
  const [formData, setFormData] = useState<CreateArticleInput>({
    title: '',
    content: '',
    excerpt: '',
    coverImage: '',
    categoryId: '',
    tagIds: [],
    seriesId: '',
    seriesOrder: undefined,
    isPublished: false,
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'seo'>('content');

  // Data for dropdowns
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Auto-save functionality
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load article data if editing
  useEffect(() => {
    if (isEditing && id) {
      loadArticle(id);
    }
    loadFormData();
  }, [id, isEditing]);

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || !isEditing) return;

    const autoSaveInterval = setInterval(async () => {
      if (hasUnsavedChanges && formData.title.trim()) {
        await handleSave(true); // Silent save
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges, formData.title, isEditing]);

  // Track form changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [formData]);

  const loadArticle = async (articleId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/articles/${articleId}`);
      const data = await response.json();
      
      if (data.success) {
        const article: Article = data.data;
        setFormData({
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          coverImage: article.coverImage || '',
          categoryId: article.categoryId || '',
          tagIds: article.tags.map(tag => tag.id),
          seriesId: article.seriesId || '',
          seriesOrder: article.seriesOrder,
          isPublished: article.isPublished,
          metaTitle: article.metaTitle || '',
          metaDescription: article.metaDescription || '',
          metaKeywords: article.metaKeywords || '',
        });
        setSelectedTags(article.tags.map(tag => tag.id));
        setHasUnsavedChanges(false);
      } else {
        throw new Error(data.error || '加载文章失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文章时出错');
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    try {
      // Load categories, tags, and series for form dropdowns
      const [categoriesRes, tagsRes, seriesRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/tags'),
        fetch('/api/series'),
      ]);

      const [categoriesData, tagsData, seriesData] = await Promise.all([
        categoriesRes.json(),
        tagsRes.json(),
        seriesRes.json(),
      ]);

      if (categoriesData.success) setCategories(categoriesData.data);
      if (tagsData.success) setTags(tagsData.data);
      if (seriesData.success) setSeries(seriesData.data);
    } catch (err) {
      console.error('Failed to load form data:', err);
    }
  };

  const handleInputChange = (field: keyof CreateArticleInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTagToggle = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    
    setSelectedTags(newSelectedTags);
    handleInputChange('tagIds', newSelectedTags);
  };

  const generateExcerpt = () => {
    if (!formData.content) return;
    
    // Extract first paragraph or first 150 characters
    const content = formData.content.replace(/[#*`]/g, ''); // Remove markdown syntax
    const firstParagraph = content.split('\n\n')[0];
    const excerpt = firstParagraph.length > 150 
      ? firstParagraph.substring(0, 150) + '...'
      : firstParagraph;
    
    handleInputChange('excerpt', excerpt);
  };

  // const generateSlug = (title: string) => {
  //   return title
  //     .toLowerCase()
  //     .replace(/[^\w\s-]/g, '') // Remove special characters
  //     .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with dashes
  //     .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  // };

  const handleSave = async (silent = false) => {
    if (!formData.title.trim()) {
      if (!silent) setError('请填写文章标题');
      return;
    }

    try {
      setSaving(true);
      if (!silent) setError(null);
      
      const payload = {
        ...formData,
        tagIds: selectedTags,
      };

      let response;
      if (isEditing && id) {
        response = await fetch(`/api/articles/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      
      if (data.success) {
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        
        if (!silent) {
          // Show success message
          if (!isEditing) {
            // Redirect to edit mode after creating
            navigate(`/admin/articles/${data.data.id}/edit`);
          }
        }
      } else {
        throw new Error(data.error || '保存失败');
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : '保存时出错');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    const wasPublished = formData.isPublished;
    handleInputChange('isPublished', !wasPublished);
    
    // Save with new publish status
    setTimeout(async () => {
      await handleSave();
    }, 100);
  };

  const handlePreview = () => {
    // Open preview in new tab/window
    if (isEditing && id) {
      window.open(`/articles/${id}/preview`, '_blank');
    } else {
      // For new articles, we could implement a temporary preview
      alert('请先保存文章后再预览');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/articles')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? '编辑文章' : '新建文章'}
              </h1>
              {hasUnsavedChanges && (
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  • 有未保存的更改
                </span>
              )}
              {lastSaved && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  上次保存: {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handlePreview}
                disabled={!isEditing}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                           bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                           rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                预览
              </button>

              <button
                onClick={() => handleSave()}
                disabled={saving || !formData.title.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 
                           border border-transparent rounded-md hover:bg-primary-700 
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                {saving ? '保存中...' : '保存'}
              </button>

              <button
                onClick={handlePublish}
                disabled={saving}
                className={`px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
                  formData.isPublished
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                    : 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                }`}
              >
                {formData.isPublished ? '取消发布' : '发布'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Editor Column */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="flex space-x-8">
                {[
                  { key: 'content', label: '内容', icon: 'document' },
                  { key: 'settings', label: '设置', icon: 'cog' },
                  { key: 'seo', label: 'SEO', icon: 'search' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.key
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content Tab */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    文章标题 *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="输入文章标题..."
                    className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 
                               rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Content Editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    文章内容 *
                  </label>
                  <MarkdownEditor
                    value={formData.content}
                    onChange={(value) => handleInputChange('content', value)}
                    height={500}
                  />
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Excerpt */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      文章摘要
                    </label>
                    <button
                      onClick={generateExcerpt}
                      disabled={!formData.content}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      自动生成
                    </button>
                  </div>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => handleInputChange('excerpt', e.target.value)}
                    placeholder="文章摘要，用于列表页展示..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                               rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    封面图片
                  </label>
                  <input
                    type="url"
                    value={formData.coverImage}
                    onChange={(e) => handleInputChange('coverImage', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                               rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {formData.coverImage && (
                    <div className="mt-2">
                      <img
                        src={formData.coverImage}
                        alt="封面预览"
                        className="w-full max-w-md h-48 object-cover rounded-md border border-gray-300 dark:border-gray-600"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    文章分类
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => handleInputChange('categoryId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                               rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">选择分类</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Series */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    文章系列
                  </label>
                  <div className="flex space-x-3">
                    <select
                      value={formData.seriesId}
                      onChange={(e) => handleInputChange('seriesId', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 
                                 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">选择系列</option>
                      {series.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {formData.seriesId && (
                      <input
                        type="number"
                        value={formData.seriesOrder || ''}
                        onChange={(e) => handleInputChange('seriesOrder', parseInt(e.target.value) || undefined)}
                        placeholder="顺序"
                        min="1"
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 
                                   rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === 'seo' && (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">SEO 优化提示</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        填写以下信息有助于搜索引擎更好地理解和收录您的文章
                      </p>
                    </div>
                  </div>
                </div>

                {/* Meta Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SEO 标题
                  </label>
                  <input
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                    placeholder="留空将使用文章标题"
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                               rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {(formData.metaTitle || '').length}/60 字符 (建议50-60字符)
                  </p>
                </div>

                {/* Meta Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SEO 描述
                  </label>
                  <textarea
                    value={formData.metaDescription}
                    onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                    placeholder="留空将使用文章摘要"
                    maxLength={160}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                               rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {(formData.metaDescription || '').length}/160 字符 (建议150-160字符)
                  </p>
                </div>

                {/* Meta Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    关键词
                  </label>
                  <input
                    type="text"
                    value={formData.metaKeywords}
                    onChange={(e) => handleInputChange('metaKeywords', e.target.value)}
                    placeholder="关键词1, 关键词2, 关键词3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                               rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    用逗号分隔多个关键词
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Tags */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  文章标签
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tags.map((tag) => (
                    <label key={tag.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 
                                   focus:ring-primary-500 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {tag.name}
                      </span>
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                        {tag.articlesCount}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Article Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  文章统计
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">字数:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.content.length.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">段落:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.content.split('\n\n').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">预计阅读:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.ceil(formData.content.length / 200)} 分钟
                    </span>
                  </div>
                </div>
              </div>

              {/* Publish Status */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  发布状态
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">状态:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      formData.isPublished
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {formData.isPublished ? '已发布' : '草稿'}
                    </span>
                  </div>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => handleInputChange('isPublished', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 
                                 focus:ring-primary-500 dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      立即发布
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}