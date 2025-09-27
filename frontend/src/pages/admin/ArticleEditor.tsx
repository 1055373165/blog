import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Article, CreateArticleInput, UpdateArticleInput, Category, Tag, Series } from '../../types';
import { articlesApi, categoriesApi, tagsApi } from '../../api';
import seriesApi from '../../services/seriesApi';
import ByteMDEditor from '../../components/ByteMDEditor';
import LoadingSpinner from '../../components/LoadingSpinner';
import FileImport from '../../components/FileImport';
import RSSImport from '../../components/RSSImport';
import CoverImageSelector from '../../components/CoverImageSelector';
import ArticlePreview from '../../components/ArticlePreview';
import { useAuth } from '../../contexts/AuthContext';

export default function ArticleEditor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = !!id;

  // Form state
  const [formData, setFormData] = useState<CreateArticleInput>({
    title: '',
    content: '',
    excerpt: '',
    cover_image: '',
    category_ids: [],
    tag_ids: [],
    series_id: undefined,
    series_order: undefined,
    is_published: false,
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    author_name: '',
  });
  // Note: Using ByteMD as the single editor solution

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'seo' | 'import'>('content');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'file' | 'rss'>('file');
  // Data for dropdowns
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  
  // Editor height calculation
  const [editorHeight, setEditorHeight] = useState(1400);

  // Load article data if editing
  useEffect(() => {
    if (isEditing && id) {
      loadArticle(id);
    }
    loadFormData();
  }, [id, isEditing]);


  // Add keyboard shortcut for Command+S / Ctrl+S
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault(); // Prevent browser's default save dialog
        
        // Only save if there's a title (basic validation)
        if (formData.title.trim()) {
          handleSave(false); // Non-silent save to show user feedback
        }
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [formData]); // Include formData to get latest data

  // Calculate editor height to fill the screen
  useEffect(() => {
    const calculateEditorHeight = () => {
      // Account for header, padding, and other UI elements
      // Reduced from 350px to 200px to give more space to editor
      const availableHeight = window.innerHeight - 200; // 200px for other UI elements
      const minHeight = 1400; // Minimum height set to 1400px as requested
      const maxHeight = Math.max(minHeight, availableHeight);
      console.log('Calculating editor height:', { 
        windowHeight: window.innerHeight, 
        availableHeight, 
        finalHeight: maxHeight 
      });
      setEditorHeight(maxHeight);
    };

    // Initial calculation
    calculateEditorHeight();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateEditorHeight);
    return () => window.removeEventListener('resize', calculateEditorHeight);
  }, []);

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
          cover_image: article.cover_image || '',
          category_ids: (article.categories || []).map(cat => cat.id),
          tag_ids: (article.tags || []).map(tag => tag.id),
          series_id: article.series_id,
          series_order: article.series_order,
          is_published: article.is_published,
          meta_title: article.meta_title || '',
          meta_description: article.meta_description || '',
          meta_keywords: article.meta_keywords || '',
          author_name: article.author?.name || '',
        });
        setSelectedTags((article.tags || []).map(tag => tag.id.toString()));
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
        setCategories(categoriesRes.data.categories || (Array.isArray(categoriesRes.data) ? categoriesRes.data : []));
      }
      if (tagsRes.success) {
        setTags(tagsRes.data.tags || []);
      }
      setSeries(seriesRes.items || []);
    } catch (err: any) {
      setError(err.message || '加载表单数据失败');
    }
  };

  const handleInputChange = useCallback((field: keyof CreateArticleInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleTagToggle = (tagId: string) => {
    const currentTags = selectedTags || [];
    const newSelectedTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    setSelectedTags(newSelectedTags);
    handleInputChange('tag_ids', newSelectedTags);
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
    // Check admin permissions
    if (!user?.is_admin) {
      if (!silent) setError('只有管理员才能编辑文章');
      return;
    }

    if (!formData.title.trim()) {
      if (!silent) setError('请填写文章标题');
      return;
    }

    try {
      setSaving(true);
      if (!silent) setError(null);

      const payload = {
        ...formData,
        tag_ids: (selectedTags || []).map(id => parseInt(id)),
      };

      let response;
      if (isEditing && id) {
        const updatePayload = { ...payload, id: parseInt(id) };
        response = await articlesApi.updateArticle(id, updatePayload);
      } else {
        response = await articlesApi.createArticle(payload);
      }

      if (response.success) {
        if (!silent) {
          // Show success message
          if (!isEditing) {
            // Redirect to edit mode after creating
            navigate(`/admin/articles/${response.data.id}/edit`);
          }
        }
      } else {
        throw new Error(response.error || '保存失败');
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
    // Check admin permissions
    if (!user?.is_admin) {
      setError('只有管理员才能发布文章');
      return;
    }

    const wasPublished = formData.is_published;
    const newPublishedState = !wasPublished;

    // Update the state
    handleInputChange('is_published', newPublishedState);

    // Save with explicit published state to avoid timing issues
    const updatedFormData = {
      ...formData,
      is_published: newPublishedState,
      tag_ids: (selectedTags || []).map(id => parseInt(id)),
    };

    try {
      setSaving(true);
      setError(null);

      let response;
      if (isEditing && id) {
        const updatePayload = { ...updatedFormData, id: parseInt(id) };
        response = await articlesApi.updateArticle(id, updatePayload);
      } else {
        response = await articlesApi.createArticle(updatedFormData);
      }

      if (response.success) {
        if (!isEditing) {
          navigate(`/admin/articles/${response.data.id}`, { replace: true });
        }
      } else {
        setError(response.error || '保存失败');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      setError(error.message || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    // Toggle preview mode instead of opening new window
    setIsPreviewMode(!isPreviewMode);
  };


  const handleFileImport = (content: string, metadata?: any) => {
    setFormData(prev => ({
      ...prev,
      content,
      title: metadata?.title || prev.title,
      excerpt: metadata?.excerpt || prev.excerpt,
      meta_title: metadata?.meta_title || prev.meta_title,
      meta_description: metadata?.meta_description || prev.meta_description,
      meta_keywords: metadata?.meta_keywords || prev.meta_keywords,
    }));
    
    setShowImportModal(false);
    setError(null);
    
    // Could add a success toast notification here
    // const successMsg = `成功导入 ${metadata?.fileName || '文件'}`;
    // toast.success(successMsg);
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
        is_published: false, // Import as draft initially
      }));
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

  // ByteMD editor handles content changes through the onChange callback
  // Auto-save is managed by the useEffect above

  // Content validation
  const validateContent = () => {
    const issues = [];
    
    if (!formData.title.trim()) {
      issues.push('标题不能为空');
    } else if (formData.title.length > 200) {
      issues.push('标题过长，建议不超过200字符');
    }
    
    if (!formData.content.trim()) {
      issues.push('文章内容不能为空');
    } else if (formData.content.length < 100) {
      issues.push('文章内容过短，建议至少100字符');
    }
    
    if (!formData.excerpt?.trim() && formData.content.length > 0) {
      issues.push('建议添加文章摘要');
    }
    
    if (!formData.category_ids || formData.category_ids.length === 0) {
      issues.push('建议选择文章分类');
    }
    
    if (!formData.tag_ids || formData.tag_ids.length === 0) {
      issues.push('建议为文章添加标签');
    }
    
    return issues;
  };

  // Get content statistics
  const getContentStats = () => {
    const content = formData.content || '';
    const words = content.length;
    const paragraphs = content.split('\n\n').filter(p => p.trim()).length;
    const readingTime = Math.ceil(words / 200);
    const images = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
    const links = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
    
    return { words, paragraphs, readingTime, images, links };
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
      {/* Admin Permission Warning */}
      {!user?.is_admin && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 m-6">
          <div className="flex">
            <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">权限不足</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                只有管理员才能编辑和发布文章。请联系管理员获取相应权限。
              </p>
            </div>
          </div>
        </div>
      )}
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
                className="btn btn-outline"
              >
                预览
              </button>

              <button
                onClick={() => handleSave()}
                disabled={saving || !formData.title.trim() || !user?.is_admin}
                className="btn btn-primary flex items-center"
                title={!user?.is_admin ? '只有管理员才能保存文章' : ''}
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                {saving ? '保存中...' : '保存'}
              </button>

              <button
                onClick={handlePublish}
                disabled={saving || !user?.is_admin}
                className={`btn ${
                  formData.is_published
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                }`}
                title={!user?.is_admin ? '只有管理员才能发布文章' : ''}
              >
                {formData.is_published ? '取消发布' : '发布'}
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
        <div className="w-full">
          {/* Tabs - Horizontal layout above content */}
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

                {/* Preview Mode Toggle */}
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    文章内容 *
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsPreviewMode(false)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        !isPreviewMode
                          ? 'bg-go-100 text-go-700 dark:bg-go-900/30 dark:text-go-300'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setIsPreviewMode(true)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        isPreviewMode
                          ? 'bg-go-100 text-go-700 dark:bg-go-900/30 dark:text-go-300'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      预览
                    </button>
                  </div>
                </div>

                {/* Content Editor or Preview */}
                <div>
                  {isPreviewMode ? (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 min-h-[600px]">
                      <ArticlePreview article={formData} />
                    </div>
                  ) : (
                    <ByteMDEditor
                      value={formData.content}
                      onChange={(value) => handleInputChange('content', value)}
                      height={Math.max(800, window.innerHeight - 300)}
                      placeholder="开始编写你的精彩文章..."
                    />
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Basic Settings */}
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
                  <CoverImageSelector
                    value={formData.cover_image || ''}
                    onChange={(url) => handleInputChange('cover_image', url)}
                  />

                  {/* Categories */}
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      文章分类
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {(categories || []).map((category) => (
                        <label key={category.id} className="flex items-center group cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(formData.category_ids || []).includes(category.id)}
                            onChange={() => {
                              const currentCategoryIds = formData.category_ids || [];
                              const newCategoryIds = currentCategoryIds.includes(category.id)
                                ? currentCategoryIds.filter(id => id !== category.id)
                                : [...currentCategoryIds, category.id];
                              handleInputChange('category_ids', newCategoryIds);
                            }}
                            className="rounded border-gray-300 dark:border-gray-600 text-go-600 focus:ring-go-500 dark:bg-gray-700"
                          />
                          <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-go-600 dark:group-hover:text-go-400 transition-colors">
                            {category.name}
                          </span>
                          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                            {category.articles_count}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Series */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      文章系列
                    </label>
                    <div className="flex space-x-3">
                      <select
                        value={formData.series_id || ''}
                        onChange={(e) => handleInputChange('series_id', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="input flex-1"
                      >
                        <option value="">选择系列</option>
                        {(series || []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {formData.series_id && (
                        <input
                          type="number"
                          value={formData.series_order || ''}
                          onChange={(e) => handleInputChange('series_order', parseInt(e.target.value) || undefined)}
                          placeholder="顺序"
                          min="1"
                          className="input w-20"
                        />
                      )}
                    </div>
                  </div>

                  {/* Author Display Name (Admin setting) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      作者显示名（管理员可设置）
                    </label>
                    <input
                      type="text"
                      value={formData.author_name || ''}
                      onChange={(e) => handleInputChange('author_name', e.target.value)}
                      placeholder="例如：管理员、张三..."
                      className="input"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      修改此项将更新该文章作者用户的名称，并用于前台展示。
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      文章标签
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {(tags || []).map((tag) => (
                        <label key={tag.id} className="flex items-center group cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(selectedTags || []).includes(tag.id.toString())}
                            onChange={() => handleTagToggle(tag.id.toString())}
                            className="rounded border-gray-300 dark:border-gray-600 text-go-600 focus:ring-go-500 dark:bg-gray-700"
                          />
                          <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-go-600 dark:group-hover:text-go-400 transition-colors">
                            {tag.name}
                          </span>
                          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                            {tag.articles_count}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Status & Analytics */}
                <div className="space-y-6">
                  {/* Publish Status */}
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      发布状态
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="font-medium text-gray-600 dark:text-gray-400">状态</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          formData.is_published
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {formData.is_published ? '已发布' : '草稿'}
                        </span>
                      </div>
                      
                      <label className="flex items-center group cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.is_published}
                          onChange={(e) => handleInputChange('is_published', e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600 text-go-600 focus:ring-go-500 dark:bg-gray-700"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-go-600 dark:group-hover:text-go-400 transition-colors">
                          立即发布
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Article Stats */}
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      文章统计
                    </h3>
                    <div className="space-y-3">
                      {(() => {
                        const stats = getContentStats();
                        return (
                          <>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                字数
                              </span>
                              <span className="font-semibold text-primary-600 dark:text-primary-400">
                                {stats.words.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                段落
                              </span>
                              <span className="font-semibold text-primary-600 dark:text-primary-400">
                                {stats.paragraphs}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                预计阅读
                              </span>
                              <span className="font-semibold text-primary-600 dark:text-primary-400">
                                {stats.readingTime} 分钟
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                图片
                              </span>
                              <span className="font-semibold text-primary-600 dark:text-primary-400">
                                {stats.images}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                链接
                              </span>
                              <span className="font-semibold text-primary-600 dark:text-primary-400">
                                {stats.links}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Content Validation */}
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      内容检查
                    </h3>
                    {(() => {
                      const issues = validateContent();
                      return (
                        <div className="space-y-3">
                          {issues.length === 0 ? (
                            <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
                              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium">内容检查通过</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {issues.map((issue, index) => (
                                <div key={index} className="flex items-start p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg">
                                  <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-sm">{issue}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
                    value={formData.meta_title}
                    onChange={(e) => handleInputChange('meta_title', e.target.value)}
                    placeholder="留空将使用文章标题"
                    maxLength={60}
                    className="input"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {(formData.meta_title || '').length}/60 字符 (建议50-60字符)
                  </p>
                </div>

                {/* Meta Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SEO 描述
                  </label>
                  <textarea
                    value={formData.meta_description}
                    onChange={(e) => handleInputChange('meta_description', e.target.value)}
                    placeholder="留空将使用文章摘要"
                    maxLength={160}
                    rows={3}
                    className="input resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {(formData.meta_description || '').length}/160 字符 (建议150-160字符)
                  </p>
                </div>

                {/* Meta Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    关键词
                  </label>
                  <input
                    type="text"
                    value={formData.meta_keywords}
                    onChange={(e) => handleInputChange('meta_keywords', e.target.value)}
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