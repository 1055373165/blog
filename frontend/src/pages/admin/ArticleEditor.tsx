import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Article, CreateArticleInput, UpdateArticleInput, Category, Tag, Series } from '../../types';
import { articlesApi, categoriesApi, tagsApi } from '../../api';
import seriesApi from '../../services/seriesApi';
import MarkdownEditor from '../../components/MarkdownEditor';
import LoadingSpinner from '../../components/LoadingSpinner';
import FileImport from '../../components/FileImport';
import RSSImport from '../../components/RSSImport';

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
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'seo' | 'import'>('content');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'file' | 'rss'>('file');

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
      
      const response = await articlesApi.getArticle(articleId);
      
      if (response.success) {
        const article: Article = response.data;
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
        throw new Error('加载文章失败');
      }
    } catch (err: any) {
      setError(err.message || '加载文章时出错');
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    try {
      // Load categories, tags, and series for form dropdowns
      const [categoriesRes, tagsRes, seriesRes] = await Promise.all([
        categoriesApi.getCategories(),
        tagsApi.getTags({ limit: 100 }),
        seriesApi.getSeries(1, 100),
      ]);

      if (categoriesRes.success) {
        setCategories(categoriesRes.data.categories || categoriesRes.data);
      }
      if (tagsRes.success) {
        setTags(tagsRes.data.tags || tagsRes.data);
      }
      setSeries(seriesRes.items || []);
    } catch (err: any) {
      setError(err.message || '加载表单数据失败');
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
        response = await articlesApi.updateArticle(id, payload);
      } else {
        response = await articlesApi.createArticle(payload);
      }
      
      if (response.success) {
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        
        if (!silent) {
          // Show success message
          if (!isEditing) {
            // Redirect to edit mode after creating
            navigate(`/admin/articles/${response.data.id}/edit`);
          }
        }
      } else {
        throw new Error('保存失败');
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || '保存时出错');
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

  const handleFileImport = (content: string, metadata?: any) => {
    setFormData(prev => ({
      ...prev,
      content,
      title: metadata?.title || prev.title,
      excerpt: metadata?.excerpt || prev.excerpt,
      metaTitle: metadata?.metaTitle || prev.metaTitle,
      metaDescription: metadata?.metaDescription || prev.metaDescription,
      metaKeywords: metadata?.metaKeywords || prev.metaKeywords,
    }));
    
    setHasUnsavedChanges(true);
    setShowImportModal(false);
    setError(null);
    
    // Show success message briefly
    const successMsg = `成功导入 ${metadata?.fileName || '文件'}`;
    setError(null);
    // Could add a toast notification here
  };

  const handleBulkImport = (articles: Array<{
    title: string;
    content: string;
    excerpt: string;
    publishedAt?: string;
    author?: string;
    tags?: string[];
    link?: string;
  }>) => {
    if (articles.length === 0) return;
    
    if (articles.length === 1) {
      // Single article import
      const article = articles[0];
      setFormData(prev => ({
        ...prev,
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        isPublished: false, // Import as draft initially
      }));
      setHasUnsavedChanges(true);
      setShowImportModal(false);
    } else {
      // Multiple articles - show selection dialog or process in batch
      alert(`导入了 ${articles.length} 篇文章。请联系开发者实现批量创建功能。`);
      setShowImportModal(false);
    }
  };

  const handleImportError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card sticky top-0 z-10 rounded-none border-x-0 border-t-0">
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/articles')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-go-600 dark:hover:text-go-400 hover:bg-go-50 dark:hover:bg-go-900/20 rounded-lg transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {isEditing ? '编辑文章' : '新建文章'}
                </h1>
                <div className="flex items-center space-x-4 mt-1">
                  {hasUnsavedChanges && (
                    <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                      有未保存的更改
                    </span>
                  )}
                  {lastSaved && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      上次保存: {lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <span>导入</span>
              </button>

              <button
                onClick={handlePreview}
                disabled={!isEditing}
                className="btn btn-outline"
              >
                预览
              </button>

              <button
                onClick={() => handleSave()}
                disabled={saving || !formData.title.trim()}
                className="btn btn-primary flex items-center"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                {saving ? '保存中...' : '保存'}
              </button>

              <button
                onClick={handlePublish}
                disabled={saving}
                className={`btn ${
                  formData.isPublished
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
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
        <div className="px-6 mt-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
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
      <div className="px-6 py-8">
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
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                      activeTab === tab.key
                        ? 'border-go-500 text-go-600 dark:text-go-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-go-600 dark:hover:text-go-400 hover:border-go-300 dark:hover:border-go-600'
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
                    className="input text-lg py-3"
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
                    className="input resize-none"
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
                    className="input"
                  />
                  {formData.coverImage && (
                    <div className="mt-2">
                      <img
                        src={formData.coverImage}
                        alt="封面预览"
                        className="w-full max-w-md h-48 object-cover rounded-xl border border-gray-300 dark:border-gray-600 shadow-soft"
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
                    className="input"
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
                      className="input flex-1"
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
                        className="input w-20"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === 'seo' && (
              <div className="space-y-6">
                <div className="bg-go-50 dark:bg-go-900/20 border border-go-200 dark:border-go-800 rounded-xl p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-go-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-go-800 dark:text-go-200">SEO 优化提示</h3>
                      <p className="text-sm text-go-700 dark:text-go-300 mt-1">
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
                    className="input"
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
                    className="input resize-none"
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
                    className="input"
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
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  文章标签
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {tags.map((tag) => (
                    <label key={tag.id} className="flex items-center group cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-go-600 focus:ring-go-500 dark:bg-gray-700"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-go-600 dark:group-hover:text-go-400 transition-colors">
                        {tag.name}
                      </span>
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                        {tag.articlesCount}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Article Stats */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  文章统计
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">字数</span>
                    <span className="font-semibold text-go-600 dark:text-go-400">
                      {formData.content.length.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">段落</span>
                    <span className="font-semibold text-go-600 dark:text-go-400">
                      {formData.content.split('\n\n').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">预计阅读</span>
                    <span className="font-semibold text-go-600 dark:text-go-400">
                      {Math.ceil(formData.content.length / 200)} 分钟
                    </span>
                  </div>
                </div>
              </div>

              {/* Publish Status */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  发布状态
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-400">状态</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      formData.isPublished
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {formData.isPublished ? '已发布' : '草稿'}
                    </span>
                  </div>
                  
                  <label className="flex items-center group cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => handleInputChange('isPublished', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-go-600 focus:ring-go-500 dark:bg-gray-700"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-go-600 dark:group-hover:text-go-400 transition-colors">
                      立即发布
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-strong">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  导入文章内容
                </h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Import Type Tabs */}
              <div className="mt-4">
                <nav className="flex space-x-2">
                  <button
                    onClick={() => setImportType('file')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center ${
                      importType === 'file'
                        ? 'bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 shadow-soft'
                        : 'text-gray-500 dark:text-gray-400 hover:text-go-600 dark:hover:text-go-400 hover:bg-go-50 dark:hover:bg-go-900/20'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    文件导入
                  </button>
                  <button
                    onClick={() => setImportType('rss')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center ${
                      importType === 'rss'
                        ? 'bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 shadow-soft'
                        : 'text-gray-500 dark:text-gray-400 hover:text-go-600 dark:hover:text-go-400 hover:bg-go-50 dark:hover:bg-go-900/20'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                    RSS 导入
                  </button>
                </nav>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {importType === 'file' && (
                <FileImport
                  onFileImport={handleFileImport}
                  onError={handleImportError}
                  className="mb-4"
                />
              )}
              
              {importType === 'rss' && (
                <RSSImport
                  onArticlesImport={handleBulkImport}
                  onError={handleImportError}
                  className="mb-4"
                />
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}